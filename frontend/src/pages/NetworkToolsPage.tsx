import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DowntimeImpactCalculator } from "../components/DowntimeImpactCalculator";

const RECORD_TYPES: { label: string; value: number }[] = [
  { label: "A", value: 1 },
  { label: "AAAA", value: 28 },
  { label: "MX", value: 15 },
  { label: "TXT", value: 16 },
  { label: "NS", value: 2 },
  { label: "CNAME", value: 5 },
  { label: "SOA", value: 6 },
];

const DNS_SERVER_URL = "https://dns.google/resolve";

const QUICK_DOMAINS = [
  { label: "Cloudflare", domain: "cloudflare.com" },
  { label: "DigitalOcean", domain: "digitalocean.com" },
  { label: "GitHub", domain: "github.com" },
  { label: "OpenAI", domain: "openai.com" },
  { label: "Twilio", domain: "twilio.com" },
  { label: "Vercel", domain: "vercel.com" },
];

interface DnsAnswer {
  name: string;
  type: number;
  TTL: number;
  data: string;
}

interface DnsResponse {
  Status: number;
  Answer?: DnsAnswer[];
  Comment?: string;
}

interface CategorizedResult {
  a: DnsAnswer[];
  aaaa: DnsAnswer[];
  cname: DnsAnswer[];
  mx: DnsAnswer[];
  txt: DnsAnswer[];
  ns: DnsAnswer[];
  soa: DnsAnswer[];
  other: DnsAnswer[];
}

const TYPE_MAP: Record<number, keyof CategorizedResult> = {
  1: "a",
  28: "aaaa",
  5: "cname",
  15: "mx",
  16: "txt",
  2: "ns",
  6: "soa",
};

