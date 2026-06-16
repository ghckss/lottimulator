import fs from "node:fs";
import { recommendWeeklyNumbers, drawRandomNumbers } from "./src/features/lotto/recommend.ts";

const raw = JSON.parse(fs.readFileSync("./public/data/lotto-history.json", "utf-8"));
const draws = Array.isArray(raw) ? raw : raw.draws ?? raw.data;

const weekly = recommendWeeklyNumbers(draws);
console.log("=== 기준 정보 ===");
console.log("다음 회차:", weekly.basis.round);
console.log("추첨일:", weekly.basis.drawDate);
console.log("시드:", weekly.basis.seed);
console.log("조건:", weekly.condition);
console.log("\n=== 주간 추천 5조합 ===");
for (const g of weekly.groups) {
  console.log(`그룹 ${g.id} [${g.label}] -> ${g.sortedNumbers.join(", ")}  (추첨순: ${g.drawOrder.join(", ")})`);
}

console.log("\n=== 즉석 랜덤 추첨 1세트 ===");
const r = drawRandomNumbers();
console.log("정렬:", r.sortedNumbers.join(", "), " 추첨순:", r.drawOrder.join(", "));
