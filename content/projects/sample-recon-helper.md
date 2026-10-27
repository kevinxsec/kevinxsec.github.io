---
title: "Sample Project: A Small Recon Notes Helper"
date: "2026-09-15"
description: "A template for a personal-project post: the problem, the design, a short script that creates a per-target notes directory, and what to improve next."
category: "project"
tags:
  - bash
  - tooling
  - sample
featured: true
published: true
---

> [!NOTE]
> **Sample content.** This describes a small illustrative script, not a released tool. Replace it with your own projects.

## The problem

Every lab target needs the same directory skeleton. Creating it by hand is a small tax that adds up, and inconsistent layouts make older notes hard to find.

## The script

```bash
#!/usr/bin/env bash
set -euo pipefail

target="${1:?usage: newbox <name> <ip>}"
ip="${2:?usage: newbox <name> <ip>}"

mkdir -p "labs/$target"/{scans,loot}
cat > "labs/$target/notes.md" <<EOF
# $target ($ip)

## Timeline
EOF
echo "$ip" > "labs/$target/ip.txt"
echo "created labs/$target"
```

```console
$ ./newbox lantern 10.10.11.50
created labs/lantern
```

## Design choices

- Plain files and Bash: nothing to install on a fresh VM.
- `set -euo pipefail` so typos fail loudly.
- No network access: the script only creates local files.

## Next steps

1. Add an optional first-pass scan.
2. Generate a notes template per platform.
3. Add tests with `bats`.
