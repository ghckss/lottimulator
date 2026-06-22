import { CalendarDays, Database, Hash, Layers, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { LottoBall } from "./LottoBall";
import { selectMethod } from "@/features/lotto/dataRecommend";
import type {
  DataRecommendation,
  LottoDraw,
  RecommendationMethodKey
} from "@/features/lotto/types";

type MethodOption = {
  key: RecommendationMethodKey;
  name: string;
  hint: string;
};

const METHOD_OPTIONS: MethodOption[] = [
  {
    key: "weighted",
    name: "가중 점수",
    hint: "전체 빈도·최근 추세·미출현 기간·날짜 패턴 점수를 합성해, 점수가 높은 번호를 가중 추첨합니다."
  },
  {
    key: "pattern",
    name: "패턴 필터",
    hint: "과거 당첨 조합의 홀짝 비율·합계 구간·고저 분포·연속수를 닮은 조합만 통과시킵니다."
  },
  {
    key: "markov",
    name: "공출현 연쇄",
    hint: "함께 자주 당첨된 번호 쌍(공출현)을 따라 친화도가 높은 번호를 연쇄로 골라냅니다."
  },
  {
    key: "consensus",
    name: "방법 합의",
    hint: "세 방법론이 가장 많이 뽑은 번호를 모으고, 동점일 때는 평균 점수가 높은 번호를 택합니다."
  }
];

const TOP_SCORE_COUNT = 8;

type RecommendationSummaryProps = {
  latestDraw?: LottoDraw;
  totalDraws: number;
  dataRecommendation?: DataRecommendation | null;
  selectedMethod: RecommendationMethodKey;
  onSelectMethod: (key: RecommendationMethodKey) => void;
};

export function RecommendationSummary({
  latestDraw,
  totalDraws,
  dataRecommendation,
  selectedMethod,
  onSelectMethod
}: RecommendationSummaryProps) {
  const method = selectMethod(dataRecommendation, selectedMethod);
  const topScores = method
    ? [...method.scores].sort((a, b) => b.score - a.score).slice(0, TOP_SCORE_COUNT)
    : [];

  return (
    <section className="rounded-lg border border-black/10 bg-white/82 p-5 shadow-[0_18px_50px_rgba(40,50,73,0.12)] backdrop-blur">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-[#e26d5c]" aria-hidden="true" />
        <h2 className="text-lg font-black tracking-[0] text-[#151922]">데이터 기반 추천 숫자</h2>
      </div>

      {dataRecommendation && method ? (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2" role="group" aria-label="추천 방법론 선택">
            {METHOD_OPTIONS.map((option) => {
              const isActive = option.key === selectedMethod;
              const tooltipId = `method-tip-${option.key}`;
              return (
                <span key={option.key} className="group relative inline-flex">
                  <button
                    type="button"
                    onClick={() => onSelectMethod(option.key)}
                    aria-pressed={isActive}
                    aria-describedby={tooltipId}
                    className={`rounded-full border px-4 py-1.5 text-sm font-bold transition ${
                      isActive
                        ? "border-[#151922] bg-[#151922] text-white"
                        : "border-black/10 bg-white text-[#5a6377] hover:border-[#151922]/40"
                    }`}
                  >
                    {option.name}
                  </button>
                  <span
                    role="tooltip"
                    id={tooltipId}
                    className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-60 -translate-x-1/2 rounded-lg bg-[#151922] px-3 py-2 text-xs font-medium leading-5 text-white opacity-0 shadow-[0_12px_30px_rgba(21,25,34,0.28)] transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
                  >
                    {option.hint}
                  </span>
                </span>
              );
            })}
          </div>

          <p className="text-sm leading-6 text-[#4f5a70]">{method.description}</p>

          <div className="space-y-3">
            {method.groups.map((group) => (
              <div
                key={group.id}
                className="grid gap-3 rounded-lg border border-black/10 bg-[#f8fafc] p-3 sm:grid-cols-[4.5rem_1fr]"
              >
                <div className="flex items-center gap-2 text-sm font-black text-[#151922] sm:block">
                  <span>조합 {group.id}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.sortedNumbers.map((number) => (
                    <LottoBall key={number} number={number} size="sm" />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {topScores.length > 0 ? (
            <div className="rounded-lg border border-black/10 bg-[#f8fafc] p-3">
              <p className="mb-3 flex items-center gap-2 text-sm font-bold text-[#596276]">
                <Layers className="h-4 w-4" aria-hidden="true" />
                상위 점수 번호
              </p>
              <ul className="space-y-2">
                {topScores.map((entry) => (
                  <li key={entry.number} className="flex items-center gap-3">
                    <LottoBall number={entry.number} size="sm" />
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-black/5">
                      <span
                        className="block h-full rounded-full bg-[#55d6be]"
                        style={{ width: `${Math.round(entry.score * 100)}%` }}
                      />
                    </span>
                    <span className="w-10 text-right text-xs font-bold text-[#5a6377]">
                      {Math.round(entry.score * 100)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="grid gap-3 text-sm">
            <Fact
              icon={<Hash className="h-4 w-4" aria-hidden="true" />}
              label="기준 회차"
              value={`${dataRecommendation.basis.round}회`}
            />
            <Fact
              icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
              label="추첨일"
              value={dataRecommendation.basis.drawDate}
            />
            <Fact
              icon={<Database className="h-4 w-4" aria-hidden="true" />}
              label="분석 표본"
              value={`${dataRecommendation.basis.totalDraws}회 · ${method.condition}`}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4 text-sm leading-6 text-[#4f5a70]">
          <p>분석 데이터가 아직 준비되지 않았습니다. <code>pnpm analyze:lotto</code>를 실행해 추천 파일을 생성하세요.</p>
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
