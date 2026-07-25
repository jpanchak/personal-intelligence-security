# Pi — Security Architecture (Public)

**Pi (Personal Intelligence)** is a local-first personal AI assistant: an encrypted Life Store on the owner’s machine, a memory layer designed for *current truth with full history*, cited recall, and (later) permissioned actions.

This repository publishes the **defensive security design** for that system — not the private corpus, not internal ops runbooks, and not credentials.

> **Author:** Jonathan Panchak  
> **Focus:** AI systems security · prompt-injection containment · local encryption · least-privilege cloud inference  
> **Status:** Architecture and core storage/security foundations implemented in a private build; this repo is the public, sanitized security surface.

---

## Why this exists

Personal AI assistants that ingest email, messages, and documents create a sharp dual-use problem:

1. **Untrusted content** arrives continuously (mail, chat, attachments).  
2. **Persistent memory** makes a successful injection *durable* — worse than a single bad answer.  
3. **Actions** (if enabled) turn instruction-following into real-world side effects.  
4. **Cloud inference** moves plaintext transiently off-device under contractual and technical controls.

Pi’s security work treats those as first-class engineering problems, not policy footnotes.

---

## Security stance (one paragraph)

Pi’s most valuable asset is not any single model answer — it is the **persistent memory tier** and any **write-capable action surface** above streams of other people’s content. The defended perimeter is ordered: (1) the memory-write path (poisoned memory persists and compounds), (2) at-rest ciphertext (device theft is the realistic physical adversary), (3) the cloud boundary (configuration hygiene and least privilege, not blind trust), (4) supply chain of a small set of native/sidecar dependencies. **Prompt injection is not “solved.”** The design buys layered containment, deterministic gates where models are weak, and eval probes so regressions fail loudly.

---

## What’s in this repo

| Path | Contents |
|---|---|
| [`SECURITY.md`](./SECURITY.md) | How to report issues; high-level guarantees and non-guarantees |
| [`docs/security-architecture.md`](./docs/security-architecture.md) | Ranked threat model, encryption posture, injection quarantine layers (L0–L5), permissions, network allowlisting, backup threat model |
| [`docs/blog/injection-layers.md`](./docs/blog/injection-layers.md) | Short engineering note on L0–L5 containment |
| [`examples/`](./examples/) | Educational TypeScript sketches (trust taxonomy, egress default-deny, fail-closed signing guard) |
| [`LICENSE`](./LICENSE) | MIT |

---

## Design highlights

- **Trust taxonomy at ingest** — owner channel vs ingested content vs assistant output; trust is not upgraded by heuristics.  
- **Structural data/instruction separation** — untrusted text enters prompts only inside hardened envelopes.  
- **Write-path injection scanning** — deterministic checks + model classifier; fail-closed on scanner errors.  
- **Deterministic memory-write gate** — preferences/skills only from the authenticated owner channel; quarantined items cannot teach behavioral memory.  
- **Action-origin checks** — ingested content may be the *object* of an action, never the *author* of one.  
- **Application-layer encryption** for stores Pi controls; platform disk encryption as defense-in-depth.  
- **Daemon-enforced egress allowlist** — default deny for outbound network from the process that holds keys and corpus access.  
- **Least-privilege cloud inference** — pinned models/routes; retention-mode fail-closed where applicable; no training-on-customer-data path by design.  
- **Client-side-encrypted offsite backup** — only ciphertext leaves the device for disaster recovery.  
- **Eval harness includes injection-resistance probes** — planted adversarial content must not be obeyed; quarantine remains citable containment, not silent drop.

---

## What this is not

- Not a claim that injection is impossible.  
- Not a pentest report or bug bounty hall of fame.  
- Not multi-tenant SaaS security — Pi is single-user, local-first.  
- Not an invitation to test systems you do not own. All research described here is against **owner-authorized** personal infrastructure.

---

## Related public posture

I use advanced AI tools strictly for **authorized defensive work**: secure design, threat modeling, implementation review, and hardening of systems I own or am explicitly permitted to test. I do not use them for unauthorized access, malware development, or abuse.

---

## License

MIT — see [`LICENSE`](./LICENSE).

Documentation is published for transparency and defensive education. The TypeScript files in `examples/` are illustrative sketches of the invariants described in the architecture doc, not the production Pi daemon; port ideas into your own systems only against infrastructure you are authorized to modify.

---

## Contact

- GitHub issues on this repo (security-sensitive: see [`SECURITY.md`](./SECURITY.md))  
- LinkedIn: [jonathanpanchak](https://www.linkedin.com/in/jonathanpanchak)  
