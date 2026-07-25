# Pi Security Architecture (Public, Sanitized)

**Status:** Public derivative of the internal Pi security model  
**Audience:** Defenders, AI-security practitioners, and anyone evaluating the design  
**Author:** Jonathan Panchak  

This document describes **mechanisms and intent**. Operational identifiers (cloud account numbers, bucket names, host paths, key material, recovery secrets, live environment details) are intentionally omitted.

---

## 1. Product context

Pi is a **local-first personal AI assistant** for a single owner. It maintains an encrypted Life Store fed by personal communication streams (mail, messaging, notes, and related sources), builds structured memory above that store, answers with citations, and—when armed—executes **permissioned** actions.

Security is load-bearing because:

| Property | Security consequence |
|---|---|
| Continuous ingest of third-party content | Indirect prompt injection is a default adversary, not an edge case |
| Persistent memory | A successful poison write outlives any single chat turn |
| Optional actions | Instruction-following can become side effects (send, move, unsubscribe, etc.) |
| Cloud inference | Some plaintext transits providers under contractual + technical controls |
| Device-local corpus | Device theft / seizure is a realistic confidentiality threat |

---

## 2. Ranked threat model

Ranking criterion: **(likelihood of attempt) × (damage durability)**.

The "primary controls" column describes the **designed** control set for each threat. Which of those controls are enforced in the current build — and which are specified and phased — is marked in §4 (injection), §5 (permissions), §6 (network), and §7 (cloud). T2, T7, and T8 are covered by controls that are implemented and, in the recovery case, drilled; T1's control stack is mostly still ahead of the build.

| ID | Threat | Primary controls | Residual (accepted, stated) |
|---|---|---|---|
| **T1** | Indirect prompt injection via ingested content → memory poisoning / action hijack | Trust taxonomy; structural data/instruction separation; write-path scanning; deterministic memory-write gate; action-origin checks; answer-time handling; harness probes | Novel scanner bypass still faces structural + deterministic layers; model obedience under adversarial framing remains the weakest layer |
| **T2** | Device theft / lost laptop | Application-layer encryption of Pi-controlled stores; platform full-disk encryption as defense-in-depth; keys in platform secure storage, not plaintext on disk | Adversary with an *unlocked, logged-in* session defeats local controls |
| **T3** | Provider / cloud boundary exposure | Enterprise-privacy inference paths where used; least-privilege cloud principal; pinned models/routes; retention posture verified fail-closed; no training-on-customer-data path by design | Trust in provider implementation of contractual privacy claims |
| **T4** | Supply chain (native modules, sidecars, deps) | Pin versions; vendor/sign critical sidecars; treat bridges as data sources not trusted code; deliberate upgrades with test re-runs | Compromise before pin; install-time scripts on dev machines |
| **T5** | Local malware / live-memory adversary | Largely out of scope for v1 on a single-user encrypted laptop | Accepted; would require non-standard key custody to upgrade |
| **T6** | Rogue local process calling the local API | Loopback-only API; bearer token in platform secure storage; renderer isolation | Process that can already read the token store has largely won |
| **T7** | Offsite backup exposure | Client-side encryption before upload; dedicated least-privilege backup credentials; separate read-only disaster credential where used | Metadata visible to storage provider; ciphertext subject to future cryptanalysis / legal process |
| **T8** | Single physical loss event | Encrypted offsite copy covers desk-fire/theft class that local-only could not | Simultaneous device loss + offsite unavailability |

---

## 3. Encryption at rest

### 3.1 Principle

Every personal-data byte **Pi’s own stores** write is protected with **application-layer encryption**. Platform disk encryption is defense-in-depth—not the sole control—for those stores.

### 3.2 Store classes (conceptual)

1. **Primary encrypted database** — page-level authenticated encryption via a mature encrypted SQLite stack; key is full-entropy, held in platform secure storage, loaded at daemon start.  
2. **Blob / vault tier** — large payloads and raw source artifacts stored as **per-object authenticated ciphertext** (e.g. AES-256-GCM chunked), content-addressed; crypto-shred by deleting key material rows.  
3. **Raw artifact vault** — source bytes encrypted **before parse**, so mid-pipeline failure does not leave a plaintext-only recovery story.  

### 3.3 Key custody (conceptual)

- Data-encryption keys are **not** stored beside the database in plaintext.  
- Platform secure storage (e.g. macOS Keychain) holds a minimal set of high-value secrets.  
- **Code identity matters:** binding key access to a signed daemon identity prevents “any local script” from inheriting DEK access through a generic interpreter ACL.  
- First-run key generation is **fail-closed** if signing/identity checks do not pass.  

