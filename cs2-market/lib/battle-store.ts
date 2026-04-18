import type { Skin } from "./mock-data";

export type BattleStatus = "waiting" | "spinning" | "done";

export interface BattlePlayer {
  id: string;         // session steamId or guest id
  name: string;
  avatar: string;
  isBot: boolean;
  won: Skin | null;
}

export interface Battle {
  id: string;
  caseId: string;
  caseName: string;
  casePrice: number;
  maxPlayers: number;
  players: BattlePlayer[];
  status: BattleStatus;
  winnerId: string | null;
  pot: number;
  createdAt: number;
}

type Listener = (battle: Battle) => void;

class BattleStore {
  private battles = new Map<string, Battle>();
  private listeners = new Map<string, Set<Listener>>();

  create(battle: Omit<Battle, "id" | "createdAt">): Battle {
    const id = Math.random().toString(36).slice(2, 8).toUpperCase();
    const full: Battle = { ...battle, id, createdAt: Date.now() };
    this.battles.set(id, full);
    // auto-cleanup after 10 minutes
    setTimeout(() => this.battles.delete(id), 10 * 60 * 1000);
    return full;
  }

  get(id: string): Battle | undefined {
    return this.battles.get(id);
  }

  update(id: string, patch: Partial<Battle>): Battle | null {
    const b = this.battles.get(id);
    if (!b) return null;
    const updated = { ...b, ...patch };
    this.battles.set(id, updated);
    this.emit(id, updated);
    return updated;
  }

  listOpen(): Battle[] {
    return [...this.battles.values()]
      .filter(b => b.status === "waiting")
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 20);
  }

  subscribe(id: string, fn: Listener): () => void {
    if (!this.listeners.has(id)) this.listeners.set(id, new Set());
    this.listeners.get(id)!.add(fn);
    return () => this.listeners.get(id)?.delete(fn);
  }

  private emit(id: string, battle: Battle) {
    this.listeners.get(id)?.forEach(fn => fn(battle));
  }
}

// singleton shared across all requests in the same process
const globalStore = global as typeof global & { __battleStore?: BattleStore };
if (!globalStore.__battleStore) globalStore.__battleStore = new BattleStore();
export const battleStore = globalStore.__battleStore;
