// Turns the Vite/TanStack build output into a GitHub Pages site and verifies it.
// Usage: node scripts/finalize-static.mjs   (run after `vite build`)
import fs from "node:fs";
import path from "node:path";

import { checkHtmlImages, loadPosts, sitePaths } from "./content.mjs";

const root = process.cwd();
// TanStack/Nitro output can vary by build configuration. Use the freshest available output.
const candidates = ["dist/client", ".output/public"]
  .map((d) => path.join(root, d))
  .filter((d) => fs.existsSync(path.join(d, "index.html")))
  .sort((a, b) => fs.statSync(path.join(b, "index.html")).mtimeMs - fs.statSync(path.join(a, "index.html")).mtimeMs);
const out = candidates[0];
const problems = [];
const fail = (msg) => problems.push(msg);

if (!out) {
  console.error(`[pages] No index.html in dist/client or .output/public. Run "vite build" first.`);
  process.exit(1);
}
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `dir=${path.relative(root, out)}\n`);

// GitHub Pages: serve 404.html for unknown URLs, and skip Jekyll processing.
fs.copyFileSync(path.join(out, "404/index.html"), path.join(out, "404.html"));
fs.writeFileSync(path.join(out, ".nojekyll"), "");
fs.rmSync(path.join(out, "_headers"), { force: true }); // Cloudflare-only file

const all = loadPosts(path.join(root, "content"), path.join(root, "public"));
const published = all.filter((p) => p.published);
const drafts = all.filter((p) => !p.published);

for (const route of sitePaths(published)) {
  const file = path.join(out, route, "index.html");
  if (!fs.existsSync(file)) fail(`missing static page for ${route} (${path.relative(root, file)})`);
  else if (fs.statSync(file).size < 500) fail(`suspiciously small page for ${route}`);
}
for (const p of published) {
  const html = fs.readFileSync(path.join(out, "blog", p.slug, "index.html"), "utf8");
  const title = p.title.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  if (!html.includes(title)) fail(`/blog/${p.slug}: title not found in prerendered HTML`);
  if (!html.includes(`rel="canonical"`)) fail(`/blog/${p.slug}: missing canonical link`);
  for (const problem of checkHtmlImages(html, out)) fail(`/blog/${p.slug}: ${problem}`);
}

for (const f of ["404.html", "rss.xml", "sitemap.xml", "search-index.json", "robots.txt", ".nojekyll"]) {
  if (!fs.existsSync(path.join(out, f))) fail(`missing ${f}`);
}

// Drafts must not leak anywhere in the output.
const walk = (d) =>
  fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const textFiles = walk(out).filter((f) => /\.(html|xml|json|js)$/.test(f));
for (const d of drafts) {
  if (fs.existsSync(path.join(out, "blog", d.slug))) fail(`draft "${d.slug}" has a page`);
  for (const f of textFiles) {
    if (fs.readFileSync(f, "utf8").includes(d.slug)) fail(`draft "${d.slug}" referenced in ${path.relative(out, f)}`);
  }
}

if (problems.length) {
  console.error(`[pages] Build verification failed:\n  - ${problems.join("\n  - ")}`);
  process.exit(1);
}
console.log(`[pages] OK: ${sitePaths(published).length} pages, ${drafts.length} draft(s) excluded. Output: ${path.relative(root, out)}`);
