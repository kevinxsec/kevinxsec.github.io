// Import one Markdown writeup (e.g. an Obsidian export) plus its screenshots into the blog.
//
//   node scripts/import-writeup.mjs --source <file.md> --images <dir> --platform HTB|THM|OffSec --slug <machine> [--dry-run] [--overwrite]
//
// Writes content/writeups/<platform>/<slug>.md and public/images/<platform>/<slug>/*.
// Only image references are rewritten; all other text is kept byte-for-byte. The source files
// are never modified, new articles are always drafts (published: false), and existing files
// are never replaced unless --overwrite is passed.
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

import { checkMarkdownImages, findImageRefs, loadPosts, slugify, validateFrontmatter } from "./content.mjs";

export class ImportError extends Error {}
const PLATFORM_DIRS = { HTB: "htb", THM: "thm", OffSec: "offsec" };

function listFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? listFiles(p) : [p];
  });
}

/** Edit one frontmatter key in place (text-level, so the rest of the file is untouched). */
function setFrontmatterKey(text, key, value, report) {
  const end = text.indexOf("\n---", 3);
  const head = text.slice(0, end);
  const re = new RegExp(`^${key}:.*$`, "m");
  if (re.test(head)) {
    const old = head.match(re)[0];
    const line = `${key}: ${value}`;
    if (old.trim() === line) return text;
    report.push(`frontmatter: "${old.trim()}" -> "${line}"`);
    return head.replace(re, line) + text.slice(end);
  }
  report.push(`frontmatter: added "${key}: ${value}"`);
  return `${head}\n${key}: ${value}${text.slice(end)}`;
}

/**
 * Pure planning step: returns the new Markdown, the image copies and a report, or throws ImportError
 * listing every problem. `imageFiles` is a list of absolute paths available for import.
 */
