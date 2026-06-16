#!/usr/bin/env python3
"""Backtest the recommendation methodologies against a known past draw.

Usage: python3 scripts/backtest-lotto.py [target_round]

Builds recommendations from history strictly BEFORE ``target_round`` (the actual
target draw is never fed into the analysis), then scores every generated combo
against the real winning numbers of ``target_round``.
"""

from __future__ import annotations

import datetime as dt
import importlib.util
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ANALYSIS_PATH = ROOT / "scripts" / "analyze-lotto.py"

spec = importlib.util.spec_from_file_location("lotto_analysis", ANALYSIS_PATH)
assert spec and spec.loader
analysis = importlib.util.module_from_spec(spec)
sys.modules["lotto_analysis"] = analysis
spec.loader.exec_module(analysis)


def main() -> None:
    target_round = int(sys.argv[1]) if len(sys.argv) > 1 else 1228

    all_draws = analysis.load_history(analysis.HISTORY_PATH)
    actual = next((d for d in all_draws if d.round == target_round), None)
    train = [d for d in all_draws if d.round < target_round]

    if not train:
        raise SystemExit(f"No training draws before round {target_round}")

    generated_at = train[0].date  # use the latest training draw date for determinism
    generated_date = analysis.parse_date(generated_at) or dt.date.today()
    payload = analysis.build_recommendations(train, generated_date)

    actual_set = set(actual.numbers) if actual else set()
    bonus = actual.bonus if actual else None

    print(f"=== 백테스트: {target_round}회 (학습: 1~{train[0].round}회, {len(train)}개 표본) ===")
    print(f"기준 추첨일: {payload['basis']['drawDate']}")
    if actual:
        print(f"실제 {target_round}회: {sorted(actual_set)}  보너스 {bonus}")
    else:
        print(f"실제 {target_round}회 데이터 없음 (순수 예측)")
    print()

    for method in payload["methods"]:
        print(f"[{method['key']}] {method['label']}")
        best = 0
        for group in method["groups"]:
            nums = group["sortedNumbers"]
            hit = sorted(set(nums) & actual_set) if actual else []
            hit_count = len(hit)
            best = max(best, hit_count)
            bonus_mark = " +보너스" if actual and bonus in nums else ""
            rank = grade(hit_count, actual and bonus in nums)
            hit_text = f"적중 {hit_count}개 {hit}{bonus_mark} -> {rank}" if actual else ""
            print(f"  조합 {group['id']}: {nums}   {hit_text}")
        if actual:
            print(f"  >> 최고 적중: {best}개")
        print()


def grade(hit_count: int, bonus_hit: bool | None) -> str:
    if hit_count == 6:
        return "1등"
    if hit_count == 5 and bonus_hit:
        return "2등"
    if hit_count == 5:
        return "3등"
    if hit_count == 4:
        return "4등"
    if hit_count == 3:
        return "5등"
    return "낙첨"


if __name__ == "__main__":
    main()
