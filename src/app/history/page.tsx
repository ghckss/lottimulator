import { HistoryTable } from "@/components/HistoryTable";
import history from "@/data/lotto-history.json";
import type { LottoDraw } from "@/features/lotto/types";

export default function HistoryPage() {
  const draws = history as LottoDraw[];

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#e26d5c]">Draw history</p>
        <h1 className="text-3xl font-black tracking-[0] text-[#151922] sm:text-4xl">역대 당첨 번호</h1>
        <p className="max-w-2xl text-base leading-7 text-[#5a6377]">
          공식 기록은 다음 회차와 추첨일을 안정적으로 계산하는 기준 데이터입니다. `pnpm fetch:lotto`로 갱신할 수 있습니다.
        </p>
      </div>
      <HistoryTable draws={draws} />
    </main>
  );
}
