// Server-side balance store — persists across requests in the same process.
// Replace with a real DB (e.g. Prisma + Postgres) in production.

class BalanceStore {
  private balances = new Map<string, number>();

  get(steamId: string): number {
    return this.balances.get(steamId) ?? 0;
  }

  add(steamId: string, amount: number) {
    const current = this.get(steamId);
    this.balances.set(steamId, Math.round((current + amount) * 100) / 100);
  }

  set(steamId: string, amount: number) {
    this.balances.set(steamId, Math.round(amount * 100) / 100);
  }
}

const g = global as typeof global & { __balanceStore?: BalanceStore };
if (!g.__balanceStore) g.__balanceStore = new BalanceStore();
export const balanceStore = g.__balanceStore;
