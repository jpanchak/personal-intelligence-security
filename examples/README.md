# Examples

Educational TypeScript sketches that illustrate **invariants** from the [security architecture](../docs/security-architecture.md).

These are **reference implementations for learning and portfolio review**, not the production Pi daemon. They intentionally avoid real certificate hashes, cloud account IDs, and host paths.

| File | Invariant |
|---|---|
| `trust-taxonomy.ts` | Ingested content cannot be upgraded to owner trust by heuristics |
| `egress-allowlist.ts` | Outbound network is default-deny; allowlist is explicit |
| `signing-guard.ts` | Fail closed unless binary code identity verifies |

Run mindset: read with the architecture doc open; port ideas into your own systems only with authorization.
