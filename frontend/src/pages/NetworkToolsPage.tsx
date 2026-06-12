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

const QUICK_LATENCY_URLS = [
  { label: "Google", url: "www.google.com" },
  { label: "Cloudflare API", url: "https://api.cloudflare.com/client/v4/ips" },
  { label: "GitHub API", url: "https://api.github.com" },
  { label: "JSONPlaceholder", url: "https://jsonplaceholder.typicode.com/posts/1" },
  { label: "HTTPBin", url: "https://httpbin.org/get" },
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
  const [slaCustomDowntime, setSlaCustomDowntime] = useState<string>("");
  const [slaCustomUnit, setSlaCustomUnit] = useState<"seconds" | "minutes" | "hours" | "days">("minutes");

  // Credit thresholds (configurable)
  const [creditThreshold25, setCreditThreshold25] = useState(95);
  const [creditThreshold10, setCreditThreshold10] = useState(99);

  const UNIT_MULTIPLIERS: Record<typeof slaCustomUnit, number> = {
    seconds: 1,
    minutes: 60,
    hours: 3600,
    days: 86400,
  };

  const SLA_PRESETS = [
    { label: "99%", value: 99, desc: "Microsoft estándar" },
    { label: "99.9%", value: 99.9, desc: "Microsoft 365, Power Platform" },
    { label: "99.99%", value: 99.99, desc: "Enterprise premium" },
    { label: "99.999%", value: 99.999, desc: "Mission critical" },
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

  // SLA Credit Calculation (configurable thresholds)
  const creditPercentage = achievedSla !== null && achievedSla < slaPercentage
    ? (() => {
        if (achievedSla < creditThreshold25) return 100; // 100% credit
        if (achievedSla < creditThreshold10) return 25; // 25% credit
        return 10; // 10% credit
      })()
    : 0;

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
      // Agregar https:// si no tiene protocolo
      if (!targetUrl.includes("://")) {
        targetUrl = `https://${targetUrl}`;
      }
      // Actualizar el input con la URL completa para que el usuario vea el formato correcto
      if (targetUrl !== url) {
        setLatencyUrl(targetUrl);
      }

      let responseStatus: number | null = null;
      let responseStatusText = "";
      try {
        const res = await fetch(targetUrl, {
          method: "GET",
          signal: controller.signal,
          mode: 'no-cors',
        });
        responseStatus = res.status;
        responseStatusText = res.statusText;
      } catch {
        // Si falla por CORS u otro error, aun intentamos leer el timing
      }
      clearTimeout(timeoutId);

      await new Promise((r) => setTimeout(r, 150));

      const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
      // Buscar por coincidencia exacta o parcial (para manejar redirecciones y variaciones de URL)
      const entry = entries
        .slice()
        .reverse()
        .find((e) => {
          const entryName = e.name.toLowerCase();
          const targetLower = targetUrl.toLowerCase();
          const urlLower = url.toLowerCase();
          return entryName === targetLower || entryName === urlLower ||
                 entryName.includes(targetLower) || targetLower.includes(entryName);
        });

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
          <strong className="text-slate-700 dark:text-slate-300">Como funciona:</strong> Ingresa la URL completa de un endpoint (ej: <code className="text-blue-600 dark:text-blue-400">https://api.github.com/status</code>) o simplemente el dominio (ej: <code className="text-blue-600 dark:text-blue-400">www.google.com</code>). La herramienta mide el ciclo completo del request usando las metricas nativas del navegador. Si ves valores en 0 para algunas fases, es porque el servidor bloquea el acceso a los timings (CORS). Funciona mejor con endpoints de tu propio dominio o con APIs publicas que permiten CORS.
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

        {/* URLs rapidas para latencia */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">URLs populares:</span>
          {QUICK_LATENCY_URLS.map((ql) => (
            <button
              key={ql.url}
              type="button"
              onClick={() => {
                setLatencyUrl(ql.url);
                void handleLatencyTest();
              }}
              className="rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 py-1 text-[11px] text-slate-600 dark:text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              {ql.label}
            </button>
          ))}
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
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Selecciona tu objetivo SLA</label>
              <p className="text-xs text-slate-500 mb-3">Elige el nivel de disponibilidad que necesitas para tu servicio. Valores más altos significan menos downtime permitido.</p>
              <div className="grid grid-cols-2 gap-3">
                {SLA_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setSlaPercentage(p.value)}
                    className={`rounded-lg border p-3 text-left transition-all ${
                      slaPercentage === p.value
                        ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20 ring-2 ring-violet-500"
                        : "border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-700"
                    }`}
                  >
                    <div className="font-semibold text-slate-900 dark:text-white">{p.label}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Periodo */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Periodo de tiempo</label>
              <p className="text-xs text-slate-500 mb-2">Define el periodo sobre el cual se mide el SLA. El downtime permitido se calcula en base a este periodo.</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "1 día", value: "day" as const },
                  { label: "1 mes", value: "month" as const },
                  { label: "1 trimestre", value: "quarter" as const },
                  { label: "1 año", value: "year" as const },
                ].map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setSlaPeriod(p.value)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
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

            {/* Downtime real ocurrido */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Downtime real ocurrido (opcional)</label>
              <p className="text-xs text-slate-500 mb-2">Ingresa el tiempo de downtime real que ocurrió para calcular el SLA logrado y verificar si cumples el objetivo.</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={slaCustomDowntime}
                  onChange={(e) => setSlaCustomDowntime(e.target.value)}
                  placeholder="0"
                  className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-200"
                />
                <select
                  value={slaCustomUnit}
                  onChange={(e) => setSlaCustomUnit(e.target.value as typeof slaCustomUnit)}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-200"
                >
                  <option value="seconds">segundos</option>
                  <option value="minutes">minutos</option>
                  <option value="hours">horas</option>
                  <option value="days">días</option>
                </select>
              </div>
            </div>

            {/* Umbrales de crédito SLA */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Umbrales de crédito SLA</label>
                <div className="relative group">
                  <svg className="h-4 w-4 text-slate-400 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="absolute left-0 top-6 z-10 w-72 rounded-lg bg-slate-900 text-white text-xs p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all shadow-lg">
                    <div className="font-semibold mb-2">Fórmula Microsoft SLA:</div>
                    <div className="mb-2">Monthly Uptime % = (User Minutes - Downtime) / User Minutes × 100</div>
                    <div className="font-semibold mb-1">Créditos:</div>
                    <div>• 100% crédito: uptime &lt; 95%</div>
                    <div>• 25% crédito: uptime 95-99%</div>
                    <div>• 10% crédito: uptime 99-SLA objetivo</div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-500 mb-2">Define los umbrales de uptime para calcular créditos de compensación. Usa el botón Microsoft para valores estándar de Microsoft 365.</p>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-xs text-slate-500 mb-1">Umbral 25% crédito</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={creditThreshold25}
                    onChange={(e) => setCreditThreshold25(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-slate-500 mb-1">Umbral 10% crédito</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={creditThreshold10}
                    onChange={(e) => setCreditThreshold10(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-200"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCreditThreshold25(95);
                    setCreditThreshold10(99);
                  }}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Microsoft
                </button>
              </div>
            </div>
          </div>

          {/* Resultados principales simplificados */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5">
              <div className="text-sm font-medium text-slate-500">Downtime máximo permitido</div>
              <div className="mt-2 text-3xl font-bold text-violet-600 dark:text-violet-400">{formatDuration(allowedDowntimeSeconds)}</div>
              <div className="mt-1 text-xs text-slate-500">{formatDurationPrecise(allowedDowntimeSeconds)}</div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5">
              <div className="text-sm font-medium text-slate-500">SLA objetivo</div>
              <div className="mt-2 text-3xl font-bold text-emerald-600 dark:text-emerald-400">{slaPercentage.toFixed(2)}%</div>
              <div className="mt-1 text-xs text-slate-500">{getNinesLabel(slaPercentage)}</div>
            </div>
          </div>

          {/* Cumplimiento si hay downtime real */}
          {achievedSla !== null && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">SLA logrado con el downtime ingresado</span>
                <span className={`text-2xl font-bold ${achievedSla >= slaPercentage ? "text-emerald-600" : "text-rose-600"}`}>
                  {achievedSla.toFixed(2)}%
                </span>
              </div>
              {complianceUsed !== null && (
                <>
                  <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full transition-all ${complianceUsed > 100 ? "bg-rose-500" : complianceUsed > 80 ? "bg-amber-500" : "bg-emerald-500"}`}
                      style={{ width: `${Math.min(100, complianceUsed)}%` }}
                    />
                  </div>
                  <div className="text-xs text-slate-500 mb-3">
                    {complianceUsed > 100 ? "⚠️ Excediste el downtime permitido" : complianceUsed > 80 ? "⚠️ Cerca del límite" : "✅ Dentro del límite"}
                  </div>
                </>
              )}
              {/* SLA Credit */}
              {creditPercentage > 0 && (
                <div className="rounded-lg bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-900/30 p-3">
                  <div className="text-xs font-medium uppercase tracking-wider text-violet-600 dark:text-violet-400">Crédito SLA</div>
                  <div className="text-xl font-bold text-slate-900 dark:text-white">{creditPercentage}%</div>
                  <div className="text-xs text-slate-500">
                    {creditPercentage === 100 ? `Uptime < ${creditThreshold25}%` : creditPercentage === 25 ? `Uptime ${creditThreshold25}-${creditThreshold10}%` : `Uptime ${creditThreshold10}-SLA objetivo`}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTool === "impact" && (
        <DowntimeImpactCalculator />
      )}
    </div>
  );
}
