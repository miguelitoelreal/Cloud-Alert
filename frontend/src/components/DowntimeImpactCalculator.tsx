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

  const [totalCustomers, setTotalCustomers] = useState(0);
  const [churnRate, setChurnRate] = useState(0);
  const [customerLTV, setCustomerLTV] = useState(0);

  const [recoveryEngineers, setRecoveryEngineers] = useState(0);
  const [recoveryEngineerCost, setRecoveryEngineerCost] = useState(0);
  const [recoveryToolsCost, setRecoveryToolsCost] = useState(0);

  const [slaPenaltyPercent, setSlaPenaltyPercent] = useState(0);
  const [slaPenaltyBase, setSlaPenaltyBase] = useState<"mrr" | "arr">("mrr");
  const [marketingRecoveryCost, setMarketingRecoveryCost] = useState(0);

  const [scenarioDuration, setScenarioDuration] = useState(240);
  const [scenarioUnit, setScenarioUnit] = useState<"minutes" | "hours" | "days">("minutes");

  const [projectedUptime, setProjectedUptime] = useState(99.9);
  const [projectedIncidents, setProjectedIncidents] = useState(4);

  const sectorMultipliers: Record<string, number> = { tech: 1.3, finance: 1.5, healthcare: 1.4, retail: 1.1, manufacturing: 1.0, other: 1.0 };
  const sectorLabels: Record<string, string> = { tech: "Tecnologia / SaaS", finance: "Finanzas / Banca", healthcare: "Salud", retail: "Retail / E-commerce", manufacturing: "Manufactura", other: "Otro" };
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

  // scenario
  const sDurMin = scenarioDuration * unitMult[scenarioUnit];
  const sLostRev = revPerMin * sDurMin * intMult * secMult;
  const sLostProd = ((employees * hourlyCost) / 60) * sDurMin * intMult;
  const sRecovery = recoveryEngineers * recoveryEngineerCost * (sDurMin / 60) + recoveryToolsCost;
  const sTotal = sLostRev + sLostProd + sRecovery + slaPenalty + churnCost + marketingRecoveryCost;

  // projection
  const projDowntimeMin = (100 - projectedUptime) / 100 * 365 * 24 * 60;
  const projAnnualCost = projectedIncidents > 0 ? projDowntimeMin * costPerMin : 0;

  const breakdown = [
    { label: "Ingresos perdidos", value: lostRev, color: "bg-red-500" },
    { label: "Productividad perdida", value: lostProd, color: "bg-amber-500" },
    { label: "Recuperacion tecnica", value: recoveryTotal, color: "bg-blue-500" },
    { label: "Penalizacion SLA", value: slaPenalty, color: "bg-purple-500" },
    { label: "Perdida por churn", value: churnCost, color: "bg-rose-500" },
    { label: "Recuperacion reputacion", value: marketingRecoveryCost, color: "bg-cyan-500" },
  ].filter(d => d.value > 0);

  const sBreakdown = [
    { label: "Ingresos perdidos", value: sLostRev, color: "bg-red-500" },
    { label: "Productividad perdida", value: sLostProd, color: "bg-amber-500" },
    { label: "Recuperacion tecnica", value: sRecovery, color: "bg-blue-500" },
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

  function sectionTitle(icon: string, title: string) {
    return (
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">{icon}</span>
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
      {/* ── Datos empresa ── */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 space-y-4">
        {sectionTitle("💼", "Datos de la empresa")}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {input("Ingresos anuales (USD)", annualRevenue, setAnnualRevenue)}
          {input("Numero de empleados", employees, setEmployees)}
          {input("Costo promedio por hora (USD)", hourlyCost, setHourlyCost)}
        </div>
      </div>

      {/* ── Incidente ── */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 space-y-4">
        {sectionTitle("🚨", "Detalles del incidente")}
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
            <div className="mt-2 text-lg font-bold text-slate-800 dark:text-slate-200">{fmt$(costPerMin)}</div>
          </div>
        </div>
      </div>

      {/* ── Clientes ── */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 space-y-4">
        {sectionTitle("👥", "Impacto en clientes")}
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
      </div>

      {/* ── Recuperacion y SLA ── */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 space-y-4">
        {sectionTitle("🔧", "Recuperacion y penalizaciones")}
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
      </div>

      {/* ── Resultados principales ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {card("Costo total", fmt$(totalCost), "danger")}
        {card("Ingresos perdidos", fmt$(lostRev))}
        {card("Productividad perdida", fmt$(lostProd))}
        {card("Costo / minuto", fmt$(costPerMin))}
      </div>

      {equivWorkDays > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-950/20 px-4 py-3">
          <p className="text-sm text-amber-800 dark:text-amber-300">Equivale a <strong>{equivWorkDays.toFixed(1)} dias laborales</strong> de toda la empresa.</p>
        </div>
      )}

      {costBreakdown(breakdown, totalCost)}

      {/* ── Comparador de escenarios ── */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 space-y-4">
        {sectionTitle("⚖️", "Comparador de escenarios")}
        <p className="text-xs text-slate-500 dark:text-slate-400">Compara el costo con una duracion diferente usando los mismos parametros.</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">Duracion alternativa</label>
            <div className="mt-2 flex items-center gap-2">
              <input type="number" min={0} value={scenarioDuration} onChange={(e) => setScenarioDuration(Number(e.target.value))}
                className="w-24 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-200" />
              <select value={scenarioUnit} onChange={(e) => setScenarioUnit(e.target.value as typeof scenarioUnit)}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-2 text-sm text-slate-800 dark:text-slate-200">
                <option value="minutes">min</option><option value="hours">hrs</option><option value="days">dias</option>
              </select>
            </div>
          </div>
          {card("Costo escenario actual", fmt$(totalCost), "danger")}
          {card("Costo escenario alternativo", fmt$(sTotal), "danger")}
          {card("Diferencia", fmt$(sTotal - totalCost), "danger")}
        </div>
        {costBreakdown(sBreakdown, sTotal)}
      </div>

      {/* ── Proyeccion anual ── */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 space-y-4">
        {sectionTitle("📈", "Proyeccion anual")}
        <p className="text-xs text-slate-500 dark:text-slate-400">Proyecta el costo anual basado en un SLA objetivo y numero estimado de incidentes.</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">SLA objetivo (%)</label>
            <div className="mt-2 flex items-center gap-3">
              <input type="range" min={90} max={99.999} step={0.001} value={projectedUptime}
                onChange={(e) => setProjectedUptime(Number(e.target.value))} className="flex-1 accent-violet-600" />
              <span className="text-sm font-mono font-semibold min-w-[80px] text-right text-slate-800 dark:text-slate-200">{projectedUptime.toFixed(3)}%</span>
            </div>
          </div>
          {input("Incidentes estimados al año", projectedIncidents, setProjectedIncidents)}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">Downtime anual permitido</label>
            <div className="mt-2 text-lg font-bold text-slate-800 dark:text-slate-200">
              {(() => { const d = projDowntimeMin; const h = Math.floor(d / 60); const m = Math.round(d % 60); return `${h}h ${m}m`; })()}
            </div>
          </div>
          {card("Costo anual proyectado", fmt$(projAnnualCost), "danger")}
        </div>
      </div>
    </div>
  );
}
