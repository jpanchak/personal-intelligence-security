/**
 * Educational example — fail-closed code-identity guard before sensitive key ops.
 * Inspired by the production idea: never mint a new data-encryption key under an
 * unsigned / wrong-identity binary. This file uses placeholders only.
 *
 * Not production Pi code. Safe to publish.
 */

import { spawnSync } from 'node:child_process';

/** Placeholder designated requirement — replace in real deployments; never commit real cert leaves to public forks of private apps without intent. */
export const EXAMPLE_DESIGNATED_REQUIREMENT =
  'identifier "com.example.assistant.daemon" and certificate leaf = H"00PLACEHOLDER_CERT_LEAF_HASH"';

const CODESIGN_TIMEOUT_MS = 5000;

export type SignatureVerdict = { readonly signed: true } | { readonly signed: false; readonly reason: string };

/**
 * FAIL-CLOSED: any spawn error, timeout, non-zero exit, or missing codesign ⇒ unsigned.
 * A guard that errs toward "signed" re-opens key-orphaning / ACL confusion failures.
 */
export function verifyBinaryIdentity(
  binaryPath: string,
  requirement: string = EXAMPLE_DESIGNATED_REQUIREMENT,
): SignatureVerdict {
  try {
    const result = spawnSync(
      'codesign',
      ['-v', '-R', requirement, binaryPath],
      { timeout: CODESIGN_TIMEOUT_MS, encoding: 'utf8' },
    );

    if (result.error) {
      return { signed: false, reason: `spawn_error:${result.error.message}` };
    }
    if (result.signal) {
      return { signed: false, reason: `signal:${result.signal}` };
    }
    if (result.status !== 0) {
      return { signed: false, reason: `codesign_exit:${result.status}` };
    }
    return { signed: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { signed: false, reason: `exception:${msg}` };
  }
}

export class UnsignedBinaryError extends Error {
  constructor(readonly verdict: Extract<SignatureVerdict, { signed: false }>) {
    super(`Refusing sensitive key operation: binary identity not verified (${verdict.reason})`);
    this.name = 'UnsignedBinaryError';
  }
}

/** Call BEFORE first-run DEK generation or any operation that binds keys to code identity. */
export function assertSignedBeforeKeyGeneration(binaryPath: string): void {
  const verdict = verifyBinaryIdentity(binaryPath);
  if (!verdict.signed) {
    throw new UnsignedBinaryError(verdict);
  }
}
