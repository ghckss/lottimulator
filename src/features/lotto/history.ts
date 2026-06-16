import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseDataRecommendation } from "./dataRecommend.ts";
import type { DataRecommendation, LottoDraw } from "./types.ts";

const HISTORY_PATH = path.join(process.cwd(), "public/data/lotto-history.json");
const RECOMMENDATION_PATH = path.join(process.cwd(), "public/data/lotto-recommendations.json");

export async function readLottoHistory(): Promise<LottoDraw[]> {
  const content = await readFile(HISTORY_PATH, "utf8");
  const parsed: unknown = JSON.parse(content);

  return Array.isArray(parsed) ? parsed.filter(isLottoDraw).sort((a, b) => b.round - a.round) : [];
}

export async function readDataRecommendation(): Promise<DataRecommendation | null> {
  try {
    const content = await readFile(RECOMMENDATION_PATH, "utf8");
    return parseDataRecommendation(JSON.parse(content));
  } catch {
    return null;
  }
}

function isLottoDraw(value: unknown): value is LottoDraw {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.round === "number" &&
    typeof value.date === "string" &&
    Array.isArray(value.numbers) &&
    value.numbers.every((number) => typeof number === "number") &&
    typeof value.bonus === "number"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
