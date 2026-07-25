/**
 * Educational example — trust taxonomy (architecture §4 L0).
 * Not production Pi code. No secrets. Safe to publish.
 */

export type TrustLevel = 'owner' | 'ingested' | 'assistant';

export interface ItemRef {
  readonly id: string;
  readonly trust: TrustLevel;
}

/**
 * Trust is structural. Heuristics must never promote ingested → owner.
 */
export function canWritePreferencesOrSkills(item: ItemRef): boolean {
  return item.trust === 'owner';
}

/**
 * Derived rows inherit the *more tainted* parent (owner < assistant < ingested
 * for safety when combining — ingested always wins taint).
 */
export function inheritTrust(a: TrustLevel, b: TrustLevel): TrustLevel {
  const rank: Record<TrustLevel, number> = { owner: 0, assistant: 1, ingested: 2 };
  return rank[a] >= rank[b] ? a : b;
}

export type QuarantineState = 'none' | 'flagged' | 'quarantined';

const Q_RANK: Record<QuarantineState, number> = {
  none: 0,
  flagged: 1,
  quarantined: 2,
};

/** Quarantine state only upgrades, never downgrades. */
export function mergeQuarantine(
  current: QuarantineState,
  incoming: QuarantineState,
): QuarantineState {
  return Q_RANK[incoming] > Q_RANK[current] ? incoming : current;
}

export function mayExtractFactsToMemory(q: QuarantineState): 'block' | 'tainted' | 'allow' {
  if (q === 'quarantined') return 'block';
  if (q === 'flagged') return 'tainted';
  return 'allow';
}
