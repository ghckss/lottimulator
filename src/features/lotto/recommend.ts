import { LOTTO_NUMBERS, sortDrawsByRecent } from "./statistics.ts";
import type {
  LottoDraw,
  LottoNumber,
  LottoNumberSet,
  RecommendationBasis,
  WeeklyRecommendation,
  WeeklyRecommendationGroup
} from "./types.ts";

type RecommendOptions = {
  drawRound?: number;
  drawDate?: string;
};

type RandomDrawOptions = {
  random?: () => number;
};

const RANDOM_DRAW_COUNT = 6;
const WEEKLY_GROUP_COUNT = 5;
const FALLBACK_ROUND = 1;
const WEEKLY_CONDITION = "기준 조합 1개와 곱셈/회전 순환 변환 4개";
const MULTIPLIER_CANDIDATES: LottoNumber[] = LOTTO_NUMBERS.filter(
  (number) => number > 1 && greatestCommonDivisor(number, 45) === 1
);
const OFFSET_CANDIDATES = Array.from({ length: 44 }, (_, index) => index + 1);

export function drawRandomNumbers(options: RandomDrawOptions = {}): LottoNumberSet {
  const drawOrder = shuffleNumbers(LOTTO_NUMBERS, (maxExclusive) =>
    getRandomInt(maxExclusive, options.random)
  ).slice(0, RANDOM_DRAW_COUNT);

  return {
    drawOrder,
    sortedNumbers: [...drawOrder].sort((a, b) => a - b)
  };
}

export function recommendWeeklyNumbers(
  draws: LottoDraw[],
  options: RecommendOptions = {}
): WeeklyRecommendation {
  const basis = getRecommendationBasis(draws, options);
  const baseRandom = createSeededRandom(`${basis.seed}:weekly-base`);
  const multiplierRandom = createSeededRandom(`${basis.seed}:weekly-multipliers`);
  const offsetRandom = createSeededRandom(`${basis.seed}:weekly-offsets`);
  const baseDrawOrder = shuffleNumbers(LOTTO_NUMBERS, (maxExclusive) =>
    getSeededRandomInt(maxExclusive, baseRandom)
  ).slice(0, RANDOM_DRAW_COUNT);
  const groups: WeeklyRecommendationGroup[] = [
    createWeeklyGroup(1, "기준", 1, 0, baseDrawOrder)
  ];
  const usedGroupKeys = new Set([getGroupKey(baseDrawOrder)]);
  const multipliers = shuffleNumbers(MULTIPLIER_CANDIDATES, (maxExclusive) =>
    getSeededRandomInt(maxExclusive, multiplierRandom)
  );
  const offsets = shuffleNumbers(OFFSET_CANDIDATES, (maxExclusive) =>
    getSeededRandomInt(maxExclusive, offsetRandom)
  );

  for (let index = 0; index < multipliers.length; index += 1) {
    const multiplier = multipliers[index] ?? 1;
    const offset = offsets[index % offsets.length] ?? 1;
    const drawOrder = baseDrawOrder.map((number) => wrapLottoNumber(number * multiplier + offset));
    const key = getGroupKey(drawOrder);

    if (new Set(drawOrder).size !== RANDOM_DRAW_COUNT || usedGroupKeys.has(key)) {
      continue;
    }

    groups.push(
      createWeeklyGroup(groups.length + 1, `x${multiplier}+${offset}`, multiplier, offset, drawOrder)
    );
    usedGroupKeys.add(key);

    if (groups.length === WEEKLY_GROUP_COUNT) {
      break;
    }
  }

  return {
    basis,
    condition: WEEKLY_CONDITION,
    groups
  };
}

export function getRecommendationBasis(
  draws: LottoDraw[],
  options: RecommendOptions = {}
): RecommendationBasis {
  const latestDraw = sortDrawsByRecent(draws)[0];
  const round = options.drawRound ?? (latestDraw ? latestDraw.round + 1 : FALLBACK_ROUND);
  const drawDate = options.drawDate ?? (latestDraw ? addDays(latestDraw.date, 7) : formatDate(new Date()));
  const seed = createSeed(round, drawDate);

  return {
    round,
    drawDate,
    seed
  };
}

function shuffleNumbers(
  numbers: LottoNumber[],
  getIndex: (maxExclusive: number) => number
): LottoNumber[] {
  const shuffled = [...numbers];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = getIndex(index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function getRandomInt(maxExclusive: number, random?: () => number): number {
  if (random) {
    return Math.floor(random() * maxExclusive);
  }

  const crypto = globalThis.crypto;
  if (!crypto) {
    return Math.floor(Math.random() * maxExclusive);
  }

  const range = 0x100000000;
  const limit = range - (range % maxExclusive);
  const buffer = new Uint32Array(1);
  let value = 0;

  do {
    crypto.getRandomValues(buffer);
    value = buffer[0] ?? 0;
  } while (value >= limit);

  return value % maxExclusive;
}

function getSeededRandomInt(maxExclusive: number, random: () => number): number {
  return Math.floor(random() * maxExclusive);
}

function createWeeklyGroup(
  id: number,
  label: string,
  multiplier: number,
  offset: number,
  drawOrder: LottoNumber[]
): WeeklyRecommendationGroup {
  return {
    id,
    label,
    multiplier,
    offset,
    drawOrder,
    sortedNumbers: [...drawOrder].sort((a, b) => a - b)
  };
}

function wrapLottoNumber(value: number): LottoNumber {
  return ((value - 1) % LOTTO_NUMBERS.length) + 1;
}

function getGroupKey(numbers: LottoNumber[]): string {
  return [...numbers].sort((a, b) => a - b).join("-");
}

function greatestCommonDivisor(a: number, b: number): number {
  let left = Math.abs(a);
  let right = Math.abs(b);

  while (right !== 0) {
    const next = left % right;
    left = right;
    right = next;
  }

  return left;
}

function createSeed(round: number, drawDate: string): string {
  return `lottimulation:${round}:${drawDate}`;
}

function createSeededRandom(seed: string): () => number {
  let state = hashString(seed);

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function addDays(value: string, days: number): string {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return formatDate(new Date());
  }

  const date = new Date(Date.UTC(year, month - 1, day + days));
  return formatDate(date);
}

function formatDate(value: Date): string {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
