import crypto from "crypto";

const BASE    = "https://api.nowpayments.io/v1";
const API_KEY = process.env.NOWPAYMENTS_API_KEY ?? "";
const IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET ?? "";

const headers = () => ({ "x-api-key": API_KEY, "Content-Type": "application/json" });

export const SUPPORTED_COINS = ["btc", "eth", "usdttrc20", "sol"] as const;
export type CoinId = typeof SUPPORTED_COINS[number];

export const COIN_LABELS: Record<CoinId, { label: string; symbol: string; icon: string; color: string }> = {
  btc:       { label: "Bitcoin",  symbol: "BTC",  icon: "₿",  color: "#f7931a" },
  eth:       { label: "Ethereum", symbol: "ETH",  icon: "Ξ",  color: "#627eea" },
  usdttrc20: { label: "USDT TRC20", symbol: "USDT", icon: "₮", color: "#26a17b" },
  sol:       { label: "Solana",   symbol: "SOL",  icon: "◎",  color: "#9945ff" },
};

export interface NowPayment {
  payment_id: string;
  payment_status: string; // waiting | confirming | confirmed | finished | failed | expired
  pay_address: string;
  pay_amount: number;
  pay_currency: string;
  price_amount: number;
  price_currency: string;
  order_id: string;
}

export async function createPayment(params: {
  priceAmount: number;      // USD
  payCurrency: CoinId;
  orderId: string;
  orderDescription: string;
  ipnCallbackUrl: string;
}): Promise<NowPayment> {
  const res = await fetch(`${BASE}/payment`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      price_amount: params.priceAmount,
      price_currency: "usd",
      pay_currency: params.payCurrency,
      order_id: params.orderId,
      order_description: params.orderDescription,
      ipn_callback_url: params.ipnCallbackUrl,
      is_fixed_rate: false,
      is_fee_paid_by_user: false,
    }),
  });
  if (!res.ok) throw new Error(`NOWPayments create failed: ${await res.text()}`);
  return res.json();
}

export async function getPaymentStatus(paymentId: string): Promise<NowPayment> {
  const res = await fetch(`${BASE}/payment/${paymentId}`, { headers: headers() });
  if (!res.ok) throw new Error(`NOWPayments status failed: ${await res.text()}`);
  return res.json();
}

export function verifyIpnSignature(rawBody: string, signature: string): boolean {
  const hmac = crypto.createHmac("sha512", IPN_SECRET).update(rawBody).digest("hex");
  return hmac === signature;
}
