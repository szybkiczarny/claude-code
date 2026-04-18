"use client";

import Image from "next/image";
import Link from "next/link";
import { rarityColor } from "@/lib/mock-data";
import type { Case } from "@/lib/mock-data";

export default function CaseCard({ c }: { c: Case }) {
  const skins = c.skins ?? c.items ?? [];
  const topRarity = skins.reduce((best, item) => {
    const order = ["Covert", "Classified", "Restricted", "Mil-Spec Grade", "Industrial Grade", "Consumer Grade"];
    return order.indexOf(item.rarity) < order.indexOf(best) ? item.rarity : best;
  }, skins[0]?.rarity ?? "Consumer Grade");

  const color = rarityColor(topRarity);

  return (
    <Link href={`/case/${c.id}`}>
      <div
        className="relative rounded-2xl border overflow-hidden cursor-pointer group transition-all duration-300 hover:-translate-y-2"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.borderColor = `${color}66`;
          (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 40px ${color}22`;
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
          (e.currentTarget as HTMLElement).style.boxShadow = "none";
        }}
      >
        {c.tag && (
          <div className="absolute top-2 left-2 z-10 text-xs font-black px-2 py-0.5 rounded-full"
            style={{ background: `${c.tagColor}22`, color: c.tagColor, border: `1px solid ${c.tagColor}44` }}>
            {c.tag}
          </div>
        )}

        <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />

        <div className="flex items-center justify-center py-4 px-4"
          style={{ background: `radial-gradient(ellipse at center, ${color}11 0%, transparent 70%)` }}>
          {c.imageUrl ? (
            <Image
              src={c.imageUrl}
              alt={c.name}
              width={120}
              height={90}
              className="object-contain group-hover:scale-105 transition-transform duration-300"
              unoptimized
            />
          ) : (
            <div className="text-7xl group-hover:scale-110 transition-transform duration-500">📦</div>
          )}
        </div>

        <div className="px-4 pb-4">
          <h3 className="font-bold text-sm mb-0.5 truncate" style={{ color: "var(--text)" }}>{c.name}</h3>
          <div className="flex items-center gap-1 mb-3">
            {skins.slice(0, 5).map((item, i) => (
              <div key={i} className="w-2 h-2 rounded-full" style={{ background: item.rarityColor ?? rarityColor(item.rarity) }} title={item.rarity} />
            ))}
          </div>
          <div className="flex items-center justify-between">
            <div>
              {c.price === 0
                ? <span className="text-base font-black" style={{ color: "#22c55e" }}>DARMOWA</span>
                : <span className="text-base font-black" style={{ color: "var(--gold)" }}>${c.price.toFixed(2)}</span>
              }
            </div>
            <div className="text-xs font-bold px-3 py-1.5 rounded-lg opacity-80 group-hover:opacity-100"
              style={{ background: "var(--neon)", color: "white" }}>
              Otwórz
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
