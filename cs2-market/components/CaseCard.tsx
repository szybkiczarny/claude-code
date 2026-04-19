"use client";

import Image from "next/image";
import Link from "next/link";
import type { Case } from "@/lib/mock-data";

export default function CaseCard({ c }: { c: Case }) {
  const skins = c.skins ?? (c as any).items ?? [];
  const topRarity = skins.length > 0
    ? skins.reduce((best: string, item: { rarity: string }) => {
        const order = ["Rare Special Item", "Covert", "Classified", "Restricted", "Mil-Spec Grade", "Industrial Grade", "Consumer Grade"];
        return order.indexOf(item.rarity) < order.indexOf(best) ? item.rarity : best;
      }, skins[0]?.rarity ?? "Consumer Grade")
    : "Consumer Grade";

  const RARITY_COLORS: Record<string, string> = {
    "Consumer Grade":    "#b0c3d9",
    "Industrial Grade":  "#5e98d9",
    "Mil-Spec Grade":    "#4b69ff",
    "Restricted":        "#8847ff",
    "Classified":        "#d32ce6",
    "Covert":            "#eb4b4b",
    "Rare Special Item": "#ffd700",
  };
  const color = RARITY_COLORS[topRarity] ?? "#f97316";

  return (
    <Link href={`/case/${c.id}`} className="block card-hover">
      <div
        className="relative rounded-2xl border overflow-hidden"
        style={{
          background: "var(--card)",
          borderColor: "var(--border)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLElement;
          el.style.borderColor = `${color}66`;
          el.style.boxShadow = `0 8px 32px ${color}28`;
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLElement;
          el.style.borderColor = "var(--border)";
          el.style.boxShadow = "0 2px 12px rgba(0,0,0,0.4)";
        }}
      >
        {/* Rarity line */}
        <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />

        {/* Tag */}
        {(c as any).tag && (
          <div className="absolute top-2 left-2 z-10 text-xs font-black px-2 py-0.5 rounded-full"
            style={{ background: `${(c as any).tagColor}22`, color: (c as any).tagColor, border: `1px solid ${(c as any).tagColor}44` }}>
            {(c as any).tag}
          </div>
        )}

        {/* Image */}
        <div className="flex items-center justify-center py-5 px-4"
          style={{ background: `radial-gradient(ellipse at center, ${color}12 0%, transparent 70%)` }}>
          {c.imageUrl ? (
            <Image
              src={c.imageUrl}
              alt={c.name}
              width={130}
              height={96}
              className="object-contain transition-transform duration-300 group-hover:scale-105"
              style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5))" }}
              unoptimized
            />
          ) : (
            <div className="text-7xl">📦</div>
          )}
        </div>

        {/* Info */}
        <div className="px-4 pb-4">
          <h3 className="font-bold text-sm mb-1.5 truncate" style={{ color: "var(--text)" }}>{c.name}</h3>

          {/* Rarity dots */}
          {skins.length > 0 && (
            <div className="flex items-center gap-1 mb-3">
              {skins.slice(0, 6).map((item: { rarity: string; rarityColor?: string }, i: number) => (
                <div key={i} className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: item.rarityColor ?? RARITY_COLORS[item.rarity] ?? "#b0c3d9" }} />
              ))}
            </div>
          )}

          <div className="flex items-center justify-between">
            {c.price === 0
              ? <span className="text-base font-black" style={{ color: "#22c55e" }}>DARMOWA</span>
              : <span className="text-base font-black" style={{ color: "var(--gold)" }}>${c.price.toFixed(2)}</span>
            }
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
