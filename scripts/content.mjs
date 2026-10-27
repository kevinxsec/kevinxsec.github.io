// Content pipeline: Markdown files in content/ -> validated, rendered JSON + feeds.
// Plain ESM JavaScript so it runs in Node, Bun, Vite config and Vitest without a build step.
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeStringify from "rehype-stringify";
import rehypeShiki from "@shikijs/rehype";
import { visit } from "unist-util-visit";
import { toString as hastToString } from "hast-util-to-string";

export const SITE = JSON.parse(
  fs.readFileSync(new URL("../src/site.config.json", import.meta.url), "utf8"),
);

export const PLATFORMS = ["HTB", "THM", "OffSec", "None"];
export const CATEGORIES = {
  writeup: "Writeups",
  research: "Research",
  tutorial: "Tutorials",
  project: "Projects",
  notes: "Notes",
};
export const DIFFICULTIES = ["Easy", "Medium", "Hard", "Insane"];

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export class ContentError extends Error {}

export function slugify(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Validate frontmatter; returns a list of human-readable problems (empty = valid). */
export function validateFrontmatter(data, file = "<post>") {
  const errors = [];
  const req = (key, check, msg) => {
    if (data[key] === undefined || data[key] === null || data[key] === "") {
      errors.push(`${file}: missing required field "${key}"`);
    } else if (check && !check(data[key])) {
      errors.push(`${file}: field "${key}" ${msg}`);
    }
  };
  req("title", (v) => typeof v === "string" && v.length <= 140, "must be a string under 140 chars");
  req(
    "date",
    (v) => (v instanceof Date ? !isNaN(v) : typeof v === "string" && DATE_RE.test(v) && !isNaN(new Date(v))),
    'must be a valid date in "YYYY-MM-DD" format',
  );
  req(
    "description",
    (v) => typeof v === "string" && v.length >= 20 && v.length <= 300,
    "must be a string of 20-300 characters",
  );
  req("category", (v) => Object.hasOwn(CATEGORIES, v), `must be one of: ${Object.keys(CATEGORIES).join(", ")}`);
  if (data.platform !== undefined && !PLATFORMS.includes(data.platform))
    errors.push(`${file}: field "platform" must be one of: ${PLATFORMS.join(", ")}`);
  if (data.difficulty !== undefined && !DIFFICULTIES.includes(data.difficulty))
    errors.push(`${file}: field "difficulty" must be one of: ${DIFFICULTIES.join(", ")}`);
  if (data.tags !== undefined && !(Array.isArray(data.tags) && data.tags.every((t) => typeof t === "string" && t.trim())))
    errors.push(`${file}: field "tags" must be a list of non-empty strings`);
  if (data.published !== undefined && typeof data.published !== "boolean")
    errors.push(`${file}: field "published" must be true or false`);
  if (data.featured !== undefined && typeof data.featured !== "boolean")
    errors.push(`${file}: field "featured" must be true or false`);
  if (data.slug !== undefined && !(typeof data.slug === "string" && SLUG_RE.test(data.slug)))
    errors.push(`${file}: field "slug" must be lowercase letters, numbers and hyphens`);
  if (data.updated !== undefined && !(data.updated instanceof Date || DATE_RE.test(String(data.updated))))
    errors.push(`${file}: field "updated" must be "YYYY-MM-DD"`);
  return errors;
}

export function readingTime(text) {
  const words = text.replace(/```[\s\S]*?```/g, (m) => m.split(/\s+/).slice(0, 40).join(" ")).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

const toIso = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d));

// --- rehype plugins -------------------------------------------------------

const ALERTS = { NOTE: "Note", TIP: "Tip", IMPORTANT: "Important", WARNING: "Warning", CAUTION: "Caution" };

/** GitHub-style callouts: > [!NOTE] ... */
function rehypeCallouts() {
  return (tree) => {
    visit(tree, "element", (node) => {
      if (node.tagName !== "blockquote") return;
      const p = node.children.find((c) => c.type === "element");
      const first = p?.children?.[0];
      if (!p || p.tagName !== "p" || first?.type !== "text") return;
      const m = first.value.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/);
      if (!m) return;
      first.value = first.value.slice(m[0].length);
      const kind = m[1].toLowerCase();
      node.tagName = "aside";
      node.properties = { className: ["callout", `callout-${kind}`], role: "note" };
      node.children.unshift({
        type: "element",
        tagName: "p",
        properties: { className: ["callout-title"] },
        children: [{ type: "text", value: ALERTS[m[1]] }],
      });
    });
  };
}

