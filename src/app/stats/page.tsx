import { LottoBall } from "@/components/LottoBall";
import { readLottoHistory } from "@/features/lotto/history";
import {
  countDatePattern,
  countOverdue,
  countRecentFrequency,
  getTopFrequency,
  normalizeScores
} from "@/features/lotto/statistics";

export default async function StatsPage() {
  const draws = await readLottoHistory();
  const recentFrequency = [...countRecentFrequency(draws, 52).entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .slice(0, 10);
  const overdue = [...countOverdue(draws).entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .slice(0, 10);
  const monthPattern = [...normalizeScores(countDatePattern(draws)).entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .slice(0, 10);

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#e26d5c]">Signal board</p>
        <h1 className="text-3xl font-black tracking-[0] text-[#151922] sm:text-4xl">공식 기록 보드</h1>
        <p className="max-w-2xl text-base leading-7 text-[#5a6377]">
          역대 번호 흐름을 참고용으로 살펴보는 화면입니다.
        </p>
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        <StatCard title="전체 출현 상위" subtitle={`${draws.length}회차 기준`} rows={getTopFrequency(draws, 10)} unit="회" />
        <StatCard title="최근 52회 상위" subtitle="짧은 흐름" rows={recentFrequency} unit="회" />
        <StatCard title="장기 미출현" subtitle="쉬어간 간격" rows={overdue} unit="회 전" />
      </section>

      <section className="rounded-lg border border-black/10 bg-white/84 p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-black tracking-[0] text-[#151922]">월/일 패턴 감도</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {monthPattern.map(([number, value]) => (
            <div key={number} className="rounded-lg border border-[#e4e8ef] bg-[#f8fafc] p-3">
              <div className="mb-3 flex items-center justify-between">
                <LottoBall number={number} size="sm" />
                <strong className="tabular-nums text-[#4f5a70]">{Math.round(value * 100)}</strong>
              </div>
              <span className="block h-2 overflow-hidden rounded-full bg-white">
                <span className="block h-full rounded-full bg-[#ff6b8a]" style={{ width: `${Math.round(value * 100)}%` }} />
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

type StatCardProps = {
  title: string;
  subtitle: string;
  rows: Array<[number, number]>;
  unit: string;
};

function StatCard({ title, subtitle, rows, unit }: StatCardProps) {
  const maxValue = Math.max(...rows.map(([, value]) => value), 1);

  return (
    <article className="rounded-lg border border-black/10 bg-white/84 p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-black tracking-[0] text-[#151922]">{title}</h2>
        <p className="text-sm font-semibold text-[#7a8498]">{subtitle}</p>
      </div>
      <div className="space-y-3">
        {rows.map(([number, value]) => (
          <div key={number} className="grid grid-cols-[2.5rem_1fr_4rem] items-center gap-3">
            <LottoBall number={number} size="sm" />
            <span className="h-2 overflow-hidden rounded-full bg-[#edf1f7]">
              <span className="block h-full rounded-full bg-[#55d6be]" style={{ width: `${Math.round((value / maxValue) * 100)}%` }} />
            </span>
            <span className="text-right text-sm font-bold tabular-nums text-[#5f6a7e]">
              {value}
              {unit}
            </span>
          </div>
        ))}
      </div>
    </article>
  );
}
