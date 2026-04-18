"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Skin } from "./mock-data";

export interface Transaction {
  id: string;
  type: "open" | "sell" | "deposit" | "battle_win" | "battle_lose";
  label: string;
  amount: number; // positive = earned, negative = spent
  date: string;   // ISO string
  caseName?: string;
}

interface GameState {
  balance: number;
  inventory: Skin[];
  transactions: Transaction[];
  clientSeed: string;
  nonce: number;

  setBalance: (b: number) => void;
  deductBalance: (amount: number) => boolean;
  addToInventory: (skin: Skin) => void;
  sellFromInventory: (skinId: string, price: number) => void;
  addTransaction: (tx: Omit<Transaction, "id" | "date">) => void;
  incrementNonce: () => void;
  setClientSeed: (seed: string) => void;
}

function randomSeed() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function txId() {
  return Math.random().toString(36).slice(2);
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      balance: 100.00,
      inventory: [],
      transactions: [],
      clientSeed: randomSeed(),
      nonce: 0,

      setBalance: (b) => set({ balance: b }),

      deductBalance: (amount) => {
        const { balance } = get();
        if (balance < amount) return false;
        set({ balance: Math.round((balance - amount) * 100) / 100 });
        return true;
      },

      addToInventory: (skin) =>
        set((s) => ({ inventory: [skin, ...s.inventory].slice(0, 200) })),

      sellFromInventory: (skinId, price) =>
        set((s) => ({
          inventory: s.inventory.filter((i) => i.id !== skinId),
          balance: Math.round((s.balance + price) * 100) / 100,
        })),

      addTransaction: (tx) =>
        set((s) => ({
          transactions: [
            { ...tx, id: txId(), date: new Date().toISOString() },
            ...s.transactions,
          ].slice(0, 100),
        })),

      incrementNonce: () => set((s) => ({ nonce: s.nonce + 1 })),
      setClientSeed: (seed) => set({ clientSeed: seed }),
    }),
    { name: "cs2drop-game" }
  )
);
