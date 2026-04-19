import { NextRequest, NextResponse } from "next/server";
import { getCase, prefetchCasePrices, getSkinPrice, priceCache } from "@/lib/cs2-data";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const c = await getCase(params.id);
    if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Kick off background price fetching (non-blocking)
    prefetchCasePrices(params.id).catch(() => null);

    // Return immediately with only already-cached prices (no waiting)
    const uniqueNames = new Set<string>();
    const previewSkins = c.skins
      .filter(s => {
        if (uniqueNames.has(s.name)) return false;
        uniqueNames.add(s.name);
        return true;
      })
      .slice(0, 40)
      .map(s => ({
        ...s,
        price: priceCache.get(s.rarity === "Rare Special Item"
          ? `★ ${s.name} (Factory New)`
          : `${s.name} (${s.wear})`)?.price ?? (s.price > 0 ? s.price : 0),
      }));

    return NextResponse.json({ ...c, skins: previewSkins });
  } catch (err) {
    console.error("[CS2Case]", err);
    return NextResponse.json({ error: "Failed to load case" }, { status: 500 });
  }
}
