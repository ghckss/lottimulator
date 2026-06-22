#!/usr/bin/env python3
"""Offline lotto analysis pipeline.

Reads the full draw history and precomputes recommendation combinations using
three independent methodologies. The result is written as a single JSON file
that the Next.js app consumes at request time (no Python at runtime).

Each methodology is implemented as a standalone ``build_*`` function returning
the same combo structure, and they are wired together through ``METHODS`` so the
consuming side can pick a methodology purely by key.

Standard library only - no numpy/pandas required.
"""

from __future__ import annotations

import datetime as dt
import hashlib
import json
import math
import os
import random
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Iterable

LOTTO_MIN = 1
LOTTO_MAX = 45
PICK_COUNT = 6
GROUP_COUNT = 5
ALL_NUMBERS = list(range(LOTTO_MIN, LOTTO_MAX + 1))

ROOT = Path(__file__).resolve().parent.parent
HISTORY_PATH = ROOT / "public" / "data" / "lotto-history.json"
OUTPUT_PATH = ROOT / "public" / "data" / "lotto-recommendations.json"

# Recency half-life expressed in draws (~3 years of weekly draws).
DECAY_HALF_LIFE = 156
# Window for the "date pattern" signal half-life.
DATE_DECAY_HALF_LIFE = 26


@dataclass(frozen=True)
class Draw:
    round: int
    date: str
    numbers: tuple[int, ...]
    bonus: int


def load_history(path: Path) -> list[Draw]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    records = raw if isinstance(raw, list) else raw.get("draws") or raw.get("data") or []
    draws: list[Draw] = []
    for record in records:
        try:
            numbers = tuple(int(n) for n in record["numbers"])
        except (KeyError, TypeError, ValueError):
            continue
        if len(numbers) != PICK_COUNT:
            continue
        if any(n < LOTTO_MIN or n > LOTTO_MAX for n in numbers):
            continue
        draws.append(
            Draw(
                round=int(record["round"]),
                date=str(record["date"]),
                numbers=numbers,
                bonus=int(record.get("bonus", 0)),
            )
        )
    draws.sort(key=lambda d: d.round, reverse=True)
    return draws


def parse_date(value: str) -> dt.date | None:
    try:
        return dt.date.fromisoformat(value)
    except ValueError:
        return None


def seeded_random(seed_text: str) -> random.Random:
    """Deterministic RNG seeded from the draw basis so output is reproducible."""
    digest = hashlib.sha256(seed_text.encode("utf-8")).hexdigest()
    return random.Random(int(digest, 16))


# --------------------------------------------------------------------------- #
# Signal builders (shared statistics)
# --------------------------------------------------------------------------- #

def frequency_scores(draws: Iterable[Draw]) -> dict[int, float]:
    scores = {n: 0.0 for n in ALL_NUMBERS}
    for draw in draws:
        for number in draw.numbers:
            scores[number] += 1.0
    return scores


def decayed_frequency_scores(draws: list[Draw], half_life: int = DECAY_HALF_LIFE) -> dict[int, float]:
    scores = {n: 0.0 for n in ALL_NUMBERS}
    for index, draw in enumerate(draws):  # draws are sorted recent-first
        weight = 0.5 ** (index / half_life)
        for number in draw.numbers:
            scores[number] += weight
    return scores


def overdue_scores(draws: list[Draw]) -> dict[int, float]:
    """Draws since each number last appeared - larger means longer overdue."""
    total = len(draws)
    scores = {n: float(total) for n in ALL_NUMBERS}
    for number in ALL_NUMBERS:
        for index, draw in enumerate(draws):  # recent-first
            if number in draw.numbers:
                scores[number] = float(index)
                break
    return scores


def date_pattern_scores(draws: list[Draw], target: dt.date, half_life: int = DATE_DECAY_HALF_LIFE) -> dict[int, float]:
    scores = {n: 0.0 for n in ALL_NUMBERS}
    for index, draw in enumerate(draws):  # recent-first
        draw_date = parse_date(draw.date)
        if draw_date is None:
            continue
        month_distance = abs(target.month - draw_date.month)
        day_distance = abs(target.day - draw_date.day)
        month_weight = 1.0 if month_distance == 0 else 0.62 if month_distance == 1 else 0.22
        day_weight = 1.0 if day_distance <= 3 else 0.55 if day_distance <= 10 else 0.18
        recency = 0.5 ** (index / half_life)
        weight = ((month_weight + day_weight) / 2) * recency
        for number in draw.numbers:
            scores[number] += weight
    return scores


