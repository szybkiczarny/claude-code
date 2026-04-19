"use client";

import { useEffect, useState, useRef } from "react";
import { LIVE_DROPS, rarityColor } from "@/lib/mock-data";

const NAMES = ["xKomik99","Shadow_PL","LuckyStar","TopFrag","NeonKing","GoldRush","FastDrop","CS2Lord","NightHawk","ProSkin3r","BladeRunner","DropKing","SilverFox","RushB_PL","HeadShot","AimGod","SniperElite","KnifeKing","FragMaster","EcoRound"];
const AVATARS = ["🦊","🐺","⭐","🎯","💜","💛","⚡","👑","🦅","🔥","🗡️","💎","🌙","🎮","👾","🐉","🦁","🐯","🦋","🌊"];

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
  };
}

export default function LiveTicker() {
  const [drops, setDrops] = useState(() =>
    Array.from({ length: 20 }, () => randomDrop())
  );
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setDrops(prev => [randomDrop(), ...prev.slice(0, 30)]);
    }, 3200);
    return () => clearInterval(t);
  }, []);

  const doubled = [...drops, ...drops];

  return (
    <div
      className="relative overflow-hidden flex-shrink-0"
      style={{
        background: "rgba(6,10,18,0.95)",
        borderBottom: "1px solid var(--border)",
        height: "38px",
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Fade masks */}
      <div className="absolute left-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to right, var(--bg), transparent)" }} />
      <div className="absolute right-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to left, var(--bg), transparent)" }} />

      <div
        className="flex items-center h-full whitespace-nowrap"
        style={{
          animation: `ticker-scroll 60s linear infinite`,
          animationPlayState: paused ? "paused" : "running",
          width: "max-content",
        }}
      >
        {doubled.map((drop, i) => {
          const c = rarityColor(drop.rarity);
          return (
            <div key={`${drop.id}-${i}`}
              className="inline-flex items-center gap-1.5 px-4 cursor-pointer hover:opacity-80 transition-opacity"
              style={{ flexShrink: 0 }}
            >
              <span className="text-sm">{drop.avatar}</span>
              <span className="text-xs font-semibold" style={{ color: "var(--muted2)" }}>
                {drop.user}
              </span>
              <span className="text-xs" style={{ color: "var(--muted)" }}>wygrał</span>
              <span className="text-xs font-bold" style={{ color: c }}>
                {drop.item.split(" | ")[1] ?? drop.item}
              </span>
              <span className="text-xs font-black" style={{ color: c }}>
                ${drop.price >= 1000 ? (drop.price / 1000).toFixed(1) + "K" : drop.price}
              </span>
              <span className="mx-2 opacity-20" style={{ color: "var(--muted)" }}>•</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
