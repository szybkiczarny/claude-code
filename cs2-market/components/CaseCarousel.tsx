"use client";

import Image from "next/image";
import { useRef, useEffect, useState } from "react";
import { motion, useMotionValue, animate } from "framer-motion";
import type { Skin } from "@/lib/mock-data";

const CARD_W = 148;
const CARD_GAP = 8;
const STEP = CARD_W + CARD_GAP;
const REEL_COUNT = 50;
const WIN_IDX = 44;

interface Props {
  items: Skin[];
  winner: Skin;
  onDone: () => void;
  spinning: boolean;
}

function buildReel(items: Skin[], winner: Skin): Skin[] {
  const reel: Skin[] = [];
  for (let i = 0; i < REEL_COUNT; i++) {
    reel.push(i === WIN_IDX ? winner : items[Math.floor(Math.random() * items.length)]);
  }
  return reel;
}

function SkinCard({ skin, isWinner }: { skin: Skin; isWinner: boolean }) {
  const c = skin.rarityColor;
  return (
    <motion.div
      className="flex-shrink-0 flex flex-col items-center justify-center rounded-xl border text-center p-2"
      style={{
        width: CARD_W,
        height: 156,
        background: isWinner ? `${c}18` : "var(--card)",
        borderColor: isWinner ? c : `${c}44`,
        borderTop: `2px solid ${c}`,
        boxShadow: isWinner ? `0 0 24px ${c}55` : "none",
      }}
      animate={isWinner ? { scale: [1, 1.05, 1] } : {}}
      transition={{ duration: 0.4 }}
    >
      <div className="relative w-20 h-14 mb-1 flex-shrink-0">
        {skin.imageUrl ? (
          <Image
            src={skin.imageUrl}
            alt={skin.name}
            fill
            className="object-contain"
            sizes="80px"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">🔫</div>
        )}
      </div>
      <div className="text-xs font-bold leading-tight truncate w-full text-center px-1"
        style={{ color: "var(--text)" }}>
        {skin.name.split(" | ")[1] ?? skin.name}
      </div>
      <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
        {skin.wear ?? skin.exterior}
      </div>
      {skin.float !== undefined && (
        <div className="mt-1 px-1">
          <div className="float-bar-track">
            <div className="float-bar-fill" style={{ width: `${skin.float * 100}%` }} />
          </div>
        </div>
      )}
      <div className="text-xs font-black mt-1" style={{ color: c }}>
        ${skin.price > 0 ? skin.price.toFixed(2) : "..."}
      </div>
    </motion.div>
  );
}

export default function CaseCarousel({ items, winner, onDone, spinning }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [reel] = useState(() => buildReel(items, winner));
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!spinning) return;
    const containerW = containerRef.current?.offsetWidth ?? 700;
    const centerOffset = Math.floor(containerW / 2) - CARD_W / 2;
    const target = -(WIN_IDX * STEP - centerOffset);

    x.set(0);
    animate(x, target, {
      duration: 4.2,
      ease: [0.05, 0.9, 0.1, 1],
      onComplete: () => {
        setDone(true);
        onDone();
      },
    });
  }, [spinning]);

  const winColor = winner.rarityColor;

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-2xl border"
      style={{
        height: 180,
        background: "var(--bg2)",
        borderColor: done ? winColor : "var(--border2)",
        boxShadow: done ? `0 0 32px ${winColor}44` : "none",
        transition: "border-color 0.4s, box-shadow 0.4s",
      }}
    >
      <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 z-20 pointer-events-none"
        style={{ background: winColor, boxShadow: `0 0 12px ${winColor}` }} />
      <div className="absolute inset-y-0 left-0 w-20 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to right, var(--bg2), transparent)" }} />
      <div className="absolute inset-y-0 right-0 w-20 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to left, var(--bg2), transparent)" }} />

      <div className="absolute inset-y-0 left-0 flex items-center" style={{ paddingLeft: 16 }}>
        <motion.div className="flex" style={{ x, gap: CARD_GAP }}>
          {reel.map((skin, i) => (
            <SkinCard key={i} skin={skin} isWinner={done && i === WIN_IDX} />
          ))}
        </motion.div>
      </div>
    </div>
  );
}