def normalize(scores: dict[int, float]) -> dict[int, float]:
    max_value = max(scores.values()) if scores else 0.0
    if max_value <= 0:
        return {n: 0.0 for n in ALL_NUMBERS}
    return {n: scores[n] / max_value for n in ALL_NUMBERS}


def weighted_sample_without_replacement(
    weights: dict[int, float], count: int, rng: random.Random
) -> list[int]:
    """Pick ``count`` distinct numbers, probability proportional to weight."""
    pool = dict(weights)
    floor = max(min(weights.values()), 0.0001) if weights else 0.0001
    # Guarantee every number keeps a non-zero chance.
    pool = {n: max(w, floor * 0.05) for n, w in pool.items()}
    picked: list[int] = []
    for _ in range(count):
        total = sum(pool.values())
        if total <= 0:
            remaining = [n for n in ALL_NUMBERS if n not in picked]
            picked.extend(rng.sample(remaining, count - len(picked)))
            break
        threshold = rng.random() * total
        cumulative = 0.0
        chosen = None
        for number, weight in pool.items():
            cumulative += weight
            if cumulative >= threshold:
                chosen = number
                break
        if chosen is None:
            chosen = next(iter(pool))
        picked.append(chosen)
        del pool[chosen]
    return picked


def co_occurrence_matrix(draws: Iterable[Draw]) -> dict[int, dict[int, float]]:
    matrix = {a: {b: 0.0 for b in ALL_NUMBERS} for a in ALL_NUMBERS}
    for draw in draws:
        for a in draw.numbers:
            for b in draw.numbers:
                if a != b:
                    matrix[a][b] += 1.0
    return matrix


def make_combo(combo_id: int, label: str, draw_order: list[int]) -> dict:
    return {
        "id": combo_id,
        "label": label,
        "drawOrder": draw_order,
        "sortedNumbers": sorted(draw_order),
    }


def scores_payload(normalized: dict[int, float]) -> list[dict]:
    return [
        {"number": number, "score": round(normalized[number], 4)}
        for number in ALL_NUMBERS
    ]


# --------------------------------------------------------------------------- #
# Method A: weighted score synthesis + weighted sampling
# --------------------------------------------------------------------------- #

WEIGHTED_BLEND = {
    "frequency": 0.25,
    "decayed": 0.35,
    "overdue": 0.18,
    "date": 0.22,
}


def build_weighted(draws: list[Draw], target: dt.date, rng: random.Random) -> dict:
    frequency = normalize(frequency_scores(draws))
    decayed = normalize(decayed_frequency_scores(draws))
    overdue = normalize(overdue_scores(draws))
    date_pattern = normalize(date_pattern_scores(draws, target))

    composite = {
        n: WEIGHTED_BLEND["frequency"] * frequency[n]
        + WEIGHTED_BLEND["decayed"] * decayed[n]
        + WEIGHTED_BLEND["overdue"] * overdue[n]
        + WEIGHTED_BLEND["date"] * date_pattern[n]
        for n in ALL_NUMBERS
    }
    normalized = normalize(composite)

    seen: set[tuple[int, ...]] = set()
    groups: list[dict] = []
    attempts = 0
    while len(groups) < GROUP_COUNT and attempts < GROUP_COUNT * 40:
        attempts += 1
        draw_order = weighted_sample_without_replacement(composite, PICK_COUNT, rng)
        key = tuple(sorted(draw_order))
        if key in seen:
            continue
        seen.add(key)
        groups.append(make_combo(len(groups) + 1, f"조합 {len(groups) + 1}", draw_order))

    return {
        "key": "weighted",
        "label": "가중 점수 합성",
        "description": "전체 빈도·최근 가중·미출현·날짜 패턴 점수를 정규화해 합성하고, 점수 비례 확률로 비복원 샘플링합니다.",
        "condition": "빈도 25% · 최근가중 35% · 미출현 18% · 날짜패턴 22%",
        "scores": scores_payload(normalized),
        "groups": groups,
    }


# --------------------------------------------------------------------------- #
# Method B: statistical pattern filter + combination generation
# --------------------------------------------------------------------------- #

def draw_features(numbers: Iterable[int]) -> dict[str, float]:
    nums = sorted(numbers)
    odd = sum(1 for n in nums if n % 2 == 1)
    total = sum(nums)
    low = sum(1 for n in nums if n <= 22)
    consecutive = sum(1 for a, b in zip(nums, nums[1:]) if b - a == 1)
    return {"odd": odd, "sum": total, "low": low, "consecutive": consecutive}


def mean_std(values: list[float]) -> tuple[float, float]:
    if not values:
        return 0.0, 0.0
    mean = sum(values) / len(values)
    variance = sum((v - mean) ** 2 for v in values) / len(values)
    return mean, math.sqrt(variance)


