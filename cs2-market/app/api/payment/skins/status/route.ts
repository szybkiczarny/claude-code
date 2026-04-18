import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { steamBot } from "@/lib/steam-bot";
import { balanceStore } from "@/lib/balance-store";

const JWT_SECRET = process.env.JWT_SECRET ?? "";

// Track which deposits have already been credited (in-memory, survives per process)
const credited = new Set<string>();

export async function GET(_req: NextRequest) {
  const token = (await cookies()).get("session")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let steamId: string;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { steamId: string };
    steamId = payload.steamId;
  } catch {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const deposit = steamBot.getDeposit(steamId);
  if (!deposit) return NextResponse.json({ status: "none" });

  // Credit only when items are physically received (not in escrow)
  if (deposit.status === "received" && deposit.creditedUsd && deposit.creditedUsd > 0) {
    const key = `${steamId}:${deposit.offerId}`;
    if (!credited.has(key)) {
      credited.add(key);
      balanceStore.add(steamId, deposit.creditedUsd);
    }
  }

  return NextResponse.json({
    status: deposit.status,
    offerId: deposit.offerId,
    creditedUsd: deposit.creditedUsd ?? 0,
    escrowEnds: deposit.escrowEnds ?? null,
    balance: balanceStore.get(steamId),
  });
}
