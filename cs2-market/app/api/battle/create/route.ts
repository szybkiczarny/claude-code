import { NextRequest, NextResponse } from "next/server";
import { battleStore } from "@/lib/battle-store";
import { getSession } from "@/lib/session";
import { getCase } from "@/lib/cs2-data";

export async function POST(req: NextRequest) {
  const session = await getSession();
  const { caseId, maxPlayers } = await req.json();

  const caseData = await getCase(caseId);
  if (!caseData) return NextResponse.json({ error: "Invalid case" }, { status: 400 });
  if (![2, 3, 4].includes(maxPlayers)) return NextResponse.json({ error: "Invalid player count" }, { status: 400 });

  const playerId = session?.steamId ?? ("guest_" + Math.random().toString(36).slice(2, 8));
  const playerName = session?.displayName ?? "Gość";
  const playerAvatar = session?.avatarUrl ?? "";

  const battle = battleStore.create({
    caseId,
    caseName: caseData.name,
    casePrice: caseData.price,
    maxPlayers,
    status: "waiting",
    winnerId: null,
    pot: caseData.price * maxPlayers,
    players: [{
      id: playerId,
      name: playerName,
      avatar: playerAvatar,
      isBot: false,
      won: null,
    }],
  });

  return NextResponse.json(battle);
}
