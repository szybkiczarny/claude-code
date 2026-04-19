"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useGameStore } from "@/lib/store";
import { RefreshCw } from "lucide-react";

interface CaseMeta {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  skinCount: number;
}

function CaseCard({ c }: { c: CaseMeta }) {
  return (
    <Link href={`/case/${c.id}`} className="block card-hover group">
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

        <div className="relative h-36 flex items-center justify-center p-4"
          style={{ background: "radial-gradient(ellipse at center, rgba(249,115,22,0.1) 0%, transparent 70%)" }}>
          <Image
            src={c.imageUrl}
            alt={c.name}
            width={140}
            height={104}
            className="object-contain transition-transform duration-300 group-hover:scale-105"
            style={{ filter: "drop-shadow(0 4px 14px rgba(0,0,0,0.6))" }}
            unoptimized
          />
        </div>

        <div className="p-3">
          <p className="text-xs font-bold truncate mb-1" style={{ color: "var(--text)" }}>{c.name}</p>
          <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>{c.skinCount} skinów</p>
          <div className="flex items-center justify-between">
            <span className="text-sm font-black" style={{ color: "var(--gold)" }}>
              ${c.price.toFixed(2)}
            </span>
            <span className="text-xs px-2.5 py-1 rounded-lg font-bold"
              style={{
                background: "rgba(249,115,22,0.15)",
                color: "var(--neon2)",
                border: "1px solid rgba(249,115,22,0.3)",
              }}>
              Otwórz
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
      <div className="h-0.5 w-full shimmer" style={{ background: "var(--border2)" }} />
      <div className="h-36 shimmer" style={{ background: "var(--bg3)" }} />
      <div className="p-3 space-y-2">
        <div className="h-3 rounded shimmer" style={{ background: "var(--border2)", width: "70%" }} />
        <div className="h-2.5 rounded shimmer" style={{ background: "var(--border2)", width: "45%" }} />
        <div className="h-7 rounded-lg shimmer" style={{ background: "var(--border2)" }} />
      </div>
    </div>
  );
}

export default function CasesPage() {
  const [cases, setCases] = useState<CaseMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { balance } = useGameStore();

  useEffect(() => {
    fetch("/api/cs2/cases")
      .then(r => r.json())
      .then(data => { setCases(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = cases.filter(c =>
    search === "" || c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black mb-1" style={{ color: "var(--text)" }}>
              Skrzynki CS2
            </h1>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              {loading ? "Ładowanie..." : `${cases.length} oficjalnych skrzynek`}
            </p>
          </div>
          <div className="px-4 py-2 rounded-xl text-sm hidden sm:block"
            style={{ background: "var(--bg2)", border: "1px solid var(--border)" }}>
            <span style={{ color: "var(--muted)" }}>Saldo: </span>
            <span className="font-black" style={{ color: "var(--gold)" }}>${balance.toFixed(2)}</span>
          </div>
        </div>

        <input
          type="text"
          placeholder="Szukaj skrzynki..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border outline-none mb-6 text-sm"
          style={{
            background: "var(--bg2)",
            borderColor: "var(--border2)",
            color: "var(--text)",
            transition: "border-color 0.15s",
          }}
          onFocus={e => (e.target.style.borderColor = "var(--neon)")}
          onBlur={e => (e.target.style.borderColor = "var(--border2)")}
        />

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 15 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20" style={{ color: "var(--muted)" }}>
            Brak wyników dla &quot;{search}&quot;
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filtered.map(c => <CaseCard key={c.id} c={c} />)}
          </div>
        )}
      </div>
    </div>
  );
}
