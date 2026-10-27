---
# Copy this file to content/<folder>/<slug>.md and fill it in.
# Walkthroughs: content/writeups/<htb|thm|offsec>/<machine>.md with screenshots in
# public/images/<htb|thm|offsec>/<machine>/ (lowercase-hyphen filenames, exact case).
# Or generate one: node scripts/import-writeup.mjs --source note.md --images dir --platform HTB --slug machine
# Files starting with "_" are never published. The filename becomes the URL slug
# unless you set `slug:` explicitly.
title: "Machine Name Writeup"          # required, max 140 chars
date: "2026-10-27"                     # required, YYYY-MM-DD
description: "One or two sentences that summarise the article (20-300 chars)."  # required
category: "writeup"                    # required: writeup | research | tutorial | project | notes
platform: "HTB"                        # optional: HTB | THM | OffSec | None (also becomes a tag)
difficulty: "Easy"                     # optional: Easy | Medium | Hard | Insane
tags:                                  # optional
  - linux
  - privilege-escalation
featured: false                        # optional: show on the homepage
published: false                       # set to true to publish; false keeps it a draft
# updated: "2026-11-02"                # optional: last-modified date
# slug: "custom-url-slug"              # optional
---

## Summary

What the target was, and the attack path in two or three lines.

## Enumeration

```console
$ nmap -sC -sV 10.10.10.10
```

## Foothold

![Descriptive alt text](/images/htb/<machine>/screenshot.png "Optional caption")

<!-- Not supported (the build fails): ![[screenshot.png]], ![x](screenshot.png), ![x](C:/...). -->
<!-- Spaces: /images/htb/<machine>/my%20shot.png or ![x](</images/htb/<machine>/my shot.png>) -->
<!-- HTML is fine for sizing: <img src="/images/htb/<machine>/screenshot.png" alt="..." width="600"> -->

## Privilege escalation

> [!TIP]
> Callouts: NOTE, TIP, IMPORTANT, WARNING, CAUTION.

## Lessons learned
