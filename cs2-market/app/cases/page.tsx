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
    <Link href={`/case/${c.id}`}
      className="group block rounded-2xl border overflow-hidden transition-all hover:-translate-y-1"
      style={{ background: "var(--bg2)", borderColor: "var(--border)" }}>
      <div className="relative h-36 flex items-center justify-center p-4"
        style={{ background: "var(--card)" }}>
        <Image
          src={c.imageUrl}
          alt={c.name}
          width={140}
          height={100}
          className="object-contain drop-shadow-lg group-hover:scale-105 transition-transform duration-300"
          unoptimized
        />
      </div>
      <div className="p-3">
        <p className="text-xs font-bold truncate mb-1" style={{ color: "var(--text)" }}>{c.name}</p>
        <p className="text-xs mb-2" style={{ color: "var(--muted)" }}>{c.skinCount} skinów</p>
        <div className="flex items-center justify-between">
          <span className="text-sm font-black" style={{ color: "var(--gold)" }}>
            ${c.price.toFixed(2)}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full font-bold"
            style={{ background: "var(--neon)22", color: "var(--neon2)", border: "1px solid var(--neon)44" }}>
            Otwórz
          </span>
        </div>
      </div>
    </Link>
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
      .then(data => { setCases(data); setLoading(false); })
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
            <h1 className="text-2xl font-black mb-1" style={{ color: "var(--text)" }}>📦 Skrzynki CS2</h1>
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
          className="w-full px-4 py-2.5 rounded-xl border outline-none mb-6 text-sm"
          style={{ background: "var(--bg2)", borderColor: "var(--border2)", color: "var(--text)" }}
        />

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <RefreshCw size={24} className="animate-spin" style={{ color: "var(--neon2)" }} />
            <p className="ml-3 text-sm" style={{ color: "var(--muted)" }}>Ładowanie skrzynek...</p>
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
