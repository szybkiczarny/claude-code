import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { steamBot } from "@/lib/steam-bot";

const JWT_SECRET = process.env.JWT_SECRET ?? "";

export async function POST(req: NextRequest) {
  const token = (await cookies()).get("session")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let steamId: string;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { steamId: string };
    steamId = payload.steamId;
  } catch {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  if (!steamBot.isConfigured()) {
    return NextResponse.json({ error: "Steam bot not configured" }, { status: 503 });
  }
  if (!steamBot.isLoggedIn()) {
    return NextResponse.json({ error: "Steam bot offline" }, { status: 503 });
  }

  const { tradeUrl } = await req.json();
  if (!tradeUrl || !tradeUrl.includes("steamcommunity.com/tradeoffer")) {
    return NextResponse.json({ error: "Invalid trade URL" }, { status: 400 });
  }

  try {
    const offerId = await steamBot.sendTradeOffer({ steamId, tradeUrl });
    return NextResponse.json({ offerId, botSteamId: steamBot.getBotSteamId() });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
