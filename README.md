# lottimulation

과거 로또 회차 데이터를 재료로 삼아 번호 추천을 연출하는 Next.js 기반 로또 시뮬레이션 앱입니다. 실제 당첨 예측 앱이 아니며, 모든 추천은 통계 점수와 무작위 요소를 섞은 엔터테인먼트용 결과입니다.

## 주요 기능

- 투명한 로또 기계 영역 안에서 여러 공이 움직이는 추첨 애니메이션
- 시작 버튼 클릭 후 6개 번호를 순차적으로 결과 슬롯에 표시
- 최근 출현 빈도, 장기 미출현, 월/일 패턴, 랜덤 노이즈를 조합한 추천 점수
- 회차, 번호, 최근 10/50/전체 필터를 가진 당첨 번호 기록 페이지
- 전체 빈도, 최근 빈도, 장기 미출현, 날짜 패턴을 보여주는 통계 페이지
- 공식 로또 API 응답을 JSON으로 저장하는 증분 업데이트 스크립트

## 실행

```bash
pnpm install
pnpm dev
```

개발 서버는 기본적으로 `http://127.0.0.1:3000`에서 실행됩니다.

## 데이터 갱신

기본 샘플 데이터는 아래 두 위치에 있습니다.

```text
src/data/lotto-history.json
public/data/lotto-history.json
```

공식 API에서 회차를 증분 수집하려면 다음 명령을 실행합니다.

```bash
pnpm fetch:lotto
```

스크립트는 이미 저장된 가장 큰 회차 다음부터 요청하고, 유효하지 않거나 누락된 응답은 건너뜁니다. 저장 대상은 `src/data/lotto-history.json`이며, 정적 접근을 위해 `public/data/lotto-history.json`도 함께 갱신합니다.

## 품질 확인

```bash
pnpm harness
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Next.js 16의 네이티브 SWC/Turbopack 바이너리가 샌드박스 환경에서 차단되는 경우를 피하기 위해 `dev`와 `build` 스크립트는 Webpack과 로컬 WASM SWC 패키지를 사용합니다.

## 구조

```text
src/
  app/
    (home)/page.tsx
    history/page.tsx
    stats/page.tsx
  components/
    LottoMachine.tsx
    LottoBall.tsx
    DrawnBallList.tsx
    HistoryTable.tsx
    RecommendationSummary.tsx
  data/
    lotto-history.json
  features/
    lotto/
      recommend.ts
      statistics.ts
      types.ts
scripts/
  fetch-lotto-history.ts
  recommendation.test.ts
```

## Harness

`pnpm harness`는 실행 가능한 컨벤션 게이트입니다. 명시적 `any` 금지, strict TypeScript 설정, `@/*` alias, Next app router 구조, 기본 접근성 위험을 확인합니다. `errors`와 `warnings`가 있으면 완료 전에 수정해야 합니다.
