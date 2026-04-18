"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import CaseCard from "@/components/CaseCard";
import LiveDropsSidebar from "@/components/LiveDropsSidebar";
import { LIVE_DROPS, rarityColor } from "@/lib/mock-data";
import type { Case } from "@/lib/mock-data";

export default function Home() {
  const [cases, setCases] = useState<Case[]>([]);

  useEffect(() => {
    fetch("/api/cs2/cases")
      .then(r => r.json())
      .then((data: Case[]) => setCases(data.slice(0, 6)))
      .catch(() => null);
  }, []);

  return (
    <div style={{ background: "var(--bg)" }}>
      <Navbar />

      <div className="flex min-h-screen">
        <div className="flex-1 min-w-0">

          {/* Hero banner */}
          <div className="relative overflow-hidden px-6 py-12" style={{
            background: "linear-gradient(135deg, #0e0820 0%, #0a0a15 50%, #110828 100%)",
            borderBottom: "1px solid var(--border)",
          }}>
            <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
              style={{ background: "var(--neon)" }} />
            <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full opacity-10 blur-3xl pointer-events-none"
              style={{ background: "#4f46e5" }} />

            <div className="relative max-w-2xl">
              <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full text-xs font-bold"
                style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", color: "#a855f7" }}>
                <span className="pulse-dot w-1.5 h-1.5 rounded-full" style={{ background: "#a855f7" }} />
                12,483 graczy online
              </div>

              <h1 className="text-3xl sm:text-5xl font-black mb-3 leading-tight" style={{ color: "var(--text)" }}>
                Otwieraj skrzynki<br />
                <span style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7, #c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  i wygrywaj skiny CS2
                </span>
              </h1>
              <p className="text-sm mb-6 max-w-md" style={{ color: "var(--muted2)" }}>
                Natychmiastowe wypłaty · Uczciwy RNG · Darmowa skrzynka każdego dnia
              </p>

              <div className="flex flex-wrap gap-3">
                <a href="/api/auth/steam" className="btn-neon flex items-center gap-2 px-6 py-3 rounded-xl text-sm">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                    <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.187.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0z"/>
                  </svg>
                  Zaloguj przez Steam
                </a>
                <a href="/cases" className="btn-outline flex items-center gap-2 px-6 py-3 rounded-xl text-sm">
                  📦 Wszystkie skrzynki
                </a>
              </div>

              <div className="flex flex-wrap gap-6 mt-8">
                {[
                  { v: "4.2M+", l: "Otwartych skrzynek" },
                  { v: "$890K", l: "Wypłacono dziś" },
                  { v: "99.2%", l: "Zadowolonych graczy" },
                ].map(s => (
                  <div key={s.l}>
                    <div className="text-lg font-black" style={{ color: "var(--neon2)" }}>{s.v}</div>
                    <div className="text-xs" style={{ color: "var(--muted)" }}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Modes bar */}
          <div className="flex gap-px overflow-x-auto" style={{ background: "var(--bg2)", borderBottom: "1px solid var(--border)" }}>
            {[
              { href: "/cases", icon: "📦", label: "Skrzynki" },
              { href: "/battle", icon: "⚔️", label: "Battle", badge: "NOWE" },
              { href: "/free", icon: "🎁", label: "Darmowe", badge: "DAILY" },
            ].map(m => (
              <a key={m.href} href={m.href}
                className="flex items-center gap-2 px-5 py-3 text-sm font-semibold flex-shrink-0 relative hover:bg-white/5 transition-colors"
                style={{ color: "var(--muted2)" }}>
                <span>{m.icon}</span>
                <span>{m.label}</span>
                {m.badge && (
                  <span className="text-xs font-black px-1.5 py-0.5 rounded-full" style={{ background: "var(--neon)", color: "white", fontSize: "9px" }}>
                    {m.badge}
                  </span>
                )}
              </a>
            ))}
          </div>

          {/* Cases grid */}
          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-black" style={{ color: "var(--text)" }}>Dostępne skrzynki</h2>
              <a href="/cases" className="text-xs font-semibold hover:underline" style={{ color: "var(--neon2)" }}>Zobacz wszystkie →</a>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {cases.map(c => <CaseCard key={c.id} c={c} />)}
            </div>
          </div>

          {/* Recent big wins */}
          <div className="px-4 sm:px-6 pb-6">
            <h2 className="text-base font-black mb-4" style={{ color: "var(--text)" }}>Największe wygrane dziś 🏆</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {LIVE_DROPS.filter(d => d.price >= 400).map((drop, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl border"
                  style={{ background: "var(--card)", borderColor: `${rarityColor(drop.rarity)}33`, borderLeft: `3px solid ${rarityColor(drop.rarity)}` }}>
                  <span className="text-2xl">{drop.avatar}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate" style={{ color: "var(--text)" }}>{drop.item}</div>
                    <div className="text-xs" style={{ color: "var(--muted)" }}>{drop.user} · {drop.caseName}</div>
                  </div>
                  <div className="text-base font-black flex-shrink-0" style={{ color: rarityColor(drop.rarity) }}>
                    ${drop.price >= 1000 ? (drop.price / 1000).toFixed(1) + "K" : drop.price}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <footer className="px-6 py-6 text-center text-xs border-t" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
            CS2DROP nie jest powiązany z Valve Corporation · CS2 i Steam są znakami towarowymi Valve
          </footer>
        </div>

        <div className="hidden lg:flex flex-col flex-shrink-0" style={{
          width: "220px", borderLeft: "1px solid var(--border)",
          height: "calc(100vh - 64px)", position: "sticky", top: "64px",
        }}>
          <LiveDropsSidebar />
        </div>
      </div>
    </div>
  );
}