/** Lazy images; a paragraph holding only an image becomes <figure> with the title as caption. */
function rehypeFigures() {
  return (tree) => {
    visit(tree, "element", (node, index, parent) => {
      if (node.tagName === "img") {
        node.properties.loading = "lazy";
        node.properties.decoding = "async";
      }
      if (node.tagName !== "p" || !parent) return;
      const kids = node.children.filter((c) => !(c.type === "text" && !c.value.trim()));
      if (kids.length !== 1 || kids[0].tagName !== "img") return;
      const img = kids[0];
      const caption = img.properties.title;
      delete img.properties.title;
      parent.children[index] = {
        type: "element",
        tagName: "figure",
        properties: {},
        children: [img, ...(caption ? [{ type: "element", tagName: "figcaption", properties: {}, children: [{ type: "text", value: caption }] }] : [])],
      };
    });
  };
}

/** Wrap code blocks with a header (language + copy button) and wrap tables for scrolling. */
function rehypeCodeChrome() {
  return (tree) => {
    visit(tree, "element", (node, index, parent) => {
      if (!parent || parent.properties?.className?.includes?.("code-block")) return;
      if (node.tagName === "table") {
        parent.children[index] = { type: "element", tagName: "div", properties: { className: ["table-wrap"] }, children: [node] };
        return "skip";
      }
      if (node.tagName !== "pre") return;
      const lang = node.properties?.dataLanguage || "text";
      parent.children[index] = {
        type: "element",
        tagName: "div",
        properties: { className: ["code-block"] },
        children: [
          {
            type: "element",
            tagName: "div",
            properties: { className: ["code-header"] },
            children: [
              { type: "element", tagName: "span", properties: { className: ["code-lang"] }, children: [{ type: "text", value: lang }] },
              { type: "element", tagName: "button", properties: { type: "button", className: ["copy-btn"], ariaLabel: "Copy code to clipboard", dataCopy: "" }, children: [{ type: "text", value: "Copy" }] },
            ],
          },
          node,
        ],
      };
      return "skip";
    });
  };
}

/** Tag Shiki <pre> with its language so the header can show it. */
const shikiLangTransformer = {
  pre(node) {
    node.properties.dataLanguage = this.options.lang;
  },
};

function collectToc(toc) {
  return () => (tree) => {
    visit(tree, "element", (node) => {
      if ((node.tagName === "h2" || node.tagName === "h3") && node.properties?.id) {
        toc.push({ depth: Number(node.tagName[1]), id: String(node.properties.id), text: hastToString(node).replace(/#$/, "").trim() });
      }
    });
  };
}

export async function renderMarkdown(markdown) {
  const toc = [];
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSlug)
    .use(collectToc(toc))
    .use(rehypeAutolinkHeadings, {
      behavior: "append",
      properties: { className: ["heading-anchor"], ariaLabel: "Link to this section" },
      content: { type: "text", value: "#" },
    })
    .use(rehypeShiki, {
      themes: { light: "github-light", dark: "github-dark-dimmed" },
      defaultColor: false,
      transformers: [shikiLangTransformer],
      fallbackLanguage: "text",
    })
    .use(rehypeCallouts)
    .use(rehypeFigures)
    .use(rehypeCodeChrome)
    .use(rehypeStringify)
    .process(markdown);
  return { html: String(file), toc };
}

function plainText(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_|\-[\]!]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.name.startsWith("_")) return []; // _template.md etc. are never published
    return e.isDirectory() ? walk(p) : /\.mdx?$/.test(e.name) ? [p] : [];
  });
}

// --- image references ------------------------------------------------------

