
import { LottoMachine } from "@/components/LottoMachine";
import history from "@/data/lotto-history.json";
import type { LottoDraw } from "@/features/lotto/types";

export function HomeContent() {
  const lottoHistory = history as LottoDraw[];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <section className="min-w-0 space-y-5">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#e26d5c]">
            Simulation draw lab
          </p>
          <h1 className="max-w-3xl text-4xl font-black tracking-[0] text-[#111827] sm:text-5xl">
            다음 추첨일과 회차로 굴러가는 로또 시뮬레이터
          </h1>
          <p className="max-w-2xl text-base leading-7 text-[#5a6377]">
            로또 머신은 매번 새로 뽑고, 금주의 추천 숫자는 다음 추첨 기준에서 파생한 다섯 개 조합으로 연출합니다.
          </p>
        </div>
        <LottoMachine draws={lottoHistory} />
      </section>
    </main>
  );
}
