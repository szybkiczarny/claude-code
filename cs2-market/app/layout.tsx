import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CS2DROP — Otwieraj skrzynki CS2",
  description: "Otwieraj skrzynki, wygrywaj skiny, zdobywaj nagrody. Zaloguj przez Steam.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  );
}
