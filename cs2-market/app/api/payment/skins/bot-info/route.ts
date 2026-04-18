import { NextResponse } from "next/server";
import { steamBot } from "@/lib/steam-bot";

export async function GET() {
  return NextResponse.json({
    configured: steamBot.isConfigured(),
    online: steamBot.isLoggedIn(),
    steamId: steamBot.getBotSteamId(),
    tradeUrl: steamBot.getBotTradeUrl(),
  });
}
