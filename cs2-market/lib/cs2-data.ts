// Real CS2 data service: cases from ByMykel API, prices from Steam Market
// Data is cached in-memory and refreshed periodically

const BYMY_BASE = "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en";
const STEAM_PRICE = "https://steamcommunity.com/market/priceoverview/?currency=1&appid=730&market_hash_name=";

const WEAR_ABBR: Record<string, string> = {
  "Factory New": "FN",
  "Minimal Wear": "MW",
  "Field-Tested": "FT",
  "Well-Worn": "WW",
  "Battle-Scarred": "BS",
};

export interface CS2Skin {
  id: string;
  name: string;
  wear: string;
  rarity: string;
  rarityColor: string;
  price: number;
  imageUrl: string;
  stattrak: boolean;
  float: number;
}

export interface CS2Case {
  id: string;
  name: string;
  price: number;      // opening price (set by us)
  imageUrl: string;
  skins: CS2Skin[];   // all skins with all wear states
}

// ─── Price cache ────────────────────────────────────────────────────────────────

export const priceCache = new Map<string, { price: number; ts: number }>();
const PRICE_TTL = 2 * 60 * 60 * 1000; // 2h — refresh market prices every 2h
const requestQueue: Array<() => Promise<void>> = [];
let processing = false;

async function drainQueue() {
  if (processing) return;
  processing = true;
  while (requestQueue.length > 0) {
    const fn = requestQueue.shift()!;
    await fn();
    await new Promise(r => setTimeout(r, 1500)); // 1.5s between requests (Steam rate limit)
  }
  processing = false;
}

async function fetchPrice(marketHashName: string): Promise<number> {
  const cached = priceCache.get(marketHashName);
  if (cached && Date.now() - cached.ts < PRICE_TTL) return cached.price;

  return new Promise(resolve => {
    requestQueue.push(async () => {
      try {
        const url = STEAM_PRICE + encodeURIComponent(marketHashName);
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) { resolve(0); return; }
        const data = await res.json();
        const raw = data.median_price ?? data.lowest_price ?? "$0";
        const price = parseFloat(raw.replace(/[^0-9.]/g, "")) || 0;
        priceCache.set(marketHashName, { price, ts: Date.now() });
        resolve(price);
      } catch {
        resolve(0);
      }
    });
    drainQueue();
  });
}

// ─── Cases cache ────────────────────────────────────────────────────────────────

let casesCache: CS2Case[] | null = null;
let casesCacheTs = 0;
const CASES_TTL = 24 * 60 * 60 * 1000; // 24h

const WEAR_STATES = ["Factory New", "Minimal Wear", "Field-Tested", "Well-Worn", "Battle-Scarred"];

const FLOAT_RANGES: Record<string, [number, number]> = {
  "Factory New":    [0.000, 0.070],
  "Minimal Wear":   [0.070, 0.150],
  "Field-Tested":   [0.150, 0.380],
  "Well-Worn":      [0.380, 0.450],
  "Battle-Scarred": [0.450, 1.000],
};

function randomFloat(wear: string): number {
  const [min, max] = FLOAT_RANGES[wear] ?? [0, 1];
  return parseFloat((Math.random() * (max - min) + min).toFixed(6));
}

// Opening price based on case name / value
function caseOpenPrice(name: string): number {
  if (name.includes("Glove") || name.includes("Chroma 3") || name.includes("Fracture")) return 4.99;
  if (name.includes("Horizon") || name.includes("Clutch") || name.includes("Danger")) return 3.99;
  if (name.includes("Revolution") || name.includes("Recoil")) return 3.49;
  return 2.99;
}

async function buildCases(): Promise<CS2Case[]> {
  const res = await fetch(`${BYMY_BASE}/crates.json`, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error("Failed to fetch crates");
  const all = await res.json();

  const cases: CS2Case[] = all
    .filter((c: any) => c.type === "Case" && c.image)
    .map((c: any) => {
      const regularSkins: CS2Skin[] = (c.contains ?? []).flatMap((s: any) => {
        const wears = s.wears?.length ? s.wears.map((w: any) => w.name) : WEAR_STATES;
        return wears.map((wear: string) => ({
          id: `${s.id}-${WEAR_ABBR[wear] ?? wear}`,
          name: s.name,
          wear,
          rarity: s.rarity?.name ?? "Mil-Spec Grade",
          rarityColor: s.rarity?.color ?? "#4b69ff",
          price: 0,
          imageUrl: s.image ?? "",
          stattrak: false,
          float: randomFloat(wear),
        }));
      });

      const rareSkins: CS2Skin[] = (c.contains_rare ?? []).slice(0, 8).map((s: any) => ({
        id: `${s.id}-FN`,
        name: s.name,
        wear: "Factory New",
        rarity: "Rare Special Item",
        rarityColor: "#ffd700",
        price: 0,
        imageUrl: s.image ?? "",
        stattrak: false,
        float: randomFloat("Factory New"),
      }));

      return {
        id: c.id,
        name: c.name,
        price: caseOpenPrice(c.name),
        imageUrl: c.image,
        skins: [...regularSkins, ...rareSkins],
      } as CS2Case;
    });

  return cases;
}

export async function getCases(): Promise<CS2Case[]> {
  if (casesCache && Date.now() - casesCacheTs < CASES_TTL) return casesCache;
  const cases = await buildCases();
  casesCache = cases;
  casesCacheTs = Date.now();
  return cases;
}

export async function getCase(id: string): Promise<CS2Case | null> {
  const cases = await getCases();
  return cases.find(c => c.id === id) ?? null;
}

// Fills price for a single skin (used when opening a case)
export async function getSkinPrice(skin: CS2Skin): Promise<number> {
  if (skin.rarity === "Rare Special Item") {
    // Knife/glove — just return a placeholder, very expensive
    return await fetchPrice(`★ ${skin.name} (Factory New)`) || 200;
  }
  const marketName = `${skin.name} (${skin.wear})`;
  return await fetchPrice(marketName);
}

// Pre-warm prices for a specific case (called when player opens case page)
export async function prefetchCasePrices(caseId: string): Promise<void> {
  const c = await getCase(caseId);
  if (!c) return;
  // Only prefetch top-wear variants to stay within rate limits
  const toFetch = c.skins.filter(s => s.wear === "Field-Tested" || s.rarity === "Rare Special Item");
  for (const skin of toFetch.slice(0, 20)) {
    await getSkinPrice(skin);
  }
}
