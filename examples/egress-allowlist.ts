/**
 * Educational example — default-deny egress allowlist (architecture §6).
 * Not production Pi code. Hostnames are examples only.
 */

export class EgressDeniedError extends Error {
  constructor(
    readonly hostname: string,
    readonly requester: string,
  ) {
    super(`Egress denied: ${hostname} (requested by ${requester})`);
    this.name = 'EgressDeniedError';
  }
}

/** Exact hostname match; production systems may also need wildcard rules carefully designed. */
export class EgressAllowlist {
  private readonly allowed: ReadonlySet<string>;

  constructor(hostnames: readonly string[]) {
    this.allowed = new Set(hostnames.map((h) => h.toLowerCase()));
  }

  assertAllowed(url: string, requesterModule: string): void {
    const hostname = safeHostname(url);
    if (!this.allowed.has(hostname)) {
      // In production: log to metrics, then throw
      throw new EgressDeniedError(hostname, requesterModule);
    }
  }
}

function safeHostname(url: string): string {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new EgressDeniedError('(unparseable)', 'url-parser');
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') {
    throw new EgressDeniedError(u.protocol, 'url-parser');
  }
  return u.hostname.toLowerCase();
}

/** Example policy for a fictional local-first assistant — not live Pi inventory. */
export const EXAMPLE_POLICY = new EgressAllowlist([
  'example-inference.api.example',
  'gmail.googleapis.com',
  'oauth2.googleapis.com',
]);

// --- tiny self-check (run with: npx tsx examples/egress-allowlist.ts) ---
if (import.meta.url === `file://${process.argv[1]}`) {
  EXAMPLE_POLICY.assertAllowed('https://gmail.googleapis.com/v1/users/me/messages', 'connector.gmail');
  try {
    EXAMPLE_POLICY.assertAllowed('https://evil.example/exfil', 'connector.gmail');
    console.error('FAIL: expected deny');
    process.exit(1);
  } catch (e) {
    if (e instanceof EgressDeniedError) {
      console.log('ok: default deny works');
    } else {
      throw e;
    }
  }
}
