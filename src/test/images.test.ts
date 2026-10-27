// @vitest-environment node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { checkHtmlImages, checkMarkdownImages, loadPosts } from "../../scripts/content.mjs";
import { ImportError, planImport, runImport } from "../../scripts/import-writeup.mjs";

function tmp(files: Record<string, string>) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "img-"));
  for (const [name, body] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    fs.writeFileSync(path.join(dir, name), body);
  }
  return dir;
}
const FM = '---\ntitle: "Box"\ndate: "2026-01-01"\ndescription: "Twenty characters minimum here."\n';

describe("image validation", () => {
  const pub = tmp({ "images/htb/box/nmap scan.png": "x", "images/htb/box/Shot.png": "x" });
  const check = (md: string) => checkMarkdownImages(md, pub, "a.md").join("\n");

  it("fails on a missing image", () => {
    expect(check("![a](/images/htb/box/nope.png)")).toMatch(/not found/);
  });
  it("flags wrong capitalisation regardless of filesystem", () => {
    expect(check("![a](/images/htb/box/shot.png)")).toMatch(/wrong capitalisation.*Shot\.png/);
    expect(check("![a](/images/HTB/box/Shot.png)")).toMatch(/wrong capitalisation/);
  });
  it("decodes URL-encoded names and accepts <angle> paths with spaces", () => {
    expect(check("![a](/images/htb/box/nmap%20scan.png)")).toBe("");
    expect(check("![a](</images/htb/box/nmap scan.png>)")).toBe("");
    expect(check("![a](/images/htb/box/bad%ZZ.png)")).toMatch(/invalid URL encoding/);
  });
  it("accepts standard Markdown and HTML images, checks HTML src too", () => {
    expect(check('![a](/images/htb/box/Shot.png "cap")\n<img src="/images/htb/box/Shot.png" alt="x">')).toBe("");
    expect(check('<img src="/images/htb/box/gone.png">')).toMatch(/not found/);
    expect(check("<img alt=x>")).toMatch(/without a readable src/);
  });
  it("rejects Obsidian wikilinks, relative, reference-style and disk paths", () => {
    expect(check("![[Shot.png]]")).toMatch(/Obsidian image link/);
    expect(check("![a](Shot.png)")).toMatch(/relative path/);
    expect(check("![a][ref]")).toMatch(/reference-style/);
    expect(check("![a](C:/Users/me/Shot.png)")).toMatch(/unsupported scheme/);
    expect(check("![a](/images/../secret.png)")).toMatch(/\.\. segments/);
  });
  it("ignores image syntax inside code blocks and inline code", () => {
    expect(check("```md\n![[x.png]]\n![a](nope.png)\n```\n`![[y.png]]`")).toBe("");
  });
  it("checks built HTML against the output directory", () => {
    const out = tmp({ "images/a.png": "x" });
    expect(checkHtmlImages('<img src="/images/a.png"><img src="https://x.io/b.png">', out)).toEqual([]);
    expect(checkHtmlImages('<img src="/images/A.png">', out).join()).toMatch(/capitalisation/);
    expect(checkHtmlImages('<img loading="lazy" src="/images/missing.png">', out).join()).toMatch(/not found in build output/);
  });
});

describe("import helper", () => {
  const src = (body: string, extra = "") => `${FM}${extra}---\n${body}`;
  const files = (dir: string) => fs.readdirSync(dir).map((f) => path.join(dir, f));

  it("rewrites only image refs, preserves text/code/order, renames predictably, forces draft", () => {
    const shots = tmp({ "Nmap Scan.PNG": "1", "root flag.png": "2" });
    const body = [
      "## Enum",
      "```console\n$ nmap -p- 10.10.10.10\n![[not-an-image.png]]\n```",
      "![[Nmap Scan.PNG|400]]",
      "flag: HTB{example}",
      "![root](root%20flag.png \"Root\")",
    ].join("\n\n");
    const plan = planImport({ markdown: src(body, "published: true\n"), platform: "HTB", slug: "box", imagesDir: shots, imageFiles: files(shots) });
    expect(plan.articlePath).toBe(path.join("content", "writeups", "htb", "box.md"));
    expect(plan.copies.map((c) => c.name).sort()).toEqual(["nmap-scan.png", "root-flag.png"]);
    const expected = body
      .replace("![[Nmap Scan.PNG|400]]", "![Nmap Scan](/images/htb/box/nmap-scan.png)")
      .replace('![root](root%20flag.png "Root")', '![root](/images/htb/box/root-flag.png "Root")');
    expect(plan.markdown.split("\n---\n")[1]).toBe(expected);
    expect(plan.markdown).toMatch(/^published: false$/m);
    expect(plan.markdown).toMatch(/^platform: "HTB"$/m);
    expect(plan.report.join("\n")).toMatch(/rename: "Nmap Scan.PNG" -> "nmap-scan.png"/);
  });
  it("fails on missing attachments and duplicate target filenames", () => {
    const shots = tmp({ "a/Shot.png": "1", "b/shot.png": "2" });
    expect(() => planImport({ markdown: src("![[gone.png]]"), platform: "HTB", slug: "box", imagesDir: shots, imageFiles: files(shots) })).toThrow(/not found/);
    const all = [path.join(shots, "a/Shot.png"), path.join(shots, "b/shot.png")];
    expect(() => planImport({ markdown: src("![](a/Shot.png)\n![](b/shot.png)"), platform: "HTB", slug: "box", imagesDir: shots, imageFiles: all })).toThrow(/duplicate image filename/);
  });
  it("never invents missing metadata", () => {
    expect(() => planImport({ markdown: "no frontmatter", platform: "THM", slug: "room", imagesDir: "/", imageFiles: [] })).toThrow(ImportError);
    expect(() => planImport({ markdown: '---\ntitle: "x"\n---\nbody', platform: "THM", slug: "room", imagesDir: "/", imageFiles: [] })).toThrow(/date/);
  });
  it("writes a draft, never overwrites silently, rejects duplicate slugs, leaves source untouched", () => {
    const root = tmp({ "content/notes/taken.md": src("x", 'category: "notes"\n'), "public/.keep": "" });
    const shots = tmp({ "s.png": "1" });
    const source = path.join(shots, "note.md");
    const original = src("![[s.png]]");
    fs.writeFileSync(source, original);
    runImport({ root, source, platform: "OffSec", slug: "lab" });
    expect(fs.readFileSync(source, "utf8")).toBe(original);
    expect(fs.existsSync(path.join(root, "public/images/offsec/lab/s.png"))).toBe(true);
    const posts = loadPosts(path.join(root, "content"), path.join(root, "public"));
    expect(posts.find((p) => p.slug === "lab")?.published).toBe(false);
    const before = fs.readFileSync(path.join(root, "content/writeups/offsec/lab.md"), "utf8");
    fs.writeFileSync(path.join(root, "content/writeups/offsec/lab.md"), before + "\nmy edits");
    expect(() => runImport({ root, source, platform: "OffSec", slug: "lab" })).toThrow(/already exists/);
    expect(fs.readFileSync(path.join(root, "content/writeups/offsec/lab.md"), "utf8")).toContain("my edits");
    expect(() => runImport({ root, source, platform: "OffSec", slug: "taken" })).toThrow(/already used/);
  });
});
