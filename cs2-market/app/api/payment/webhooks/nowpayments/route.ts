import { NextRequest, NextResponse } from "next/server";
import { verifyIpnSignature } from "@/lib/nowpayments";
import { paymentStore } from "@/lib/payment-store";
import { balanceStore } from "@/lib/balance-store";

const FINISHED = new Set(["finished", "confirmed"]);

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-nowpayments-sig") ?? "";

  if (!verifyIpnSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const body = JSON.parse(rawBody);
  const { payment_id, payment_status, price_amount } = body;

  if (!FINISHED.has(payment_status)) {
    return NextResponse.json({ status: "pending" });
  }

  const credited = paymentStore.credit(String(payment_id));
  if (credited) {
    balanceStore.add(credited.steamId, price_amount);
    console.log(`✅ Crypto: credited $${price_amount} to ${credited.steamId}`);
  }

  return NextResponse.json({ status: "OK" });
}
