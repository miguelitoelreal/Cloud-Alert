export function MetaCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900/60 p-3 transition-colors hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800/60">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-500">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${color ?? "text-slate-900 dark:text-slate-200"}`}>{value}</p>
    </div>
  );
}
