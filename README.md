# kevinxsec

Personal cybersecurity blog: lab writeups (HTB, TryHackMe, OffSec), security research,
tutorials, projects and notes. A fully static site deployed free to GitHub Pages at
**https://kevinxsec.github.io/**.

- Markdown files in `content/` are the only source of truth for articles.
- Every page (each article, category, tag, archive page, About, Search, 404) is prerendered to real HTML.
- No database, backend, accounts, comments, analytics or third-party scripts. Fonts are self-hosted.

## Stack

React 19 + TypeScript, TanStack Start (prerendering every route to static HTML), Vite,
Tailwind CSS v4. Markdown is processed at build time with unified/remark/rehype and Shiki
(syntax highlighting with light and dark themes, no runtime highlighter). Search uses
MiniSearch over a generated JSON index.

## Quick start

Requires [Bun](https://bun.sh) (or Node 22+ with npm).

```sh
bun install
bun run dev            # http://localhost:8080, content reloads when you edit content/
```

| Command               | What it does                                                           |
| --------------------- | ---------------------------------------------------------------------- |
| `bun run content`     | Validate all articles and regenerate data, RSS, sitemap, search index |
| `bun run test`        | Schema, duplicate slug, draft, Markdown rendering and route tests      |
| `bun run build:pages` | Production build to `dist/client` + GitHub Pages fix-ups + verification |
| `bun run verify`      | Re-run output verification on an existing build                        |
| `bun run preview:pages` | Serve `dist/client` locally, exactly as GitHub Pages will           |
| `bun run check`       | Everything above in order (what CI runs)                               |
| `bun run lint`        | ESLint                                                                 |

## Writing an article

1. Copy `content/_template.md` to a folder, e.g. `content/writeups/htb-machine-name.md`.
   Folders are only for your own organisation; the filename becomes the URL
   (`/blog/htb-machine-name/`) unless you set `slug:`.
2. Fill in the frontmatter:

   ```yaml
   ---
   title: "Machine Name Writeup"        # required
   date: "2026-10-27"                   # required, YYYY-MM-DD
   description: "20-300 character summary used in lists, search and link previews."
   category: "writeup"                  # required: writeup | research | tutorial | project | notes
   platform: "HTB"                      # optional: HTB | THM | OffSec | None  (also added as a tag)
   difficulty: "Medium"                 # optional: Easy | Medium | Hard | Insane
   tags: [linux, privilege-escalation]  # optional
   featured: false                      # optional, shows on the homepage
   published: true                      # false = draft, never built or indexed
   updated: "2026-11-02"                # optional
   ---
   ```

3. Write Markdown. Supported: GFM tables, task lists, fenced code with any Shiki language
   (`console`/`text` for terminal output), images with captions, links, blockquotes, and
   callouts:

   ```md
   > [!TIP]
   > NOTE, TIP, IMPORTANT, WARNING and CAUTION are available.

   ![Alt text describing the screenshot](/images/htb-machine-name/nmap.png "Optional caption")
   ```

4. Run `bun run content`. Invalid frontmatter, duplicate slugs and missing images fail
   with a message naming the file and field.
5. Commit and push. CI builds and deploys.

Every `##`/`###` heading gets an anchor link and a table-of-contents entry. Reading time,
previous/next links, related articles (by shared tags, category and platform), category and
tag pages, the RSS feed, the sitemap and the search index are all generated automatically.

### Drafts

`published: false` posts are skipped entirely: no page, no feed entry, no sitemap entry, no
search entry. `bun run build:pages` fails if a draft's slug appears anywhere in the output.
Files starting with `_` (like the template) are ignored.

### Images

Walkthroughs use one folder per platform and machine:

```text
content/writeups/htb/<machine>.md      public/images/htb/<machine>/
content/writeups/thm/<room>.md         public/images/thm/<room>/
content/writeups/offsec/<lab>.md       public/images/offsec/<lab>/
```

Other articles can keep `public/images/<article-slug>/`. Use lowercase, hyphenated filenames
(`nmap-scan.png`) and reference them from the site root:

```md
![Nmap scan](/images/htb/lantern/nmap-scan.png "Optional caption")
<img src="/images/htb/lantern/nmap-scan.png" alt="Nmap scan" width="600">
```

`bun run content` fails (naming the file) on: missing images, wrong capitalisation (GitHub
Pages is case-sensitive even if Windows is not), relative paths, Windows disk paths,
`../` segments, invalid `%` encoding, reference-style images and Obsidian `![[...]]` links.
Spaces must be written as `%20` or wrapped in `<...>`. Image syntax inside code blocks is
ignored. `bun run build:pages` re-checks every `<img>` in the built article pages against
the output folder.

Recommendations: crop to what matters, export as WebP or PNG around 1600 px wide, keep files
under ~300 KB. Redact IPs, flags and credentials where platform rules require it.

### Importing a writeup (Obsidian or plain Markdown)

```bash
node scripts/import-writeup.mjs --source "C:\notes\Lantern.md" --images "C:\notes\attachments" --platform HTB --slug lantern --dry-run
```

Drop `--dry-run` to write. The importer:

- needs `title`, `date` and `description` in the source frontmatter (it never invents them);
  `category: "writeup"` and `platform` are added if absent, and `published` is always set to `false`;
- copies referenced screenshots (found by path or filename under `--images`) to
  `public/images/<platform>/<slug>/`, renaming them to lowercase-hyphen names;
- rewrites only image references (`![[x.png|400]]`, `![a](x.png)`, `<img src>`); all other text,
  code and ordering stay byte-for-byte identical; image syntax in code blocks is untouched;
- prints a report of every rename, rewrite and frontmatter change;
- stops without writing anything on missing or ambiguous attachments, duplicate image names,
  slugs already in use, or existing files (`--overwrite` is the explicit confirmation to replace);
- never modifies the source files.

Review the draft, set `published: true`, run `bun run content`, then commit.

## Personal details

Site name, intro text, GitHub link and URL live in `src/site.config.json`. The About page is
`src/routes/about.tsx` and contains clearly marked placeholders for you to replace. The
sample articles are tagged `sample` and labelled as sample content; delete them when you
have your own.

## Project layout

```text
content/                 Markdown articles (source of truth); _template.md
public/images/           Article images, one folder per article
public/                  favicon, robots.txt; build writes rss.xml, sitemap.xml, search-index.json
scripts/content.mjs      Frontmatter validation + Markdown rendering + feeds
scripts/finalize-static.mjs  404.html, .nojekyll, and output verification
src/generated/           Generated article data (rebuilt from content/, do not edit)
src/routes/              Pages (file-based routing)
src/components/          Header/footer, post lists, filters, 404
src/lib/posts.ts         Data access and SEO helpers
src/styles.css           Design tokens, light/dark themes, article typography
src/test/                Vitest tests
.github/workflows/deploy.yml  CI + GitHub Pages deploy
```

## Deploying to GitHub Pages

This project has **not** been pushed or deployed anywhere. When you are ready:

1. Push this project to
   `kevinxsec/kevinxsec.github.io` on the `main` branch. Review the diff first if the
   repository already has content you want to keep.
2. In the repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Push to `main`. The workflow validates content, runs tests, builds, verifies the output and
   deploys `dist/client`. Pull requests run the same checks without deploying.

Because this is a user site (`<user>.github.io`), the site lives at the domain root and no
base path is needed. If you ever move it to a project repository (`/repo-name/`), the router
`basepath`, Vite `base`, and absolute `/images/...` references would need updating.

URLs end with a trailing slash (`/blog/slug/`) because GitHub Pages serves each page as a
directory `index.html`; canonical URLs, the sitemap and the RSS feed use the same form.

## Updating dependencies

`bun outdated`, then `bun update`, then `bun run check`. Shiki themes and languages, the
unified/rehype plugins, and MiniSearch are the content-critical dependencies; the tests
cover their output.