/** Replace fenced and inline code with spaces (offsets preserved) so code samples are never scanned. */
export function maskCode(text) {
  let out = text.replace(/^( {0,3})(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:\n {0,3}\2[`~]*[ \t]*(?=\n|(?![\s\S]))|(?![\s\S]))/gm, (m) => m.replace(/[^\n]/g, " "));
  out = out.replace(/(`+)(?!`)[\s\S]*?[^`]\1(?!`)/g, (m) => m.replace(/[^\n]/g, " "));
  return out;
}

/** Every image reference in Markdown outside code: { kind, url, start, end, alt, title, raw }. */
export function findImageRefs(markdown) {
  const masked = maskCode(markdown);
  const refs = [];
  const at = (m, extra) => ({ start: m.index, end: m.index + m[0].length, raw: markdown.slice(m.index, m.index + m[0].length), ...extra });
  for (const m of masked.matchAll(/!\[\[([^\]\n]+)\]\]/g)) refs.push(at(m, { kind: "wikilink", url: markdown.slice(m.index + 3, m.index + 3 + m[1].length) }));
  for (const m of masked.matchAll(/!\[([^\]\n]*)\]\(\s*(<[^>\n]+>|[^)\s]+)(\s+"[^"\n]*")?\s*\)/g)) {
    const r = at(m, {});
    const inner = r.raw.match(/^!\[([^\]]*)\]\(\s*(<[^>]+>|[^)\s]+)(\s+"([^"]*)")?\s*\)$/);
    const url = inner[2].startsWith("<") ? inner[2].slice(1, -1) : inner[2];
    refs.push({ ...r, kind: "markdown", url, alt: inner[1], title: inner[4] ?? null });
  }
  for (const m of masked.matchAll(/!\[([^\]\n]*)\]\[([^\]\n]*)\]/g)) refs.push(at(m, { kind: "reference", url: null }));
  for (const m of masked.matchAll(/<img\b[^>]*>/gi)) {
    const r = at(m, {});
    const src = r.raw.match(/\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
    refs.push({ ...r, kind: "html", url: src ? (src[1] ?? src[2]) : null });
  }
  return refs.sort((a, b) => a.start - b.start);
}

/** Find a file by exact path segments; reports case mismatches even on case-insensitive filesystems. */
export function resolveExactCase(baseDir, relPath) {
  let dir = baseDir;
  const segs = relPath.split("/").filter(Boolean);
  for (const [i, seg] of segs.entries()) {
    let entries;
    try {
      entries = fs.readdirSync(dir);
    } catch {
      return { ok: false, reason: "missing" };
    }
    if (!entries.includes(seg)) {
      const near = entries.find((e) => e.toLowerCase() === seg.toLowerCase());
      return near ? { ok: false, reason: "case", expected: [...segs.slice(0, i), near].join("/") } : { ok: false, reason: "missing" };
    }
    dir = path.join(dir, seg);
  }
  return fs.statSync(dir).isFile() ? { ok: true } : { ok: false, reason: "missing" };
}

/** Validate one image URL against a directory of static files. Returns a problem string or null. */
export function checkImageUrl(url, baseDir, label = "public/") {
  if (/^https?:\/\//i.test(url) || /^data:image\//i.test(url)) return null;
  if (url.startsWith("//")) return `image "${url}" uses a protocol-relative URL; use https:// or a /images/... path`;
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return `image "${url}" uses an unsupported scheme or a local disk path; use /images/...`;
  if (!url.startsWith("/")) return `image "${url}" is a relative path; local images must start with /images/...`;
  const clean = url.split(/[?#]/)[0];
  let decoded;
  try {
    decoded = decodeURIComponent(clean);
  } catch {
    return `image "${url}" has invalid URL encoding`;
  }
  if (decoded.includes("\\") || decoded.split("/").some((s) => s === ".." || s === ".")) return `image "${url}" contains backslashes or ./.. segments`;
  const r = resolveExactCase(baseDir, decoded);
  if (r.ok) return null;
  if (r.reason === "case") return `image "${url}" has wrong capitalisation; the file on disk is "/${r.expected}..." (GitHub Pages is case-sensitive)`;
  return `image "${url}" not found in ${label} (expected ${path.join(label, decoded)})`;
}

/** All image problems in a Markdown body, one message per problem. */
export function checkMarkdownImages(markdown, publicDir, rel = "<post>") {
  const problems = [];
  for (const r of findImageRefs(markdown)) {
    if (r.kind === "wikilink") problems.push(`${rel}: Obsidian image link "${r.raw}" is not supported; use ![alt](/images/...) (scripts/import-writeup.mjs converts these)`);
    else if (r.kind === "reference") problems.push(`${rel}: reference-style image "${r.raw}" is not supported; use ![alt](/images/...)`);
    else if (r.url === null || r.url === "") problems.push(`${rel}: image tag without a readable src: ${r.raw}`);
    else {
      const p = checkImageUrl(r.url, publicDir);
      if (p) problems.push(`${rel}: ${p}`);
    }
  }
  return problems;
}

/** Local <img src> references in built HTML that don't exist (exact case) in the output dir. */
export function checkHtmlImages(html, outDir) {
  const problems = [];
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const src = m[0].match(/\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
    if (!src) {
      problems.push(`<img> without src: ${m[0].slice(0, 120)}`);
      continue;
    }
    const url = (src[1] ?? src[2]).replace(/&amp;/g, "&");
    const p = checkImageUrl(url, outDir, "build output");
    if (p) problems.push(p);
  }
  return problems;
}

/** Parse + validate every post. Throws ContentError listing every problem found. */
export function loadPosts(contentDir, publicDir = path.join(contentDir, "../public")) {
  const errors = [];
  const posts = [];
  for (const file of walk(contentDir)) {
    const rel = path.relative(contentDir, file);
    let parsed;
    try {
      parsed = matter(fs.readFileSync(file, "utf8"));
    } catch (e) {
      errors.push(`${rel}: invalid YAML frontmatter (${e.message})`);
      continue;
    }
    const problems = validateFrontmatter(parsed.data, rel);
    if (problems.length) {
      errors.push(...problems);
      continue;
    }
    const d = parsed.data;
    // Local images must exist (with exact filename case) so a typo never ships a broken screenshot.
    const imageProblems = checkMarkdownImages(parsed.content, publicDir, rel);
    if (d.cover) {
      const p = checkImageUrl(d.cover, publicDir);
      if (p) imageProblems.push(`${rel}: cover ${p}`);
    }
    if (imageProblems.length) {
      errors.push(...imageProblems);
      continue;
    }
    posts.push({
      file: rel,
      slug: d.slug || slugify(path.basename(file).replace(/\.mdx?$/, "")),
      title: d.title,
      date: toIso(d.date),
      updated: d.updated ? toIso(d.updated) : null,
      description: d.description,
      category: d.category,
      platform: d.platform && d.platform !== "None" ? d.platform : null,
      difficulty: d.difficulty || null,
      // The platform doubles as a tag so /tags/htb, /tags/thm, /tags/offsec just work.
      tags: [...new Set([...(d.tags || []), ...(d.platform && d.platform !== "None" ? [d.platform] : [])].map(slugify))],
      featured: d.featured === true,
      published: d.published !== false,
      cover: d.cover || null,
      body: parsed.content,
    });
  }
  const seen = new Map();
  for (const p of posts) {
    if (seen.has(p.slug)) errors.push(`Duplicate slug "${p.slug}" in ${seen.get(p.slug)} and ${p.file}`);
    else seen.set(p.slug, p.file);
  }
  if (errors.length) throw new ContentError(`Content validation failed:\n  - ${errors.join("\n  - ")}`);
  return posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.title.localeCompare(b.title)));
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function related(post, all) {
  return all
    .filter((p) => p.slug !== post.slug)
    .map((p) => ({
      p,
      score: p.tags.filter((t) => post.tags.includes(t)).length * 2 + (p.category === post.category ? 1 : 0) + (p.platform && p.platform === post.platform ? 1 : 0),
    }))
    .filter((x) => x.score > 1)
    .sort((a, b) => b.score - a.score || (a.p.date < b.p.date ? 1 : -1))
    .slice(0, 3)
    .map((x) => x.p.slug);
}

/** Static (non-post) paths that are always prerendered. */
export const STATIC_PATHS = ["/", "/blog", "/about", "/search", "/categories", "/tags", "/404"];
export const PAGE_SIZE = 10;

export function sitePaths(posts) {
  const pages = Math.ceil(posts.length / PAGE_SIZE);
  const tags = [...new Set(posts.flatMap((p) => p.tags))];
  const cats = [...new Set(posts.map((p) => p.category))];
  return [
    ...STATIC_PATHS,
    ...Array.from({ length: Math.max(0, pages - 1) }, (_, i) => `/blog/page/${i + 2}`),
    ...posts.map((p) => `/blog/${p.slug}`),
    ...cats.map((c) => `/categories/${c}`),
    ...tags.map((t) => `/tags/${t}`),
  ];
}

/** Full build: validate, render, write src/generated/* and public feeds. Returns published posts. */
export async function buildContent(root = process.cwd(), { log = true } = {}) {
  const all = loadPosts(path.join(root, "content"), path.join(root, "public"));
  const posts = all.filter((p) => p.published);
  const genDir = path.join(root, "src/generated");
  const postDir = path.join(genDir, "posts");
  fs.rmSync(postDir, { recursive: true, force: true });
  fs.mkdirSync(postDir, { recursive: true });

  const index = [];
  const search = [];
  for (const [i, p] of posts.entries()) {
    const { html, toc } = await renderMarkdown(p.body);
    const text = plainText(p.body);
    const meta = {
      slug: p.slug, title: p.title, date: p.date, updated: p.updated, description: p.description,
      category: p.category, platform: p.platform, difficulty: p.difficulty, tags: p.tags,
      featured: p.featured, cover: p.cover, readingTime: readingTime(p.body),
    };
    index.push(meta);
    search.push({ id: p.slug, title: p.title, description: p.description, category: CATEGORIES[p.category], platform: p.platform || "", tags: p.tags.join(" "), date: p.date, text });
    const prev = posts[i + 1];
    const next = posts[i - 1];
    fs.writeFileSync(
      path.join(postDir, `${p.slug}.json`),
      JSON.stringify({
        ...meta, html, toc,
        prev: prev ? { slug: prev.slug, title: prev.title } : null,
        next: next ? { slug: next.slug, title: next.title } : null,
        related: related(p, posts),
      }),
    );
  }
  fs.writeFileSync(path.join(genDir, "index.json"), JSON.stringify(index, null, 2) + "\n");

  const pub = path.join(root, "public");
  fs.writeFileSync(path.join(pub, "search-index.json"), JSON.stringify(search));

  const rssItems = posts.slice(0, 30).map((p) =>
    `    <item>\n      <title>${esc(p.title)}</title>\n      <link>${SITE.url}/blog/${p.slug}/</link>\n      <guid isPermaLink="true">${SITE.url}/blog/${p.slug}/</guid>\n      <pubDate>${new Date(p.date + "T00:00:00Z").toUTCString()}</pubDate>\n      <description>${esc(p.description)}</description>\n${[CATEGORIES[p.category], ...p.tags].map((c) => `      <category>${esc(c)}</category>`).join("\n")}\n    </item>`,
  );
  fs.writeFileSync(
    path.join(pub, "rss.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n  <channel>\n    <title>${esc(SITE.title)}</title>\n    <link>${SITE.url}/</link>\n    <description>${esc(SITE.description)}</description>\n    <language>en</language>\n    <atom:link href="${SITE.url}/rss.xml" rel="self" type="application/rss+xml"/>\n${posts[0] ? `    <lastBuildDate>${new Date(posts[0].date + "T00:00:00Z").toUTCString()}</lastBuildDate>\n` : ""}${rssItems.join("\n")}\n  </channel>\n</rss>\n`,
  );

  const lastmod = Object.fromEntries(posts.map((p) => [`/blog/${p.slug}`, p.updated || p.date]));
  const urls = sitePaths(posts).filter((u) => u !== "/404");
  fs.writeFileSync(
    path.join(pub, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
      .map((u) => `  <url><loc>${SITE.url}${u === "/" ? "/" : u + "/"}</loc>${lastmod[u] ? `<lastmod>${lastmod[u]}</lastmod>` : ""}</url>`)
      .join("\n")}\n</urlset>\n`,
  );

  if (log) console.log(`[content] ${posts.length} published, ${all.length - posts.length} draft(s) excluded`);
  return posts;
}

// CLI: node scripts/content.mjs
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  buildContent().catch((e) => {
    console.error(e instanceof ContentError ? e.message : e);
    process.exit(1);
  });
}
