import assert from "node:assert/strict";
import {
  parseDataRecommendation,
  selectMethod
} from "../src/features/lotto/dataRecommend.ts";
import {
  drawRandomNumbers,
  getRecommendationBasis,
  recommendWeeklyNumbers
} from "../src/features/lotto/recommend.ts";
import type { DataRecommendation, LottoDraw } from "../src/features/lotto/types.ts";

const draws: LottoDraw[] = [
  { round: 3, date: "2026-05-09", numbers: [1, 2, 3, 4, 5, 6], bonus: 7 },
  { round: 2, date: "2026-05-02", numbers: [1, 8, 9, 10, 11, 12], bonus: 13 },
  { round: 1, date: "2026-04-25", numbers: [1, 14, 15, 16, 17, 18], bonus: 19 }
];

const randomDraw = drawRandomNumbers({ random: createSequenceRandom([0.12, 0.42, 0.74, 0.31, 0.93, 0.22]) });

assert.equal(randomDraw.drawOrder.length, 6);
assert.equal(new Set(randomDraw.drawOrder).size, 6);
assert.deepEqual(
  randomDraw.sortedNumbers,
  [...randomDraw.drawOrder].sort((a, b) => a - b)
);

const recommendation = recommendWeeklyNumbers(draws);

assert.equal(recommendation.groups.length, 5);
assert.equal(recommendation.basis.round, 4);
assert.equal(recommendation.basis.drawDate, "2026-05-16");

for (const group of recommendation.groups) {
  assert.equal(group.drawOrder.length, 6);
  assert.equal(new Set(group.drawOrder).size, 6);
  assert.deepEqual(group.sortedNumbers, [...group.drawOrder].sort((a, b) => a - b));
}

const baseGroup = recommendation.groups[0];
assert.ok(baseGroup);
assert.equal(baseGroup.multiplier, 1);

for (const group of recommendation.groups.slice(1)) {
  assert.equal(greatestCommonDivisor(group.multiplier, 45), 1);
  assert.ok(group.offset > 0 && group.offset < 45);
  assert.deepEqual(
    group.drawOrder,
    baseGroup.drawOrder.map((number) => wrapLottoNumber(number * group.multiplier + group.offset)),
    "derived groups should multiply and rotate the base group, then wrap after 45"
  );
}

const oldSkewedDraws: LottoDraw[] = Array.from({ length: 120 }, (_, index) => {
  const round = index + 1;
  const isOldRange = round <= 100;
  return {
    round,
    date: `2026-01-${String((index % 28) + 1).padStart(2, "0")}`,
    numbers: isOldRange ? [2, 11, 21, 31, 41, 45] : [8, 18, 28, 34, 39, 44],
    bonus: 7
  };
});

const rewrittenHistory = oldSkewedDraws.map((draw) => ({
  ...draw,
  numbers: [3, 12, 19, 27, 36, 45],
  bonus: 9
}));

assert.deepEqual(
  recommendWeeklyNumbers(oldSkewedDraws).groups,
  recommendWeeklyNumbers(rewrittenHistory).groups,
  "historical winning numbers should not affect the independent recommendation"
);

assert.deepEqual(
  recommendWeeklyNumbers([], { drawRound: 1224, drawDate: "2026-05-16" }),
  recommendWeeklyNumbers([], { drawRound: 1224, drawDate: "2026-05-16" }),
  "the same draw round and draw date should produce a consistent recommendation"
);

assert.deepEqual(getRecommendationBasis(draws), {
  round: 4,
  drawDate: "2026-05-16",
  seed: "lottimulation:4:2026-05-16"
});

const recommendationPayload = {
  basis: {
    round: 1229,
    drawDate: "2026-06-20",
    sourceLatestRound: 1228,
    totalDraws: 1228,
    generatedAt: "2026-06-16"
  },
  methods: [
    {
      key: "weighted",
      label: "가중 점수",
      description: "desc",
      condition: "cond",
      scores: [{ number: 7, score: 0.83 }],
      groups: [
        { id: 1, label: "조합 1", drawOrder: [7, 3, 1, 22, 44, 15], sortedNumbers: [1, 3, 7, 15, 22, 44] }
      ]
    },
    {
      key: "markov",
      label: "공출현 연쇄",
      description: "desc",
      condition: "cond",
      scores: [],
      groups: [
        { id: 1, label: "조합 1", drawOrder: [6, 12, 19, 21, 28, 41], sortedNumbers: [6, 12, 19, 21, 28, 41] }
      ]
    }
  ]
};

const parsed = parseDataRecommendation(recommendationPayload);
assert.ok(parsed, "valid payload should parse");
const parsedData: DataRecommendation = parsed;
assert.equal(parsedData.methods.length, 2);
assert.equal(selectMethod(parsedData, "weighted")?.groups[0]?.sortedNumbers.length, 6);
assert.equal(selectMethod(parsedData, "markov")?.key, "markov");
assert.equal(selectMethod(parsedData, "pattern"), undefined, "absent method returns undefined");

assert.equal(parseDataRecommendation(null), null);
assert.equal(parseDataRecommendation({ basis: {}, methods: [] }), null);
assert.equal(
  parseDataRecommendation({ basis: recommendationPayload.basis, methods: [{ key: "bogus" }] }),
  null,
  "unknown method keys are dropped and empty methods fail"
);

console.log("recommendation tests passed");

function createSequenceRandom(sequence: number[]): () => number {
  let index = 0;

  return () => {
    const value = sequence[index % sequence.length];
    index += 1;
    return value ?? 0;
  };
}

function wrapLottoNumber(value: number): number {
  return ((value - 1) % 45) + 1;
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
