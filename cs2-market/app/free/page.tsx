import Navbar from "@/components/Navbar";
import { getSession } from "@/lib/session";
import Link from "next/link";

export default async function FreePage() {
  const session = await getSession();
  const freeCase = { id: "c4", name: "Free Daily Case" };

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <Navbar user={session} />

      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="text-8xl mb-6 float">🎁</div>
        <h1 className="text-3xl font-black mb-3" style={{ color: "var(--text)" }}>
          Darmowa skrzynka
        </h1>
        <p className="text-sm mb-2" style={{ color: "var(--muted)" }}>
          Możesz ją odebrać raz na 24 godziny. Zupełnie za darmo.
        </p>

        <div className="rounded-2xl border p-6 mb-6"
          style={{ background: "var(--bg2)", borderColor: "rgba(34,197,94,0.3)" }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold" style={{ color: "var(--text)" }}>{freeCase.name}</span>
            <span className="text-xs font-black px-2 py-1 rounded-full"
              style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>
              GOTOWA
            </span>
          </div>
          <div className="h-2 rounded-full mb-3" style={{ background: "#22c55e" }} />
          <p className="text-xs" style={{ color: "var(--muted)" }}>Odnowi się za: 00:00:00</p>
        </div>

        {session ? (
          <Link href={`/case/${freeCase.id}`}
            className="btn-gold inline-flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-base">
            🎁 Odbierz darmową skrzynkę
          </Link>
        ) : (
          <div>
            <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
              Zaloguj się przez Steam żeby odebrać darmową skrzynkę
            </p>
            <a href="/api/auth/steam"
              className="btn-neon inline-flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-base">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.187.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0z"/>
              </svg>
              Zaloguj przez Steam
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
