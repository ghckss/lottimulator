
import type { ReactNode } from "react";


type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className = "" }: CardProps) {
  const baseClassName = "rounded-lg border border-slate-200 bg-white p-6 shadow-sm";
  return <section className={`${baseClassName} ${className}`.trim()}>{children}</section>;
}