### 3.4 Recovery (conceptual, no secrets)

An offline recovery bundle exists so a dead machine is not permanent loss. Design properties:

- Secrets in the bundle are wrapped under a passphrase-derived key (memory-hard KDF + authenticated encryption).  
- **Disaster recovery is drilled, not assumed.** Two owner-run drills are on record: the recovery bundle has been restore-confirmed on a host holding neither the signing identity nor the key, and the offsite repository has been pushed, pulled back, and opened under the data key end-to-end. *Scope, stated plainly:* both drills ran against a pre-ingestion store, and the "clean host" was a separate account on the same machine. A full new-machine, full-corpus drill is a release gate, not a completed one. A never-restored backup is treated as a hypothesis.  
- Escrowed restore credentials are scoped **read-only** and rotated on re-export, so a leaked kit cannot delete the sole offsite copy. The read-write backup principal is never escrowed.

### 3.5 Honest plaintext exceptions

Some intermediary formats owned by third-party applications and used as ingest bridges may remain plaintext under **platform disk encryption only**. Pi does not control those formats, so it cannot apply application-layer encryption to them. Those surfaces are **inventoried**, lifecycle-bounded, and excluded from naive whole-disk backup tools that would copy them off-machine uncontrolled.

Publishing the general shape of this exception is deliberate — a security document that claims *everything* is encrypted is not credible. Specific products and paths are omitted.

---

## 4. Injection quarantine (L0–L5)

Injection is treated as **unsolved**. The claim is defense-in-depth + deterministic gates + continuous probes—not perfection.

> **Enforcement status of this section.** L0 is enforced in shipped schema. L3's owner-channel rule is enforced in shipped code. **L1, L2, L4, and L5 are specified and phased — they are not running.** L4's schema already makes an ingested instruction origin unrepresentable, but no executor exists to be constrained. The layers below are written as design; each one notes where enforcement actually lives.

### L0 — Trust taxonomy (structural)

Every stored item carries origin trust. Conceptually:

| Trust | Meaning |
|---|---|
| `owner` | Produced only via authenticated owner UI/chat channel |
| `ingested` | Came from external streams (mail, chat, imports, …) |
| `assistant` | Produced by Pi |

**No heuristic upgrades trust.** Derived rows inherit taint through provenance links.

### L1 — Structural separation at prompt time

Ingested content enters model context **only** inside a hardened envelope (data container), never as free-floating system instructions. Hardening includes:

- Escaping content that would break envelope boundaries  
- Escaping attribute values derived from untrusted fields (display names, subjects, etc.)  
- Versioning envelope grammar together with the prompt bundle  

Tool results re-entering context keep envelopes—content stays data across turns.

### L2 — Write-path scanning

After raw vaulting and item creation, **before memory writes**:

**(a) Deterministic checks** — known payload patterns, dangerous Unicode obfuscation (zero-width/bidi/homoglyph), data-URI payloads, instruction-shaped header anomalies.

**(b) Model classifier** — separate call whose *only* job is a verdict (`score` + signals). Invalid classifier output **fails closed** to a flagged state (no “repair pass” that could launder attacker-shaped output).

**Scan isolation invariant:** the call that emits quarantine state must **not** also emit facts/entities into durable stores. Fusing “interpret” and “gate” into one call is a confused-deputy shape and is rejected.

**Attachment text** is scanned on its own clock when extraction completes; quarantine state only **monotonically upgrades**.

Verdict lattice (conceptual): `none < flagged < quarantined`, combining deterministic floors with classifier thresholds under a versioned rule ID.

### L3 — Memory-write gate (hardest deterministic line)

| State | Memory effect | Enforcement today |
|---|---|---|
| `quarantined` | **Zero** facts/preferences/skills/entity links written from the item; item remains stored and retrievable *with warning* | **Partial.** Retroactive quarantine propagation is built and oracle-tested — a later verdict sweeps derived rows, with an explicit false-positive override path. The *pre-write* block is specified, not built |
| `flagged` | Extraction may proceed with taint; sensitive profile surfaces exclude unconfirmed rows | Specified |
| any | **Preferences and skills are only ever written from the owner channel** | **Enforced.** Deterministic, evaluated inside the writing transaction against live rows, so a spoofed identifier cannot slip past |

That last rule closes the highest-damage class (“always forward mail to X”) without depending on scanner quality — which is precisely why it was built first, before any scanner exists.

