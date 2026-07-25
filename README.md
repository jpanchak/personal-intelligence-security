# Pi — Security Architecture (Public)

**Pi (Personal Intelligence)** is a local-first personal AI assistant: an encrypted Life Store on the owner’s machine, a memory layer designed for *current truth with full history*, cited recall, and (later) permissioned actions.

This repository publishes the **defensive security design** for that system — not the private corpus, not internal ops runbooks, and not credentials.

> **Author:** Jonathan Panchak  
> **Focus:** AI systems security · prompt-injection containment · local encryption · least-privilege cloud inference  
> **Status:** Storage, encryption, key custody, and backup/DR foundations are implemented and drilled in a private build. The injection-containment, permission, and evaluation layers above them are specified and phased. This repo publishes the design and marks which parts are enforced today.

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

## Design highlights — and what is actually enforced

Pi is built in phases. This repository documents the **whole** security design, so the honest thing is to mark the line between what runs today and what is specified. Publishing an architecture is easy; the split below is the part worth scrutinising.

### Enforced in the current build

- **Application-layer encryption across every store Pi controls** — page-level authenticated encryption for the primary database; per-object AES-256-GCM for the blob and raw-artifact tiers, content-addressed, with crypto-shred by deleting key material. Raw source bytes are encrypted *before* parse. Platform disk encryption is defense-in-depth, not the control.
- **Key custody bound to code identity** — data-encryption keys live in platform secure storage, never beside the database. Key access is bound to a signed daemon identity, so a generic interpreter ACL cannot inherit it. First-run key generation is fail-closed if the identity check does not pass.
- **Trust taxonomy (L0)** — origin trust is a database CHECK constraint, not a convention; stream/trust combinations that should be impossible are structurally rejected. No heuristic can upgrade trust.
- **Owner-channel rule for behavioral memory (L3, first half)** — preferences and skills are writable only from the authenticated owner channel. The gate is deterministic and evaluated *inside* the writing transaction against live rows, so a spoofed identifier cannot slip past.
- **Append-only action log** — update and delete abort at the storage layer by trigger, not by convention.
- **Client-side-encrypted offsite backup** — only ciphertext leaves the device, pushed daily under the signed daemon; backup credentials are separate principals from anything else.
- **Drilled disaster recovery** — the recovery bundle has been restore-confirmed on a host holding neither the signing identity nor the key, and the offsite repository has been pulled back and opened under the data key. Dates and scope in [`docs/security-architecture.md`](./docs/security-architecture.md) §3.4.

### Specified and phased — not yet enforced

- Structural data/instruction separation at prompt time (L1)
- Write-path injection scanning, deterministic checks and classifier (L2)
- The *write-time* quarantine block (L3's second half — retroactive quarantine propagation is built and oracle-tested; the pre-write gate is not)
- Action-origin checks (L4) — the schema makes an ingested instruction origin unrepresentable; the executor does not exist
- Answer-time labeling and strips (L5)
- The permission evaluator — tables and triggers exist; grant matching and scope enforcement do not
- A runtime egress hostname allowlist — default-deny is currently enforced statically, see §6
- The evaluation harness and its injection-resistance probes — a release gate. **No pass-rate data is published because no run has occurred.**

The current build registers **zero** tools of any kind and has made **zero** model calls. Nothing above is yet load-bearing for a live personal corpus — which is the point of building the storage and recovery floor first.

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
