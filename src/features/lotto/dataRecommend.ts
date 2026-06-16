import type {
  DataRecommendation,
  DataRecommendationBasis,
  MethodRecommendation,
  RecommendationCombo,
  RecommendationMethodKey,
  ScoredNumber
} from "./types.ts";

export const RECOMMENDATION_METHOD_KEYS: readonly RecommendationMethodKey[] = [
  "weighted",
  "pattern",
  "markov"
];

export const DEFAULT_RECOMMENDATION_METHOD: RecommendationMethodKey = "weighted";

export function selectMethod(
  data: DataRecommendation | null | undefined,
  key: RecommendationMethodKey
): MethodRecommendation | undefined {
  return data?.methods.find((method) => method.key === key);
}

export function parseDataRecommendation(value: unknown): DataRecommendation | null {
  if (!isRecord(value) || !isRecord(value.basis) || !Array.isArray(value.methods)) {
    return null;
  }

  const basis = parseBasis(value.basis);
  if (!basis) {
    return null;
  }

  const methods = value.methods
    .map((method) => parseMethod(method))
    .filter((method): method is MethodRecommendation => method !== null);

  if (methods.length === 0) {
    return null;
  }

  return { basis, methods };
}

function parseBasis(value: Record<string, unknown>): DataRecommendationBasis | null {
  if (
    typeof value.round !== "number" ||
    typeof value.drawDate !== "string" ||
    typeof value.sourceLatestRound !== "number" ||
    typeof value.totalDraws !== "number" ||
    typeof value.generatedAt !== "string"
  ) {
    return null;
  }

  return {
    round: value.round,
    drawDate: value.drawDate,
    sourceLatestRound: value.sourceLatestRound,
    totalDraws: value.totalDraws,
    generatedAt: value.generatedAt
  };
}

function parseMethod(value: unknown): MethodRecommendation | null {
  if (!isRecord(value) || !isMethodKey(value.key)) {
    return null;
  }
  if (
    typeof value.label !== "string" ||
    typeof value.description !== "string" ||
    typeof value.condition !== "string" ||
    !Array.isArray(value.scores) ||
    !Array.isArray(value.groups)
  ) {
    return null;
  }

  const scores = value.scores
    .map((score) => parseScore(score))
    .filter((score): score is ScoredNumber => score !== null);
  const groups = value.groups
    .map((group) => parseCombo(group))
    .filter((group): group is RecommendationCombo => group !== null);

  if (groups.length === 0) {
    return null;
  }

  return {
    key: value.key,
    label: value.label,
    description: value.description,
    condition: value.condition,
    scores,
    groups
  };
}

function parseScore(value: unknown): ScoredNumber | null {
  if (!isRecord(value) || typeof value.number !== "number" || typeof value.score !== "number") {
    return null;
  }
  return { number: value.number, score: value.score };
}

function parseCombo(value: unknown): RecommendationCombo | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "number" ||
    typeof value.label !== "string" ||
    !isNumberArray(value.drawOrder) ||
    !isNumberArray(value.sortedNumbers)
  ) {
    return null;
  }
  return {
    id: value.id,
    label: value.label,
    drawOrder: value.drawOrder,
    sortedNumbers: value.sortedNumbers
  };
}

function isMethodKey(value: unknown): value is RecommendationMethodKey {
  return (
    typeof value === "string" &&
    RECOMMENDATION_METHOD_KEYS.includes(value as RecommendationMethodKey)
  );
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => typeof item === "number");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
