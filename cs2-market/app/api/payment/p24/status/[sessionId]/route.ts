import { NextRequest, NextResponse } from "next/server";
import { paymentStore } from "@/lib/payment-store";

export async function GET(_req: NextRequest, { params }: { params: { sessionId: string } }) {
  const p = paymentStore.get(params.sessionId);
  if (!p) return NextResponse.json({ status: "not_found" });
  return NextResponse.json({ status: p.credited ? "credited" : "pending", amount: p.amountUsd });
}
