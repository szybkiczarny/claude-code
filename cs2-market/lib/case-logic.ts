/**
 * Bucket-based case opening system.
 * 35% house margin, 5 tiers, skin+wear selected to match price range.
 */

import type { CS2Skin } from "./cs2-data";

// ─── Buckets ────────────────────────────────────────────────────────────────

export const BUCKETS = {
  LOSS:       { chance: 0.80,    minMult: 0.30, maxMult: 0.40 },
  RETURN:     { chance: 0.06667, minMult: 0.95, maxMult: 1.05 },
  MID_PROFIT: { chance: 0.13,    minMult: 2.00, maxMult: 3.00 },
  BIG_WIN:    { chance: 0.00233, minMult: 9.00, maxMult: 11.0 },
  JACKPOT:    { chance: 0.001,   minMult: 18.0, maxMult: 22.0 },
} as const;

export type BucketKey = keyof typeof BUCKETS;

// Rarity → which buckets it can appear in (ordered by preference)
const RARITY_BUCKET_MAP: Record<string, BucketKey[]> = {
  "Consumer Grade":    ["LOSS"],
  "Industrial Grade":  ["LOSS"],
  "Mil-Spec Grade":    ["LOSS"],
  "Restricted":        ["LOSS", "RETURN"],
  "Classified":        ["MID_PROFIT"],
  "Covert":            ["MID_PROFIT", "BIG_WIN"],
  "Rare Special Item": ["JACKPOT"],
  "★ Rare Special":   ["JACKPOT"],
  "Extraordinary":     ["JACKPOT"],
};

// Wear multipliers relative to FT price (Field-Tested = 1.0)
const WEAR_MULT: Record<string, number> = {
  "Factory New":    1.55,
  "Minimal Wear":   1.20,
  "Field-Tested":   1.00,
  "Well-Worn":      0.70,
  "Battle-Scarred": 0.50,
};

// ─── Bucket picker ──────────────────────────────────────────────────────────

export function pickBucket(): BucketKey {
  const r = Math.random();
  let cumulative = 0;
  for (const [key, bucket] of Object.entries(BUCKETS)) {
    cumulative += bucket.chance;
    if (r < cumulative) return key as BucketKey;
  }
  return "LOSS";
}

// ─── Price estimation ───────────────────────────────────────────────────────

/** Estimates skin price for any wear state given a known FT price. */
export function estimatePriceForWear(ftPrice: number, wear: string): number {
  return ftPrice * (WEAR_MULT[wear] ?? 1.0);
}

/**
 * Given a skin whose price is known for one wear state,
 * estimate its FT-equivalent base price.
 */
function toFTBase(price: number, wear: string): number {
  return price / (WEAR_MULT[wear] ?? 1.0);
}

// ─── Skin grouping ──────────────────────────────────────────────────────────

interface SkinGroup {
  name: string;
  rarity: string;
  rarityColor: string;
  imageUrl: string;
  stattrak: boolean;
  wears: { skin: CS2Skin; price: number; ftBase: number }[];
}

function groupSkins(skins: CS2Skin[]): SkinGroup[] {
  const map = new Map<string, SkinGroup>();
  for (const skin of skins) {
    if (!map.has(skin.name)) {
      map.set(skin.name, {
        name: skin.name,
        rarity: skin.rarity,
        rarityColor: skin.rarityColor,
        imageUrl: skin.imageUrl,
        stattrak: skin.stattrak,
        wears: [],
      });
    }
    const group = map.get(skin.name)!;
    const ftBase = skin.price > 0 ? toFTBase(skin.price, skin.wear) : 0;
    group.wears.push({ skin, price: skin.price, ftBase });
  }
  return Array.from(map.values());
}

// ─── Main: openCase ─────────────────────────────────────────────────────────

export interface OpenResult {
  skin: CS2Skin;
  bucket: BucketKey;
  estimatedPrice: number;
}

/**
 * Opens a case and returns the winning skin.
 *
 * Flow:
 * 1. Pick bucket by probability
 * 2. Filter skins to those whose rarity can appear in that bucket
 * 3. Pick a random skin from eligible group
 * 4. Find the wear state whose price best fits the bucket price range
 */
