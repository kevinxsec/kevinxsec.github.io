# Project rules

- Fully static site for GitHub Pages: every route is prerendered (vite.config.ts `pages` from `sitePaths`); never add server functions, API routes or runtime backends — Pages cannot run them.
- Articles live only in `content/**/*.md`; `scripts/content.mjs` validates and renders them into `src/generated/` and `public/{rss.xml,sitemap.xml,search-index.json}` — never hand-edit generated files or hardcode posts in components.
- New list/archive routes must be added to `sitePaths` in `scripts/content.mjs` so they get static HTML and a sitemap entry.
- Router uses `trailingSlash: "always"` to match GitHub Pages directory URLs; Link `to` values end with `/`.
- `scripts/content.mjs` is plain ESM JS so Node, Vite config and Vitest can all import it without a build step; keep its `.d.mts` in sync.
- Code-copy buttons are emitted into article HTML at build time and handled by one delegated click handler in the article route.
- Image references are validated twice: Markdown sources in `scripts/content.mjs` (exact-case lookup, no relative/wikilink paths) and built article HTML in `scripts/finalize-static.mjs`; walkthrough images live in `public/images/<htb|thm|offsec>/<slug>/`, and `scripts/import-writeup.mjs` is the only tool that converts external notes.
