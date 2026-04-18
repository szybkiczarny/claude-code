import { NextRequest, NextResponse } from "next/server";
import { getCase, prefetchCasePrices, getSkinPrice } from "@/lib/cs2-data";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const c = await getCase(params.id);
    if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Start prefetching prices in background
    prefetchCasePrices(params.id).catch(() => null);

    // For the unique skins shown in UI, attach prices for Field-Tested (representative)
    const uniqueNames = new Set<string>();
    const previewSkins = await Promise.all(
      c.skins
        .filter(s => {
          if (uniqueNames.has(s.name)) return false;
          uniqueNames.add(s.name);
          return true;
        })
        .slice(0, 30)
        .map(async s => ({
          ...s,
          price: await getSkinPrice(s),
        }))
    );

    return NextResponse.json({ ...c, skins: previewSkins });
  } catch (err) {
    console.error("[CS2Case]", err);
    return NextResponse.json({ error: "Failed to load case" }, { status: 500 });
  }
}
