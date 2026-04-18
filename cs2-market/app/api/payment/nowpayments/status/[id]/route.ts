import { NextRequest, NextResponse } from "next/server";
import { getPaymentStatus } from "@/lib/nowpayments";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const status = await getPaymentStatus(params.id);
    return NextResponse.json(status);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "error" },
      { status: 500 }
    );
  }
}
