---
title: "Linux Privilege Escalation Checklist"
date: "2026-09-22"
description: "A short, ordered checklist for local privilege escalation enumeration on Linux lab machines: sudo, SUID binaries, cron, capabilities and writable paths."
category: "notes"
tags:
  - linux
  - privilege-escalation
  - checklist
published: true
---

An ordered list of quick checks to run on a Linux box after getting a shell. Start cheap and local before reaching for automated tools.

## Identity and sudo

```bash
id
sudo -l
```

Any `NOPASSWD` entry deserves a look at [GTFOBins](https://gtfobins.github.io/).

## SUID binaries and capabilities

```bash
find / -perm -4000 -type f 2>/dev/null
getcap -r / 2>/dev/null
```

## Scheduled tasks

```bash
cat /etc/crontab
ls -la /etc/cron.*
```

Look for scripts that run as root but are writable by your user.

## Writable paths and credentials

```bash
find / -writable -type d 2>/dev/null | grep -v -E '^/(proc|sys|dev|run)'
grep -ril "password" /var/www /opt /home 2>/dev/null
```

> [!TIP]
> Note what you checked and the result. Negative results are just as useful when you come back later.

## Quick reference

| Area         | Command                  |
| ------------ | ------------------------ |
| Kernel       | `uname -a`               |
| Listening    | `ss -tulpn`              |
| Processes    | `ps aux`                 |
| Environment  | `env`                    |
