import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { LottoDraw } from "../src/features/lotto/types.ts";

const API_URL = "https://www.dhlottery.co.kr/lt645/selectPstLt645InfoNew.do";
const REFERER_URL = "https://www.dhlottery.co.kr/lt645/result";
const DATA_PATH = path.join(process.cwd(), "public/data/lotto-history.json");
const MAX_CONSECUTIVE_MISSES = 3;
const REQUEST_DELAY_MS = 120;
const BATCH_CURSOR_STEP = 10;
const REQUEST_HEADERS = {
  Accept: "application/json,text/javascript,*/*;q=0.01",
  Referer: REFERER_URL,
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
};

type ApiRecord = Record<string, unknown>;

export async function fetchRound(round: number): Promise<LottoDraw | null> {
  const batch = await fetchRoundBatch(round);
  return batch.find((draw) => draw.round === round) ?? null;
}

async function fetchRoundBatch(cursorRound: number): Promise<LottoDraw[]> {
  try {
    const params = new URLSearchParams({
      srchDir: "center",
      srchLtEpsd: String(cursorRound)
    });
    const response = await fetch(`${API_URL}?${params.toString()}`, {
      cache: "no-store",
      headers: REQUEST_HEADERS
    });

    if (!response.ok) {
      console.warn(`Round cursor ${cursorRound}: HTTP ${response.status}`);
      return [];
    }

    const payload: unknown = await response.json();
    if (!isRecord(payload) || !isRecord(payload.data) || !Array.isArray(payload.data.list)) {
      return [];
    }

    return payload.data.list
      .map((record) => (isRecord(record) ? parseRound(record) : null))
      .filter((draw): draw is LottoDraw => draw !== null);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown network error";
    console.warn(`Round cursor ${cursorRound}: ${message}`);
    return [];
  }
}

export async function fetchLatestRound(startRound = 1): Promise<number> {
  let latestRound = startRound - 1;
  let misses = 0;

  for (
    let cursorRound = getPageCursor(startRound);
    misses < MAX_CONSECUTIVE_MISSES;
    cursorRound += 1
  ) {
    const batch = await fetchRoundBatch(cursorRound);
    if (batch.length > 0) {
      const batchLatestRound = Math.max(...batch.map((draw) => draw.round));
      latestRound = Math.max(latestRound, batchLatestRound);
      misses = 0;
      cursorRound = Math.max(cursorRound, batchLatestRound);
    } else {
      misses += 1;
    }
    await delay(REQUEST_DELAY_MS);
  }

  return latestRound;
}

type FetchAllHistoryOptions = {
  fullRefresh?: boolean;
};

export async function fetchAllHistory(options: FetchAllHistoryOptions = {}): Promise<LottoDraw[]> {
  const existingDraws = options.fullRefresh ? [] : await readExistingHistory();
  const existingByRound = new Map(existingDraws.map((draw) => [draw.round, draw]));
  const highestStoredRound = Math.max(0, ...existingDraws.map((draw) => draw.round));
  let misses = 0;

  for (
    let cursorRound = options.fullRefresh ? 1 : Math.max(1, highestStoredRound + 1);
    misses < MAX_CONSECUTIVE_MISSES;
    cursorRound += 1
  ) {
    const batch = await fetchRoundBatch(cursorRound);
    if (batch.length > 0) {
      batch.forEach((draw) => {
        existingByRound.set(draw.round, draw);
      });
      misses = 0;
      const rounds = batch.map((draw) => draw.round);
      console.log(`Fetched cursor ${cursorRound}: rounds ${Math.min(...rounds)}-${Math.max(...rounds)}`);
      cursorRound = Math.max(cursorRound, Math.max(...rounds));
    } else {
      misses += 1;
    }
    await delay(REQUEST_DELAY_MS);
  }

  return [...existingByRound.values()].sort((a, b) => b.round - a.round);
}

async function main() {
  const fullRefresh = process.argv.includes("--full");
  const history = await fetchAllHistory({ fullRefresh });
  if (history.length === 0) {
    throw new Error("No draw records were fetched; history files were not updated.");
  }
  await writeHistory(history);
  const latest = history[0]?.round ?? 0;
  console.log(`Saved ${history.length} draw records. Latest round: ${latest}`);
}

function parseRound(record: ApiRecord): LottoDraw | null {
  const round = readNumber(record, "ltEpsd") ?? readNumber(record, "drwNo");
  const date = formatDate(readString(record, "ltRflYmd") ?? readString(record, "drwNoDate"));
  const bonus = readNumber(record, "bnsWnNo") ?? readNumber(record, "bnusNo");
  const numbers = [
    readNumber(record, "tm1WnNo") ?? readNumber(record, "drwtNo1"),
    readNumber(record, "tm2WnNo") ?? readNumber(record, "drwtNo2"),
    readNumber(record, "tm3WnNo") ?? readNumber(record, "drwtNo3"),
    readNumber(record, "tm4WnNo") ?? readNumber(record, "drwtNo4"),
    readNumber(record, "tm5WnNo") ?? readNumber(record, "drwtNo5"),
    readNumber(record, "tm6WnNo") ?? readNumber(record, "drwtNo6")
  ];

  if (
    !round ||
    !date ||
    !bonus ||
    bonus < 1 ||
    bonus > 45 ||
    numbers.some((number) => number === null || number < 1 || number > 45)
  ) {
    return null;
  }

  return {
    round,
    date,
    numbers: numbers.map((number) => number ?? 0),
    bonus
  };
}

function readNumber(record: ApiRecord, key: string): number | null {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readString(record: ApiRecord, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function formatDate(value: string | null): string | null {
  if (!value) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  if (/^\d{8}$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  }

  return null;
}

function isRecord(value: unknown): value is ApiRecord {
  return typeof value === "object" && value !== null;
}

function getPageCursor(round: number): number {
  return Math.floor(Math.max(1, round - 1) / BATCH_CURSOR_STEP) * BATCH_CURSOR_STEP + 1;
}

async function readExistingHistory(): Promise<LottoDraw[]> {
  try {
    const content = await readFile(DATA_PATH, "utf8");
    const parsed: unknown = JSON.parse(content);
    return Array.isArray(parsed) ? parsed.filter(isLottoDraw) : [];
  } catch {
    return [];
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

async function writeHistory(history: LottoDraw[]): Promise<void> {
  const content = `${JSON.stringify(history, null, 2)}\n`;
  await mkdir(path.dirname(DATA_PATH), { recursive: true });
  await writeFile(DATA_PATH, content, "utf8");
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "unknown error";
    console.error(`Failed to fetch lotto history: ${message}`);
    process.exitCode = 1;
  });
}
