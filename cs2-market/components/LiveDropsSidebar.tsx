"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LIVE_DROPS, rarityColor } from "@/lib/mock-data";

const NAMES = ["xKomik99","Shadow_PL","LuckyStar","TopFrag","NeonKing","GoldRush","FastDrop","CS2Lord","NightHawk","ProSkin3r","BladeRunner","DropKing","SilverFox","RushB_PL","HeadShot"];
const AVATARS = ["🦊","🐺","⭐","🎯","💜","💛","⚡","👑","🦅","🔥","🗡️","💎","🌙","🎮","👾"];

function randomDrop() {
  const base = LIVE_DROPS[Math.floor(Math.random() * LIVE_DROPS.length)];
  const i = Math.floor(Math.random() * NAMES.length);
  return {
    id: Math.random().toString(36).slice(2),
    user: NAMES[i],
    avatar: AVATARS[i % AVATARS.length],
    item: base.item,
    rarity: base.rarity,
    price: base.price,
    caseName: base.caseName,
  };
}

export default function LiveDropsSidebar() {
  const [drops, setDrops] = useState(() =>
    LIVE_DROPS.map((d, i) => ({ ...d, id: String(i) }))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setDrops(prev => [randomDrop(), ...prev.slice(0, 24)]);
    }, 3800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg2)" }}>
      <div className="px-3 py-3 flex items-center gap-2 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}>
        <span className="pulse-dot w-2 h-2 rounded-full inline-block" style={{ background: "#22c55e" }} />
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--muted2)" }}>
          Live Drops
        </span>
        <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full font-bold"
          style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e", fontSize: "9px" }}>
          LIVE
        </span>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <AnimatePresence initial={false}>
          {drops.map((drop, i) => {
            const c = rarityColor(drop.rarity);
            return (
              <motion.div
                key={drop.id}
                initial={{ opacity: 0, y: -28, backgroundColor: `${c}28` }}
                animate={{ opacity: 1, y: 0, backgroundColor: "transparent" }}
                exit={{ opacity: 0, height: 0, marginBottom: -52 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-white/5"
                style={{
                  borderBottom: "1px solid var(--border)",
                  borderLeft: i === 0 ? `2px solid ${c}` : "2px solid transparent",
                }}
              >
                <span className="text-base flex-shrink-0">{drop.avatar}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold truncate" style={{ color: "var(--text)" }}>
                    {drop.item.split(" | ")[1] ?? drop.item}
                  </div>
                  <div className="text-xs truncate" style={{ color: "var(--muted)" }}>
                    {drop.user}
                  </div>
                </div>
                <div className="text-xs font-black flex-shrink-0" style={{ color: c }}>
                  ${drop.price >= 1000 ? (drop.price / 1000).toFixed(1) + "K" : drop.price.toFixed(0)}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
