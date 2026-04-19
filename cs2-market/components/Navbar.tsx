"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import DepositModal from "@/components/DepositModal";
import { useGameStore } from "@/lib/store";

interface NavUser { displayName: string; avatarUrl: string; balance: number; }

export default function Navbar({ user: initialUser }: { user?: NavUser | null }) {
  const [open, setOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [user, setUser] = useState<NavUser | null | undefined>(initialUser);
  const { balance } = useGameStore();

  useEffect(() => {
    fetch("/api/user/me").then(r => r.json()).then(setUser).catch(() => setUser(null));
  }, []);

  const links = [
    { href: "/cases", label: "Skrzynki", icon: "📦" },
    { href: "/battle", label: "Battle", icon: "⚔️", badge: "HOT" },
    { href: "/free", label: "Darmowe", icon: "🎁", badge: "DAILY" },
  ];

  return (
    <>
    <nav className="sticky top-0 z-50" style={{
      background: "rgba(6,10,18,0.94)",
      backdropFilter: "blur(20px)",
      borderBottom: "1px solid var(--border)",
    }}>
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-0.5 flex-shrink-0">
          <span className="text-xl font-black tracking-tight" style={{
            background: "linear-gradient(135deg, #f97316, #fb923c)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>CS2</span>
          <span className="text-xl font-black tracking-tight" style={{ color: "var(--text)" }}>DROP</span>
        </Link>

        {/* Nav links — desktop */}
        <div className="hidden md:flex items-center gap-1">
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className="relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold hover:text-white hover:bg-white/5"
              style={{ color: "var(--muted2)", transition: "color 0.15s, background 0.15s" }}
            >
              <span>{l.icon}</span>
              <span>{l.label}</span>
              {(l as any).badge && (
                <span className="text-xs font-black px-1.5 py-0.5 rounded-full"
                  style={{ background: "var(--neon)", color: "white", fontSize: "8px", lineHeight: 1.2 }}>
                  {(l as any).badge}
                </span>
              )}
            </Link>
          ))}
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <button
                onClick={() => setDepositOpen(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-90"
                style={{ background: "var(--neon)", color: "white" }}
              >
                <span>+</span>
                <span>Doładuj</span>
              </button>
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold cursor-pointer"
                onClick={() => setDepositOpen(true)}
                style={{ background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--gold)" }}
              >
                ${balance.toFixed(2)}
              </div>
              <div className="relative">
                <button
                  onClick={() => setOpen(!open)}
                  className="flex items-center gap-2 p-1 rounded-lg transition-all hover:bg-white/5"
                >
                  {user.avatarUrl ? (
                    <Image src={user.avatarUrl} alt="" width={34} height={34} className="rounded-lg" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-black"
                      style={{ background: "var(--neon)" }}>
                      {user.displayName[0]?.toUpperCase()}
                    </div>
                  )}
                </button>
                {open && (
                  <div className="absolute right-0 top-full mt-2 rounded-xl border overflow-hidden w-44 shadow-2xl"
                    style={{ background: "var(--bg2)", borderColor: "var(--border2)" }}>
                    <Link href="/profile" onClick={() => setOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-white/5 transition-colors"
                      style={{ color: "var(--text)" }}>
                      👤 Mój profil
                    </Link>
                    <Link href="/inventory" onClick={() => setOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-white/5 transition-colors"
                      style={{ color: "var(--text)" }}>
                      🎒 Ekwipunek
                    </Link>
                    <div style={{ height: 1, background: "var(--border)" }} />
                    <form action="/api/auth/logout" method="POST">
                      <button type="submit" className="w-full text-left flex items-center gap-2 px-4 py-3 text-sm hover:bg-white/5 transition-colors"
                        style={{ color: "#ef4444" }}>
                        🚪 Wyloguj
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </>
          ) : (
            <a href="/api/auth/steam"
              className="btn-neon flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current flex-shrink-0">
                <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.187.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0z"/>
              </svg>
              Zaloguj Steam
            </a>
          )}
        </div>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden flex gap-1 px-4 pb-2 overflow-x-auto">
        {links.map(l => (
          <Link key={l.href} href={l.href}
            className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ color: "var(--muted2)", background: "var(--bg3)" }}>
            {l.icon} {l.label}
          </Link>
        ))}
      </div>
    </nav>
    <DepositModal open={depositOpen} onClose={() => setDepositOpen(false)} />
    </>
  );
}
