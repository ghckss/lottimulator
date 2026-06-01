import type { CSSProperties } from "react";

type LottoBallProps = {
  number: number;
  size?: "sm" | "md" | "lg";
  isBonus?: boolean;
  className?: string;
};

const sizeClassName = {
  sm: "h-8 w-8 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-14 w-14 text-base"
};

export function LottoBall({ number, size = "md", isBonus = false, className = "" }: LottoBallProps) {
  const color = getBallColor(number, isBonus);
  const style: CSSProperties = {
    background:
      `radial-gradient(circle at 30% 24%, rgba(255,255,255,0.95) 0 11%, transparent 12%), ${color}`,
    boxShadow: "inset 0 -7px 0 rgba(0,0,0,0.16), 0 10px 22px rgba(21,25,34,0.18)"
  };

  return (
    <span
      className={`inline-grid shrink-0 place-items-center rounded-full border border-white/70 font-black tabular-nums text-white ${sizeClassName[size]} ${className}`.trim()}
      style={style}
    >
      {number}
    </span>
  );
}

export function getBallColor(number: number, isBonus = false): string {
  if (isBonus) {
    return "linear-gradient(145deg, #151922, #4b5568)";
  }

  if (number <= 10) {
    return "linear-gradient(145deg, #ffd166, #f08a24)";
  }
  if (number <= 20) {
    return "linear-gradient(145deg, #43d9bd, #0f9f8d)";
  }
  if (number <= 30) {
    return "linear-gradient(145deg, #5aa9ff, #2667d9)";
  }
  if (number <= 40) {
    return "linear-gradient(145deg, #ff6b8a, #c7355d)";
  }
  return "linear-gradient(145deg, #a78bfa, #6d5bd0)";
}
