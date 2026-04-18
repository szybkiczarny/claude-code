"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CreditCard, Check, Copy, RefreshCw, ArrowLeft } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useGameStore } from "@/lib/store";

// ─── Types ────────────────────────────────────────────────────────────────────
type Method = "blik" | "crypto" | "skins";
type Step = "select-amount" | "blik-code" | "blik-waiting" | "crypto-addr" | "skins-url" | "skins-items" | "done";

const PRESETS = [5, 10, 20, 50, 100, 200];

const CRYPTO_COINS = [
  { id: "btc",  label: "Bitcoin",  symbol: "BTC", icon: "₿",  color: "#f7931a", addr: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", rate: 0.000016 },
  { id: "eth",  label: "Ethereum", symbol: "ETH", icon: "Ξ",  color: "#627eea", addr: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F", rate: 0.00028 },
  { id: "usdt", label: "Tether",   symbol: "USDT", icon: "₮", color: "#26a17b", addr: "TN3W4H6rK2ce4vX9YnFQHwKx7X9TM9TM9T",        rate: 1 },
  { id: "sol",  label: "Solana",   symbol: "SOL", icon: "◎",  color: "#9945ff", addr: "DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmkitJDcX", rate: 0.0055 },
];


// ─── Sub-flows ─────────────────────────────────────────────────────────────────

function BlikFlow({ amount, onSuccess, onBack }: { amount: number; onSuccess: () => void; onBack: () => void }) {
  const [step, setStep] = useState<"init" | "redirect" | "polling" | "done" | "error">("init");
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [redirectUrl, setRedirectUrl] = useState("");
  const [countdown, setCountdown] = useState(120);

  const start = async () => {
    setStep("redirect");
    try {
      const res = await fetch("/api/payment/p24/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountUsd: amount }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setSessionId(data.sessionId);
      setRedirectUrl(data.redirectUrl);
      setStep("polling");
      // open P24 in new tab
      window.open(data.redirectUrl, "_blank");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Błąd");
      setStep("error");
    }
  };

  // poll for payment confirmation
  useEffect(() => {
    if (step !== "polling" || !sessionId) return;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/payment/p24/status/${sessionId}`);
      const data = await res.json();
      if (data.status === "credited") {
        clearInterval(interval);
        setStep("done");
        setTimeout(onSuccess, 800);
      }
    }, 3000);
    const timer = setInterval(() => setCountdown(c => {
      if (c <= 1) { clearInterval(timer); clearInterval(interval); setStep("error"); setError("Upłynął limit czasu"); }
      return c - 1;
    }), 1000);
    return () => { clearInterval(interval); clearInterval(timer); };
  }, [step, sessionId]);

  if (step === "init") return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-xs mb-5" style={{ color: "var(--muted)" }}>
        <ArrowLeft size={13} /> Wróć
      </button>
      <div className="text-center mb-6">
        <div className="text-5xl mb-3">📱</div>
        <p className="font-bold mb-1" style={{ color: "var(--text)" }}>Płatność BLIK via Przelewy24</p>
        <p className="text-3xl font-black" style={{ color: "var(--gold)" }}>${amount.toFixed(2)}</p>
        <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>≈ {(amount * 4).toFixed(2)} PLN</p>
      </div>
      <p className="text-xs text-center mb-5" style={{ color: "var(--muted)" }}>
        Zostaniesz przekierowany do bramki Przelewy24. Wybierz BLIK i zatwierdź kod w aplikacji bankowej.
      </p>
      <button onClick={start} className="btn-neon w-full py-3.5 rounded-xl text-sm font-bold">
        Przejdź do płatności →
      </button>
    </div>
  );

  if (step === "redirect" || step === "polling") return (
    <div className="text-center py-6">
      <div className="w-16 h-16 rounded-full border-2 mx-auto mb-4 flex items-center justify-center"
        style={{ borderColor: "var(--neon)" }}>
        <RefreshCw size={24} className="animate-spin" style={{ color: "var(--neon2)" }} />
      </div>
      {step === "redirect" ? (
        <p className="font-bold" style={{ color: "var(--text)" }}>Otwieranie bramki...</p>
      ) : (
        <>
          <p className="font-bold mb-1" style={{ color: "var(--text)" }}>Oczekiwanie na potwierdzenie</p>
          <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>
            Zatwierdź płatność BLIK w aplikacji bankowej
          </p>
          <p className="text-2xl font-black" style={{ color: "var(--gold)" }}>${amount.toFixed(2)}</p>
          <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>Czas: {countdown}s</p>
          {redirectUrl && (
            <a href={redirectUrl} target="_blank" className="text-xs underline mt-3 block" style={{ color: "var(--neon2)" }}>
              Otwórz bramkę ponownie
            </a>
          )}
        </>
      )}
    </div>
  );

  if (step === "done") return (
    <motion.div className="text-center py-6" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
      <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
        style={{ background: "rgba(34,197,94,0.15)", border: "2px solid #22c55e" }}>
        <Check size={28} color="#22c55e" />
      </div>
      <p className="font-bold" style={{ color: "var(--text)" }}>Płatność zatwierdzona!</p>
    </motion.div>
  );

  return (
    <div className="text-center py-6">
      <p className="text-red-400 font-bold mb-3">{error}</p>
      <button onClick={() => setStep("init")} className="btn-outline px-4 py-2 rounded-xl text-sm">
        Spróbuj ponownie
      </button>
    </div>
  );
}

const COIN_UI = [
  { id: "btc",       symbol: "BTC",  icon: "₿", color: "#f7931a" },
  { id: "eth",       symbol: "ETH",  icon: "Ξ", color: "#627eea" },
  { id: "usdttrc20", symbol: "USDT", icon: "₮", color: "#26a17b" },
  { id: "sol",       symbol: "SOL",  icon: "◎", color: "#9945ff" },
];

function CryptoFlow({ amount, onSuccess, onBack }: { amount: number; onSuccess: () => void; onBack: () => void }) {
  const [coin, setCoin] = useState(COIN_UI[2]);
  const [payment, setPayment] = useState<{ payment_id: string; pay_address: string; pay_amount: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const create = async (coinId: string) => {
    setLoading(true); setError(""); setPayment(null);
    try {
      const res = await fetch("/api/payment/nowpayments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountUsd: amount, coin: coinId }),
      });
      if (!res.ok) throw new Error(await res.text());
      setPayment(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Błąd");
    } finally { setLoading(false); }
  };

  // poll for confirmation
  useEffect(() => {
    if (!payment) return;
    const t = setInterval(async () => {
      const res = await fetch(`/api/payment/nowpayments/status/${payment.payment_id}`);
      const data = await res.json();
      if (data.payment_status === "finished" || data.payment_status === "confirmed") {
        clearInterval(t);
        onSuccess();
      }
    }, 5000);
    return () => clearInterval(t);
  }, [payment]);

  const copy = () => {
    if (!payment) return;
    navigator.clipboard?.writeText(payment.pay_address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const qrValue = payment ? `${coin.id}:${payment.pay_address}?amount=${payment.pay_amount}` : "";

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-xs mb-5" style={{ color: "var(--muted)" }}>
        <ArrowLeft size={13} /> Wróć
      </button>

      <div className="flex gap-2 mb-5">
        {COIN_UI.map(c => (
          <button key={c.id}
            onClick={() => { setCoin(c); create(c.id); }}
            className="flex-1 py-2 rounded-xl text-xs font-bold border transition-all"
            style={{
              background: coin.id === c.id ? `${c.color}22` : "var(--card)",
              borderColor: coin.id === c.id ? c.color : "var(--border)",
              color: coin.id === c.id ? c.color : "var(--muted2)",
            }}>
            {c.icon} {c.symbol}
          </button>
        ))}
      </div>

      {!payment && !loading && (
        <div className="text-center py-4">
          <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
            Wybierz walutę aby wygenerować adres płatności
          </p>
          <button onClick={() => create(coin.id)} className="btn-neon px-6 py-3 rounded-xl text-sm">
            Generuj adres {coin.symbol}
          </button>
          {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
        </div>
      )}

      {loading && (
        <div className="text-center py-8">
          <RefreshCw size={24} className="animate-spin mx-auto" style={{ color: "var(--neon2)" }} />
          <p className="text-xs mt-3" style={{ color: "var(--muted)" }}>Generowanie adresu...</p>
        </div>
      )}

      {payment && (
        <>
          <div className="text-center mb-4">
            <p className="text-xs mb-1" style={{ color: "var(--muted)" }}>Wyślij dokładnie</p>
            <p className="text-2xl font-black" style={{ color: coin.color }}>
              {payment.pay_amount} {coin.symbol}
            </p>
            <p className="text-xs" style={{ color: "var(--muted)" }}>≈ ${amount.toFixed(2)} USD</p>
          </div>

          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-2xl" style={{ background: "white" }}>
              <QRCodeSVG value={qrValue} size={140} />
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-xl mb-2"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <p className="text-xs flex-1 truncate font-mono" style={{ color: "var(--muted2)" }}>{payment.pay_address}</p>
            <button onClick={copy} className="flex-shrink-0 p-1.5 rounded-lg hover:bg-white/10">
              {copied ? <Check size={14} color="#22c55e" /> : <Copy size={14} style={{ color: "var(--muted2)" }} />}
            </button>
          </div>

          <p className="text-xs text-center" style={{ color: "var(--muted)" }}>
            Saldo zostanie zaktualizowane po 1 potwierdzeniu sieci
          </p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <RefreshCw size={12} className="animate-spin" style={{ color: "var(--muted)" }} />
            <p className="text-xs" style={{ color: "var(--muted)" }}>Nasłuchuję na transakcję...</p>
          </div>
        </>
      )}
    </div>
  );
}

function SkinsFlow({ onSuccess, onBack }: { amount: number; onSuccess: () => void; onBack: () => void }) {
  const [tradeUrl, setTradeUrl] = useState("");
  const [step, setStep] = useState<"idle" | "sending" | "waiting" | "escrow" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [offerId, setOfferId] = useState("");
  const [botInfo, setBotInfo] = useState<{ online: boolean; steamId: string } | null>(null);
  const [creditedUsd, setCreditedUsd] = useState(0);
  const [escrowEnds, setEscrowEnds] = useState("");
  const creditedRef = useRef(false);

  useEffect(() => {
    fetch("/api/payment/skins/bot-info").then(r => r.json()).then(setBotInfo).catch(() => null);
  }, []);

  const sendOffer = async () => {
    if (!tradeUrl.includes("steamcommunity.com/tradeoffer")) return;
    setStep("sending"); setError("");
    try {
      const res = await fetch("/api/payment/skins/send-offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tradeUrl }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setOfferId(data.offerId);
      setStep("waiting");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Błąd");
      setStep("error");
    }
  };

  // Poll for offer acceptance
  useEffect(() => {
    if (step !== "waiting") return;
    const t = setInterval(async () => {
      const url = `/api/payment/skins/status${creditedRef.current ? "?credited=true" : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === "received") {
        clearInterval(t);
        setCreditedUsd(data.creditedUsd ?? 0);
        creditedRef.current = true;
        setStep("done");
        setTimeout(onSuccess, 1500);
      } else if (data.status === "escrow") {
        clearInterval(t);
        setEscrowEnds(data.escrowEnds ?? "");
        setStep("escrow");
      } else if (data.status === "declined" || data.status === "cancelled") {
        clearInterval(t);
        setError("Oferta została odrzucona lub anulowana.");
        setStep("error");
      }
    }, 5000);
    return () => clearInterval(t);
  }, [step]);

  if (botInfo && !botInfo.online) return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-xs mb-5" style={{ color: "var(--muted)" }}>
        <ArrowLeft size={13} /> Wróć
      </button>
      <div className="text-center py-6">
        <div className="text-4xl mb-3">🤖</div>
        <p className="font-bold mb-2" style={{ color: "var(--text)" }}>Bot chwilowo offline</p>
        <p className="text-xs" style={{ color: "var(--muted)" }}>Spróbuj ponownie za kilka minut</p>
      </div>
    </div>
  );

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-xs mb-5" style={{ color: "var(--muted)" }}>
        <ArrowLeft size={13} /> Wróć
      </button>

      <div className="text-center mb-5">
        <div className="text-4xl mb-2">🔫</div>
        <p className="font-bold mb-1" style={{ color: "var(--text)" }}>Depozyt skinami CS2</p>
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          Przyjmujemy 80% wartości rynkowej Steam
        </p>
        {botInfo?.online && (
          <p className="text-xs mt-1" style={{ color: "#22c55e" }}>● Bot online</p>
        )}
      </div>

      {step === "idle" && (
        <>
          <p className="text-xs font-bold mb-2" style={{ color: "var(--muted2)" }}>Twój Trade URL Steam</p>
          <input
            type="text"
            placeholder="https://steamcommunity.com/tradeoffer/new/?partner=..."
            value={tradeUrl}
            onChange={e => setTradeUrl(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-xs border outline-none mb-3"
            style={{ background: "var(--card)", borderColor: "var(--border2)", color: "var(--text)" }}
          />
          <p className="text-xs mb-5" style={{ color: "var(--muted)" }}>
            Steam → Ekwipunek → Oferty wymiany → Mój adres URL wymiany
          </p>
          <button onClick={sendOffer} disabled={tradeUrl.length < 30}
            className="btn-neon w-full py-3 rounded-xl text-sm disabled:opacity-40">
            Wyślij ofertę wymiany →
          </button>
        </>
      )}

      {step === "sending" && (
        <div className="text-center py-8">
          <RefreshCw size={24} className="animate-spin mx-auto mb-3" style={{ color: "var(--neon2)" }} />
          <p className="text-sm" style={{ color: "var(--text)" }}>Wysyłanie oferty...</p>
        </div>
      )}

      {step === "waiting" && (
        <div className="text-center py-6">
          <div className="w-16 h-16 rounded-full border-2 mx-auto mb-4 flex items-center justify-center"
            style={{ borderColor: "var(--neon)" }}>
            <RefreshCw size={24} className="animate-spin" style={{ color: "var(--neon2)" }} />
          </div>
          <p className="font-bold mb-2" style={{ color: "var(--text)" }}>Oczekuję na akceptację</p>
          <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>
            Zaakceptuj ofertę wymiany w aplikacji Steam
          </p>
          {offerId && (
            <p className="text-xs font-mono" style={{ color: "var(--muted)" }}>Oferta #{offerId}</p>
          )}
          <div className="flex items-center justify-center gap-2 mt-4">
            <RefreshCw size={12} className="animate-spin" style={{ color: "var(--muted)" }} />
            <p className="text-xs" style={{ color: "var(--muted)" }}>Sprawdzam co 5s...</p>
          </div>
        </div>
      )}

      {step === "escrow" && (
        <div className="text-center py-6">
          <div className="text-5xl mb-3">⏳</div>
          <p className="font-bold mb-2" style={{ color: "var(--text)" }}>Ochrona handlu Steam</p>
          <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
            Steam nałożył 7-dniowe wstrzymanie wymiany na Twoim koncie.<br />
            Saldo zostanie dodane automatycznie po odblokowaniu.
          </p>
          {escrowEnds && (
            <p className="text-xs font-bold" style={{ color: "var(--gold)" }}>
              Odblokowanie: {new Date(escrowEnds).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          )}
          <p className="text-xs mt-4" style={{ color: "var(--muted)" }}>
            Aby uniknąć holdów w przyszłości, włącz Steam Guard Mobile Authenticator na swoim koncie.
          </p>
        </div>
      )}

      {step === "done" && (
        <motion.div className="text-center py-6" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ background: "rgba(34,197,94,0.15)", border: "2px solid #22c55e" }}>
            <Check size={28} color="#22c55e" />
          </div>
          <p className="font-bold mb-1" style={{ color: "var(--text)" }}>Skiny przyjęte!</p>
          <p className="text-2xl font-black" style={{ color: "var(--gold)" }}>+${creditedUsd.toFixed(2)}</p>
        </motion.div>
      )}

      {step === "error" && (
        <div className="text-center py-6">
          <p className="text-red-400 font-bold mb-3">{error}</p>
          <button onClick={() => setStep("idle")} className="btn-outline px-4 py-2 rounded-xl text-sm">
            Spróbuj ponownie
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Modal ────────────────────────────────────────────────────────────────
interface Props { open: boolean; onClose: () => void; }

export default function DepositModal({ open, onClose }: Props) {
  const [amount, setAmount] = useState(50);
  const [custom, setCustom] = useState("");
  const [method, setMethod] = useState<Method | null>(null);
  const [done, setDone] = useState(false);
  const { balance, setBalance, addTransaction } = useGameStore();

  const finalAmount = custom ? parseFloat(custom) || 0 : amount;

  const handleSuccess = () => {
    setDone(true);
    setBalance(Math.round((balance + finalAmount) * 100) / 100);
    addTransaction({
      type: "deposit",
      label: `Doładowanie ${method === "blik" ? "BLIK" : method === "crypto" ? "Crypto" : "Skiny CS2"}`,
      amount: finalAmount,
    });
    setTimeout(() => { onClose(); setMethod(null); setDone(false); setCustom(""); }, 2000);
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => { setMethod(null); setDone(false); }, 300);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={handleClose}>
          <motion.div
            className="relative rounded-3xl border w-full max-w-md overflow-hidden"
            style={{ background: "var(--bg2)", borderColor: "var(--border2)" }}
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4"
              style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2">
                <CreditCard size={17} style={{ color: "var(--neon2)" }} />
                <h2 className="text-base font-black" style={{ color: "var(--text)" }}>Doładuj saldo</h2>
              </div>
              <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-white/10"
                style={{ color: "var(--muted)" }}>
                <X size={16} />
              </button>
            </div>

            <div className="px-6 py-5 max-h-[80vh] overflow-y-auto">

              {/* Done state */}
              {done && (
                <motion.div className="text-center py-6"
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
                  <motion.div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{ background: "rgba(34,197,94,0.15)", border: "2px solid #22c55e" }}
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.1 }}>
                    <Check size={28} color="#22c55e" />
                  </motion.div>
                  <p className="text-base font-black mb-1" style={{ color: "var(--text)" }}>Doładowano!</p>
                  <p className="text-2xl font-black" style={{ color: "var(--gold)" }}>+${finalAmount.toFixed(2)}</p>
                </motion.div>
              )}

              {/* Amount selector (shown when no method selected) */}
              {!method && !done && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="flex items-center justify-between mb-4 p-3 rounded-xl"
                    style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                    <span className="text-xs" style={{ color: "var(--muted)" }}>Saldo</span>
                    <span className="font-black" style={{ color: "var(--gold)" }}>${balance.toFixed(2)}</span>
                  </div>

                  <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--muted)" }}>Kwota</p>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {PRESETS.map(p => (
                      <button key={p} onClick={() => { setAmount(p); setCustom(""); }}
                        className="py-2.5 rounded-xl text-sm font-bold transition-all"
                        style={{
                          background: amount === p && !custom ? "var(--neon)" : "var(--card)",
                          color: amount === p && !custom ? "white" : "var(--muted2)",
                          border: `1px solid ${amount === p && !custom ? "var(--neon)" : "var(--border)"}`,
                        }}>
                        ${p}
                      </button>
                    ))}
                  </div>
                  <div className="relative mb-6">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-sm"
                      style={{ color: "var(--muted2)" }}>$</span>
                    <input type="number" min="1" placeholder="Inna kwota..." value={custom}
                      onChange={e => setCustom(e.target.value)}
                      className="w-full pl-7 pr-4 py-2.5 rounded-xl text-sm border outline-none"
                      style={{ background: "var(--card)", borderColor: custom ? "var(--neon)" : "var(--border2)", color: "var(--text)" }} />
                  </div>

                  <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--muted)" }}>Metoda płatności</p>
                  <div className="space-y-2">
                    {[
                      { id: "blik" as Method,   icon: "📱", label: "BLIK",          sub: "Kod z aplikacji bankowej", color: "#3b82f6" },
                      { id: "crypto" as Method, icon: "₿",  label: "Kryptowaluty",  sub: "BTC, ETH, USDT, SOL",     color: "#f7931a" },
                      { id: "skins" as Method,  icon: "🔫", label: "Skiny CS2",     sub: "Akceptujemy 80% wartości", color: "#a855f7" },
                    ].map(m => (
                      <button key={m.id} onClick={() => setMethod(m.id)}
                        disabled={finalAmount < 1}
                        className="w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all hover:border-opacity-100 disabled:opacity-40"
                        style={{ background: "var(--card)", borderColor: "var(--border2)" }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = m.color)}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border2)")}>
                        <span className="text-2xl">{m.icon}</span>
                        <div className="flex-1">
                          <p className="text-sm font-bold" style={{ color: "var(--text)" }}>{m.label}</p>
                          <p className="text-xs" style={{ color: "var(--muted)" }}>{m.sub}</p>
                        </div>
                        <span className="text-xs font-black" style={{ color: "var(--gold)" }}>${finalAmount.toFixed(2)}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Method flows */}
              {method === "blik" && !done && (
                <BlikFlow amount={finalAmount} onSuccess={handleSuccess} onBack={() => setMethod(null)} />
              )}
              {method === "crypto" && !done && (
                <CryptoFlow amount={finalAmount} onSuccess={handleSuccess} onBack={() => setMethod(null)} />
              )}
              {method === "skins" && !done && (
                <SkinsFlow amount={finalAmount} onSuccess={handleSuccess} onBack={() => setMethod(null)} />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
