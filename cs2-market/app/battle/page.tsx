"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Plus, Swords, Crown, Clock, RefreshCw } from "lucide-react";
import Navbar from "@/components/Navbar";
import { rarityColor } from "@/lib/mock-data";
import { useGameStore } from "@/lib/store";
import type { Battle } from "@/lib/battle-store";

const AVATARS = ["👤","🦊","🐺","⭐","🎯","💜","💛","⚡","👑"];

function PlayerSlot({ player, isWinner, status }: {
  player?: Battle["players"][0];
  isWinner?: boolean;
  status: Battle["status"];
}) {
  const won = player?.won;
  const color = won ? rarityColor(won.rarity) : "var(--neon)";

  return (
    <div className={`flex-1 rounded-2xl border overflow-hidden transition-all ${isWinner ? "scale-105" : ""}`}
      style={{
        background: "var(--bg2)",
        borderColor: isWinner ? "var(--gold)" : player ? "var(--border2)" : "var(--border)",
        boxShadow: isWinner ? "0 0 30px rgba(234,179,8,0.3)" : "none",
        minWidth: 0,
      }}>
      {/* Player header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b" style={{ borderColor: "var(--border)" }}>
        {player ? (
          <>
            <span className="text-lg">{AVATARS[player.name.charCodeAt(0) % AVATARS.length]}</span>
            <span className="text-sm font-bold truncate flex-1" style={{ color: "var(--text)" }}>{player.name}</span>
            {isWinner && <Crown size={14} style={{ color: "var(--gold)", flexShrink: 0 }} />}
          </>
        ) : (
          <>
            <span className="text-lg opacity-30">❓</span>
            <span className="text-sm flex-1" style={{ color: "var(--muted)" }}>Czeka na gracza...</span>
          </>
        )}
      </div>

      {/* Result area */}
      <div className="p-3 min-h-[100px] flex items-center justify-center">
        {!player && (
          <div className="text-center">
            <div className="w-10 h-10 rounded-full border-2 border-dashed mx-auto mb-2 flex items-center justify-center"
              style={{ borderColor: "var(--border2)" }}>
              <Plus size={16} style={{ color: "var(--muted)" }} />
            </div>
            <p className="text-xs" style={{ color: "var(--muted)" }}>Wolne miejsce</p>
          </div>
        )}

        {player && status === "waiting" && (
          <div className="text-center">
            <div className="text-3xl mb-1 animate-pulse">📦</div>
            <p className="text-xs" style={{ color: "var(--muted)" }}>Gotowy</p>
          </div>
        )}

        {player && status === "spinning" && (
          <div className="text-center">
            <div className="text-3xl mb-1 animate-bounce">🎰</div>
            <p className="text-xs animate-pulse" style={{ color: "var(--neon2)" }}>Losowanie...</p>
          </div>
        )}

        {player && status === "done" && won && (
          <motion.div
            className="text-center"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            <div className="text-3xl mb-1">🔫</div>
            <p className="text-xs font-bold truncate" style={{ color: "var(--text)", maxWidth: 100 }}>
              {won.name.split(" | ")[1] ?? won.name}
            </p>
            <p className="text-sm font-black" style={{ color }}>${won.price.toFixed(2)}</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function BattleRoom({ battleId, myId, onExit }: { battleId: string; myId: string; onExit: () => void }) {
  const [battle, setBattle] = useState<Battle | null>(null);
  const { setBalance, addTransaction } = useGameStore();
  const rewarded = useRef(false);

  useEffect(() => {
    const es = new EventSource(`/api/battle/stream/${battleId}`);
    es.onmessage = e => {
      const b: Battle = JSON.parse(e.data);
      setBattle(b);

      if (b.status === "done" && b.winnerId === myId && !rewarded.current) {
        rewarded.current = true;
        const prize = Math.round(b.pot * 0.95 * 100) / 100;
        setBalance(useGameStore.getState().balance + prize);
        addTransaction({ type: "battle_win", label: `Wygrano Battle: ${b.caseName}`, amount: prize, caseName: b.caseName });
      }
    };
    return () => es.close();
  }, [battleId]);

  if (!battle) return (
    <div className="text-center py-20 animate-pulse" style={{ color: "var(--muted)" }}>Łączenie...</div>
  );

  const slots = Array.from({ length: battle.maxPlayers }, (_, i) => battle.players[i]);
  const winner = battle.players.find(p => p.id === battle.winnerId);
  const iWon = battle.winnerId === myId;

  return (
    <div>
      {/* Pot + status */}
      <div className="text-center mb-6">
        <div className="text-xs uppercase tracking-widest mb-1" style={{ color: "var(--muted)" }}>Pula</div>
        <div className="text-3xl font-black" style={{ color: "var(--gold)" }}>${battle.pot.toFixed(2)}</div>
        <div className="text-sm mt-2" style={{ color: "var(--muted2)" }}>
          {battle.status === "waiting" && `Czeka na graczy (${battle.players.length}/${battle.maxPlayers})`}
          {battle.status === "spinning" && <span className="animate-pulse text-purple-400">Trwa losowanie...</span>}
          {battle.status === "done" && winner && (
            <span style={{ color: iWon ? "var(--gold)" : "var(--neon2)" }}>
              {iWon ? "🏆 Wygrałeś!" : `Wygrywa ${winner.name}`}
            </span>
          )}
        </div>
      </div>

      {/* Player slots */}
      <div className="flex gap-3 mb-6 flex-wrap sm:flex-nowrap">
        {slots.map((player, i) => (
          <PlayerSlot
            key={i}
            player={player ?? undefined}
            isWinner={battle.status === "done" && player?.id === battle.winnerId}
            status={battle.status}
          />
        ))}
      </div>

      {/* Room code */}
      <div className="flex items-center justify-between p-3 rounded-xl mb-6"
        style={{ background: "var(--bg2)", border: "1px solid var(--border)" }}>
        <span className="text-xs" style={{ color: "var(--muted)" }}>Kod pokoju</span>
        <span className="font-black text-sm tracking-widest" style={{ color: "var(--neon2)" }}>{battle.id}</span>
        <button onClick={() => navigator.clipboard?.writeText(battle.id)}
          className="text-xs px-2 py-1 rounded-lg" style={{ background: "var(--card)", color: "var(--muted2)" }}>
          Kopiuj
        </button>
      </div>

      {battle.status === "done" && (
        <button onClick={onExit} className="btn-neon w-full py-3 rounded-xl flex items-center justify-center gap-2">
          <RefreshCw size={16} /> Nowa bitwa
        </button>
      )}
    </div>
  );
}

export default function BattlePage() {
  const [view, setView] = useState<"lobby" | "room">("lobby");
  const [battleId, setBattleId] = useState<string | null>(null);
  const [myId, setMyId] = useState<string>("");
  const [openBattles, setOpenBattles] = useState<Battle[]>([]);
  const [cases, setCases] = useState<{ id: string; name: string; price: number }[]>([]);
  const [selectedCase, setSelectedCase] = useState("");
  const [playerCount, setPlayerCount] = useState(2);
  const [creating, setCreating] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  const { balance, deductBalance } = useGameStore();
  const caseData = cases.find(c => c.id === selectedCase) ?? cases[0];

  useEffect(() => {
    fetch("/api/cs2/cases")
      .then(r => r.json())
      .then((data: { id: string; name: string; price: number }[]) => {
        setCases(data);
        if (data.length > 0) setSelectedCase(data[0].id);
      })
      .catch(() => {});
  }, []);

  // fetch open battles every 3s
  useEffect(() => {
    const load = () => fetch("/api/battle/list").then(r => r.json()).then(setOpenBattles).catch(() => {});
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, []);

  // get my id
  useEffect(() => {
    fetch("/api/user/me").then(r => r.json()).then(u => {
      setMyId(u?.steamId ?? ("guest_" + Math.random().toString(36).slice(2, 8)));
    });
  }, []);

  const enterRoom = (id: string) => {
    setBattleId(id);
    setView("room");
  };

  const handleCreate = async () => {
    if (!deductBalance(caseData.price)) return;
    setCreating(true);
    const res = await fetch("/api/battle/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseId: selectedCase, maxPlayers: playerCount }),
    });
    const battle = await res.json();
    setCreating(false);
    enterRoom(battle.id);
  };

  const handleJoin = async (battleId: string, casePrice: number) => {
    if (!deductBalance(casePrice)) return;
    await fetch(`/api/battle/join/${battleId}`, { method: "POST" });
    enterRoom(battleId);
  };

  const handleJoinCode = async () => {
    const id = joinCode.trim().toUpperCase();
    const battle = openBattles.find(b => b.id === id)
      ?? await fetch(`/api/battle/list`).then(r => r.json()).then((bs: Battle[]) => bs.find(b => b.id === id));
    if (!battle) { alert("Nie znaleziono bitwy: " + id); return; }
    await handleJoin(battle.id, battle.casePrice);
  };

  if (view === "room" && battleId) {
    return (
      <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setView("lobby")} className="text-sm hover:underline" style={{ color: "var(--muted)" }}>
              ← Lobby
            </button>
            <h1 className="text-xl font-black" style={{ color: "var(--text)" }}>⚔️ Case Battle</h1>
          </div>
          <BattleRoom battleId={battleId} myId={myId} onExit={() => setView("lobby")} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-black mb-1" style={{ color: "var(--text)" }}>⚔️ Case Battle</h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Zmierz się z prawdziwymi graczami — kto wylosuje cenniejszy skin, wygrywa pulę!
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Create */}
          <div className="rounded-2xl border p-6" style={{ background: "var(--bg2)", borderColor: "var(--border)" }}>
            <h2 className="text-sm font-black uppercase tracking-widest mb-5 flex items-center gap-2"
              style={{ color: "var(--muted)" }}>
              <Plus size={14} /> Stwórz bitwę
            </h2>

            <div className="space-y-4 mb-5">
              <div>
                <label className="text-xs font-bold mb-2 block" style={{ color: "var(--muted2)" }}>Skrzynka</label>
                <select value={selectedCase} onChange={e => setSelectedCase(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm font-semibold border outline-none"
                  style={{ background: "var(--card)", borderColor: "var(--border2)", color: "var(--text)" }}>
                  {cases.map(c => (
                    <option key={c.id} value={c.id}>{c.name} — ${c.price.toFixed(2)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold mb-2 block" style={{ color: "var(--muted2)" }}>Graczy</label>
                <div className="flex gap-2">
                  {[2, 3, 4].map(n => (
                    <button key={n} onClick={() => setPlayerCount(n)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                      style={{
                        background: playerCount === n ? "var(--neon)" : "var(--card)",
                        color: playerCount === n ? "white" : "var(--muted2)",
                        border: `1px solid ${playerCount === n ? "var(--neon)" : "var(--border)"}`,
                      }}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs mb-4" style={{ color: "var(--muted)" }}>
              <span>Saldo: <span className="font-black" style={{ color: "var(--gold)" }}>${balance.toFixed(2)}</span></span>
              <span>Koszt: <span className="font-bold" style={{ color: "var(--text)" }}>${(caseData?.price ?? 0).toFixed(2)}</span></span>
            </div>

            <button onClick={handleCreate} disabled={creating || !caseData || balance < caseData.price}
              className="btn-neon w-full py-3.5 rounded-xl text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              <Swords size={16} />
              {creating ? "Tworzenie..." : `Stwórz — $${((caseData?.price ?? 0) * playerCount).toFixed(2)} pula`}
            </button>
          </div>

          {/* Join by code */}
          <div className="rounded-2xl border p-6" style={{ background: "var(--bg2)", borderColor: "var(--border)" }}>
            <h2 className="text-sm font-black uppercase tracking-widest mb-5 flex items-center gap-2"
              style={{ color: "var(--muted)" }}>
              <Users size={14} /> Dołącz kodem
            </h2>
            <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
              Wpisz 6-znakowy kod pokoju aby dołączyć do znajomego.
            </p>
            <input
              type="text"
              placeholder="np. AB1C2D"
              maxLength={6}
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 rounded-xl text-sm border outline-none text-center font-black tracking-widest uppercase mb-4"
              style={{ background: "var(--card)", borderColor: joinCode ? "var(--neon)" : "var(--border2)", color: "var(--text)", letterSpacing: "0.2em" }}
            />
            <button onClick={handleJoinCode} disabled={joinCode.length < 4}
              className="btn-outline w-full py-3 rounded-xl text-sm disabled:opacity-40">
              Dołącz do pokoju
            </button>
          </div>
        </div>

        {/* Open battles list */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-black uppercase tracking-widest" style={{ color: "var(--muted)" }}>
              Otwarte bitwy
            </h2>
            <span className="w-2 h-2 rounded-full" style={{ background: "#22c55e" }} />
            <span className="text-xs" style={{ color: "var(--muted)" }}>{openBattles.length} aktywnych</span>
          </div>

          {openBattles.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
              <Swords size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Brak otwartych bitew. Stwórz pierwszą!</p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {openBattles.map(b => {
                  const free = b.maxPlayers - b.players.length;
                  const topColor = rarityColor("Covert");
                  return (
                    <motion.div key={b.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      className="rounded-2xl border p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4"
                      style={{ background: "var(--bg2)", borderColor: "var(--border)" }}>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-3xl">📦</span>
                        <div>
                          <div className="text-sm font-bold" style={{ color: "var(--text)" }}>{b.caseName}</div>
                          <div className="text-xs" style={{ color: "var(--muted)" }}>
                            {b.players.length}/{b.maxPlayers} graczy · ${b.casePrice.toFixed(2)}/os. · #{b.id}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {Array.from({ length: b.maxPlayers }).map((_, i) => (
                          <div key={i}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm border"
                            style={{
                              background: i < b.players.length ? `${topColor}22` : "var(--card)",
                              borderColor: i < b.players.length ? topColor : "var(--border2)",
                            }}>
                            {i < b.players.length
                              ? AVATARS[b.players[i].name.charCodeAt(0) % AVATARS.length]
                              : "?"}
                          </div>
                        ))}
                      </div>

                      <div className="font-bold text-sm flex-shrink-0" style={{ color: "var(--gold)" }}>
                        ${b.pot.toFixed(2)}
                      </div>

                      <button
                        onClick={() => handleJoin(b.id, b.casePrice)}
                        disabled={balance < b.casePrice}
                        className="btn-neon px-5 py-2 rounded-xl text-xs flex-shrink-0 disabled:opacity-40 flex items-center gap-1.5">
                        <Clock size={12} /> Dołącz
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
