import crypto from "crypto";

const SANDBOX = process.env.P24_SANDBOX !== "false";
const BASE = SANDBOX
  ? "https://sandbox.przelewy24.pl"
  : "https://secure.przelewy24.pl";

const MERCHANT_ID = Number(process.env.P24_MERCHANT_ID);
const POS_ID      = Number(process.env.P24_POS_ID ?? process.env.P24_MERCHANT_ID);
const CRC_KEY     = process.env.P24_CRC_KEY ?? "";
const API_KEY     = process.env.P24_API_KEY ?? "";

function authHeader() {
  const token = Buffer.from(`${POS_ID}:${API_KEY}`).toString("base64");
  return { Authorization: `Basic ${token}`, "Content-Type": "application/json" };
}

function p24Sign(fields: object): string {
  const json = JSON.stringify({ ...fields, crc: CRC_KEY });
  return crypto.createHash("sha384").update(json).digest("hex");
}

export interface P24Transaction {
  sessionId: string;    // unikalny ID sesji płatności
  amount: number;       // w groszach (PLN * 100)
  currency: string;     // "PLN"
  description: string;
  email: string;
  urlReturn: string;    // redirect po płatności
  urlStatus: string;    // webhook
  method?: number;      // 154 = BLIK
}

export async function registerTransaction(tx: P24Transaction) {
  const sign = p24Sign({
    sessionId: tx.sessionId,
    merchantId: MERCHANT_ID,
    amount: tx.amount,
    currency: tx.currency,
  });

  const body = {
    merchantId: MERCHANT_ID,
    posId: POS_ID,
    sessionId: tx.sessionId,
    amount: tx.amount,
    currency: tx.currency,
    description: tx.description,
    email: tx.email,
    country: "PL",
    language: "pl",
    method: tx.method ?? 154, // 154 = BLIK
    urlReturn: tx.urlReturn,
    urlStatus: tx.urlStatus,
    sign,
  };

  const res = await fetch(`${BASE}/api/v1/transaction/register`, {
    method: "POST",
    headers: authHeader(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`P24 register failed: ${err}`);
  }

  const data = await res.json();
  // data.data.token — token do przekierowania
  return {
    token: data.data.token as string,
    redirectUrl: `${BASE}/trnRequest/${data.data.token}`,
  };
}

export async function verifyTransaction(sessionId: string, orderId: number, amount: number) {
  const sign = p24Sign({ sessionId, orderId, merchantId: MERCHANT_ID, amount, currency: "PLN" });

  const res = await fetch(`${BASE}/api/v1/transaction/verify`, {
    method: "PUT",
    headers: authHeader(),
    body: JSON.stringify({
      merchantId: MERCHANT_ID,
      posId: POS_ID,
      sessionId,
      amount,
      currency: "PLN",
      orderId,
      sign,
    }),
  });

  if (!res.ok) throw new Error(`P24 verify failed: ${await res.text()}`);
  return (await res.json()) as { data: { status: string } };
}

export function verifyWebhookSign(body: {
  merchantId: number; posId: number; sessionId: string;
  amount: number; currency: string; orderId: number; sign: string;
}): boolean {
  const expected = p24Sign({
    merchantId: body.merchantId,
    posId: body.posId,
    sessionId: body.sessionId,
    amount: body.amount,
    currency: body.currency,
    orderId: body.orderId,
  });
  return expected === body.sign;
}
