# Writeup image import workflow

This project keeps article content in Markdown under `content/` and screenshots under
`public/images/`. New imports are drafts by default.

## Import a writeup

Run from the repository root:

```bash
node scripts/import-writeup.mjs --source "/path/to/writeup.md" --images "/path/to/attachments" --platform HTB --slug machine-name --dry-run
```

Review the report. If it looks correct, repeat without `--dry-run`:

```bash
node scripts/import-writeup.mjs --source "/path/to/writeup.md" --images "/path/to/attachments" --platform HTB --slug machine-name
```

Supported platforms are `HTB`, `THM`, and `OffSec`. The importer writes the article to
`content/writeups/<platform>/<slug>.md` and copies images into
`public/images/<platform>/<slug>/`. It rewrites supported image references but leaves
other article text and code blocks unchanged. It does not modify the source files.

The source Markdown must already include `title`, `date`, and `description` frontmatter.
Imported articles are always marked `published: false`, so they stay drafts until reviewed.
Existing target files are not overwritten unless `--overwrite` is explicitly supplied.

## Validate before publishing

The GitHub Actions workflow installs Bun, validates content, runs the Vitest suite, builds
the static site, checks the generated output, and deploys to GitHub Pages when a push to
`main` succeeds. You do not need to install Bun locally just to push changes.

To test locally, use `bun install` followed by `bun run check`. Before publishing an imported
article, review the Markdown and images, change `published: false` to `published: true`,
then run the checks.
