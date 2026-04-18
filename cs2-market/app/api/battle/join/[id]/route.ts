import { NextRequest, NextResponse } from "next/server";
import { battleStore } from "@/lib/battle-store";
import { getSession } from "@/lib/session";
import { getCase } from "@/lib/cs2-data";
import { weightedRandom, getRarityWeight } from "@/lib/odds";
import type { Skin } from "@/lib/mock-data";

function pickWinner(items: Skin[]): Skin {
  return weightedRandom(items.map(item => ({ item, weight: getRarityWeight(item.rarity) })));
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  const battle = battleStore.get(params.id);

  if (!battle) return NextResponse.json({ error: "Battle not found" }, { status: 404 });
  if (battle.status !== "waiting") return NextResponse.json({ error: "Battle already started" }, { status: 400 });

  const playerId = session?.steamId ?? ("guest_" + Math.random().toString(36).slice(2, 8));

  if (battle.players.some(p => p.id === playerId)) {
    return NextResponse.json(battle);
  }

  const updatedPlayers = [...battle.players, {
    id: playerId,
    name: session?.displayName ?? "Gość",
    avatar: session?.avatarUrl ?? "",
    isBot: false,
    won: null,
  }];

  if (updatedPlayers.length >= battle.maxPlayers) {
    const caseData = await getCase(battle.caseId);
    const skins: Skin[] = (caseData?.skins ?? []) as Skin[];

    const playersWithResults = updatedPlayers.map(p => ({
      ...p,
      won: skins.length > 0 ? pickWinner(skins) : { id: "fallback", name: "AK-47 | Redline", wear: "Field-Tested", rarity: "Classified", rarityColor: "#d32ce6", price: 12, imageUrl: "" },
    }));
    const winner = playersWithResults.reduce((a, b) =>
      (b.won?.price ?? 0) > (a.won?.price ?? 0) ? b : a
    );

    battleStore.update(params.id, { players: playersWithResults, status: "spinning" });
    setTimeout(() => {
      battleStore.update(params.id, { status: "done", winnerId: winner.id });
    }, 5500);

    return NextResponse.json(battleStore.get(params.id));
  }

  const updated = battleStore.update(params.id, { players: updatedPlayers });
  return NextResponse.json(updated);
}
