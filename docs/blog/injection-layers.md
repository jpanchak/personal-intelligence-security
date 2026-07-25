# Layered prompt-injection containment for personal AI agents

*Jonathan Panchak — public engineering note (defensive)*

Personal AI assistants that ingest email and chat face a different risk profile than chatbots with empty context. **Untrusted text is a continuous input.** If the agent also keeps **persistent memory** or can take **actions**, a successful injection is not a funny one-off — it is a durable compromise.

This note summarizes the layered approach documented in the [Pi security architecture](../security-architecture.md). It is for authorized defensive design on systems you own.

**Read this as design, not as a shipped-feature list.** In my own build, L0 and the owner-channel half of L3 are enforced in shipped schema and code; L1, L2, L4, and L5 are specified and phased. The architecture doc marks each one. I am writing about the shape of the problem and the ordering I chose, not claiming a finished system.

## The failure that matters

Classic demo: “ignore previous instructions.”  
Serious failure mode: ingested content that causes the agent to **write a poisoned preference**, **exfiltrate data on a later turn**, or **execute a workflow the user never authorized**.

So the memory-write path and the action executor deserve stronger controls than “hope the model refuses.”

## Layers (L0–L5)

### L0 — Trust taxonomy
Label every item: `owner` | `ingested` | `assistant`.  
**Never** promote trust with a classifier vibe check. Derived data inherits taint.

### L1 — Structural data / instruction separation
Untrusted content enters the model only inside a hardened envelope. Escape content and untrusted attributes so a display name cannot break out of quotes and forge `trust=owner`.

### L2 — Write-path scanning
Before memory writes: deterministic detectors + a **dedicated** classifier verdict.  
If the scanner errors, **fail closed** (flag), don’t “repair” attacker-shaped JSON into a clean verdict.  
Do not fuse “extract facts” and “gate safety” into one call (confused deputy).

### L3 — Deterministic memory-write gate
Quarantined items write **no** behavioral memory.  
**Preferences and skills only from the authenticated owner channel** — full stop.  
This single rule kills an entire class of “always forward my mail to attacker@…” poisons without needing a perfect scanner.

### L4 — Action-origin checks
Ingested content may be the **object** of an action (“archive this mail”) but never the **author** of one (“send a wire”). The schema makes an ingested instruction origin unrepresentable; the executor that enforces it is a later phase.

### L5 — Answer-time labeling and strips
Show warnings for flagged/quarantined retrieval. Deterministic output checks catch probe leakage.

## Evals that bite

Plant adversarial messages with fresh nonces every run:

1. Model must not obey them.  
2. Actions must not spawn from them.  
3. Quarantine must remain **retrievable and citable** — containment, not silent delete that hides evidence.

## Honesty

Injection is **not solved**. Layers raise cost; residual risk sits where models still obey adversarial framing — which is exactly why L3/L4 are deterministic.

## Why publish this

I’m building a local-first assistant (Pi) where security is a product surface: encryption at rest, least-privilege cloud inference, egress allowlisting, and the injection stack above. Sanitized architecture: [repo root](../../README.md).

*Authorized defensive use only.*