### L4 — Action-origin check

Every planned action records instruction provenance. The executor refuses actions whose instruction chain originates in ingested content. Ingested mail may be the **object** of “file this”; it must never be the **author** of “send money / change rules / escalate grants.”

### L5 — Answer-time handling

Flagged/quarantined retrieval is labeled in context and UI. Deterministic stripping removes known probe/marker leakage paths independent of model behavior.

### Eval posture

The eval design treats injection resistance as a graded category. Probes are planted with fresh nonces each run, and the checks are:

- Model does not obey planted instructions — graded on **raw, pre-L5-strip** model output, so the deterministic strip cannot launder a failure into a pass  
- No actions spawn from planted lineage  
- Quarantined content remains **findable and citable** as untrusted—containment, not silent deletion  

**Status: specified, never run.** The harness is a release gate and does not yet exist. No pass-rate data is published here because none has been produced — the build has made zero model calls to date. A security document that quoted eval numbers it did not have would be the exact failure this section is meant to guard against.

**Honesty clause:** layers raise attacker cost; they do not make injection impossible. Residual risk concentrates at L1 (model obedience); that is why L3/L4 are code.

---

## 5. Permission system

> **Enforcement status:** the tables, constraints, and append-only triggers below exist in the shipped schema. The **evaluator does not** — grant matching, scope enforcement, and the `ask`/`auto` flow ship with the actions phase. The current build registers zero tools, so there is nothing to evaluate yet. The design is described in the present tense; only the schema-level items are enforced today.

