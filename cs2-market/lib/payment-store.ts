// In-memory pending payments — maps sessionId/paymentId → { steamId, amount, credited }
// W produkcji zastąp bazą danych.

export interface PendingPayment {
  id: string;
  steamId: string;
  amountUsd: number;
  method: "p24" | "crypto";
  credited: boolean;
  createdAt: number;
}

class PaymentStore {
  private map = new Map<string, PendingPayment>();

  set(id: string, p: PendingPayment) {
    this.map.set(id, p);
    setTimeout(() => this.map.delete(id), 2 * 60 * 60 * 1000); // auto-cleanup 2h
  }

  get(id: string) { return this.map.get(id); }

  credit(id: string): PendingPayment | null {
    const p = this.map.get(id);
    if (!p || p.credited) return null;
    p.credited = true;
    return p;
  }
}

const g = global as typeof global & { __paymentStore?: PaymentStore };
if (!g.__paymentStore) g.__paymentStore = new PaymentStore();
export const paymentStore = g.__paymentStore;
