---
title: "Sample OffSec Notes: A Repeatable Enumeration Methodology"
date: "2026-09-28"
description: "A template for OffSec lab study notes: a structured enumeration checklist, note-taking layout and time-boxing rules that keep lab work organised."
category: "notes"
platform: "OffSec"
tags:
  - methodology
  - enumeration
  - study-notes
  - sample
published: true
---

> [!NOTE]
> **Sample content.** These notes describe a generic methodology and make no claims about any certification or exam. Replace them with your own.

## Why a methodology

When a box is not giving up a foothold, the usual cause is skipped enumeration, not missing exploits. A checklist turns "stuck" into "next item".

## Note layout

```text
labs/
  <target>/
    scans/        raw tool output, never edited
    loot/         credentials, keys, files pulled off the host
    notes.md      timeline: what I tried, what happened
```

## Enumeration checklist

| Phase    | Questions                                              |
| -------- | ------------------------------------------------------ |
| Network  | All TCP ports? Top UDP ports? Any odd service banners? |
| Web      | Virtual hosts? Hidden paths? Parameters? Tech stack?   |
| Services | Anonymous or default access? Version-specific issues?  |
| Host     | Users, sudo rules, cron, SUID, writable paths?         |

## Time-boxing

> [!TIP]
> Set a timer for each rabbit hole. When it fires, write one line about what you learned and return to the checklist.

1. Spend 20 minutes on any single idea before re-evaluating.
2. Re-run a full port scan if nothing fits.
3. Re-read your notes from the top before searching for new techniques.
