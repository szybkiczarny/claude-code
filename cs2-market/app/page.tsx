"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import LiveDropsSidebar from "@/components/LiveDropsSidebar";
import LiveTicker from "@/components/LiveTicker";
import Image from "next/image";
import Link from "next/link";
import { LIVE_DROPS, rarityColor } from "@/lib/mock-data";

interface CaseMeta {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  skinCount: number;
}

function HomeCaseCard({ c }: { c: CaseMeta }) {
  return (
    <Link href={`/case/${c.id}`} className="block card-hover">
      <div
        className="relative rounded-2xl border overflow-hidden"
        style={{
          background: "var(--card)",
          borderColor: "var(--border)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
          transition: "border-color 0.2s ease, box-shadow 0.2s ease",
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLElement;
          el.style.borderColor = "rgba(249,115,22,0.5)";
          el.style.boxShadow = "0 8px 32px rgba(249,115,22,0.2)";
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLElement;
          el.style.borderColor = "var(--border)";
          el.style.boxShadow = "0 2px 12px rgba(0,0,0,0.4)";
        }}
      >
        <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, transparent, var(--neon), transparent)" }} />

        <div className="flex items-center justify-center py-5 px-4"
          style={{ background: "radial-gradient(ellipse at center, rgba(249,115,22,0.1) 0%, transparent 70%)" }}>
          <Image
            src={c.imageUrl}
            alt={c.name}
            width={130}
            height={96}
            className="object-contain"
            style={{ filter: "drop-shadow(0 4px 14px rgba(0,0,0,0.6))" }}
            unoptimized
          />
        </div>

        <div className="px-4 pb-4">
          <h3 className="font-bold text-sm mb-1 truncate" style={{ color: "var(--text)" }}>{c.name}</h3>
          <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>{c.skinCount} skinów</p>
          <div className="flex items-center justify-between">
            <span className="text-base font-black" style={{ color: "var(--gold)" }}>${c.price.toFixed(2)}</span>
            <div className="text-xs font-bold px-3 py-1.5 rounded-lg"
              style={{ background: "rgba(249,115,22,0.15)", color: "var(--neon2)", border: "1px solid rgba(249,115,22,0.3)" }}>
              Otwórz
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function Home() {
  const [cases, setCases] = useState<CaseMeta[]>([]);
  const [onlineCount, setOnlineCount] = useState(12483);

  useEffect(() => {
    fetch("/api/cs2/cases")
      .then(r => r.json())
      .then((data: CaseMeta[]) => setCases(Array.isArray(data) ? data.slice(0, 6) : []))
      .catch(() => null);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setOnlineCount(prev => prev + Math.floor(Math.random() * 7) - 3);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ background: "var(--bg)" }}>
      <Navbar />
      <LiveTicker />

      <div className="flex min-h-screen">
        <div className="flex-1 min-w-0">

          {/* Hero */}
          <div className="relative overflow-hidden px-6 py-12 sm:py-16" style={{
            background: "linear-gradient(135deg, #080e1a 0%, #060a12 40%, #0c0f08 100%)",
            borderBottom: "1px solid var(--border)",
            minHeight: "320px",
          }}>
            {/* Ambient glows */}
            <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle, rgba(249,115,22,0.12) 0%, transparent 70%)" }} />
            <div className="absolute bottom-0 right-1/3 w-64 h-64 rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)" }} />

            <div className="relative flex items-center justify-between gap-8 max-w-5xl">
              {/* Left: text */}
              <div className="flex-1 min-w-0">
                {/* Online badge */}
                <div className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 rounded-full text-xs font-bold"
                  style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", color: "#22c55e" }}>
                  <span className="pulse-dot w-1.5 h-1.5 rounded-full" style={{ background: "#22c55e" }} />
                  {onlineCount.toLocaleString("pl-PL")} graczy online
                </div>

                <h1 className="text-3xl sm:text-5xl font-black mb-3 leading-tight" style={{ color: "var(--text)" }}>
                  Otwieraj skrzynki<br />
                  <span style={{
                    background: "linear-gradient(135deg, #f97316, #fb923c, #fbbf24)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}>
                    i wygrywaj skiny CS2
                  </span>
                </h1>

                <p className="text-sm mb-7 max-w-md" style={{ color: "var(--muted2)" }}>
                  Natychmiastowe wypłaty · Uczciwy RNG · Darmowa skrzynka każdego dnia
                </p>

                <div className="flex flex-wrap gap-3">
                  <a href="/api/auth/steam" className="btn-neon flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current flex-shrink-0">
                      <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.187.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0z"/>
                    </svg>
                    Zaloguj przez Steam
                  </a>
                  <a href="/cases" className="btn-outline flex items-center gap-2 px-6 py-3 rounded-xl text-sm">
                    📦 Przeglądaj skrzynki
                  </a>
                </div>

                {/* Stats */}
                <div className="flex flex-wrap gap-6 mt-8">
                  {[
                    { v: "4.2M+", l: "Otwartych skrzynek" },
                    { v: "$890K", l: "Wypłacono dziś" },
                    { v: "237K+", l: "Graczy" },
                  ].map(s => (
                    <div key={s.l}>
                      <div className="text-xl font-black" style={{ color: "var(--gold)" }}>{s.v}</div>
                      <div className="text-xs" style={{ color: "var(--muted)" }}>{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: featured case */}
              {cases.length > 0 && (
                <div className="hidden md:flex flex-col items-center flex-shrink-0 relative">
                  <div className="absolute inset-0 rounded-full blur-3xl pointer-events-none"
                    style={{ background: "rgba(249,115,22,0.2)", transform: "scale(1.2)" }} />
                  <Link href={`/case/${cases[0].id}`} className="relative float block">
                    <Image
                      src={cases[0].imageUrl}
                      alt={cases[0].name}
                      width={220}
                      height={160}
                      className="object-contain"
                      style={{ filter: "drop-shadow(0 8px 32px rgba(249,115,22,0.5))" }}
                      unoptimized
                    />
                  </Link>
                  <div className="relative mt-3 text-center">
                    <div className="text-xs font-semibold mb-1" style={{ color: "var(--muted2)" }}>{cases[0].name}</div>
                    <Link href={`/case/${cases[0].id}`}
                      className="btn-neon inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold">
                      Otwórz — ${cases[0].price.toFixed(2)}
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Modes bar */}
          <div className="flex overflow-x-auto" style={{ background: "var(--bg2)", borderBottom: "1px solid var(--border)" }}>
            {[
              { href: "/cases", icon: "📦", label: "Skrzynki", active: true },
              { href: "/battle", icon: "⚔️", label: "Battle", badge: "HOT" },
              { href: "/free", icon: "🎁", label: "Darmowe", badge: "DAILY" },
            ].map(m => (
              <a key={m.href} href={m.href}
                className="flex items-center gap-2 px-5 py-3 text-sm font-semibold flex-shrink-0 hover:bg-white/5 relative"
                style={{
                  color: m.active ? "var(--text)" : "var(--muted2)",
                  transition: "color 0.15s, background 0.15s",
                  borderBottom: m.active ? "2px solid var(--neon)" : "2px solid transparent",
                }}>
                <span>{m.icon}</span>
                <span>{m.label}</span>
                {m.badge && (
                  <span className="text-xs font-black px-1.5 py-0.5 rounded-full"
                    style={{ background: "var(--neon)", color: "white", fontSize: "9px" }}>
                    {m.badge}
                  </span>
                )}
              </a>
            ))}
          </div>

          {/* Cases grid */}
          <div className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-black" style={{ color: "var(--text)" }}>Popularne skrzynki</h2>
              <a href="/cases" className="text-xs font-semibold hover:underline" style={{ color: "var(--neon2)" }}>
                Zobacz wszystkie →
              </a>
            </div>

            {cases.length === 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border animate-pulse" style={{
                    background: "var(--card)", borderColor: "var(--border)", height: 200,
                  }} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {cases.map(c => <HomeCaseCard key={c.id} c={c} />)}
              </div>
            )}
          </div>

          {/* Biggest wins */}
          <div className="px-5 sm:px-6 pb-8">
            <h2 className="text-base font-black mb-4" style={{ color: "var(--text)" }}>Największe wygrane dziś 🏆</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {LIVE_DROPS.filter(d => d.price >= 400).map((drop, i) => {
                const c = rarityColor(drop.rarity);
                return (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl border card-hover"
                    style={{
                      background: "var(--card)",
                      borderColor: `${c}28`,
                      borderLeft: `3px solid ${c}`,
                      transition: "border-color 0.2s, box-shadow 0.2s, transform 0.2s",
                    }}>
                    <span className="text-2xl flex-shrink-0">{drop.avatar}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold truncate" style={{ color: "var(--text)" }}>{drop.item}</div>
                      <div className="text-xs" style={{ color: "var(--muted)" }}>{drop.user} · {drop.caseName}</div>
                    </div>
                    <div className="text-base font-black flex-shrink-0" style={{ color: c }}>
                      ${drop.price >= 1000 ? (drop.price / 1000).toFixed(1) + "K" : drop.price}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <footer className="border-t" style={{ borderColor: "var(--border)", background: "var(--bg2)" }}>
            {/* Stats bar */}
            <div className="flex flex-wrap items-center justify-center gap-8 px-6 py-5 border-b"
              style={{ borderColor: "var(--border)" }}>
              {[
                { icon: "👥", v: "237K+", l: "Graczy" },
                { icon: "📦", v: "4.2M+", l: "Skrzynek otwartych" },
                { icon: "💰", v: "$12.4M", l: "Łączne wypłaty" },
                { icon: "⚔️", v: "89K+", l: "Bitew rozegranych" },
              ].map(s => (
                <div key={s.l} className="flex items-center gap-2">
                  <span className="text-lg">{s.icon}</span>
                  <div>
                    <div className="text-sm font-black" style={{ color: "var(--text)" }}>{s.v}</div>
                    <div className="text-xs" style={{ color: "var(--muted)" }}>{s.l}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Social + legal */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4">
              <div className="flex items-center gap-3">
                {["Discord", "X (Twitter)", "YouTube", "Telegram"].map(s => (
                  <span key={s} className="text-xs cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ color: "var(--muted2)" }}>
                    {s}
                  </span>
                ))}
              </div>
              <p className="text-xs text-center" style={{ color: "var(--muted)" }}>
                CS2DROP nie jest powiązany z Valve Corporation · CS2 i Steam są znakami towarowymi Valve
              </p>
            </div>
          </footer>
        </div>

        {/* Live drops sidebar */}
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
