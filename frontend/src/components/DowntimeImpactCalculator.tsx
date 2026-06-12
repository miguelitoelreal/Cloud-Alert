import { useState } from "react";

function fmt$(n: number) { return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function fmtI(n: number) { return n.toLocaleString("en-US", { maximumFractionDigits: 0 }); }

export function DowntimeImpactCalculator() {
  const [annualRevenue, setAnnualRevenue] = useState(0);
  const [employees, setEmployees] = useState(0);
  const [hourlyCost, setHourlyCost] = useState(0);

  const [duration, setDuration] = useState(60);
  const [durationUnit, setDurationUnit] = useState<"minutes" | "hours" | "days">("minutes");
  const [interruptionType, setInterruptionType] = useState<"partial" | "total">("total");
  const [sector, setSector] = useState("tech");

  // Optional sections
  const [showCustomerImpact, setShowCustomerImpact] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);

  const [totalCustomers, setTotalCustomers] = useState(0);
  const [churnRate, setChurnRate] = useState(0);
  const [customerLTV, setCustomerLTV] = useState(0);
  const [marketingRecoveryCost, setMarketingRecoveryCost] = useState(0);

  const [recoveryEngineers, setRecoveryEngineers] = useState(0);
  const [recoveryEngineerCost, setRecoveryEngineerCost] = useState(0);
  const [recoveryToolsCost, setRecoveryToolsCost] = useState(0);
  const [slaPenaltyPercent, setSlaPenaltyPercent] = useState(0);
  const [slaPenaltyBase, setSlaPenaltyBase] = useState<"mrr" | "arr">("mrr");

  const sectorMultipliers: Record<string, number> = { tech: 1.3, finance: 1.5, healthcare: 1.4, retail: 1.1, manufacturing: 1.0, other: 1.0 };
  const sectorLabels: Record<string, string> = { tech: "Tecnología / SaaS", finance: "Finanzas / Banca", healthcare: "Salud", retail: "Retail / E-commerce", manufacturing: "Manufactura", other: "Otro" };
  const unitMult: Record<typeof durationUnit, number> = { minutes: 1, hours: 60, days: 1440 };

  const intMult = interruptionType === "total" ? 1 : 0.5;
  const secMult = sectorMultipliers[sector] ?? 1;
  const durMin = duration * unitMult[durationUnit];

  const revPerMin = annualRevenue / 365 / 24 / 60;
  const lostRev = revPerMin * durMin * intMult * secMult;
  const lostProd = ((employees * hourlyCost) / 60) * durMin * intMult;

  const churned = totalCustomers * (churnRate / 100);
  const churnCost = churned * customerLTV;

  const recoveryLabor = recoveryEngineers * recoveryEngineerCost * (durMin / 60);
  const recoveryTotal = recoveryLabor + recoveryToolsCost;

  const penaltyBase = slaPenaltyBase === "mrr" ? annualRevenue / 12 : annualRevenue;
  const slaPenalty = (slaPenaltyPercent / 100) * penaltyBase;

  const totalCost = lostRev + lostProd + recoveryTotal + slaPenalty + churnCost + marketingRecoveryCost;
  const costPerMin = durMin > 0 ? totalCost / durMin : 0;
  const equivWorkDays = employees > 0 && hourlyCost > 0 ? totalCost / (employees * hourlyCost * 8) : 0;

  const breakdown = [
    { label: "Ingresos perdidos", value: lostRev, color: "bg-red-500" },
    { label: "Productividad perdida", value: lostProd, color: "bg-amber-500" },
    { label: "Recuperacion tecnica", value: recoveryTotal, color: "bg-blue-500" },
    { label: "Penalizacion SLA", value: slaPenalty, color: "bg-purple-500" },
    { label: "Perdida por churn", value: churnCost, color: "bg-rose-500" },
    { label: "Recuperacion reputacion", value: marketingRecoveryCost, color: "bg-cyan-500" },
  ].filter(d => d.value > 0);

  function input(label: string, value: string | number, onChange: (v: any) => void, type: "number" | "select" = "number", opts?: Record<string, string>) {
    return (
      <div>
        <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">{label}</label>
        {type === "select" && opts ? (
          <select value={String(value)} onChange={(e) => onChange(e.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-200">
            {Object.entries(opts).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        ) : (
          <input type="number" min={0} value={value || ""} onChange={(e) => onChange(Number(e.target.value))}
            className="mt-2 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-200" />
        )}
      </div>
    );
  }

  function card(title: string, value: string, variant: "danger" | "neutral" = "neutral") {
    const c = variant === "danger" ? "border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950";
    const t = variant === "danger" ? "text-red-600 dark:text-red-400" : "text-slate-500";
    const v = variant === "danger" ? "text-red-700 dark:text-red-300" : "text-slate-800 dark:text-slate-100";
    return (
      <div className={`rounded-xl border ${c} p-4`}>
        <p className={`text-[10px] uppercase tracking-wider ${t}`}>{title}</p>
        <p className={`mt-1 ${variant === "danger" ? "text-2xl" : "text-xl"} font-bold ${v}`}>{value}</p>
      </div>
    );
  }

  function sectionTitle(icon: React.ReactNode, title: string) {
    return (
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
          {icon}
        </div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">{title}</h2>
      </div>
    );
  }

  function costBreakdown(data: typeof breakdown, total: number) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5">
        <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Desglose de costos</h3>
        <div className="space-y-3">
          {data.map((d) => (
            <div key={d.label}>
              <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
                <span>{d.label}</span>
                <span className="font-medium">{fmt$(d.value)}</span>
              </div>
              <div className="mt-1 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className={`h-full rounded-full ${d.color} transition-all`} style={{ width: `${total > 0 ? (d.value / total) * 100 : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header con fórmulas ── */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-violet-50 to-white dark:from-violet-950/20 dark:to-slate-950 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/30">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Calculadora de Costo de Downtime</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">Calcula el impacto financiero de incidentes en tu empresa</p>
            </div>
          </div>
          <div className="relative group">
            <svg className="h-5 w-5 text-slate-400 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="absolute right-0 top-6 z-10 w-80 rounded-lg bg-slate-900 text-white text-xs p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all shadow-lg">
              <div className="font-semibold mb-2">Fórmulas de cálculo:</div>
              <div className="mb-2">• Ingresos perdidos = (Ingresos anuales / tiempo) × duración × multiplicador sector</div>
              <div className="mb-2">• Productividad = (empleados × costo hora) × duración</div>
              <div className="mb-2">• Churn cost = clientes que se van × LTV</div>
              <div className="mb-2">• Recuperación = ingenieros × costo × tiempo + herramientas</div>
              <div>• Penalización SLA = % del contrato (MRR o ARR)</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Datos empresa ── */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 space-y-4">
        {sectionTitle(
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>,
          "Datos de la empresa"
        )}
        <p className="text-sm text-slate-600 dark:text-slate-400">Ingresa los datos financieros y operativos de tu empresa para calcular el impacto del downtime.</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {input("Ingresos anuales (USD)", annualRevenue, setAnnualRevenue)}
          {input("Numero de empleados", employees, setEmployees)}
          {input("Costo promedio por hora (USD)", hourlyCost, setHourlyCost)}
        </div>
      </div>

      {/* ── Incidente ── */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 space-y-4">
        {sectionTitle(
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>,
          "Detalles del incidente"
        )}
        <p className="text-sm text-slate-600 dark:text-slate-400">Define las características del incidente. El sector afecta el multiplicador de impacto financiero.</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">Duracion</label>
            <div className="mt-2 flex items-center gap-2">
              <input type="number" min={0} value={duration} onChange={(e) => setDuration(Number(e.target.value))}
                className="w-24 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-200" />
              <select value={durationUnit} onChange={(e) => setDurationUnit(e.target.value as typeof durationUnit)}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-2 text-sm text-slate-800 dark:text-slate-200">
                <option value="minutes">min</option><option value="hours">hrs</option><option value="days">dias</option>
              </select>
            </div>
          </div>
          {input("Tipo de interrupcion", interruptionType, (v) => setInterruptionType(v as "partial" | "total"), "select", { total: "Total (100%)", partial: "Parcial (50%)" })}
          {input("Sector", sector, setSector, "select", sectorLabels)}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">Costo / min estimado</label>
            <div className="mt-2 text-lg font-bold text-violet-600 dark:text-violet-400">{fmt$(costPerMin)}</div>
          </div>
        </div>
      </div>

      {/* ── Clientes (opcional) ── */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 space-y-4">
        <div className="flex items-center justify-between">
          {sectionTitle(
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>,
            "Impacto en clientes"
          )}
          <button
            type="button"
            onClick={() => setShowCustomerImpact(!showCustomerImpact)}
            className="rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/20 px-3 py-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors"
          >
            {showCustomerImpact ? "Ocultar" : "Mostrar"}
          </button>
        </div>
        {showCustomerImpact && (
          <>
            <p className="text-sm text-slate-600 dark:text-slate-400">Calcula el impacto en clientes incluyendo churn y costos de recuperación de reputación.</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {input("Total clientes / usuarios", totalCustomers, setTotalCustomers)}
              {input("Tasa de churn estimada (%)", churnRate, setChurnRate)}
              {input("Lifetime Value (LTV) por cliente (USD)", customerLTV, setCustomerLTV)}
              {input("Costo marketing recuperacion (USD)", marketingRecoveryCost, setMarketingRecoveryCost)}
            </div>
            {totalCustomers > 0 && (
              <div className="grid gap-3 sm:grid-cols-3">
                {card("Clientes afectados", fmtI(totalCustomers), "neutral")}
                {card("Clientes que se iran", fmtI(Math.round(churned)), "danger")}
                {card("Perdida por cliente", fmt$(durMin > 0 ? lostRev / totalCustomers : 0), "danger")}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Recuperacion y SLA (opcional) ── */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 space-y-4">
        <div className="flex items-center justify-between">
          {sectionTitle(
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>,
            "Recuperacion y penalizaciones"
          )}
          <button
            type="button"
            onClick={() => setShowRecovery(!showRecovery)}
            className="rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/20 px-3 py-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors"
          >
            {showRecovery ? "Ocultar" : "Mostrar"}
          </button>
        </div>
        {showRecovery && (
          <>
            <p className="text-sm text-slate-600 dark:text-slate-400">Incluye costos de recuperación técnica y penalizaciones por incumplimiento de SLA.</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {input("Ingenieros en recuperacion", recoveryEngineers, setRecoveryEngineers)}
              {input("Costo por hora ingeniero (USD)", recoveryEngineerCost, setRecoveryEngineerCost)}
              {input("Costo herramientas recuperacion (USD)", recoveryToolsCost, setRecoveryToolsCost)}
              {input("Penalizacion SLA (% del contrato)", slaPenaltyPercent, setSlaPenaltyPercent)}
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">Base penalizacion</label>
                <select value={slaPenaltyBase} onChange={(e) => setSlaPenaltyBase(e.target.value as "mrr" | "arr")}
                  className="mt-2 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-200">
                  <option value="mrr">MRR (mensual)</option><option value="arr">ARR (anual)</option>
                </select>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Resultados principales ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border-2 border-red-200 dark:border-red-900/30 bg-gradient-to-br from-red-50 to-white dark:from-red-950/20 dark:to-slate-950 p-6 shadow-lg shadow-red-500/10">
          <p className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">Costo total</p>
          <p className="mt-2 text-3xl font-bold text-red-700 dark:text-red-300">{fmt$(totalCost)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Ingresos perdidos</p>
          <p className="mt-2 text-2xl font-bold text-slate-800 dark:text-slate-200">{fmt$(lostRev)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Productividad perdida</p>
          <p className="mt-2 text-2xl font-bold text-slate-800 dark:text-slate-200">{fmt$(lostProd)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Costo / minuto</p>
          <p className="mt-2 text-2xl font-bold text-slate-800 dark:text-slate-200">{fmt$(costPerMin)}</p>
        </div>
      </div>

      {equivWorkDays > 0 && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-900/30 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-slate-950 px-6 py-4 shadow-lg shadow-amber-500/10">
          <p className="text-sm text-amber-800 dark:text-amber-300">Equivale a <strong>{equivWorkDays.toFixed(1)} días laborales</strong> de toda la empresa.</p>
        </div>
      )}

      {costBreakdown(breakdown, totalCost)}
    </div>
  );
}
