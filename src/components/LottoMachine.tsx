"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Play, RotateCcw, WandSparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_RECOMMENDATION_METHOD } from "@/features/lotto/dataRecommend";
import { drawRandomNumbers } from "@/features/lotto/recommend";
import type {
  DataRecommendation,
  LottoDraw,
  LottoNumberSet,
  RecommendationMethodKey
} from "@/features/lotto/types";
import { Button } from "@/shared/ui/Button";
import { LottoBall } from "./LottoBall";
import { RecommendationSummary } from "./RecommendationSummary";

type LottoMachineProps = {
  draws: LottoDraw[];
  dataRecommendation: DataRecommendation | null;
};

type DrawStatus = "idle" | "spinning" | "revealing" | "done";

type PhysicsBall = {
  id: number;
  number: number;
  radius: number;
  spin: number;
  spinVelocity: number;
  vx: number;
  vy: number;
  x: number;
  y: number;
};

const MACHINE_BALL_COUNT = 30;
const MACHINE_BALL_RADIUS = 16;
const MACHINE_EDGE_PADDING = 6;

export function LottoMachine({ draws, dataRecommendation }: LottoMachineProps) {
  const [status, setStatus] = useState<DrawStatus>("idle");
  const [drawnNumbers, setDrawnNumbers] = useState<number[]>([]);
  const [machineSize, setMachineSize] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [physicsBalls, setPhysicsBalls] = useState<PhysicsBall[]>([]);
  const [drawResult, setDrawResult] = useState<LottoNumberSet>();
  const [methodKey, setMethodKey] = useState<RecommendationMethodKey>(DEFAULT_RECOMMENDATION_METHOD);
  const machineRef = useRef<HTMLDivElement | null>(null);
  const isRunning = status === "spinning" || status === "revealing";
  const sortedNumbers = useMemo(
    () => (drawResult ? [...drawResult.sortedNumbers] : []),
    [drawResult]
  );

  useEffect(() => {
    const element = machineRef.current;
    if (!element) {
      return undefined;
    }

    const updateMachineSize = () => {
      setMachineSize(element.clientWidth);
    };
    const resizeObserver = new ResizeObserver(updateMachineSize);

    updateMachineSize();
    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };

    updateMotionPreference();
    mediaQuery.addEventListener("change", updateMotionPreference);

    return () => {
      mediaQuery.removeEventListener("change", updateMotionPreference);
    };
  }, []);

  useEffect(() => {
    if (machineSize <= 0) {
      return;
    }

    setPhysicsBalls(createPhysicsBalls(machineSize));
  }, [machineSize]);

  useEffect(() => {
    if (machineSize <= 0 || prefersReducedMotion || !isRunning) {
      return undefined;
    }

    let animationFrame = 0;
    let lastTimestamp = performance.now();

    const animate = (timestamp: number) => {
      const deltaSeconds = Math.min((timestamp - lastTimestamp) / 1000, 0.032);
      lastTimestamp = timestamp;

      setPhysicsBalls((currentBalls) =>
        currentBalls.map((ball) => stepPhysicsBall(ball, machineSize, deltaSeconds, isRunning))
      );
      animationFrame = window.requestAnimationFrame(animate);
    };

    animationFrame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [isRunning, machineSize, prefersReducedMotion]);

  const boostPhysicsBalls = useCallback(() => {
    setPhysicsBalls((currentBalls) =>
      currentBalls.map((ball, index) => {
        const angle = Math.random() * Math.PI * 2;
        const speed = 720 + Math.random() * 260 + (index % 5) * 28;
        return {
          ...ball,
          spinVelocity: (Math.random() > 0.5 ? 1 : -1) * (1500 + Math.random() * 900),
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed
        };
      })
    );
  }, []);

  const settlePhysicsBalls = useCallback(() => {
    if (machineSize <= 0) {
      return;
    }

    setPhysicsBalls(createPhysicsBalls(machineSize));
  }, [machineSize]);

  function startDraw() {
    if (isRunning) {
      return;
    }

    const nextDraw = drawRandomNumbers();
    boostPhysicsBalls();
    setDrawResult(nextDraw);
    setDrawnNumbers([]);
    setStatus("spinning");

    window.setTimeout(() => {
      setStatus("revealing");
      revealNumbers(nextDraw.drawOrder);
    }, 1600);
  }

  function revealNumbers(numbers: number[]) {
    numbers.forEach((number, index) => {
      window.setTimeout(() => {
        setDrawnNumbers((current) => [...current, number]);
        if (index === numbers.length - 1) {
          window.setTimeout(() => {
            setStatus("done");
            settlePhysicsBalls();
          }, 520);
        }
      }, index * 620);
    });
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-lg border border-black/10 bg-white/70 p-4 shadow-[0_24px_80px_rgba(40,50,73,0.15)] backdrop-blur sm:p-5">
        <div className="relative min-h-[360px] overflow-hidden rounded-lg border border-white/70 bg-[#151922] p-4 text-white shadow-inner sm:min-h-[440px]">
          <div className="absolute inset-x-8 top-7 h-16 rounded-full bg-[#55d6be]/20 blur-2xl" />
          <div
            ref={machineRef}
            className="absolute left-1/2 top-8 h-[245px] w-[245px] -translate-x-1/2 rounded-full border border-white/35 bg-white/14 shadow-[inset_0_0_55px_rgba(255,255,255,0.22),0_0_50px_rgba(85,214,190,0.24)] backdrop-blur-md sm:h-[305px] sm:w-[305px]"
          >
            <div className="absolute inset-5 rounded-full border border-white/25" />
            <div className="absolute inset-10 rounded-full border border-white/15" />
            <div
              className="absolute inset-0 rounded-full bg-[#55d6be]/15 blur-xl"
              style={{ animation: isRunning ? "machine-glow 0.7s ease-in-out infinite" : undefined }}
            />
            {physicsBalls.map((ball) => (
              <span
                key={ball.id}
                aria-hidden="true"
                className="absolute will-change-transform"
                style={{
                  left: ball.x,
                  top: ball.y,
                  transition: isRunning
                    ? "none"
                    : "left 780ms cubic-bezier(0.2, 0.8, 0.2, 1), top 780ms cubic-bezier(0.2, 0.8, 0.2, 1), transform 780ms cubic-bezier(0.2, 0.8, 0.2, 1)",
                  transform: `translate(-50%, -50%) rotate(${ball.spin}deg) scale(${isRunning ? 1.16 : 0.96})`
                }}
              >
                <LottoBall number={ball.number} size="sm" className={isRunning ? "" : "opacity-85"} />
              </span>
            ))}
          </div>

          <div className="absolute bottom-[104px] left-1/2 h-24 w-9 -translate-x-1/2 rounded-b-full border border-white/25 bg-white/16 shadow-inner" />
          <div className="absolute bottom-20 left-1/2 h-10 w-28 -translate-x-1/2 rounded-full border border-white/20 bg-[#ff6b8a]/80 shadow-lg" />

          <AnimatePresence>
            {drawnNumbers.map((number, index) => (
              <motion.div
                key={`${number}-${index}`}
                className="absolute bottom-24 left-1/2"
                initial={{ opacity: 0, scale: 0.45, x: "-50%", y: -130, rotate: -90 }}
                animate={{ opacity: 1, scale: 1, x: `calc(-50% + ${(index - 2.5) * 56}px)`, y: 88, rotate: 360 }}
                transition={{ type: "spring", stiffness: 180, damping: 18 }}
              >
                <LottoBall number={number} size="lg" />
              </motion.div>
            ))}
          </AnimatePresence>

        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <div className="rounded-lg border border-black/10 bg-white/82 p-4 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-[#596276]">오름차순 표시</p>
          <div className="flex min-h-12 flex-wrap items-center gap-2">
            {sortedNumbers.length > 0 ? (
              sortedNumbers.map((number) => <LottoBall key={number} number={number} size="md" />)
            ) : (
              <span className="text-sm text-[#7a8498]">추첨 대기</span>
            )}
          </div>
        </div>
        <Button
          className="min-h-16 gap-2 border-0 bg-[#151922] px-6 text-base shadow-[0_16px_34px_rgba(21,25,34,0.24)] hover:bg-[#2c3342]"
          disabled={isRunning}
          onClick={startDraw}
        >
          {status === "done" ? <RotateCcw className="h-5 w-5" aria-hidden="true" /> : <Play className="h-5 w-5" aria-hidden="true" />}
          {status === "idle" ? "시작" : status === "done" ? "다시 추첨" : "추첨 중"}
        </Button>
      </div>

      <RecommendationSummary
        totalDraws={draws.length}
        latestDraw={draws[0]}
        dataRecommendation={dataRecommendation}
        selectedMethod={methodKey}
        onSelectMethod={setMethodKey}
      />

      <div className="rounded-lg border border-[#d3e8e2] bg-[#effdf8] p-4 text-sm leading-6 text-[#246455]">
        <span className="inline-flex items-center gap-2 font-bold text-[#123f35]">
          <WandSparkles className="h-4 w-4" aria-hidden="true" />
          시뮬레이션 안내
        </span>
        <p className="mt-2">로또 머신은 매번 무작위 6개를 뽑고, 추천 숫자는 전체 회차 데이터를 분석한 세 가지 방법론(가중 점수·패턴 필터·공출현 연쇄)에서 파생합니다. 어느 방법도 실제 당첨 확률을 높이지는 않습니다.</p>
      </div>
    </div>
  );
}