def build_pattern(draws: list[Draw], rng: random.Random) -> dict:
    features = [draw_features(draw.numbers) for draw in draws]
    sum_mean, sum_std = mean_std([f["sum"] for f in features])
    odd_counts = [f["odd"] for f in features]
    low_counts = [f["low"] for f in features]
    max_consecutive = 2  # historically 0-2 consecutive pairs dominate

    common_odd = _common_values(odd_counts)
    common_low = _common_values(low_counts)
    sum_low = sum_mean - sum_std
    sum_high = sum_mean + sum_std

    # Frequency weighting biases the random base toward historically hot numbers.
    base_weights = normalize(decayed_frequency_scores(draws))

    seen: set[tuple[int, ...]] = set()
    groups: list[dict] = []
    attempts = 0
    while len(groups) < GROUP_COUNT and attempts < GROUP_COUNT * 600:
        attempts += 1
        draw_order = weighted_sample_without_replacement(base_weights, PICK_COUNT, rng)
        feats = draw_features(draw_order)
        if feats["odd"] not in common_odd:
            continue
        if feats["low"] not in common_low:
            continue
        if not (sum_low <= feats["sum"] <= sum_high):
            continue
        if feats["consecutive"] > max_consecutive:
            continue
        key = tuple(sorted(draw_order))
        if key in seen:
            continue
        seen.add(key)
        groups.append(make_combo(len(groups) + 1, f"조합 {len(groups) + 1}", draw_order))

    # Fallback if the filter was too strict to reach GROUP_COUNT.
    while len(groups) < GROUP_COUNT:
        draw_order = weighted_sample_without_replacement(base_weights, PICK_COUNT, rng)
        key = tuple(sorted(draw_order))
        if key in seen:
            continue
        seen.add(key)
        groups.append(make_combo(len(groups) + 1, f"조합 {len(groups) + 1}", draw_order))

    return {
        "key": "pattern",
        "label": "통계 패턴 필터",
        "description": "과거 당첨 조합의 홀짝 비율·합계 구간·고저 분포·연속수 분포를 만족하는 후보만 통과시킵니다.",
        "condition": (
            f"합계 {sum_low:.0f}~{sum_high:.0f} · 홀수 {sorted(common_odd)}개 · "
            f"저수(1-22) {sorted(common_low)}개 · 연속수 ≤{max_consecutive}"
        ),
        "scores": scores_payload(base_weights),
        "groups": groups,
    }


def _common_values(values: list[int]) -> set[int]:
    """Values covering the bulk (~80%) of the distribution."""
    if not values:
        return set()
    counts: dict[int, int] = {}
    for value in values:
        counts[value] = counts.get(value, 0) + 1
    ordered = sorted(counts.items(), key=lambda item: item[1], reverse=True)
    target = len(values) * 0.8
    accumulated = 0
    common: set[int] = set()
    for value, count in ordered:
        common.add(value)
        accumulated += count
        if accumulated >= target:
            break
    return common


# --------------------------------------------------------------------------- #
# Method C: co-occurrence / Markov chain selection
# --------------------------------------------------------------------------- #

def build_markov(draws: list[Draw], rng: random.Random) -> dict:
    matrix = co_occurrence_matrix(draws)
    affinity_total = {n: sum(matrix[n].values()) for n in ALL_NUMBERS}
    seed_weights = normalize(decayed_frequency_scores(draws))

    seen: set[tuple[int, ...]] = set()
    groups: list[dict] = []
    attempts = 0
    while len(groups) < GROUP_COUNT and attempts < GROUP_COUNT * 40:
        attempts += 1
        draw_order = _markov_walk(matrix, seed_weights, rng)
        key = tuple(sorted(draw_order))
        if key in seen:
            continue
        seen.add(key)
        groups.append(make_combo(len(groups) + 1, f"조합 {len(groups) + 1}", draw_order))

    return {
        "key": "markov",
        "label": "공출현 연쇄",
        "description": "함께 당첨된 적이 많은 번호 쌍(공출현 행렬)을 따라가며 친화도가 높은 번호를 연쇄적으로 선택합니다.",
        "condition": "시드 번호에서 출발해 공출현 가중치 비례로 다음 번호를 선택",
        "scores": scores_payload(normalize(affinity_total)),
        "groups": groups,
    }


