# Security Policy

## Supported scope

This repository documents the **defensive security architecture** of Pi, a single-user, local-first personal AI assistant. It may later include **sanitized reference implementations** of security-relevant components.

In scope for discussion and reports:

- Flaws in the published threat model or control design
- Logic bugs in any code samples published here
- Ways an attacker with access to *ingested content* (email, chat, attachments) could influence memory, actions, or exfiltration *under the design as described*
- Suggestions that improve fail-closed behavior, least privilege, or injection containment

Out of scope:

- Social engineering of the author
- Attacks against third-party providers (cloud AI, email hosts) unrelated to Pi’s integration choices
- Demands for private corpus, credentials, recovery material, or unpublished internal docs
- Testing against systems you do not own or lack explicit authorization to test

## Reporting a vulnerability

**Please do not open a public GitHub issue for actionable security vulnerabilities in code.**

Prefer:

1. GitHub **Private vulnerability reporting** on this repository (if enabled), or  
2. A responsible disclosure email via the contact method on the author’s LinkedIn profile, with subject line:  
   `SECURITY: Pi public repo`

Include:

- Description of the issue and impact  
- Steps to reproduce (against **published** material only)  
- Suggested fix if you have one  

I will acknowledge good-faith reports and credit reporters who want credit.

## Security guarantees (honest)

Pi’s design aims to:

- Keep personal stores **encrypted at rest** under application-layer controls plus platform disk encryption  
- Treat **ingested content as untrusted data**, never as a source of instructions or preference/skill learning  
- Enforce **default-deny permissions** for actions, with deterministic evaluation  
- Constrain **daemon egress** to an explicit allowlist  
- Fail **closed** on critical configuration drift (e.g. cloud retention posture where applicable)  
- Keep **offsite backups** as client-side ciphertext only  

Pi’s design does **not** claim:

- That prompt injection is solved  
- Protection against an adversary with an unlocked, logged-in session on the owner’s machine  
- Multi-tenant isolation (single-user product)  
- Formal verification of the full stack  

## Authorized use only

Security research and AI-assisted analysis related to this project are intended for **defensive, authorized** purposes: protecting systems and data the owner controls. Do not use this material to attack others’ systems.

## Preferred stack hygiene (maintainers)

When code is present in this repo:

- No secrets in git history  
- No production account IDs, bucket names, or live endpoints  
- Dependency pins reviewed deliberately  
- Tests for security invariants where practical  