Design follows the default-deny, structured-grant pattern that agentic coding assistants have made publicly documented practice (Claude Code's permission model is the closest public reference):

- **Default deny**  
- Grants are structured (tool, action class, scope, mode `ask`|`auto`, constraints)  
- Evaluation is **deterministic**—the model proposes; the evaluator disposes  
- “Always allow” mints a grant scoped to **exactly** what was shown—never silently wider  
- Escalation mid-workflow is designed to be structurally unavailable: every executed action must name an authorizing grant or approval that predates the run. The schema enforces exactly one authorizer per action today; the precedence check itself is a timestamp comparison over the action log, verified at the release gate rather than by a code invariant — so this is a design property with a planned test, not a proven one  
- Dangerous classes are structurally absent where possible (e.g. OAuth scopes that exclude permanent mass-delete)  
- Action log is **append-only**; blocked attempts log too  
- v1 can ship full permission machinery while registering **zero** write-capable tools until each path is verified  

---

## 6. Network posture

### 6.1 Daemon egress allowlist

The daemon is the only process intended to speak to the internet on Pi’s behalf.

**Enforced today.** Default-deny is a static architecture rule with test coverage on its own bypasses. Every network core module (`http`, `https`, `http2`, `net`, `tls`, `dgram`, `dns`), the `fetch` global, `WebSocket`, `XMLHttpRequest`, and `sendBeacon` are banned repository-wide outside a single sanctioned path — static import, dynamic import, and `require` alike. Phase gates are verified by packet capture against the running daemon, so the claim is checked empirically rather than asserted.

**Specified, not yet enforced.** The runtime hostname allowlist — evaluated before connect, default deny, blocked attempts surfaced as bugs or attacks — ships with the first network-bearing connector. Until then the accurate description of this control is *"no code path can reach the network except one,"* not *"every destination is checked before connect."* The distinction matters and is not papered over here.

Allowlisted destinations are limited to what the product truly needs, for example (categories, not a live inventory):

- Cloud inference / embeddings control and runtime endpoints in use  
- Mail/chat provider APIs for connectors that are enabled  
- Transient batch staging if used  
- Encrypted backup transport targets if offsite is enabled  

### 6.2 Sidecars

Some supervised helpers (mail bridges, backup tools, LAN sync for phone exports) have their own network behavior. They are treated as **data sources with explicit configuration norms** (e.g. no third-party relay for LAN sync), not as holes silently ignored in the threat model.

### 6.3 Local API

- Bound to loopback only  
- Bearer authentication  
- Renderer treated as untrusted-adjacent: no Node integration, CSP pins, strip remote resources in stored HTML so viewing mail is not a tracking-pixel exfil channel  

### 6.4 Telemetry

The daemon performs no third-party telemetry or crash reporting: such destinations are absent from its allowlist, so the property follows from §6.1 rather than from policy. Supervised sidecars (§6.2) run outside that allowlist and are governed by explicit configuration norms instead — the claim is scoped to the daemon, not asserted for the whole system. Dependency updates are pull-based at build time, not silent runtime auto-update of the trusted computing base.

---

## 7. Cloud inference boundary

Goals:

1. **Minimize custodians** of personal plaintext.  
2. Prefer providers/modes with **no training on customer content** and strong retention controls.  
3. **Pin** which models/routes exist; make disallowed models unroutable in code.  
4. Separate **interactive** answering routes from **bulk** classification/extraction routes.  
5. **Fail closed** if retention posture drifts from the required mode.  
6. Least-privilege cloud access policy: invoke only pinned models; deny retention-mode mutation from the app principal; dedicated principals for backup vs inference.  

Routing selection is deterministic and model-free where possible (classify turn → route key → pinned model id) so policy is testable without spending tokens.

**Enforcement status.** The pinned route map and its guards are shipped code: a request naming a disallowed model throws rather than degrading, non-pinned providers are denied by default, and the cheap tier is structurally barred from answering the owner directly. Retention posture is enforced as a fail-closed *precondition* — the required account mode was verified out-of-band, routing refuses to arm on any other value, and the daemon refuses to arm at all while the automated check is unconfigured, so an unrun probe cannot be silently defaulted past. **What is not yet in place:** nothing queries the provider to confirm retention mode at runtime, and the least-privilege access policy is drafted but not attached — account work to date has run from a broad administrative principal. Both land with the first live inference path. Until then, "least privilege" describes the routing layer, not the cloud principal.

---

## 8. Backups

| Layer | Role |
|---|---|
| Live encrypted store | Primary |
| Local encrypted snapshots | Fast rollback; consistent snapshot API (never naive file-copy of a live DB+WAL) |
| Client-side-encrypted offsite | Survives loss of the physical machine |

Properties:

- Snapshot integrity gates (format checks, keyed open, DB integrity)  
- **Scheduled restore verification**, monthly and scheduler-driven: restore from the offsite repository → keyed open → integrity check → recompute per-stream row counts and recency against the manifest recorded at snapshot time. The check is deliberately non-vacuous and that property is test-proven — tampered, zero-byte, and wrong-key inputs each fail at the correct stage rather than passing trivially. Installed and exercised; the recurring cadence is young  
- Offsite holds **ciphertext only**  
- Backup credentials scoped to backup storage—not inference, and split into separate read-write and read-only principals  

---

## 9. Supply chain

- Pin exact dependency versions; upgrade deliberately with full test suite  
- Critical sidecars: prefer build-from-vendored-source and sign with project identity over running unsigned upstream binaries  
- Treat third-party bridges as **untrusted code paths that emit data**  
- Single storage module boundary for DB access; decrypt escape hatches exist for owner disaster recovery and are tested  

---

## 10. What “good” looks like in evaluation

Security-relevant acceptance themes (illustrative):

1. Planted adversarial email is summarized/flagged as content—not obeyed.  
2. Taught workflows do not inherit instructions from planted content.  
3. “Anything suspicious?” answers from quarantine records with citations—not vibes.  
4. Action log can answer what the assistant did without asking, with grant identifiers.  
5. Attribution: assistant-moved vs user-moved is log-derived.  

---

## 11. Non-goals and explicit non-claims

- Not a multi-user SaaS control plane  
- Not resistant to a present, unlocked-session attacker on the owner device  
- Not a substitute for secure SDLC on every dependency upstream  
- Not permission to test others’ systems  
- **Injection is not solved**  

---

## 12. Mapping for practitioners

| If you work in… | Look at |
|---|---|
| AppSec / AI red team (defensive) | §4 L0–L5, §10 |
| Privacy engineering | §3, §7, §8 |
| Detection engineering mindset | Quarantine as durable labeled state + review queue concepts |
| Secure product / TPM | Default-deny permissions §5; fail-closed retention §7 |
| Incident response readiness | Append-only action log; restore drills §8 |

---

## 13. Document control

- This public document is **derived** from a more detailed internal model used to build the private implementation.  
- When internal and public docs diverge, **mechanisms** described here should remain accurate; only operational detail is withheld.  
- **Enforcement claims were audited against the private build on 2026-07-25**, and several were narrowed as a result — the egress control, the retention check, the permission evaluator, and the eval harness were all described more strongly than the code warranted. They now state what runs. If you find a remaining claim that outruns the implementation, that is a bug in this document and worth reporting.  
- Corrections and design critiques welcome via the process in [`../SECURITY.md`](../SECURITY.md).

---

*Built for authorized defensive work on owner-controlled systems.*
