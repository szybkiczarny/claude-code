"use client";

import { useState, useEffect } from "react";
import { rarityColor } from "@/lib/mock-data";
import type { Skin } from "@/lib/mock-data";

export default function ProfileInventory() {
  const [inventory, setInventory] = useState<Skin[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("cs2_inventory");
      if (raw) setInventory(JSON.parse(raw));
    } catch {}
  }, []);

  const totalValue = inventory.reduce((s, i) => s + i.price, 0);

  return (
    <div className="rounded-2xl border p-5" style={{ background: "var(--bg2)", borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-black uppercase tracking-widest" style={{ color: "var(--muted)" }}>
          Ekwipunek
        </h2>
        {inventory.length > 0 && (
          <span className="text-xs font-bold" style={{ color: "var(--neon2)" }}>
            {inventory.length} szt. · ${totalValue.toFixed(2)}
          </span>
        )}
      </div>

      {inventory.length === 0 ? (
        <div className="text-center py-10">
          <div className="text-3xl mb-2">🎒</div>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            Ekwipunek jest pusty.<br />Otwórz skrzynkę i zachowaj skin!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {inventory.map((item, idx) => {
            const c = rarityColor(item.rarity);
            return (
              <div key={idx}
                className="rounded-xl border p-2.5 text-center hover:-translate-y-0.5 transition-transform cursor-pointer"
                style={{ background: "var(--card)", borderColor: `${c}33`, borderTop: `2px solid ${c}` }}>
                <div className="text-3xl mb-1">🔫</div>
                <div className="text-xs font-bold truncate" style={{ color: "var(--text)" }}>
                  {item.name.split(" | ")[1] ?? item.name}
                </div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>{item.exterior}</div>
                <div className="text-xs font-black mt-1" style={{ color: c }}>${item.price}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