export function openCase(skins: CS2Skin[], casePrice: number): OpenResult {
  const bucket = pickBucket();
  const { minMult, maxMult } = BUCKETS[bucket];
  const minPrice = casePrice * minMult;
  const maxPrice = casePrice * maxMult;

  const eligibleRarities = Object.entries(RARITY_BUCKET_MAP)
    .filter(([, buckets]) => buckets.includes(bucket))
    .map(([rarity]) => rarity);

  const groups = groupSkins(skins);
  const eligible = groups.filter(g => eligibleRarities.includes(g.rarity));

  // Fall back to LOSS bucket skins if no match (edge case)
  const pool = eligible.length > 0 ? eligible : groups;

  // Pick a random skin group from eligible pool
  const group = pool[Math.floor(Math.random() * pool.length)];

  // Find best wear state:
  // 1. Prefer exact price match if we have real prices
  // 2. Otherwise pick wear state by interpolating with WEAR_MULT

  let bestSkin: CS2Skin | null = null;
  let bestPrice = 0;

  // Try to find wear state with real price in range
  const withPrices = group.wears.filter(w => w.price > 0);
  const inRange = withPrices.filter(w => w.price >= minPrice && w.price <= maxPrice);

  if (inRange.length > 0) {
    const picked = inRange[Math.floor(Math.random() * inRange.length)];
    bestSkin = picked.skin;
    bestPrice = picked.price;
  } else if (withPrices.length > 0) {
    // Have prices but none in range — pick wear closest to target midpoint
    const target = (minPrice + maxPrice) / 2;
    let closest = withPrices[0];
    for (const w of withPrices) {
      if (Math.abs(w.price - target) < Math.abs(closest.price - target)) {
        closest = w;
      }
    }
    bestSkin = closest.skin;
    bestPrice = closest.price;
  } else {
    // No prices yet — pick wear state by multiplier estimation
    // Use the first wear entry as reference and estimate FT base
    const target = (minPrice + maxPrice) / 2;
    const WEAR_ORDER = ["Factory New", "Minimal Wear", "Field-Tested", "Well-Worn", "Battle-Scarred"];

    // Find wear state from WEAR_MULT that's closest to target
    let bestWear = "Field-Tested";
    let bestDiff = Infinity;

    // Estimate FT base: for JACKPOT/BIG_WIN rarities use higher base estimates
    const rarityFTEstimate: Record<string, number> = {
      "Consumer Grade":    casePrice * 0.05,
      "Industrial Grade":  casePrice * 0.08,
      "Mil-Spec Grade":    casePrice * 0.15,
      "Restricted":        casePrice * 0.50,
      "Classified":        casePrice * 1.50,
      "Covert":            casePrice * 5.00,
      "Rare Special Item": casePrice * 15.0,
      "★ Rare Special":   casePrice * 15.0,
      "Extraordinary":     casePrice * 15.0,
    };
    const ftBase = rarityFTEstimate[group.rarity] ?? casePrice;

    for (const wear of WEAR_ORDER) {
      const estimated = ftBase * (WEAR_MULT[wear] ?? 1);
      const diff = Math.abs(estimated - target);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestWear = wear;
      }
    }

    // Find the skin with this wear state, or fall back to any
    const wearMatch = group.wears.find(w => w.skin.wear === bestWear);
    const fallback = group.wears[0];
    const picked = wearMatch ?? fallback;
    bestSkin = picked.skin;
    bestPrice = estimatePriceForWear(ftBase, picked.skin.wear);
  }

  // Generate a fresh float for this specific drop
  const floatRanges: Record<string, [number, number]> = {
    "Factory New":    [0.000, 0.070],
    "Minimal Wear":   [0.070, 0.150],
    "Field-Tested":   [0.150, 0.380],
    "Well-Worn":      [0.380, 0.450],
    "Battle-Scarred": [0.450, 1.000],
  };
  const [fMin, fMax] = floatRanges[bestSkin!.wear] ?? [0, 1];
  const freshFloat = parseFloat((Math.random() * (fMax - fMin) + fMin).toFixed(6));

  return {
    skin: { ...bestSkin!, float: freshFloat, price: bestPrice > 0 ? bestPrice : bestSkin!.price },
    bucket,
    estimatedPrice: bestPrice,
  };
}

/** Expected Value calculator — for transparency */
export function expectedValue(casePrice: number): number {
  return Object.values(BUCKETS).reduce((sum, b) => {
    const midMult = (b.minMult + b.maxMult) / 2;
    return sum + b.chance * casePrice * midMult;
  }, 0);
}
