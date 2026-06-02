import type { PropsWithChildren } from "react";

type CardProps = PropsWithChildren<{
  title?: string;
  right?: React.ReactNode;
  className?: string;
  titleClassName?: string;
  headerClassName?: string;
  bodyClassName?: string;
}>;

export function Card({
  title,
  right,
  className,
  titleClassName,
  headerClassName,
  bodyClassName,
  children,
}: CardProps) {
  return (
    <section
      className={["rounded-xl border border-slate-200 bg-white/80 shadow-lg shadow-slate-200/20 dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-slate-950/20", className ?? ""].join(" ")}
    >
      {title ? (
        <header
          className={[
            "flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-4 py-3 dark:border-slate-800",
            headerClassName ?? "",
          ].join(" ")}
        >
          <div
            className={[
              "text-sm font-semibold text-slate-900 dark:text-slate-100",
              titleClassName ?? "",
            ].join(" ")}
          >
            {title}
          </div>
          {right ? <div>{right}</div> : null}
        </header>
      ) : null}
      <div className={["p-4", bodyClassName ?? ""].join(" ")}>{children}</div>
    </section>
  );
}
