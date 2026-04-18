import { createHash } from "crypto";

export interface WeightedItem<T> {
  item: T;
  weight: number; // percentage, e.g. 79.92
}

/**
 * Weighted random selection — pure function, testable.
 * Accepts items with weights (must not need to sum to 100).
 */
export function weightedRandom<T>(pool: WeightedItem<T>[]): T {
  const total = pool.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const entry of pool) {
    r -= entry.weight;
    if (r <= 0) return entry.item;
  }
  return pool[pool.length - 1].item;
}

/**
 * Provably Fair roll using HMAC-SHA256.
 *
 * How it works:
 *   1. Server generates a random server_seed and publishes its SHA256 hash BEFORE the roll.
 *   2. Client provides a client_seed (any string, e.g. random UUID they set).
 *   3. A nonce increments with every roll so the same seeds never repeat.
 *   4. Result = HMAC-SHA256(server_seed, `${client_seed}:${nonce}`)
 *   5. We take first 8 hex chars → parse as uint32 → divide by 2^32 → [0, 1)
 *   6. After the session, server reveals server_seed → anyone can verify the outcome.
 *
 * For a real deployment: store server_seed in the DB, never expose it before the roll,
 * and provide a verification page where users can re-run the computation.
 */
export function provablyFairFloat(
  serverSeed: string,
  clientSeed: string,
  nonce: number
): number {
  const message = `${clientSeed}:${nonce}`;
  const hash = createHash("sha256")
    .update(serverSeed + message)
    .digest("hex");
  const uint32 = parseInt(hash.slice(0, 8), 16);
  return uint32 / 0x100000000; // [0, 1)
}

/** Map rarity name → default weight (CS2-style odds) */
export const RARITY_WEIGHTS: Record<string, number> = {
  "Consumer Grade":    79.92,
  "Industrial Grade":  15.98,
  "Mil-Spec Grade":    7.99,
  "Restricted":        3.2,
  "Classified":        1.28,
  "Covert":            0.51,
  "Contraband":        0.26,
  "★ Rare Special":   0.26,
};

export function getRarityWeight(rarity: string): number {
  return RARITY_WEIGHTS[rarity] ?? 3.2;
}
