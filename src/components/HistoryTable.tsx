"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { LottoBall } from "./LottoBall";
import type { LottoDraw } from "@/features/lotto/types";

type HistoryTableProps = {
  draws: LottoDraw[];
};

type RangeFilter = "10" | "50" | "all";

export function HistoryTable({ draws }: HistoryTableProps) {
  const [roundQuery, setRoundQuery] = useState("");
  const [numberQuery, setNumberQuery] = useState("");
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>("10");

  const filteredDraws = useMemo(() => {
    const ranged = rangeFilter === "all" ? draws : draws.slice(0, Number(rangeFilter));
    const roundText = roundQuery.trim();
    const parsedNumber = Number(numberQuery);
    const hasNumber = Number.isInteger(parsedNumber) && parsedNumber >= 1 && parsedNumber <= 45;

    return ranged.filter((draw) => {
      const roundMatches = roundText.length === 0 || String(draw.round).includes(roundText);
      const numberMatches =
        numberQuery.trim().length === 0 ||
        (hasNumber && (draw.numbers.includes(parsedNumber) || draw.bonus === parsedNumber));
      return roundMatches && numberMatches;
    });
  }, [draws, numberQuery, rangeFilter, roundQuery]);

  return (
    <section className="space-y-4">
      <div className="grid gap-3 rounded-lg border border-black/10 bg-white/82 p-4 shadow-sm sm:grid-cols-[1fr_1fr_auto]">
        <label className="space-y-2 text-sm font-semibold text-[#4c566a]">
          회차 검색
          <span className="flex items-center gap-2 rounded-lg border border-[#d6dce7] bg-white px-3 py-2">
            <Search className="h-4 w-4 text-[#8791a3]" aria-hidden="true" />
            <input
              className="min-w-0 flex-1 border-0 bg-transparent text-[#151922] outline-none"
              inputMode="numeric"
              onChange={(event) => setRoundQuery(event.target.value)}
              placeholder="1223"
              value={roundQuery}
            />
          </span>
        </label>
        <label className="space-y-2 text-sm font-semibold text-[#4c566a]">
          번호 검색
          <span className="flex items-center gap-2 rounded-lg border border-[#d6dce7] bg-white px-3 py-2">
            <Search className="h-4 w-4 text-[#8791a3]" aria-hidden="true" />
            <input
              className="min-w-0 flex-1 border-0 bg-transparent text-[#151922] outline-none"
              inputMode="numeric"
              max={45}
              min={1}
              onChange={(event) => setNumberQuery(event.target.value)}
              placeholder="16"
              value={numberQuery}
            />
          </span>
        </label>
        <div className="space-y-2 text-sm font-semibold text-[#4c566a]">
          범위
          <div className="grid grid-cols-3 rounded-lg border border-[#d6dce7] bg-white p-1">
            {(["10", "50", "all"] satisfies RangeFilter[]).map((value) => (
              <button
                key={value}
                className={`rounded-md px-3 py-2 text-sm font-bold transition ${
                  rangeFilter === value ? "bg-[#151922] text-white" : "text-[#5c6678] hover:bg-[#eef3fa]"
                }`}
                onClick={() => setRangeFilter(value)}
                type="button"
              >
                {value === "all" ? "전체" : `최근 ${value}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-black/10 bg-white/86 shadow-sm">
        <div className="grid grid-cols-[5rem_7.5rem_1fr_4rem] gap-3 border-b border-[#e5e9f0] bg-[#f8fafc] px-4 py-3 text-sm font-black text-[#4c566a] max-md:hidden">
          <span>회차</span>
          <span>추첨일</span>
          <span>당첨 번호</span>
          <span className="text-center">보너스</span>
        </div>
        <div className="divide-y divide-[#edf0f5]">
          {filteredDraws.map((draw) => (
            <article
              key={draw.round}
              className="grid gap-3 px-4 py-4 md:grid-cols-[5rem_7.5rem_1fr_4rem] md:items-center"
            >
              <div>
                <span className="text-xs font-bold text-[#8a95a6] md:hidden">회차 </span>
                <strong className="text-[#151922]">{draw.round}</strong>
              </div>
              <time className="text-sm font-semibold text-[#657085]" dateTime={draw.date}>
                {draw.date}
              </time>
              <div className="flex flex-wrap gap-2">
                {draw.numbers.map((number) => (
                  <LottoBall key={`${draw.round}-${number}`} number={number} size="sm" />
                ))}
              </div>
              <div className="md:text-center">
                <LottoBall number={draw.bonus} size="sm" isBonus />
              </div>
            </article>
          ))}
          {filteredDraws.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm font-semibold text-[#748095]">검색 결과가 없습니다.</div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
