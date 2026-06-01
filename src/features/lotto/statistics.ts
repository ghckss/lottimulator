import type { LottoDraw, LottoNumber } from "./types.ts";

export const LOTTO_MIN = 1;
export const LOTTO_MAX = 45;
export const LOTTO_NUMBERS: LottoNumber[] = Array.from(
  { length: LOTTO_MAX },
  (_, index) => index + LOTTO_MIN
);

export function sortDrawsByRecent(draws: LottoDraw[]): LottoDraw[] {
  return [...draws].sort((a, b) => b.round - a.round);
}

export function countFrequency(draws: LottoDraw[]): Map<LottoNumber, number> {
  const counts = createNumberMap(0);

  for (const draw of draws) {
    for (const number of draw.numbers) {
      counts.set(number, (counts.get(number) ?? 0) + 1);
    }
  }

  return counts;
}

export function countRecentFrequency(draws: LottoDraw[], recentWindow = 52): Map<LottoNumber, number> {
  return countFrequency(sortDrawsByRecent(draws).slice(0, recentWindow));
}

export function countDecayedFrequency(draws: LottoDraw[], halfLifeDraws = 156): Map<LottoNumber, number> {
  const counts = createNumberMap(0);
  const recentDraws = sortDrawsByRecent(draws);

  recentDraws.forEach((draw, index) => {
    const weight = Math.pow(0.5, index / halfLifeDraws);
    for (const number of draw.numbers) {
      counts.set(number, (counts.get(number) ?? 0) + weight);
    }
  });

  return counts;
}

export function countOverdue(draws: LottoDraw[]): Map<LottoNumber, number> {
  const recentDraws = sortDrawsByRecent(draws);
  const overdue = createNumberMap(recentDraws.length);

  for (const number of LOTTO_NUMBERS) {
    const lastSeenIndex = recentDraws.findIndex((draw) => draw.numbers.includes(number));
    overdue.set(number, lastSeenIndex >= 0 ? lastSeenIndex : recentDraws.length);
  }

  return overdue;
}

export function countDatePattern(
  draws: LottoDraw[],
  targetDate = new Date()
): Map<LottoNumber, number> {
  const targetMonth = targetDate.getMonth() + 1;
  const targetDay = targetDate.getDate();
  const pattern = createNumberMap(0);

  for (const draw of draws) {
    const drawDate = parseDrawDate(draw.date);
    const monthDistance = Math.abs(targetMonth - (drawDate.getMonth() + 1));
    const dayDistance = Math.abs(targetDay - drawDate.getDate());
    const monthWeight = monthDistance === 0 ? 1 : monthDistance === 1 ? 0.62 : 0.22;
    const dayWeight = dayDistance <= 3 ? 1 : dayDistance <= 10 ? 0.55 : 0.18;
    const weight = (monthWeight + dayWeight) / 2;

    for (const number of draw.numbers) {
      pattern.set(number, (pattern.get(number) ?? 0) + weight);
    }
  }

  return pattern;
}

export function countDecayedDatePattern(
  draws: LottoDraw[],
  targetDate = new Date(),
  halfLifeDraws = 26
): Map<LottoNumber, number> {
  const targetMonth = targetDate.getMonth() + 1;
  const targetDay = targetDate.getDate();
  const pattern = createNumberMap(0);
  const recentDraws = sortDrawsByRecent(draws);

  recentDraws.forEach((draw, index) => {
    const drawDate = parseDrawDate(draw.date);
    const monthDistance = Math.abs(targetMonth - (drawDate.getMonth() + 1));
    const dayDistance = Math.abs(targetDay - drawDate.getDate());
    const monthWeight = monthDistance === 0 ? 1 : monthDistance === 1 ? 0.62 : 0.22;
    const dayWeight = dayDistance <= 3 ? 1 : dayDistance <= 10 ? 0.55 : 0.18;
    const recencyWeight = Math.pow(0.5, index / halfLifeDraws);
    const weight = ((monthWeight + dayWeight) / 2) * recencyWeight;

    for (const number of draw.numbers) {
      pattern.set(number, (pattern.get(number) ?? 0) + weight);
    }
  });

  return pattern;
}

export function normalizeScores(values: Map<LottoNumber, number>): Map<LottoNumber, number> {
  const maxValue = Math.max(...LOTTO_NUMBERS.map((number) => values.get(number) ?? 0), 0);

  if (maxValue <= 0) {
    return createNumberMap(0);
  }

  const normalized = createNumberMap(0);
  for (const number of LOTTO_NUMBERS) {
    normalized.set(number, (values.get(number) ?? 0) / maxValue);
  }

  return normalized;
}

export function normalizeLogScores(values: Map<LottoNumber, number>): Map<LottoNumber, number> {
  const logged = createNumberMap(0);

  for (const number of LOTTO_NUMBERS) {
    logged.set(number, Math.log1p(values.get(number) ?? 0));
  }

  return normalizeScores(logged);
}

export function getTopFrequency(draws: LottoDraw[], limit = 8): Array<[LottoNumber, number]> {
  return [...countFrequency(draws).entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .slice(0, limit);
}

export function createNumberMap(defaultValue: number): Map<LottoNumber, number> {
  return new Map(LOTTO_NUMBERS.map((number) => [number, defaultValue]));
}

function parseDrawDate(value: string): Date {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}
