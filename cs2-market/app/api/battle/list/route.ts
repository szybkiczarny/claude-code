import { NextResponse } from "next/server";
import { battleStore } from "@/lib/battle-store";

export async function GET() {
  return NextResponse.json(battleStore.listOpen());
}