function createPhysicsBalls(machineSize: number): PhysicsBall[] {
  const center = machineSize / 2;
  const usableRadius = center - MACHINE_BALL_RADIUS - MACHINE_EDGE_PADDING;
  const rowCounts = [4, 6, 7, 6, 5, 2];
  const rowGap = machineSize < 280 ? 18 : 20;
  const bottomInset = 8;
  const restingPositions = rowCounts.flatMap((count, rowIndex) => {
    const y = center + usableRadius - bottomInset - rowIndex * rowGap;
    const yOffset = y - center;
    const maxX = Math.sqrt(Math.max(usableRadius ** 2 - yOffset ** 2, 0));
    const spacing = count > 1 ? (maxX * 1.74) / (count - 1) : 0;
    const startX = center - spacing * (count - 1) * 0.5;

    return Array.from({ length: count }, (_, columnIndex) => ({
      x: startX + columnIndex * spacing,
      y
    }));
  });

  return Array.from({ length: MACHINE_BALL_COUNT }, (_, index) => {
    const position = restingPositions[index] ?? { x: center, y: center + usableRadius };

    return {
      id: index,
      number: ((index * 7 + 11) % 45) + 1,
      radius: MACHINE_BALL_RADIUS,
      spin: seededUnit(index + 101) * 360,
      spinVelocity: 0,
      vx: 0,
      vy: 0,
      x: position.x,
      y: position.y
    };
  });
}

