
"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";


type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export function Button({ children, type = "button", className = "", ...props }: ButtonProps) {
  const baseClassName = "inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";
  return (
    <button type={type} className={`${baseClassName} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
