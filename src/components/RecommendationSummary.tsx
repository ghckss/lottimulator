import { CalendarDays, Database, Hash, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { LottoBall } from "./LottoBall";
import type { LottoDraw, WeeklyRecommendation } from "@/features/lotto/types";

type RecommendationSummaryProps = {
  latestDraw?: LottoDraw;
  totalDraws: number;
  recommendation?: WeeklyRecommendation;
};

export function RecommendationSummary({
  latestDraw,
  totalDraws,
  recommendation
}: RecommendationSummaryProps) {
  return (
    <section className="rounded-lg border border-black/10 bg-white/82 p-5 shadow-[0_18px_50px_rgba(40,50,73,0.12)] backdrop-blur">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-[#e26d5c]" aria-hidden="true" />
        <h2 className="text-lg font-black tracking-[0] text-[#151922]">금주의 추천 숫자</h2>
      </div>

      {recommendation ? (
        <div className="space-y-5">
          <div className="space-y-3">
            {recommendation.groups.map((group) => (
              <div
                key={group.id}
                className="grid gap-3 rounded-lg border border-black/10 bg-[#f8fafc] p-3 sm:grid-cols-[4.5rem_1fr]"
              >
                <div className="flex items-center gap-2 text-sm font-black text-[#151922] sm:block">
                  <span>그룹 {group.id}</span>
                  <span className="text-xs font-bold text-[#7a8498]">{group.label}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.sortedNumbers.map((number) => (
                    <LottoBall key={number} number={number} size="sm" />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="grid gap-3 text-sm">
            <Fact
              icon={<Hash className="h-4 w-4" aria-hidden="true" />}
              label="기준 회차"
              value={`${recommendation.basis.round}회`}
            />
            <Fact
              icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
              label="추첨일"
              value={recommendation.basis.drawDate}
            />
            <Fact
              icon={<Database className="h-4 w-4" aria-hidden="true" />}
              label="조건"
              value={recommendation.condition}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4 text-sm leading-6 text-[#4f5a70]">
          <p>기계가 공식 기록에서 다음 추첨 기준을 읽고 있습니다.</p>
          <div className="grid gap-3">
            <Fact icon={<Database className="h-4 w-4" aria-hidden="true" />} label="공식 기록" value={`${totalDraws}건`} />
            <Fact
              icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
              label="최근 기준"
              value={latestDraw ? `${latestDraw.round}회 ${latestDraw.date}` : "대기 중"}
            />
          </div>
        </div>
      )}
    </section>
  );
}

type FactProps = {
  icon: ReactNode;
  label: string;
  value: string;
};

function Fact({ icon, label, value }: FactProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-black/10 bg-[#f8fafc] px-3 py-2">
      <span className="flex items-center gap-2 text-[#5e687b]">
        {icon}
        {label}
      </span>
      <strong className="text-right text-[#151922]">{value}</strong>
    </div>
  );
}