function stepPhysicsBall(
  ball: PhysicsBall,
  machineSize: number,
  deltaSeconds: number,
  isRunning: boolean
): PhysicsBall {
  const center = machineSize / 2;
  const usableRadius = center - ball.radius - MACHINE_EDGE_PADDING;
  const targetSpeed = isRunning ? 920 : 72;
  let x = ball.x + ball.vx * deltaSeconds;
  let y = ball.y + ball.vy * deltaSeconds;
  let vx = ball.vx;
  let vy = ball.vy;

  const dx = x - center;
  const dy = y - center;
  const distance = Math.hypot(dx, dy);

  if (distance > usableRadius) {
    const normalX = dx / distance;
    const normalY = dy / distance;
    const velocityDotNormal = vx * normalX + vy * normalY;

    x = center + normalX * usableRadius;
    y = center + normalY * usableRadius;
    vx -= 2 * velocityDotNormal * normalX;
    vy -= 2 * velocityDotNormal * normalY;
  }

  const currentSpeed = Math.max(Math.hypot(vx, vy), 1);
  const normalizedVx = vx / currentSpeed;
  const normalizedVy = vy / currentSpeed;
  const accelerationBlend = isRunning ? 0.044 : 0.014;
  const correctedVx = normalizedVx * targetSpeed;
  const correctedVy = normalizedVy * targetSpeed;

  vx += (correctedVx - vx) * accelerationBlend;
  vy += (correctedVy - vy) * accelerationBlend;

  return {
    ...ball,
    spin: ball.spin + ball.spinVelocity * deltaSeconds,
    vx,
    vy,
    x,
    y
  };
}

function seededUnit(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}
