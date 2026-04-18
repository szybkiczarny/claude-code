import { NextRequest, NextResponse } from "next/server";
import { createPayment, SUPPORTED_COINS } from "@/lib/nowpayments";
import { paymentStore } from "@/lib/payment-store";
import { getSession } from "@/lib/session";
import type { CoinId } from "@/lib/nowpayments";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { amountUsd, coin } = await req.json();
  if (!amountUsd || amountUsd < 1) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  if (!SUPPORTED_COINS.includes(coin)) return NextResponse.json({ error: "Invalid coin" }, { status: 400 });

  const orderId = `cs2drop_${session.steamId}_${Date.now()}`;
  const origin = process.env.NEXTAUTH_URL ?? req.nextUrl.origin;

  try {
    const payment = await createPayment({
      priceAmount: amountUsd,
      payCurrency: coin as CoinId,
      orderId,
      orderDescription: `CS2DROP doładowanie $${amountUsd}`,
      ipnCallbackUrl: `${origin}/api/payment/webhooks/nowpayments`,
    });

    paymentStore.set(payment.payment_id, {
      id: payment.payment_id,
      steamId: session.steamId,
      amountUsd,
      method: "crypto",
      credited: false,
      createdAt: Date.now(),
    });

    return NextResponse.json(payment);
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "NOWPayments error" },
      { status: 500 }
    );
  }
}
