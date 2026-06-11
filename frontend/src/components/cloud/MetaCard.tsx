export function MetaCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-3 transition-colors hover:border-slate-600 hover:bg-slate-800/60">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${color ?? "text-slate-200"}`}>{value}</p>
    </div>
  );
}
