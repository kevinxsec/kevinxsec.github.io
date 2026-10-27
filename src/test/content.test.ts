// @vitest-environment node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  ContentError,
  loadPosts,
  readingTime,
  renderMarkdown,
  sitePaths,
  validateFrontmatter,
} from "../../scripts/content.mjs";

const valid = {
  title: "Example",
  date: "2026-10-27",
  description: "A concise summary of the article for testing.",
  category: "writeup",
};

function tmpContent(files: Record<string, string>) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "content-"));
  fs.mkdirSync(path.join(dir, "content"), { recursive: true });
  fs.mkdirSync(path.join(dir, "public"), { recursive: true });
  for (const [name, body] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, "content", name)), { recursive: true });
    fs.writeFileSync(path.join(dir, "content", name), body);
  }
  return dir;
}

const fm = (extra: string) =>
  `---\ntitle: "T"\ndate: "2026-01-01"\ndescription: "Twenty characters minimum here."\ncategory: "notes"\n${extra}---\nBody\n`;

describe("frontmatter schema", () => {
  it("accepts a valid post", () => {
    expect(validateFrontmatter(valid)).toEqual([]);
  });
  it.each(["title", "date", "description", "category"])("requires %s", (key) => {
    const data: Record<string, unknown> = { ...valid };
    delete data[key];
    expect(validateFrontmatter(data, "x.md").join()).toContain(`missing required field "${key}"`);
  });
  it("rejects malformed dates, unknown categories, platforms and difficulties", () => {
    const errs = validateFrontmatter(
      {
        ...valid,
        date: "27/10/2026",
        category: "walkthrough",
        platform: "HackerOne",
        difficulty: "Trivial",
      },
      "x.md",
    ).join("\n");
    expect(errs).toContain('"date"');
    expect(errs).toContain('"category"');
    expect(errs).toContain('"platform"');
    expect(errs).toContain('"difficulty"');
  });
  it("rejects a non-boolean published flag", () => {
    expect(validateFrontmatter({ ...valid, published: "no" }).length).toBe(1);
  });
});

describe("loading posts", () => {
  it("fails on duplicate slugs", () => {
    const dir = tmpContent({ "a/same.md": fm(""), "b/same.md": fm("") });
    expect(() => loadPosts(path.join(dir, "content"))).toThrow(/Duplicate slug "same"/);
  });
  it("fails on an explicit slug colliding with a filename", () => {
    const dir = tmpContent({ "one.md": fm(""), "two.md": fm('slug: "one"\n') });
    expect(() => loadPosts(path.join(dir, "content"))).toThrow(ContentError);
  });
  it("fails when a referenced local image is missing", () => {
    const dir = tmpContent({ "img.md": fm("") + "\n![alt](/images/nope.png)\n" });
    expect(() => loadPosts(path.join(dir, "content"))).toThrow(
      /image "\/images\/nope.png" not found/,
    );
  });
  it("ignores underscore files and marks drafts", () => {
    const dir = tmpContent({
      "_template.md": "not even frontmatter",
      "draft.md": fm("published: false\n"),
      "live.md": fm(""),
    });
    const posts = loadPosts(path.join(dir, "content"));
    expect(posts.map((p) => [p.slug, p.published])).toEqual(
      expect.arrayContaining([
        ["draft", false],
        ["live", true],
      ]),
    );
    expect(posts).toHaveLength(2);
  });
  it("adds the platform as a tag", () => {
    const dir = tmpContent({ "box.md": fm('platform: "HTB"\ntags: [Linux]\n') });
    expect(loadPosts(path.join(dir, "content"))[0]?.tags).toEqual(["linux", "htb"]);
  });
});

describe("real content", () => {
  const root = path.resolve(__dirname, "../..");
  const all = loadPosts(path.join(root, "content"), path.join(root, "public"));

  it("validates every article in content/", () => {
    expect(all.length).toBeGreaterThan(0);
  });
  it("keeps drafts out of generated pages and the search index", () => {
    const drafts = all.filter((p) => !p.published);
    const published = all.filter((p) => p.published);
    const paths = sitePaths(published);
    const index = fs.readFileSync(path.join(root, "public/search-index.json"), "utf8");
    for (const d of drafts) {
      expect(paths).not.toContain(`/blog/${d.slug}`);
      expect(index).not.toContain(d.slug);
    }
  });
});

describe("markdown rendering", () => {
  it("adds anchors, toc, copy buttons, callouts, figures and table wrappers", async () => {
    const { html, toc } = await renderMarkdown(
      [
        "## Setup Steps",
        "```bash\necho hi\n```",
        "> [!WARNING]\n> Careful",
        '![Alt text](/x.png "Caption")',
        "| a | b |\n|---|---|\n| 1 | 2 |",
      ].join("\n\n"),
    );
    expect(toc).toEqual([{ depth: 2, id: "setup-steps", text: "Setup Steps" }]);
    expect(html).toContain('href="#setup-steps"');
    expect(html).toContain("data-copy");
    expect(html).toContain('class="code-lang">bash');
    expect(html).toContain("callout-warning");
    expect(html).toContain("<figcaption>Caption</figcaption>");
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('class="table-wrap"');
  }, 30_000);
  it("estimates reading time at about 220 words per minute", () => {
    expect(readingTime("word ".repeat(660))).toBe(3);
    expect(readingTime("short")).toBe(1);
  });
});
