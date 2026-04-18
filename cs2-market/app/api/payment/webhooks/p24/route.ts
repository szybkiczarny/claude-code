import { NextRequest, NextResponse } from "next/server";
import { verifyTransaction, verifyWebhookSign } from "@/lib/p24";
import { paymentStore } from "@/lib/payment-store";
import { balanceStore } from "@/lib/balance-store";

const USD_TO_PLN = 4.0;

export async function POST(req: NextRequest) {
  const body = await req.json();

  // 1. verify P24 signature
  if (!verifyWebhookSign(body)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const { sessionId, orderId, amount } = body;

  // 2. look up pending payment
  const pending = paymentStore.get(sessionId);
  if (!pending) return NextResponse.json({ error: "Unknown session" }, { status: 404 });

  // 3. verify transaction with P24 API
  try {
    await verifyTransaction(sessionId, orderId, amount);
  } catch {
    return NextResponse.json({ error: "Verification failed" }, { status: 400 });
  }

  // 4. credit balance (idempotent)
  const credited = paymentStore.credit(sessionId);
  if (credited) {
    const amountUsd = Math.round((amount / 100 / USD_TO_PLN) * 100) / 100;
    balanceStore.add(credited.steamId, amountUsd);
    console.log(`✅ P24: credited $${amountUsd} to ${credited.steamId}`);
  }

  return NextResponse.json({ status: "OK" });
}