async function queryDns(domain: string, type: number): Promise<DnsResponse> {
  const url = `${DNS_SERVER_URL}?name=${encodeURIComponent(domain)}&type=${type}`;
  const res = await fetch(url, {
    headers: { Accept: "application/dns-json" },
  });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

function emptyCategorized(): CategorizedResult {
  return { a: [], aaaa: [], cname: [], mx: [], txt: [], ns: [], soa: [], other: [] };
}

function extractHostname(input: string): string {
  try {
    if (input.includes("://")) {
      return new URL(input).hostname;
    }
    return input.split(":")[0].trim();
  } catch {
    return input.split(":")[0].trim();
  }
}

export function NetworkToolsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialDomain = searchParams.get("domain") || "";

  const cleanedInitial = extractHostname(initialDomain);
  const [domain, setDomain] = useState(cleanedInitial);
  const [selectedType, setSelectedType] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categorized, setCategorized] = useState<CategorizedResult | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Set<keyof CategorizedResult>>(new Set());
  const [history, setHistory] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("dns-history") || "[]");
    } catch {
      return [];
    }
  });

  const [activeTool, setActiveTool] = useState<"dns" | "latency" | "sla" | "impact">("dns");

  const [latencyUrl, setLatencyUrl] = useState("");
  const [latencyLoading, setLatencyLoading] = useState(false);
  const [latencyError, setLatencyError] = useState<string | null>(null);
  const [latencyResult, setLatencyResult] = useState<{
    url: string;
    status: number | null;
    statusText: string;
    dns: number;
    connect: number;
    tls: number;
    ttfb: number;
    download: number;
    total: number;
  } | null>(null);

  // ── SLA Calculator state ──
  const [slaPercentage, setSlaPercentage] = useState(99.9);
  const [slaPeriod, setSlaPeriod] = useState<"day" | "month" | "quarter" | "year">("month");
  const [slaServices, setSlaServices] = useState(1);
  const [slaCustomDowntime, setSlaCustomDowntime] = useState<string>("");
  const [slaCustomUnit, setSlaCustomUnit] = useState<"seconds" | "minutes" | "hours" | "days">("minutes");

  // Reverse calculator: I had X downtime → what SLA did I achieve?
  const [revDowntime, setRevDowntime] = useState<string>("");
  const [revUnit, setRevUnit] = useState<"seconds" | "minutes" | "hours" | "days">("minutes");
  const [revPeriod, setRevPeriod] = useState<"day" | "month" | "quarter" | "year">("month");

  // Penalty calculator
  const [penaltySla, setPenaltySla] = useState(99.9);
  const [penaltyMonthlyCost, setPenaltyMonthlyCost] = useState<string>("1000");
  const [penaltyDowntime, setPenaltyDowntime] = useState<string>("");
  const [penaltyUnit, setPenaltyUnit] = useState<"seconds" | "minutes" | "hours" | "days">("minutes");
  const [penaltyPeriod, setPenaltyPeriod] = useState<"day" | "month" | "quarter" | "year">("month");

  // Compare two SLAs
  const [compareA, setCompareA] = useState(99.9);
  const [compareB, setCompareB] = useState(99.99);
  const [comparePeriod, setComparePeriod] = useState<"day" | "month" | "quarter" | "year">("month");

  const UNIT_MULTIPLIERS: Record<typeof slaCustomUnit, number> = {
    seconds: 1,
    minutes: 60,
    hours: 3600,
    days: 86400,
  };

  const SLA_PRESETS = [
    { label: "99%", value: 99, desc: "3.65 dias/ano de downtime" },
    { label: "99.9%", value: 99.9, desc: "8.76 horas/ano" },
    { label: "99.95%", value: 99.95, desc: "4.38 horas/ano" },
    { label: "99.99%", value: 99.99, desc: "52.6 minutos/ano" },
    { label: "99.999%", value: 99.999, desc: "5.26 minutos/ano" },
    { label: "99.9999%", value: 99.9999, desc: "31.5 segundos/ano" },
  ];

  const PERIOD_SECONDS: Record<typeof slaPeriod, number> = {
    day: 86400,
    month: 2592000,
    quarter: 7776000,
    year: 31536000,
  };

  function formatDuration(totalSeconds: number): string {
    if (totalSeconds <= 0) return "0s";
    const d = Math.floor(totalSeconds / 86400);
    const h = Math.floor((totalSeconds % 86400) / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.round(totalSeconds % 60);
    const parts: string[] = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (s > 0 || parts.length === 0) parts.push(`${s}s`);
    return parts.join(" ");
  }

  function formatDurationPrecise(totalSeconds: number): string {
    if (totalSeconds <= 0) return "0s";
    const d = Math.floor(totalSeconds / 86400);
    const h = Math.floor((totalSeconds % 86400) / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = (totalSeconds % 60).toFixed(2);
    const parts: string[] = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (Number(s) > 0 || parts.length === 0) parts.push(`${Number(s)}s`);
    return parts.join(" ");
  }

  const allowedDowntimeSeconds = (100 - slaPercentage) / 100 * PERIOD_SECONDS[slaPeriod];
  const compoundSla = Math.pow(slaPercentage / 100, slaServices) * 100;
  const effectiveDowntime = (100 - compoundSla) / 100 * PERIOD_SECONDS[slaPeriod];

  // Convert custom downtime to seconds
  const customDowntimeRaw = Number(slaCustomDowntime);
  const customDowntimeSeconds = !isNaN(customDowntimeRaw) && customDowntimeRaw > 0
    ? customDowntimeRaw * UNIT_MULTIPLIERS[slaCustomUnit]
    : 0;
  const achievedSla = customDowntimeSeconds > 0
    ? Math.max(0, 100 - (customDowntimeSeconds / PERIOD_SECONDS[slaPeriod]) * 100)
    : null;
  const complianceUsed = customDowntimeSeconds > 0 && allowedDowntimeSeconds > 0
    ? Math.min(100, (customDowntimeSeconds / allowedDowntimeSeconds) * 100)
    : null;

  // Reverse calculator
  const revDowntimeRaw = Number(revDowntime);
  const revDowntimeSeconds = !isNaN(revDowntimeRaw) && revDowntimeRaw > 0
    ? revDowntimeRaw * UNIT_MULTIPLIERS[revUnit]
    : 0;
  const revAchievedSla = revDowntimeSeconds > 0
    ? Math.max(0, 100 - (revDowntimeSeconds / PERIOD_SECONDS[revPeriod]) * 100)
    : null;

  // Penalty calculator
  const penaltyDowntimeRaw = Number(penaltyDowntime);
  const penaltyDowntimeSeconds = !isNaN(penaltyDowntimeRaw) && penaltyDowntimeRaw > 0
    ? penaltyDowntimeRaw * UNIT_MULTIPLIERS[penaltyUnit]
    : 0;
  const penaltyAllowedSeconds = (100 - penaltySla) / 100 * PERIOD_SECONDS[penaltyPeriod];
  const penaltyExceededSeconds = Math.max(0, penaltyDowntimeSeconds - penaltyAllowedSeconds);
  const penaltyMonthlyCostNum = Number(penaltyMonthlyCost) || 0;
  const penaltyCredit = penaltyExceededSeconds > 0 && penaltyAllowedSeconds > 0
    ? Math.min(100, (penaltyExceededSeconds / penaltyAllowedSeconds) * 10) // 10% credit per allowed downtime unit exceeded, capped at 100%
    : 0;
  const penaltyCreditAmount = penaltyMonthlyCostNum * (penaltyCredit / 100);

  // Compare two SLAs
  const compareAllowedA = (100 - compareA) / 100 * PERIOD_SECONDS[comparePeriod];
  const compareAllowedB = (100 - compareB) / 100 * PERIOD_SECONDS[comparePeriod];
  const compareDiffSeconds = compareAllowedB - compareAllowedA;

  function getNinesLabel(pct: number): string {
    if (pct >= 99.9999) return "Six Nines";
    if (pct >= 99.999) return "Five Nines";
    if (pct >= 99.99) return "Four Nines";
    if (pct >= 99.9) return "Three Nines";
    if (pct >= 99) return "Two Nines";
    return "One Nine";
  }

  useEffect(() => {
    document.title = "Herramientas — DNS Lookup";
  }, []);

  useEffect(() => {
    if (initialDomain) {
      void handleLookupAll(initialDomain);
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLookupAll(overrideDomain?: string) {
    const target = extractHostname(overrideDomain || domain);
    if (!target) return;
    setLoading(true);
    setError(null);
    setCategorized(null);
    setHasSearched(true);
    setActiveFilters(new Set());
    try {
      const responses = await Promise.all(
        RECORD_TYPES.map((r) => queryDns(target, r.value))
      );

      const cat: CategorizedResult = emptyCategorized();
      const allRaw: DnsAnswer[] = [];

      responses.forEach((res) => {
        if (res.Answer) {
          allRaw.push(...res.Answer);
        }
      });

      allRaw.forEach((ans) => {
        const key = TYPE_MAP[ans.type];
        if (key) {
          (cat[key] as DnsAnswer[]).push(ans);
        } else {
          cat.other.push(ans);
        }
      });

      setCategorized(cat);
      const entry = `${target} (Todos)`;
      setHistory((prev) => {
        const next = [entry, ...prev.filter((h) => h !== entry)].slice(0, 10);
        localStorage.setItem("dns-history", JSON.stringify(next));
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al consultar DNS");
    } finally {
      setLoading(false);
    }
  }

  async function handleLookupSingle() {
    const target = extractHostname(domain);
    if (!target) return;
    setLoading(true);
    setError(null);
    setCategorized(null);
    setHasSearched(true);
    try {
      const data = await queryDns(target, selectedType);
      const cat = emptyCategorized();
      if (data.Answer) {
        data.Answer.forEach((ans) => {
          const key = TYPE_MAP[ans.type];
          if (key) {
            (cat[key] as DnsAnswer[]).push(ans);
          } else {
            cat.other.push(ans);
          }
        });
      }
      setCategorized(cat);
      const entry = `${target} (${RECORD_TYPES.find((r) => r.value === selectedType)?.label || "A"})`;
      setHistory((prev) => {
        const next = [entry, ...prev.filter((h) => h !== entry)].slice(0, 10);
        localStorage.setItem("dns-history", JSON.stringify(next));
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al consultar DNS");
    } finally {
      setLoading(false);
    }
  }

  function triggerQuick(d: string) {
    setDomain(d);
    void handleLookupAll(d);
  }

  async function handleLatencyTest() {
    const url = latencyUrl.trim();
    if (!url) return;
    setLatencyLoading(true);
    setLatencyError(null);
    setLatencyResult(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      let targetUrl = url;
      if (!targetUrl.includes("://")) {
        targetUrl = `https://${targetUrl}`;
      }

      let responseStatus: number | null = null;
      let responseStatusText = "";
      try {
        const res = await fetch(targetUrl, {
          method: "GET",
          signal: controller.signal,
        });
        responseStatus = res.status;
        responseStatusText = res.statusText;
      } catch {
        // Si falla por CORS u otro error, aun intentamos leer el timing
      }
      clearTimeout(timeoutId);

      await new Promise((r) => setTimeout(r, 150));

      const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
      const entry = entries
        .slice()
        .reverse()
        .find((e) => e.name === targetUrl || e.name === url);

      if (!entry) {
        setLatencyError("No se pudo capturar el timing del navegador. Intenta de nuevo.");
        return;
      }

      const dns = Math.round(entry.domainLookupEnd - entry.domainLookupStart);
      const connect = Math.round(entry.connectEnd - entry.connectStart);
      const tls = entry.secureConnectionStart > 0
        ? Math.round(entry.connectEnd - entry.secureConnectionStart)
        : 0;
      const ttfb = Math.round(entry.responseStart - entry.startTime);
      const download = Math.round(entry.responseEnd - entry.responseStart);
      const total = Math.round(entry.responseEnd - entry.startTime);

      const hasZeroTimings = dns === 0 && connect === 0 && ttfb === 0;
      if (hasZeroTimings) {
        setLatencyError(
          "El servidor bloquea el acceso a los timings de red (politica CORS). " +
          "El navegador no puede desglosar las fases para dominios de terceros. " +
          "Prueba con un endpoint de tu propio dominio o uno con CORS habilitado."
        );
        return;
      }

      setLatencyResult({
        url: targetUrl,
        status: responseStatus,
        statusText: responseStatusText,
        dns,
        connect,
        tls,
        ttfb,
        download,
        total,
      });
    } catch (e) {
      setLatencyError(e instanceof Error ? e.message : "Error al medir latencia");
    } finally {
      clearTimeout(timeoutId);
      setLatencyLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Herramientas</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Diagnostico de DNS, latencia, calculadora SLA y costo de downtime</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTool("dns")}
          className={`rounded-t-lg px-4 py-2.5 text-sm font-medium flex items-center gap-2 transition-colors ${
            activeTool === "dns"
              ? "bg-white dark:bg-slate-950 text-blue-600 dark:text-blue-400 border-t border-x border-slate-200 dark:border-slate-800 -mb-px"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
          DNS Lookup
        </button>
        <button
          type="button"
          onClick={() => setActiveTool("latency")}
          className={`rounded-t-lg px-4 py-2.5 text-sm font-medium flex items-center gap-2 transition-colors ${
            activeTool === "latency"
              ? "bg-white dark:bg-slate-950 text-emerald-600 dark:text-emerald-400 border-t border-x border-slate-200 dark:border-slate-800 -mb-px"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
          Test de Latencia
        </button>
        <button
          type="button"
          onClick={() => setActiveTool("sla")}
          className={`rounded-t-lg px-4 py-2.5 text-sm font-medium flex items-center gap-2 transition-colors ${
            activeTool === "sla"
              ? "bg-white dark:bg-slate-950 text-violet-600 dark:text-violet-400 border-t border-x border-slate-200 dark:border-slate-800 -mb-px"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.251 2.251 0 012.25 2.25v.894m-12 0A2.251 2.251 0 012.25 3.75h-1.5a2.251 2.251 0 01-2.25-2.25v-.894m20 0a2.25 2.25 0 012.25-2.25h1.5a2.25 2.25 0 012.25 2.25v.894M9 10.5h.008v.008H9V10.5zm0 3h.008v.008H9v-.008zm0 3h.008v.008H9v-.008zM12 10.5h.008v.008H12V10.5zm0 3h.008v.008H12v-.008zm0 3h.008v.008H12v-.008zM15 10.5h.008v.008H15V10.5zm0 3h.008v.008H15v-.008zm0 3h.008v.008H15v-.008z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 22.5c5.523 0 10-4.477 10-10S17.523 2.5 12 2.5 2 6.977 2 12.5s4.477 10 10 10z" /></svg>
          Calculadora SLA
        </button>
        <button
          type="button"
          onClick={() => setActiveTool("impact")}
          className={`rounded-t-lg px-4 py-2.5 text-sm font-medium flex items-center gap-2 transition-colors ${
            activeTool === "impact"
              ? "bg-white dark:bg-slate-950 text-rose-600 dark:text-rose-400 border-t border-x border-slate-200 dark:border-slate-800 -mb-px"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Costo de Downtime
        </button>
      </div>

      {activeTool === "dns" && (
      <div className="space-y-6">
      {/* Inputs */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">Dominio</label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (e.shiftKey) void handleLookupSingle();
                  else void handleLookupAll();
                }
              }}
              placeholder="ejemplo.com"
              className="mt-2 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-200"
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">Tipo</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(Number(e.target.value))}
              className="mt-2 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-200"
            >
              {RECORD_TYPES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleLookupAll()}
              disabled={loading || !domain.trim()}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607z" /></svg>
              )}
              {loading ? "Consultando..." : "Buscar"}
            </button>
            <button
              type="button"
              onClick={() => void handleLookupSingle()}
              disabled={loading || !domain.trim()}
              title="Buscar solo el tipo seleccionado"
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5h12M3 12h9m-9 4.5h6" /></svg>
              Solo {RECORD_TYPES.find(r => r.value === selectedType)?.label}
            </button>
          </div>
        </div>

        {/* Dominios rapidos */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">Dominios populares:</span>
          {QUICK_DOMAINS.map((qd) => (
            <button
              key={qd.domain}
              type="button"
              onClick={() => triggerQuick(qd.domain)}
              className="rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 py-1 text-[11px] text-slate-600 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {qd.label}
            </button>
          ))}
        </div>

        {/* Historial */}
        {history.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500">Recientes:</span>
            {history.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => {
                  const match = h.match(/^(.+) \((\w+)\)$/);
                  if (match) {
                    setDomain(match[1]);
                    if (match[2] === "Todos") void handleLookupAll(match[1]);
                    else {
                      const type = RECORD_TYPES.find((r) => r.label === match[2])?.value || 1;
                      setSelectedType(type);
                      void handleLookupSingle();
                    }
                  }
                }}
                className="rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 py-1 text-[11px] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {h}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setHistory([]);
                localStorage.removeItem("dns-history");
              }}
              className="text-[11px] text-red-500 hover:text-red-400"
            >
              Limpiar
            </button>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Resultados por categorias */}
      {hasSearched && categorized && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500">Filtrar:</span>
            <button
              type="button"
              onClick={() => setActiveFilters(new Set())}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${activeFilters.size === 0 ? "bg-blue-600 text-white" : "border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600"}`}
            >
              Todos
            </button>
            {([
              { key: "a", label: "A" },
              { key: "aaaa", label: "AAAA" },
              { key: "cname", label: "CNAME" },
              { key: "mx", label: "MX" },
              { key: "txt", label: "TXT" },
              { key: "ns", label: "NS" },
              { key: "soa", label: "SOA" },
            ] as { key: keyof CategorizedResult; label: string }[]).map((f) => {
              const count = categorized[f.key].length;
              if (count === 0) return null;
              const active = activeFilters.size === 0 || activeFilters.has(f.key);
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() =>
                    setActiveFilters((prev) => {
                      const next = new Set(prev);
                      if (next.has(f.key)) next.delete(f.key);
                      else next.add(f.key);
                      return next.size === 0 ? new Set() : next;
                    })
                  }
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    active
                      ? "bg-blue-600 text-white"
                      : "border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600"
                  }`}
                >
                  {f.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Secciones */}
          {([
            { key: "a" as const, title: "A (IPv4)", badge: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400", typeLabel: "A", typeColor: "text-blue-600 dark:text-blue-400" },
            { key: "aaaa" as const, title: "AAAA (IPv6)", badge: "bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400", typeLabel: "AAAA", typeColor: "text-violet-600 dark:text-violet-400" },
            { key: "cname" as const, title: "CNAME (Alias)", badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400", typeLabel: "CNAME", typeColor: "text-amber-600 dark:text-amber-400" },
            { key: "mx" as const, title: "MX (Mail Exchange)", badge: "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400", typeLabel: "MX", typeColor: "text-rose-600 dark:text-rose-400" },
            { key: "txt" as const, title: "TXT (Texto)", badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400", typeLabel: "TXT", typeColor: "text-emerald-600 dark:text-emerald-400" },
            { key: "ns" as const, title: "NS (Nameserver)", badge: "bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400", typeLabel: "NS", typeColor: "text-orange-600 dark:text-orange-400" },
            { key: "soa" as const, title: "SOA (Start of Authority)", badge: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400", typeLabel: "SOA", typeColor: "text-indigo-600 dark:text-indigo-400" },
            { key: "other" as const, title: "Otros registros", badge: "bg-slate-50 text-slate-700 dark:bg-slate-900/50 dark:text-slate-400", typeLabel: "", typeColor: "" },
          ] as const).map((section) => {
            const items = categorized[section.key];
            const shouldShow = activeFilters.size === 0 || activeFilters.has(section.key);
            if (!shouldShow || items.length === 0) return null;
            return (
              <div key={section.key} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden">
                <div className="border-b border-slate-200 dark:border-slate-800 px-5 py-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    {section.title} &mdash; {domain.trim()}
                  </h3>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${section.badge}`}>
                    {items.length} registro{items.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
                        {section.typeLabel && (
                          <th className="px-5 py-3 text-left font-medium text-slate-500 dark:text-slate-400">Tipo</th>
                        )}
                        <th className="px-5 py-3 text-left font-medium text-slate-500 dark:text-slate-400">Registro</th>
                        <th className="px-5 py-3 text-left font-medium text-slate-500 dark:text-slate-400">Valor</th>
                        <th className="px-5 py-3 text-right font-medium text-slate-500 dark:text-slate-400">TTL</th>
                        <th className="px-5 py-3 text-right font-medium text-slate-500 dark:text-slate-400"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {items.map((ans, i) => (
                        <tr key={`${section.key}-${i}`}>
                          {section.typeLabel && (
                            <td className={`px-5 py-3 text-xs font-medium ${section.typeColor}`}>{section.typeLabel}</td>
                          )}
                          <td className="px-5 py-3 text-slate-700 dark:text-slate-300 font-mono text-xs">{ans.name}</td>
                          <td className="px-5 py-3 text-slate-800 dark:text-slate-200 font-mono text-xs break-all max-w-xs">{ans.data}</td>
                          <td className="px-5 py-3 text-right text-slate-500 dark:text-slate-400 text-xs">{ans.TTL}s</td>
                          <td className="px-5 py-3 text-right">
                            <button type="button" onClick={() => navigator.clipboard.writeText(ans.data)} className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-500" title="Copiar valor">Copiar</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          {/* Mensaje si no hay nada */}
          {Object.values(categorized).every((arr) => arr.length === 0) && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
              No se encontraron registros DNS para este dominio.
            </div>
          )}
        </div>
      )}
      </div>
      )}

      {activeTool === "latency" && (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 space-y-4">
        <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3">
          <strong className="text-slate-700 dark:text-slate-300">Como funciona:</strong> Ingresa la URL completa de un endpoint (ej: <code className="text-blue-600 dark:text-blue-400">https://api.github.com/status</code>). La herramienta mide el ciclo completo del request usando las metricas nativas del navegador. Si ves valores en 0 para algunas fases, es porque el servidor bloquea el acceso a los timings (CORS). Funciona mejor con endpoints de tu propio dominio o con APIs publicas que permiten CORS.
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">URL del endpoint</label>
            <input
              type="text"
              value={latencyUrl}
              onChange={(e) => setLatencyUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void handleLatencyTest(); }}
              placeholder="https://ejemplo.com/api/status"
              className="mt-2 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-200"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleLatencyTest()}
              disabled={latencyLoading || !latencyUrl.trim()}
              className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {latencyLoading ? (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
              )}
              {latencyLoading ? "Midiendo..." : "Test"}
            </button>
          </div>
        </div>

        {latencyError && (
          <div className="rounded-xl border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {latencyError}
          </div>
        )}

        {latencyResult && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-slate-500">URL probada:</span>
              <span className="text-xs font-mono text-slate-700 dark:text-slate-300 break-all">{latencyResult.url}</span>
              {latencyResult.status != null && (
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${latencyResult.status >= 200 && latencyResult.status < 300 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" : latencyResult.status >= 400 ? "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400" : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"}`}>
                  HTTP {latencyResult.status} {latencyResult.statusText}
                </span>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-5">
              <div className="flex items-end justify-center gap-1 mb-4" style={{ minHeight: 120 }}>
                {[
                  { label: "DNS", value: latencyResult.dns, color: "bg-blue-500" },
                  { label: "Conexion", value: latencyResult.connect, color: "bg-violet-500" },
                  { label: "TLS", value: latencyResult.tls, color: "bg-amber-500" },
                  { label: "TTFB", value: latencyResult.ttfb, color: "bg-emerald-500" },
                  { label: "Descarga", value: latencyResult.download, color: "bg-slate-400" },
                ].map((bar) => {
                  const max = Math.max(latencyResult.total, 1);
                  const height = Math.max((bar.value / max) * 100, 4);
                  return (
                    <div key={bar.label} className="flex flex-col items-center gap-1" style={{ width: 48 }}>
                      <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400">{bar.value}ms</span>
                      <div
                        className={`w-full rounded-t-md ${bar.color}`}
                        style={{ height: `${height}%`, minHeight: 4 }}
                        title={`${bar.label}: ${bar.value} ms`}
                      />
                      <span className="text-[10px] text-slate-500 dark:text-slate-500">{bar.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-blue-200 dark:border-blue-900/30 bg-blue-50 dark:bg-blue-950/20 px-6 py-6 text-center">
              <div className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">Tiempo Total</div>
              <div className="text-4xl font-bold text-slate-900 dark:text-white mt-1">{latencyResult.total}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">ms</div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {[
                    { label: "DNS Lookup", value: latencyResult.dns, desc: "Resolucion de nombre de dominio" },
                    { label: "Conexion TCP", value: latencyResult.connect, desc: "Establecimiento de conexion" },
                    { label: "TLS Handshake", value: latencyResult.tls, desc: "Negociacion de seguridad (HTTPS)" },
                    { label: "TTFB (Time to First Byte)", value: latencyResult.ttfb, desc: "Tiempo hasta primer byte de respuesta" },
                    { label: "Descarga", value: latencyResult.download, desc: "Transferencia del cuerpo de la respuesta" },
                    { label: "Total", value: latencyResult.total, desc: "Suma completa del ciclo de request" },
                  ].map((row) => (
                    <tr key={row.label}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-700 dark:text-slate-300">{row.label}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{row.desc}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-800 dark:text-slate-200">{row.value} ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      )}

      {activeTool === "sla" && (
        <div className="space-y-6">
          {/* Configuracion */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 space-y-5">
            {/* SLA Target */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">Objetivo SLA</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {SLA_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setSlaPercentage(p.value)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      slaPercentage === p.value
                        ? "bg-violet-600 text-white"
                        : "border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-violet-50 dark:hover:bg-violet-900/20"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <input
                  type="range"
                  min={90}
                  max={99.9999}
                  step={0.0001}
                  value={slaPercentage}
                  onChange={(e) => setSlaPercentage(Number(e.target.value))}
                  className="w-full accent-violet-600"
                />
                <span className="text-sm font-mono font-semibold text-slate-800 dark:text-slate-200 min-w-[80px] text-right">
                  {slaPercentage.toFixed(4)}%
                </span>
              </div>
            </div>

            {/* Periodo */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">Periodo</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {[
                  { label: "Dia", value: "day" as const },
                  { label: "Mes (30d)", value: "month" as const },
                  { label: "Trimestre (90d)", value: "quarter" as const },
                  { label: "Ano (365d)", value: "year" as const },
                ].map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setSlaPeriod(p.value)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      slaPeriod === p.value
                        ? "bg-violet-600 text-white"
                        : "border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-violet-50 dark:hover:bg-violet-900/20"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Servicios en cadena */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">
                Servicios en cadena (SLA compuesto)
              </label>
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={slaServices}
                  onChange={(e) => setSlaServices(Number(e.target.value))}
                  className="w-48 accent-violet-600"
                />
                <span className="text-sm font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {slaServices} {slaServices === 1 ? "servicio" : "servicios"}
                </span>
              </div>
            </div>

            {/* Downtime real con unidades flexibles */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">
                Downtime real ocurrido — opcional
              </label>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  value={slaCustomDowntime}
                  onChange={(e) => setSlaCustomDowntime(e.target.value)}
                  placeholder="ej: 30"
                  className="w-32 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-200"
                />
                <select
                  value={slaCustomUnit}
                  onChange={(e) => setSlaCustomUnit(e.target.value as typeof slaCustomUnit)}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-200"
                >
                  <option value="seconds">segundos</option>
                  <option value="minutes">minutos</option>
                  <option value="hours">horas</option>
                  <option value="days">dias</option>
                </select>
              </div>
            </div>
          </div>

          {/* Resultados principales */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 text-center">
              <div className="text-xs font-medium uppercase tracking-wider text-slate-500">Downtime maximo permitido</div>
              <div className="mt-2 text-2xl font-bold text-violet-600 dark:text-violet-400">{formatDuration(allowedDowntimeSeconds)}</div>
              <div className="mt-1 text-xs text-slate-500">{formatDurationPrecise(allowedDowntimeSeconds)}</div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 text-center">
              <div className="text-xs font-medium uppercase tracking-wider text-slate-500">Uptime esperado</div>
              <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{slaPercentage.toFixed(4)}%</div>
              <div className="mt-1 text-xs text-slate-500">{getNinesLabel(slaPercentage)}</div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 text-center">
              <div className="text-xs font-medium uppercase tracking-wider text-slate-500">SLA compuesto</div>
              <div className="mt-2 text-2xl font-bold text-cyan-600 dark:text-cyan-400">{compoundSla.toFixed(4)}%</div>
              <div className="mt-1 text-xs text-slate-500">{slaServices} en serie</div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 text-center">
              <div className="text-xs font-medium uppercase tracking-wider text-slate-500">Downtime efectivo (compuesto)</div>
              <div className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">{formatDuration(effectiveDowntime)}</div>
            </div>
          </div>

          {/* Barra de cumplimiento */}
          {complianceUsed !== null && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Uso del downtime permitido</span>
                <span className={`text-sm font-bold ${complianceUsed > 100 ? "text-rose-600" : complianceUsed > 80 ? "text-amber-600" : "text-emerald-600"}`}>
                  {complianceUsed.toFixed(1)}%
                </span>
              </div>
              <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${complianceUsed > 100 ? "bg-rose-500" : complianceUsed > 80 ? "bg-amber-500" : "bg-emerald-500"}`}
                  style={{ width: `${Math.min(100, complianceUsed)}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs text-slate-500">
                <span>Downtime real: {formatDuration(customDowntimeSeconds)}</span>
                <span>Permitido: {formatDuration(allowedDowntimeSeconds)}</span>
              </div>
              {complianceUsed > 100 && (
                <div className="mt-2 text-sm text-rose-600 dark:text-rose-400 font-semibold">
                  SLA incumplido — Excedido por {formatDuration(customDowntimeSeconds - allowedDowntimeSeconds)}
                </div>
              )}
              {achievedSla !== null && (
                <div className="mt-1 text-sm">
                  SLA alcanzado: <span className="font-mono font-semibold text-violet-600 dark:text-violet-400">{achievedSla.toFixed(4)}%</span>
                </div>
              )}
            </div>
          )}

          {/* Calculadora inversa */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /></svg>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Calculadora inversa</h2>
              <span className="text-xs text-slate-400">Tuve X downtime, que SLA logre?</span>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">Downtime ocurrido</label>
                <div className="mt-1 flex items-center gap-2">
                  <input type="number" value={revDowntime} onChange={(e) => setRevDowntime(e.target.value)} placeholder="30"
                    className="w-28 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-200" />
                  <select value={revUnit} onChange={(e) => setRevUnit(e.target.value as typeof revUnit)}
                    className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-200">
                    <option value="seconds">seg</option><option value="minutes">min</option><option value="hours">hrs</option><option value="days">dias</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">Periodo</label>
                <select value={revPeriod} onChange={(e) => setRevPeriod(e.target.value as typeof revPeriod)}
                  className="mt-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-200">
                  <option value="day">Dia</option><option value="month">Mes</option><option value="quarter">Trimestre</option><option value="year">Ano</option>
                </select>
              </div>
            </div>
            {revAchievedSla !== null && (
              <div className="rounded-lg bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-900/30 p-4">
                <div className="text-xs font-medium uppercase tracking-wider text-cyan-600 dark:text-cyan-400">SLA alcanzado</div>
                <div className="text-3xl font-bold text-slate-900 dark:text-white">{revAchievedSla.toFixed(4)}%</div>
                <div className="text-sm text-slate-500">{getNinesLabel(revAchievedSla)}</div>
              </div>
            )}
          </div>

          {/* Calculadora de penalizacion */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Calculadora de penalizacion</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">SLA objetivo</label>
                <select value={penaltySla} onChange={(e) => setPenaltySla(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-200">
                  {SLA_PRESETS.map((p) => (<option key={p.value} value={p.value}>{p.label} — {p.desc}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">Costo mensual ($)</label>
                <input type="number" value={penaltyMonthlyCost} onChange={(e) => setPenaltyMonthlyCost(e.target.value)} placeholder="1000"
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-200" />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">Downtime real</label>
                <div className="mt-1 flex items-center gap-2">
                  <input type="number" value={penaltyDowntime} onChange={(e) => setPenaltyDowntime(e.target.value)} placeholder="120"
                    className="w-20 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-200" />
                  <select value={penaltyUnit} onChange={(e) => setPenaltyUnit(e.target.value as typeof penaltyUnit)}
                    className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-2 text-sm text-slate-800 dark:text-slate-200">
                    <option value="seconds">seg</option><option value="minutes">min</option><option value="hours">hrs</option><option value="days">dias</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">Periodo</label>
                <select value={penaltyPeriod} onChange={(e) => setPenaltyPeriod(e.target.value as typeof penaltyPeriod)}
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-200">
                  <option value="day">Dia</option><option value="month">Mes</option><option value="quarter">Trimestre</option><option value="year">Ano</option>
                </select>
              </div>
            </div>
            {penaltyDowntimeSeconds > 0 && (
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 p-4 text-center">
                  <div className="text-xs font-medium uppercase tracking-wider text-rose-600 dark:text-rose-400">Downtime excedido</div>
                  <div className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{formatDuration(penaltyExceededSeconds)}</div>
                </div>
                <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 p-4 text-center">
                  <div className="text-xs font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400">Credito estimado</div>
                  <div className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{penaltyCredit.toFixed(1)}%</div>
                </div>
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 p-4 text-center">
                  <div className="text-xs font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Monto a creditar</div>
                  <div className="mt-1 text-xl font-bold text-slate-900 dark:text-white">${penaltyCreditAmount.toFixed(2)}</div>
                  <div className="text-xs text-slate-500">de ${penaltyMonthlyCostNum.toFixed(2)}/mes</div>
                </div>
              </div>
            )}
          </div>

          {/* Comparador de SLAs */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Comparador de SLAs</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">SLA A</label>
                <input type="number" min={90} max={99.9999} step={0.01} value={compareA} onChange={(e) => setCompareA(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-200" />
                <div className="mt-1 text-xs text-slate-500">{getNinesLabel(compareA)} — {formatDuration(compareAllowedA)} permitido</div>
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">SLA B</label>
                <input type="number" min={90} max={99.9999} step={0.01} value={compareB} onChange={(e) => setCompareB(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-200" />
                <div className="mt-1 text-xs text-slate-500">{getNinesLabel(compareB)} — {formatDuration(compareAllowedB)} permitido</div>
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">Periodo</label>
                <select value={comparePeriod} onChange={(e) => setComparePeriod(e.target.value as typeof comparePeriod)}
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-200">
                  <option value="day">Dia</option><option value="month">Mes</option><option value="quarter">Trimestre</option><option value="year">Ano</option>
                </select>
              </div>
            </div>
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 p-4">
              <div className="text-xs font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Diferencia de tolerancia</div>
              <div className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                {compareDiffSeconds >= 0 ? "+" : ""}{formatDuration(Math.abs(compareDiffSeconds))}
              </div>
              <div className="text-sm text-slate-500">
                SLA B permite {compareDiffSeconds >= 0 ? "mas" : "menos"} downtime que SLA A en un {comparePeriod === "day" ? "dia" : comparePeriod === "month" ? "mes" : comparePeriod === "quarter" ? "trimestre" : "ano"}.
              </div>
            </div>
          </div>

          {/* Tabla contextual de referencia */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">Referencia de niveles SLA</div>
              <div className="text-xs text-slate-500">Downtime maximo permitido por ano</div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                  <th className="px-5 py-2 text-left font-medium text-slate-500 dark:text-slate-400">Nivel</th>
                  <th className="px-5 py-2 text-right font-medium text-slate-500 dark:text-slate-400">SLA</th>
                  <th className="px-5 py-2 text-right font-medium text-slate-500 dark:text-slate-400">Downtime/ano</th>
                  <th className="px-5 py-2 text-right font-medium text-slate-500 dark:text-slate-400">Downtime/mes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {[
                  { label: "One Nine", pct: 90 },
                  { label: "Two Nines", pct: 99 },
                  { label: "Three Nines", pct: 99.9 },
                  { label: "Four Nines", pct: 99.99 },
                  { label: "Five Nines", pct: 99.999 },
                  { label: "Six Nines", pct: 99.9999 },
                ].map((row) => {
                  const yearly = (100 - row.pct) / 100 * PERIOD_SECONDS.year;
                  const monthly = (100 - row.pct) / 100 * PERIOD_SECONDS.month;
                  const isActive = Math.abs(slaPercentage - row.pct) < 0.0001;
                  return (
                    <tr key={row.pct} className={isActive ? "bg-violet-50 dark:bg-violet-950/10" : ""}>
                      <td className={`px-5 py-2 font-medium ${isActive ? "text-violet-700 dark:text-violet-300" : "text-slate-700 dark:text-slate-300"}`}>{row.label}</td>
                      <td className="px-5 py-2 text-right font-mono text-slate-800 dark:text-slate-200">{row.pct}%</td>
                      <td className="px-5 py-2 text-right font-mono text-slate-600 dark:text-slate-400">{formatDuration(yearly)}</td>
                      <td className="px-5 py-2 text-right font-mono text-slate-600 dark:text-slate-400">{formatDuration(monthly)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTool === "impact" && (
        <DowntimeImpactCalculator />
      )}
    </div>
  );
}
