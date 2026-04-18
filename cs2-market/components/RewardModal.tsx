"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { X, TrendingUp, Package } from "lucide-react";
import { rarityColor } from "@/lib/mock-data";
import type { Skin } from "@/lib/mock-data";

interface Props {
  skin: Skin | null;
  onSell: (skin: Skin) => void;
  onKeep: (skin: Skin) => void;
  onClose: () => void;
}

export default function RewardModal({ skin, onSell, onKeep, onClose }: Props) {
  if (!skin) return null;

  const color = skin.rarityColor ?? rarityColor(skin.rarity);
  const sellPrice = Math.round(skin.price * 0.95 * 100) / 100;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="relative rounded-3xl border p-8 max-w-sm w-full text-center"
          style={{
            background: "var(--bg2)",
            borderColor: color,
            boxShadow: `0 0 80px ${color}44, 0 0 160px ${color}22`,
          }}
          initial={{ scale: 0.6, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 22 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            style={{ color: "var(--muted)" }}
            onClick={onClose}
          >
            <X size={16} />
          </button>

          {/* Glow blob */}
          <div className="absolute inset-0 rounded-3xl pointer-events-none overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full opacity-10 blur-3xl"
              style={{ background: color }} />
          </div>

          <motion.div
            className="relative text-xs uppercase tracking-widest font-black mb-3"
            style={{ color }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            🎉 WYGRAŁEŚ!
          </motion.div>

          <motion.div
            className="relative w-40 h-28 mx-auto mb-4"
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
          >
            {skin.imageUrl ? (
              <Image src={skin.imageUrl} alt={skin.name} fill className="object-contain" sizes="160px" unoptimized />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl">🔫</div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-xl font-black mb-1" style={{ color: "var(--text)" }}>
              {skin.name}
            </h2>
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}>
                {skin.rarity}
              </span>
              <span className="text-xs" style={{ color: "var(--muted)" }}>{skin.wear ?? skin.exterior}</span>
            </div>
            <p className="text-3xl font-black mt-3 mb-6" style={{ color }}>
              ${skin.price.toFixed(2)}
            </p>
          </motion.div>

          <motion.div
            className="flex gap-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <button
              onClick={() => onSell(skin)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90"
              style={{ background: "var(--neon)", color: "white" }}
            >
              <TrendingUp size={15} />
              Sprzedaj ${sellPrice}
            </button>
            <button
              onClick={() => onKeep(skin)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold border transition-all hover:bg-white/5"
              style={{ borderColor: "var(--border2)", color: "var(--text)" }}
            >
              <Package size={15} />
              Zachowaj
            </button>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
