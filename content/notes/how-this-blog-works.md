---
title: "How This Blog Works (and a Markdown Feature Tour)"
date: "2026-10-20"
description: "A tour of every Markdown feature this site supports: code blocks, terminal output, tables, callouts, images and captions. Doubles as a reference while writing."
category: "notes"
tags:
  - meta
  - markdown
featured: true
published: true
---

Every article on this site is a single Markdown file in the `content/` directory. The build validates its frontmatter, renders it to static HTML and adds it to the archive, the tag pages, the RSS feed, the sitemap and the search index. No React code is touched to publish a post.

> [!NOTE]
> This post is sample content that demonstrates the template. Keep it as a reference or delete it.

## The pipeline

![How a Markdown file becomes a page](/images/how-this-blog-works/content-pipeline.svg "From a Markdown file to a static page on GitHub Pages.")

A post is published when it has valid frontmatter and `published: true` (or no `published` field at all). Drafts with `published: false` are skipped entirely, so they never reach a page, the feed or the search index.

## Code blocks

Fenced code blocks are highlighted at build time, so no highlighting script is shipped to readers. Every block has a copy button.

```python
import socket

def grab_banner(host: str, port: int, timeout: float = 3.0) -> str:
    """Connect to a TCP service and return the first bytes it sends."""
    with socket.create_connection((host, port), timeout=timeout) as s:
        return s.recv(1024).decode(errors="replace").strip()

print(grab_banner("10.10.10.10", 22))
```

Terminal output works the same way, using `console` or `text` as the language:

```console
$ nmap -sC -sV -oN scans/initial 10.10.10.10
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 8.9p1 Ubuntu
80/tcp open  http    nginx 1.18.0
```

Inline code such as `sudo -l` is styled too.

## Tables

| Field         | Required | Example                     |
| ------------- | -------- | --------------------------- |
| `title`       | yes      | `"Lantern Writeup"`         |
| `date`        | yes      | `"2026-10-27"`              |
| `description` | yes      | 20 to 300 characters        |
| `category`    | yes      | `writeup`, `research`, etc. |
| `platform`    | no       | `HTB`, `THM`, `OffSec`      |
| `tags`        | no       | `[linux, privesc]`          |

## Callouts

> [!TIP]
> Write the description for someone skimming the archive. It is also used for search results and link previews.

> [!WARNING]
> Never publish credentials, flags or details of systems you are not authorised to test.

> [!CAUTION]
> Respect platform rules: many platforms ask that writeups of active machines stay unpublished until retirement.

## Headings and the table of contents

Every `##` and `###` heading gets an anchor link and appears in the table of contents beside the article.

### A third-level heading

Use these for sub-steps, such as "Enumeration → Web".

## Quotes

> Plain blockquotes stay plain, for quoting documentation or advisories.
