import { NextResponse } from "next/server";
import { getCases } from "@/lib/cs2-data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cases = await getCases();
    // Return only the metadata needed for the cases listing (no skin details)
    const list = cases.map(c => ({
      id: c.id,
      name: c.name,
      price: c.price,
      imageUrl: c.imageUrl,
      skinCount: c.skins.length,
    }));
    return NextResponse.json(list);
  } catch (err) {
    console.error("[CS2Cases]", err);
    return NextResponse.json({ error: "Failed to load cases" }, { status: 500 });
  }
}