def _markov_walk(
    matrix: dict[int, dict[int, float]],
    seed_weights: dict[int, float],
    rng: random.Random,
) -> list[int]:
    picked: list[int] = [_weighted_pick(seed_weights, set(), rng)]
    while len(picked) < PICK_COUNT:
        affinity = {n: 0.0 for n in ALL_NUMBERS}
        for current in picked:
            for candidate, weight in matrix[current].items():
                affinity[candidate] += weight
        chosen = _weighted_pick(affinity, set(picked), rng)
        picked.append(chosen)
    return picked


def _weighted_pick(weights: dict[int, float], exclude: set[int], rng: random.Random) -> int:
    pool = {n: max(w, 0.0001) for n, w in weights.items() if n not in exclude}
    total = sum(pool.values())
    if total <= 0:
        return rng.choice([n for n in ALL_NUMBERS if n not in exclude])
    threshold = rng.random() * total
    cumulative = 0.0
    for number, weight in pool.items():
        cumulative += weight
        if cumulative >= threshold:
            return number
    return next(iter(pool))


# --------------------------------------------------------------------------- #
# Method D: consensus of the base methods (majority vote + score tie-break)
# --------------------------------------------------------------------------- #

def build_consensus(base_methods: list[dict]) -> dict:
    """Combine the base methods: pick the numbers they pick most often,
    breaking ties by the highest average per-number score across methods."""
    counts = {n: 0 for n in ALL_NUMBERS}
    for method in base_methods:
        for group in method["groups"]:
            for number in group["sortedNumbers"]:
                counts[number] += 1

    score_lookup = {
        method["key"]: {entry["number"]: entry["score"] for entry in method["scores"]}
        for method in base_methods
    }
    avg_score = {
        n: (
            sum(score_lookup[key].get(n, 0.0) for key in score_lookup) / len(score_lookup)
            if score_lookup
            else 0.0
        )
        for n in ALL_NUMBERS
    }

    ranked = sorted(ALL_NUMBERS, key=lambda n: (-counts[n], -avg_score[n], n))
    chosen = ranked[:PICK_COUNT]

    return {
        "key": "consensus",
        "label": "방법 합의",
        "description": "세 방법론이 만든 조합 전체에서 가장 많이 뽑힌 번호를 모으고, 동점일 때는 방법론 평균 점수가 높은 번호를 택합니다.",
        "condition": "다수결(등장 횟수) · 동점 시 세 방법 평균 점수",
        "scores": scores_payload(normalize(avg_score)),
        "groups": [make_combo(1, "합의 조합", chosen)],
    }


# --------------------------------------------------------------------------- #
# Method registry + orchestration
# --------------------------------------------------------------------------- #

METHODS: dict[str, Callable[..., dict]] = {
    "weighted": lambda draws, target, rng: build_weighted(draws, target, rng),
    "pattern": lambda draws, target, rng: build_pattern(draws, rng),
    "markov": lambda draws, target, rng: build_markov(draws, rng),
}


def next_basis(draws: list[Draw], generated_at: dt.date) -> dict:
    latest = draws[0] if draws else None
    if latest is None:
        return {
            "round": 1,
            "drawDate": generated_at.isoformat(),
            "sourceLatestRound": 0,
            "totalDraws": 0,
            "generatedAt": generated_at.isoformat(),
        }
    latest_date = parse_date(latest.date) or generated_at
    target = latest_date + dt.timedelta(days=7)
    return {
        "round": latest.round + 1,
        "drawDate": target.isoformat(),
        "sourceLatestRound": latest.round,
        "totalDraws": len(draws),
        "generatedAt": generated_at.isoformat(),
    }


def build_recommendations(draws: list[Draw], generated_at: dt.date) -> dict:
    basis = next_basis(draws, generated_at)
    target = parse_date(basis["drawDate"]) or generated_at
    methods = []
    for key, builder in METHODS.items():
        rng = seeded_random(f"lottimulation:{basis['round']}:{basis['drawDate']}:{key}")
        methods.append(builder(draws, target, rng))
    methods.append(build_consensus(methods))
    return {"basis": basis, "methods": methods}


def main() -> None:
    draws = load_history(HISTORY_PATH)
    if not draws:
        raise SystemExit(f"No draws loaded from {HISTORY_PATH}")
    generated_at = _today()
    payload = build_recommendations(draws, generated_at)
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(
        f"Wrote {OUTPUT_PATH.relative_to(ROOT)} | round {payload['basis']['round']} "
        f"| methods: {', '.join(m['key'] for m in payload['methods'])}"
    )


def _today() -> dt.date:
    override = os.environ.get("LOTTO_GENERATED_AT")
    if override:
        parsed = parse_date(override)
        if parsed:
            return parsed
    return dt.date.today()


if __name__ == "__main__":
    main()
