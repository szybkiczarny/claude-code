import { NextRequest, NextResponse } from "next/server";
import { registerTransaction } from "@/lib/p24";
import { paymentStore } from "@/lib/payment-store";
import { getSession } from "@/lib/session";

// PLN/USD approximate rate — in production fetch live rate
const USD_TO_PLN = 4.0;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { amountUsd } = await req.json();
  if (!amountUsd || amountUsd < 1) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });

  const sessionId = `cs2drop_${session.steamId}_${Date.now()}`;
  const amountPln = Math.round(amountUsd * USD_TO_PLN * 100); // w groszach
  const origin = process.env.NEXTAUTH_URL ?? req.nextUrl.origin;

  try {
    const { token, redirectUrl } = await registerTransaction({
      sessionId,
      amount: amountPln,
      currency: "PLN",
      description: `CS2DROP doładowanie $${amountUsd}`,
      email: `${session.steamId}@cs2drop.gg`, // P24 requires email
      urlReturn: `${origin}/payment/success?session=${sessionId}`,
      urlStatus: `${origin}/api/payment/webhooks/p24`,
      method: 154, // BLIK
    });

    // save pending payment
    paymentStore.set(sessionId, {
      id: sessionId,
      steamId: session.steamId,
      amountUsd,
      method: "p24",
      credited: false,
      createdAt: Date.now(),
    });

    return NextResponse.json({ sessionId, token, redirectUrl });
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "P24 error" },
      { status: 500 }
    );
  }
}
