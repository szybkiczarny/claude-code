import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// Rate limit: simple in-memory store (use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!checkRateLimit(session.id)) {
    return NextResponse.json(
      { error: "Too many requests. Max 10 opens per minute." },
      { status: 429 }
    );
  }

  const body = await request.json();
  const { caseId } = body;

  if (!caseId || typeof caseId !== "string") {
    return NextResponse.json({ error: "Invalid caseId" }, { status: 400 });
  }

  const caseData = await prisma.case.findUnique({
    where: { id: caseId },
    include: { items: true },
  });

  if (!caseData || caseData.items.length === 0) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  // Server-side: verify balance
  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user || user.balance < caseData.price) {
    return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
  }

  // Weighted RNG based on rarity
  const rarityWeights: Record<string, number> = {
    "Consumer Grade": 80,
    "Industrial Grade": 64,
    "Mil-Spec Grade": 25,
    "Restricted": 8,
    "Classified": 3,
    "Covert": 1,
    "Rare Special Item": 0.26,
  };

  const weightedItems = caseData.items.flatMap((item: { rarity: string; price: number; id: string; name: string; exterior: string; imageUrl: string; float?: number | null }) => {
    const w = rarityWeights[item.rarity] ?? 1;
    return Array(Math.round(w * 100)).fill(item);
  });

  const wonItem = weightedItems[Math.floor(Math.random() * weightedItems.length)];

  // Deduct balance, add item, record transaction
  await prisma.$transaction([
    prisma.user.update({
      where: { id: session.id },
      data: { balance: { decrement: caseData.price } },
    }),
    prisma.userItem.create({
      data: { userId: session.id, itemId: wonItem.id },
    }),
    prisma.transaction.create({
      data: {
        userId: session.id,
        itemId: wonItem.id,
        type: "win",
        amount: wonItem.price,
      },
    }),
  ]);

  return NextResponse.json({ item: wonItem });
}
