
import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import "@/styles/globals.css";

type RootLayoutProps = {
  children: ReactNode;
};

export const metadata: Metadata = {
  title: "Lottimulation",
  description: "A playful lotto recommendation simulation built from historical draw signals."
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ko">
      <body>
        <header className="sticky top-0 z-40 border-b border-black/10 bg-[#f6f7fb]/85 backdrop-blur-xl">
          <nav className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-[0] text-[#151922]">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#ffd166] text-sm font-black text-[#151922] shadow-[inset_0_-4px_0_rgba(0,0,0,0.12)]">
                L
              </span>
              <span>Lottimulation</span>
            </Link>
            <div className="flex items-center gap-1 rounded-full border border-black/10 bg-white/70 p-1 text-sm font-medium text-[#4b5263] shadow-sm">
              <Link className="rounded-full px-3 py-2 transition hover:bg-[#e8fff7] hover:text-[#143c31]" href="/">
                추첨
              </Link>
              <Link className="rounded-full px-3 py-2 transition hover:bg-[#fff2d8] hover:text-[#54380b]" href="/history">
                기록
              </Link>
              <Link className="rounded-full px-3 py-2 transition hover:bg-[#e9f0ff] hover:text-[#1f3d72]" href="/stats">
                통계
              </Link>
            </div>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
