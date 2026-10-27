---
title: "A Practical Nmap Workflow for Lab Machines"
date: "2026-10-08"
description: "A fast two-stage Nmap workflow for lab targets: find open ports quickly, then run detailed scripts only where it matters, with notes on what each flag does."
category: "tutorial"
tags:
  - nmap
  - enumeration
  - networking
published: true
---

Scanning every port with full scripts is slow. A two-stage approach is faster and gives cleaner notes.

> [!IMPORTANT]
> Scan only systems you own or are authorised to test, such as lab environments.

## Stage 1: find open ports

```bash
nmap -p- --min-rate 2000 -T4 -oN scans/all-ports.txt "$TARGET"
```

## Stage 2: detail on open ports only

```bash
ports=$(grep -oP '^\d+(?=/tcp\s+open)' scans/all-ports.txt | paste -sd,)
nmap -sC -sV -p"$ports" -oN scans/detail.txt "$TARGET"
```

## Flag reference

| Flag          | Meaning                                  |
| ------------- | ---------------------------------------- |
| `-p-`         | Scan all 65535 TCP ports                 |
| `--min-rate`  | Send at least this many packets/second   |
| `-sC`         | Run Nmap's default scripts               |
| `-sV`         | Probe service versions                   |
| `-oN`         | Save normal output to a file             |
| `-sU --top-ports 20` | Quick check of common UDP ports   |

## Reading the output

```text
80/tcp open  http  nginx 1.18.0
|_http-title: Did not follow redirect to http://target.htb/
```

A redirect to a hostname is a cue to add an `/etc/hosts` entry and look for virtual hosts.

> [!NOTE]
> High scan rates can miss ports on unreliable networks. If results look incomplete, rescan at a lower rate.
