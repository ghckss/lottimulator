
import type { ReactNode } from "react";


type StateViewProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function StateView({ title, description, action }: StateViewProps) {
  const baseClassName = "rounded-md border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-700";
  return (
    <section className={baseClassName} aria-live="polite">
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {action ? <div>{action}</div> : null}
    </section>
  );
}