export function planImport({ markdown, platform, slug, imagesDir, imageFiles }) {
  const errors = [];
  const report = [];
  if (!PLATFORM_DIRS[platform]) throw new ImportError(`--platform must be one of: ${Object.keys(PLATFORM_DIRS).join(", ")}`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug || "")) throw new ImportError(`--slug must be lowercase letters, numbers and hyphens (got "${slug}")`);
  const dir = PLATFORM_DIRS[platform];
  const webBase = `/images/${dir}/${slug}`;

  if (!/^---\r?\n/.test(markdown)) {
    throw new ImportError(
      'source has no YAML frontmatter. Add at least title, date ("YYYY-MM-DD"), description (20-300 chars) at the top between --- lines; the importer does not invent metadata.',
    );
  }
  const data = matter(markdown).data;
  if (data.platform !== undefined && data.platform !== platform) errors.push(`frontmatter platform "${data.platform}" does not match --platform ${platform}`);
  if (data.category !== undefined && data.category !== "writeup") errors.push(`frontmatter category "${data.category}" must be "writeup" for content/writeups/`);
  if (data.slug !== undefined && data.slug !== slug) errors.push(`frontmatter slug "${data.slug}" does not match --slug ${slug}`);

  // Rewrite image references (from the end so offsets stay valid).
  const copies = new Map(); // source abs path -> target filename
  const taken = new Map(); // target filename -> source abs path
  const edits = [];
  const byName = (name) => imageFiles.filter((f) => path.basename(f) === name);
  const byNameCi = (name) => imageFiles.filter((f) => path.basename(f).toLowerCase() === name.toLowerCase());

  for (const ref of findImageRefs(markdown)) {
    if (ref.kind === "reference") {
      errors.push(`reference-style image ${ref.raw} is not supported; convert it to ![alt](file.png) first`);
      continue;
    }
    if (!ref.url) {
      errors.push(`image tag without a readable src: ${ref.raw}`);
      continue;
    }
    let target = ref.url;
    let alt = ref.alt ?? "";
    if (ref.kind === "wikilink") {
      const [file, extra] = target.split("|");
      target = file.trim();
      alt = path.basename(target).replace(/\.[^.]+$/, "");
      if (extra) report.push(`wikilink size/alias "|${extra}" dropped from ${ref.raw}`);
    }
    if (/^(https?:|data:)/i.test(target)) continue; // remote images are left as-is
    if (target.startsWith(`${webBase}/`)) continue; // already in the final location

    let decoded;
    try {
      decoded = decodeURIComponent(target.split(/[?#]/)[0]);
    } catch {
      errors.push(`image "${target}" has invalid URL encoding`);
      continue;
    }
    const rel = decoded.replace(/^\/+/, "");
    let src = imageFiles.find((f) => path.relative(imagesDir, f).split(path.sep).join("/") === rel);
    if (!src) {
      const name = path.basename(rel);
      let hits = byName(name);
      if (hits.length === 0) {
        hits = byNameCi(name);
        if (hits.length === 1) report.push(`case-insensitive match: "${name}" -> "${path.basename(hits[0])}"`);
      }
      if (hits.length === 0) {
        errors.push(`image "${target}" referenced by ${ref.raw} was not found in ${imagesDir}`);
        continue;
      }
      if (hits.length > 1) {
        errors.push(`image "${name}" is ambiguous; matches: ${hits.map((h) => path.relative(imagesDir, h)).join(", ")}`);
        continue;
      }
      src = hits[0];
    }

    if (!copies.has(src)) {
      const ext = path.extname(src).toLowerCase();
      const base = slugify(path.basename(src, path.extname(src))) || `image-${copies.size + 1}`;
      const out = `${base}${ext}`;
      if (taken.has(out) && taken.get(out) !== src) {
        errors.push(`duplicate image filename: "${path.relative(imagesDir, src)}" and "${path.relative(imagesDir, taken.get(out))}" both become "${out}"`);
        continue;
      }
      taken.set(out, src);
      copies.set(src, out);
      if (path.basename(src) !== out) report.push(`rename: "${path.basename(src)}" -> "${out}"`);
    }
    const url = `${webBase}/${copies.get(src)}`;
    let replacement;
    if (ref.kind === "html") replacement = ref.raw.replace(/(\bsrc\s*=\s*)(["'])[^"']*\2/i, `$1$2${url}$2`);
    else replacement = `![${alt}](${url}${ref.title != null ? ` "${ref.title}"` : ""})`;
    if (replacement !== ref.raw) {
      edits.push({ start: ref.start, end: ref.end, replacement });
      report.push(`rewrite: ${ref.raw} -> ${replacement}`);
    }
  }
  if (errors.length) throw new ImportError(`Import failed:\n  - ${errors.join("\n  - ")}`);

  let out = markdown;
  for (const e of edits.sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + e.replacement + out.slice(e.end);
  out = setFrontmatterKey(out, "published", "false", report);
  if (data.platform === undefined) out = setFrontmatterKey(out, "platform", `"${platform}"`, report);
  if (data.category === undefined) out = setFrontmatterKey(out, "category", '"writeup"', report);

  const problems = validateFrontmatter(matter(out).data, `${slug}.md`);
  if (problems.length) throw new ImportError(`Frontmatter needs fixing in the source (nothing was invented):\n  - ${problems.join("\n  - ")}`);

  return {
    markdown: out,
    articlePath: path.join("content", "writeups", dir, `${slug}.md`),
    imageDir: path.join("public", "images", dir, slug),
    copies: [...copies].map(([from, name]) => ({ from, name })),
    report,
  };
}

/** Plan, check for collisions, then write. Nothing is written if any check fails. */
export function runImport({ root = process.cwd(), source, images, platform, slug, dryRun = false, overwrite = false }) {
  if (!source || !fs.existsSync(source)) throw new ImportError(`--source file not found: ${source}`);
  const imagesDir = images ? path.resolve(images) : path.dirname(path.resolve(source));
  if (!fs.existsSync(imagesDir)) throw new ImportError(`--images directory not found: ${imagesDir}`);
  const imageFiles = listFiles(imagesDir).filter((f) => /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(f));
  const plan = planImport({ markdown: fs.readFileSync(source, "utf8"), platform, slug, imagesDir, imageFiles });

  const errors = [];
  const articleAbs = path.join(root, plan.articlePath);
  const existing = loadPosts(path.join(root, "content"), path.join(root, "public"));
  const clash = existing.find((p) => p.slug === slug && path.join(root, "content", p.file) !== articleAbs);
  if (clash) errors.push(`slug "${slug}" is already used by content/${clash.file}`);
  if (fs.existsSync(articleAbs) && !overwrite) errors.push(`${plan.articlePath} already exists (pass --overwrite to replace it)`);
  for (const c of plan.copies) {
    const dest = path.join(root, plan.imageDir, c.name);
    if (fs.existsSync(dest) && !overwrite && !fs.readFileSync(dest).equals(fs.readFileSync(c.from)))
      errors.push(`${path.join(plan.imageDir, c.name)} already exists with different content (pass --overwrite to replace it)`);
  }
  if (errors.length) throw new ImportError(`Import failed:\n  - ${errors.join("\n  - ")}`);

  if (!dryRun) {
    fs.mkdirSync(path.dirname(articleAbs), { recursive: true });
    fs.mkdirSync(path.join(root, plan.imageDir), { recursive: true });
    for (const c of plan.copies) fs.copyFileSync(c.from, path.join(root, plan.imageDir, c.name));
    fs.writeFileSync(articleAbs, plan.markdown);
    const left = checkMarkdownImages(matter(plan.markdown).content, path.join(root, "public"), plan.articlePath);
    if (left.length) throw new ImportError(`Imported, but image validation still fails:\n  - ${left.join("\n  - ")}`);
  }
  return plan;
}

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--dry-run") a.dryRun = true;
    else if (k === "--overwrite") a.overwrite = true;
    else if (k.startsWith("--")) a[k.slice(2)] = argv[++i];
  }
  return a;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"))) {
  const a = parseArgs(process.argv.slice(2));
  try {
    const plan = runImport({ source: a.source, images: a.images, platform: a.platform, slug: a.slug, dryRun: a.dryRun, overwrite: a.overwrite });
    console.log(`${a.dryRun ? "[dry run] would write" : "Wrote"} ${plan.articlePath} and ${plan.copies.length} image(s) to ${plan.imageDir}`);
    console.log(plan.report.length ? `Changes:\n  - ${plan.report.join("\n  - ")}` : "No changes besides copying.");
    console.log("The article is a draft (published: false). Review it, then run: bun run content");
  } catch (e) {
    console.error(e instanceof ImportError ? e.message : e);
    process.exit(1);
  }
}
