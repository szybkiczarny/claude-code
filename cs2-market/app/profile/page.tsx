"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { TrendingUp, Package, Clock, Wallet } from "lucide-react";
import Navbar from "@/components/Navbar";
import DepositModal from "@/components/DepositModal";
import { rarityColor } from "@/lib/mock-data";
import { useGameStore } from "@/lib/store";
import type { Transaction } from "@/lib/store";

interface SessionUser { displayName: string; avatarUrl: string; steamId: string; }

const TX_ICON: Record<string, string> = {
  open: "🎰",
  sell: "💰",
  deposit: "💳",
  battle_win: "🏆",
  battle_lose: "💔",
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2, "0")}.${(d.getMonth() + 1).toString().padStart(2, "0")}`;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [depositOpen, setDepositOpen] = useState(false);
  const { balance, inventory, transactions, sellFromInventory, addTransaction, setBalance } = useGameStore();

  useEffect(() => {
    fetch("/api/user/me").then(r => r.json()).then(u => {
      if (!u) router.push("/");
      else setUser(u);
    });
  }, []);

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
      <div className="text-sm animate-pulse" style={{ color: "var(--muted)" }}>Ładowanie...</div>
    </div>
  );

  const inventoryValue = inventory.reduce((s, i) => s + i.price, 0);

  const handleSell = (skinId: string, skinName: string, price: number) => {
    const net = Math.round(price * 0.95 * 100) / 100;
    sellFromInventory(skinId, net);
    setBalance(Math.round((balance + net) * 100) / 100);
    addTransaction({ type: "sell", label: `Sprzedano: ${skinName}`, amount: net });
  };

  return (
    <>
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="rounded-2xl border p-5 mb-5 flex flex-col sm:flex-row items-center sm:items-start gap-5"
          style={{ background: "var(--bg2)", borderColor: "var(--border)" }}>
          {user.avatarUrl ? (
            <Image src={user.avatarUrl} alt="" width={72} height={72} className="rounded-xl flex-shrink-0"
              unoptimized />
          ) : (
            <div className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-black flex-shrink-0"
              style={{ background: "var(--neon)", color: "white" }}>
              {user.displayName[0]?.toUpperCase()}
            </div>
          )}

          <div className="flex-1 text-center sm:text-left min-w-0">
            <h1 className="text-xl font-black truncate mb-0.5" style={{ color: "var(--text)" }}>
              {user.displayName}
            </h1>
            <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>Steam ID: {user.steamId}</p>

            <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
              {[
                { label: "Saldo", value: `$${balance.toFixed(2)}`, color: "var(--gold)", icon: <Wallet size={14} /> },
                { label: "Wartość inv.", value: `$${inventoryValue.toFixed(0)}`, color: "var(--neon2)", icon: <Package size={14} /> },
                { label: "Transakcje", value: String(transactions.length), color: "var(--text)", icon: <Clock size={14} /> },
              ].map(s => (
                <div key={s.label} className="text-center px-4 py-2 rounded-xl"
                  style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center justify-center gap-1 text-lg font-black" style={{ color: s.color }}>
                    {s.icon}{s.value}
                  </div>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => setDepositOpen(true)}
            className="btn-neon px-5 py-2.5 rounded-xl text-sm flex-shrink-0 flex items-center gap-2"
          >
            <Wallet size={15} /> + Doładuj
          </button>
        </div>

        <div className="grid md:grid-cols-5 gap-5">
          {/* Inventory */}
          <div className="md:col-span-3 rounded-2xl border p-5"
            style={{ background: "var(--bg2)", borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-black uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                Ekwipunek
              </h2>
              {inventory.length > 0 && (
                <span className="text-xs font-bold" style={{ color: "var(--neon2)" }}>
                  {inventory.length} szt.
                </span>
              )}
            </div>

            {inventory.length === 0 ? (
              <div className="text-center py-10">
                <div className="text-4xl mb-3">🎒</div>
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  Ekwipunek jest pusty.<br />Otwórz skrzynkę i zachowaj skin!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {inventory.map((item) => {
                  const c = rarityColor(item.rarity);
                  return (
                    <div key={item.id} className="group rounded-xl border p-2.5 text-center relative overflow-hidden"
                      style={{ background: "var(--card)", borderColor: `${c}33`, borderTop: `2px solid ${c}` }}>
                      <div className="text-3xl mb-1">🔫</div>
                      <div className="text-xs font-bold truncate" style={{ color: "var(--text)" }}>
                        {item.name.split(" | ")[1] ?? item.name}
                      </div>
                      <div className="text-xs" style={{ color: "var(--muted)" }}>{item.exterior}</div>
                      <div className="text-xs font-black mt-1" style={{ color: c }}>${item.price}</div>

                      {/* Sell overlay on hover */}
                      <div className="absolute inset-0 flex items-center justify-center rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: "rgba(0,0,0,0.75)" }}>
                        <button
                          onClick={() => handleSell(item.id, item.name, item.price)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                          style={{ background: "var(--neon)", color: "white" }}
                        >
                          <TrendingUp size={12} /> ${(item.price * 0.95).toFixed(2)}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* History */}
          <div className="md:col-span-2 rounded-2xl border p-5"
            style={{ background: "var(--bg2)", borderColor: "var(--border)" }}>
            <h2 className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: "var(--muted)" }}>
              Historia
            </h2>

            {transactions.length === 0 ? (
              <div className="text-center py-10">
                <div className="text-4xl mb-3">📋</div>
                <p className="text-xs" style={{ color: "var(--muted)" }}>Brak transakcji.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {transactions.map((tx: Transaction) => (
                  <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: "var(--card)" }}>
                    <span className="text-lg flex-shrink-0">{TX_ICON[tx.type] ?? "📦"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold truncate" style={{ color: "var(--text)" }}>
                        {tx.label}
                      </div>
                      <div className="text-xs" style={{ color: "var(--muted)" }}>
                        {fmtDate(tx.date)}{tx.caseName ? ` · ${tx.caseName}` : ""}
                      </div>
                    </div>
                    <span className="text-xs font-black flex-shrink-0"
                      style={{ color: tx.amount >= 0 ? "#22c55e" : "#ef4444" }}>
                      {tx.amount >= 0 ? "+" : ""}${Math.abs(tx.amount).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    <DepositModal open={depositOpen} onClose={() => setDepositOpen(false)} />
    </>
  );
}
