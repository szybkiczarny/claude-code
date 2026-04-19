"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, RefreshCw, Lock } from "lucide-react";
import Navbar from "@/components/Navbar";
import CaseCarousel from "@/components/CaseCarousel";
import RewardModal from "@/components/RewardModal";
import type { Skin, Case } from "@/lib/mock-data";
import { getRarityWeight } from "@/lib/odds";
import { openCase, type BucketKey, BUCKETS } from "@/lib/case-logic";
import type { CS2Skin } from "@/lib/cs2-data";
import { useGameStore } from "@/lib/store";

type Phase = "idle" | "spinning" | "done";

const BUCKET_LABELS: Record<BucketKey, string> = {
  LOSS:       "Słaby drop",
  RETURN:     "Zwrot",
  MID_PROFIT: "Średni profit",
  BIG_WIN:    "Duża wygrana!",
  JACKPOT:    "JACKPOT!!!",
};
const BUCKET_COLORS: Record<BucketKey, string> = {
  LOSS:       "#5a6a80",
  RETURN:     "#22c55e",
  MID_PROFIT: "#f59e0b",
  BIG_WIN:    "#f97316",
  JACKPOT:    "#ffd700",
};

export default function CasePage() {
  const { id } = useParams<{ id: string }>();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>("idle");
  const [winner, setWinner] = useState<Skin | null>(null);
  const [winnerBucket, setWinnerBucket] = useState<BucketKey | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const { balance, deductBalance, addToInventory, setBalance, addTransaction, incrementNonce, clientSeed, nonce } =
    useGameStore();

  useEffect(() => {
    // First load — instant (cached prices only)
    fetch(`/api/cs2/cases/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.skins) data.items = data.skins;
        setCaseData(data);
        setLoading(false);
        // After 8s refresh prices silently (background fetch will have populated cache)
        setTimeout(() => {
          fetch(`/api/cs2/cases/${id}`)
            .then(r => r.json())
            .then(updated => {
              if (updated.skins) updated.items = updated.skins;
              setCaseData(updated);
            })
            .catch(() => null);
        }, 8000);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
      <RefreshCw size={24} className="animate-spin" style={{ color: "var(--neon2)" }} />
    </div>
  );

  if (!caseData) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
      <div className="text-center">
        <p className="mb-4" style={{ color: "var(--muted)" }}>Skrzynka nie znaleziona</p>
        <Link href="/cases" className="btn-neon px-4 py-2 rounded-lg text-sm">← Wróć</Link>
      </div>
    </div>
  );

  const items: Skin[] = caseData.skins ?? caseData.items ?? [];
  const canAfford = caseData.price === 0 || balance >= caseData.price * quantity;

  const spin = () => {
    if (phase !== "idle") return;
    if (caseData.price > 0 && !deductBalance(caseData.price * quantity)) return;
    if (caseData.price > 0)
      addTransaction({ type: "open", label: `Otwarto: ${caseData.name}`, amount: -(caseData.price * quantity), caseName: caseData.name });
    const result = openCase(items as unknown as CS2Skin[], caseData.price);
    incrementNonce();
    setWinner(result.skin as unknown as Skin);
    setWinnerBucket(result.bucket);
    setPhase("spinning");
  };

  const handleDone = () => {
    setPhase("done");
    setShowModal(true);
  };

  const handleSell = (skin: Skin) => {
    const price = Math.round(skin.price * 0.95 * 100) / 100;
    setBalance(Math.round((balance + price) * 100) / 100);
    addTransaction({ type: "sell", label: `Sprzedano: ${skin.name}`, amount: price, caseName: caseData.name });
    setShowModal(false);
    reset();
  };

  const handleKeep = (skin: Skin) => {
    addToInventory({ ...skin, id: skin.id + "_" + Date.now() });
    addTransaction({ type: "open", label: `Zachowano: ${skin.name}`, amount: skin.price, caseName: caseData.name });
    setShowModal(false);
    reset();
  };

  const reset = () => { setPhase("idle"); setWinner(null); setWinnerBucket(null); };

  // De-duplicate by name for display in odds table
  const uniqueSkins = items.filter((s, i, arr) => arr.findIndex(x => x.name === s.name) === i);

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-6">

        <div className="flex items-center gap-2 mb-6 text-xs" style={{ color: "var(--muted)" }}>
          <Link href="/cases" className="flex items-center gap-1 hover:text-white transition-colors">
            <ChevronLeft size={14} /> Skrzynki
          </Link>
          <span>/</span>
          <span style={{ color: "var(--text)" }}>{caseData.name}</span>
        </div>

        {/* Case header */}
        <div className="text-center mb-8">
          <div className="relative w-48 h-36 mx-auto mb-4">
            <Image
              src={caseData.imageUrl}
              alt={caseData.name}
              fill
              className="object-contain drop-shadow-2xl"
              sizes="192px"
              unoptimized
            />
          </div>
          <h1 className="text-2xl font-black mb-1" style={{ color: "var(--text)" }}>{caseData.name}</h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            {uniqueSkins.length} skinów · Weighted RNG · Provably Fair
          </p>
        </div>

        {/* Carousel */}
        {(phase === "spinning" || phase === "done") && winner && (
          <div className="mb-6">
            <CaseCarousel items={items} winner={winner} spinning={phase === "spinning"} onDone={handleDone} />
            {phase === "done" && winnerBucket && (
              <div className="flex justify-center mt-3">
                <div className="px-4 py-1.5 rounded-full text-xs font-black tracking-wider"
                  style={{
                    background: `${BUCKET_COLORS[winnerBucket]}22`,
                    color: BUCKET_COLORS[winnerBucket],
                    border: `1px solid ${BUCKET_COLORS[winnerBucket]}55`,
                  }}>
                  {BUCKET_LABELS[winnerBucket]}
                  {" · "}
                  {(BUCKETS[winnerBucket].chance * 100).toFixed(3)}% szansy
                </div>
              </div>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
          {phase === "idle" && (
            <>
              {caseData.price > 0 && (
                <div className="flex items-center gap-2 rounded-xl border p-1"
                  style={{ background: "var(--bg2)", borderColor: "var(--border)" }}>
                  {[1, 2, 3, 5].map(n => (
                    <button key={n} onClick={() => setQuantity(n)}
                      className="px-3 py-1.5 rounded-lg text-sm font-bold transition-all"
                      style={{ background: quantity === n ? "var(--neon)" : "transparent", color: quantity === n ? "white" : "var(--muted2)" }}>
                      {n}x
                    </button>
                  ))}
                </div>
              )}
              <button onClick={spin} disabled={!canAfford}
                className="btn-gold px-8 py-3.5 rounded-xl text-base disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2">
                {!canAfford && <Lock size={16} />}
                {caseData.price === 0
                  ? "🎁 Otwórz za darmo"
                  : canAfford
                  ? `🔑 Otwórz ${quantity}x — $${(caseData.price * quantity).toFixed(2)}`
                  : "Niewystarczające saldo"}
              </button>
            </>
          )}
          {phase === "spinning" && (
            <div className="text-sm font-bold animate-pulse" style={{ color: "var(--muted2)" }}>Losowanie...</div>
          )}
          {phase === "done" && (
            <button onClick={reset} className="btn-neon px-8 py-3.5 rounded-xl text-base flex items-center gap-2">
              <RefreshCw size={16} /> Otwórz ponownie
            </button>
          )}
        </div>

        {/* Balance */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm"
            style={{ background: "var(--bg2)", border: "1px solid var(--border)" }}>
            <span style={{ color: "var(--muted)" }}>Saldo:</span>
            <span className="font-black" style={{ color: "var(--gold)" }}>${balance.toFixed(2)}</span>
          </div>
        </div>

        {/* Skin grid */}
        <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--bg2)", borderColor: "var(--border)" }}>
          <div className="px-5 py-3 border-b" style={{ borderColor: "var(--border)" }}>
            <span className="text-xs font-black uppercase tracking-widest" style={{ color: "var(--muted)" }}>
              Zawartość &amp; szanse
            </span>
          </div>
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {uniqueSkins.map(skin => {
              const c = skin.rarityColor;
              const w = getRarityWeight(skin.rarity);
              const totalW = uniqueSkins.reduce((s, i) => s + getRarityWeight(i.rarity), 0);
              const pct = ((w / totalW) * 100).toFixed(1);
              return (
                <div key={skin.id}
                  className="rounded-xl border p-2 text-center card-hover"
                  style={{ background: "var(--card)", borderColor: `${c}44`, borderTop: `2px solid ${c}` }}>
                  <div className="relative w-full h-16 mb-1">
                    {skin.imageUrl ? (
                      <Image src={skin.imageUrl} alt={skin.name} fill className="object-contain" sizes="120px" unoptimized />
                    ) : (
                      <div className="flex items-center justify-center h-full text-2xl">🔫</div>
                    )}
                  </div>
                  <div className="text-xs font-bold truncate" style={{ color: "var(--text)" }}>
                    {skin.name.split(" | ")[1] ?? skin.name}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{skin.wear}</div>
                  {/* Float bar */}
                  {(skin as any).float !== undefined && (
                    <div className="mt-1.5 px-1">
                      <div className="float-bar-track">
                        <div className="float-bar-fill" style={{ width: `${((skin as any).float) * 100}%` }} />
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: "var(--muted)", fontSize: "9px" }}>
                        {((skin as any).float as number).toFixed(4)}
                      </div>
                    </div>
                  )}
                  <div className="text-xs font-black mt-1" style={{ color: c }}>
                    {skin.price > 0 ? `$${skin.price.toFixed(2)}` : "..."}
                  </div>
                  <div className="text-xs mt-1 px-1.5 py-0.5 rounded-full inline-block"
                    style={{ background: `${c}18`, color: c, fontSize: "10px" }}>
                    {pct}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Provably Fair */}
        <div className="mt-4 p-4 rounded-xl border text-xs" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
          <span className="font-bold" style={{ color: "var(--muted2)" }}>🔐 Provably Fair</span>
          {" "}— Client seed: <code style={{ color: "var(--neon2)" }}>{clientSeed.slice(0, 12)}…</code>
          {" "}· Nonce: <code style={{ color: "var(--neon2)" }}>{nonce}</code>
          {" "}· Każde losowanie weryfikowalne przez HMAC-SHA256.
        </div>
      </div>

      <RewardModal
        skin={showModal ? winner : null}
        bucket={winnerBucket ? BUCKET_LABELS[winnerBucket] : null}
        bucketColor={winnerBucket ? BUCKET_COLORS[winnerBucket] : undefined}
        onSell={handleSell}
        onKeep={handleKeep}
        onClose={() => { setShowModal(false); reset(); }}
      />
    </div>
  );
}
