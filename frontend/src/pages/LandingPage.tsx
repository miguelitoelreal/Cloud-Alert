import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { CloudAlertLogo } from "../components/CloudAlertLogo";

/* ── inline SVG icons ── */
function IconActivity(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
function IconCloud(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
    </svg>
  );
}
function IconMap(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polygon points="1 6 1 22 8 18 16 22 21 18 21 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  );
}
function IconTranslate(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 5h7M9 3v2M7 17l4.3-9.3M15 5h5l-5 10h5" />
      <path d="M2 12h6M18 12h4" />
    </svg>
  );
}
function IconBell(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
function IconZap(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
function IconLayers(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}
function IconUsers(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IconShield(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function IconGlobe(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}
function IconArrowRight(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}
function IconTrendingUp(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}
function IconBarChart(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}
function IconCalculator(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="16" y1="14" x2="16" y2="14" />
      <line x1="8" y1="10" x2="8" y2="10" />
      <line x1="12" y1="10" x2="12" y2="10" />
      <line x1="8" y1="14" x2="8" y2="14" />
      <line x1="12" y1="14" x2="12" y2="14" />
      <line x1="8" y1="18" x2="8" y2="18" />
      <line x1="12" y1="18" x2="12" y2="18" />
      <line x1="16" y1="18" x2="16" y2="18" />
    </svg>
  );
}
function IconSearch(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
function IconBriefcase(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}
function IconPlug(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 22v-5M9 8V2M15 8V2M18 8H6a4 4 0 0 0 0 8h12a4 4 0 0 0 0-8z" />
    </svg>
  );
}

/* ── data ── */
const featureCards = [
  {
    title: "Monitoreo uptime en tiempo real",
    description:
      "Supervisa endpoints críticos, tiempo de respuesta y disponibilidad con checks automáticos y métricas en vivo.",
    icon: IconActivity,
    accent: "from-emerald-500 to-teal-500",
    shadow: "shadow-emerald-500/20",
  },
  {
    title: "Estado cloud unificado",
    description:
      "Centraliza el estado de Cloudflare, GitHub, OpenAI, Vercel, Google Cloud, Oracle Cloud, Netlify, Render, GitLab, Microsoft 365 y Power Platform en un solo tablero.",
    icon: IconCloud,
    accent: "from-sky-500 to-blue-600",
    shadow: "shadow-sky-500/20",
  },
  {
    title: "Analítica Cloud avanzada",
    description:
      "KPIs de uptime, distribución de severidad, tendencias históricas, comparación lado a lado de providers y calculadora de impacto financiero de downtime.",
    icon: IconBarChart,
    accent: "from-violet-500 to-purple-600",
    shadow: "shadow-violet-500/20",
  },
  {
    title: "Calculadora de impacto de downtime",
    description:
      "Estima costos financieros de interrupciones en tiempo real: ingresos perdidos, productividad, costo por minuto y jornadas equivalentes.",
    icon: IconCalculator,
    accent: "from-rose-500 to-pink-600",
    shadow: "shadow-rose-500/20",
  },
  {
    title: "DNS Lookup Tool",
    description:
      "Consulta registros DNS (A, AAAA, MX, TXT, NS, CNAME, SOA) desde múltiples servidores con historial de búsquedas y copiado rápido.",
    icon: IconSearch,
    accent: "from-amber-500 to-orange-600",
    shadow: "shadow-amber-500/20",
  },
  {
    title: "SLA Dashboard",
    description:
      "Define objetivos de uptime por provider, genera reportes automáticos y detecta breaches con seguimiento de cumplimiento.",
    icon: IconShield,
    accent: "from-yellow-500 to-amber-600",
    shadow: "shadow-yellow-500/20",
  },
  {
    title: "Mapa interactivo por región",
    description:
      "Navega un mapa mundial con zoom y paneo. Marcadores dinámicos agrupan incidencias por región geográfica.",
    icon: IconMap,
    accent: "from-teal-500 to-cyan-600",
    shadow: "shadow-teal-500/20",
  },
  {
    title: "Traducción automática",
    description:
      "Convierte descripciones técnicas de incidentes al español directamente desde la interfaz para acelerar el análisis.",
    icon: IconTranslate,
    accent: "from-indigo-500 to-blue-600",
    shadow: "shadow-indigo-500/20",
  },
  {
    title: "Cartera de Clientes",
    description:
      "Gestiona clientes con sus proveedores cloud asociados, tipo de industria y estado operativo. Visualiza relaciones cliente-provider.",
    icon: IconBriefcase,
    accent: "from-cyan-500 to-blue-500",
    shadow: "shadow-cyan-500/20",
  },
  {
    title: "Integraciones Microsoft 365",
    description:
      "Conecta tu tenant de Microsoft vía Graph API para importar incidencias reales de Exchange, Teams, SharePoint y Power Platform.",
    icon: IconPlug,
    accent: "from-blue-500 to-indigo-600",
    shadow: "shadow-blue-500/20",
  },
  {
    title: "Alertas y notificaciones",
    description:
      "Configura preferencias de alerta por email, horarios silenciosos, severidad mínima, envía alertas de prueba y gestiona notificaciones por tenant.",
    icon: IconBell,
    accent: "from-orange-500 to-red-500",
    shadow: "shadow-orange-500/20",
  },
  {
    title: "Gestión multi-tenant",
    description:
      "Datos aislados por tenant: cada usuario ve solo sus monitores, incidentes, clientes y configuraciones. Seguridad por JWT + refresh tokens.",
    icon: IconUsers,
    accent: "from-green-500 to-emerald-600",
    shadow: "shadow-green-500/20",
  },
];

const providerBadges = [
  { name: "Cloudflare", color: "border-orange-500/30 text-orange-200 bg-orange-500/10" },
  { name: "GitHub", color: "border-slate-500/30 text-slate-200 bg-slate-500/10" },
  { name: "OpenAI", color: "border-emerald-500/30 text-emerald-200 bg-emerald-500/10" },
  { name: "Vercel", color: "border-slate-500/30 text-slate-200 bg-slate-500/10" },
  { name: "Twilio", color: "border-red-500/30 text-red-200 bg-red-500/10" },
  { name: "DigitalOcean", color: "border-sky-500/30 text-sky-200 bg-sky-500/10" },
  { name: "Google Cloud", color: "border-blue-500/30 text-blue-200 bg-blue-500/10" },
  { name: "Oracle Cloud", color: "border-red-500/30 text-red-200 bg-red-500/10" },
  { name: "Netlify", color: "border-teal-500/30 text-teal-200 bg-teal-500/10" },
  { name: "Render", color: "border-emerald-500/30 text-emerald-200 bg-emerald-500/10" },
  { name: "GitLab", color: "border-orange-600/30 text-orange-200 bg-orange-600/10" },
  { name: "Microsoft 365", color: "border-blue-500/30 text-blue-200 bg-blue-500/10" },
  { name: "Power Platform", color: "border-sky-500/30 text-sky-200 bg-sky-500/10" },
];

const details = [
  {
    title: "Checks de uptime personalizables",
    text: "Define endpoints, intervalos de verificación y umbrales de respuesta. El sistema registra disponibilidad histórica y alerta ante caídas.",
  },
  {
    title: "Analítica Cloud con impacto financiero",
    text: "Dashboard de KPIs con uptime, incidentes, tendencias, comparación de providers y calculadora de costo de downtime por sector.",
  },
  {
    title: "Integración Microsoft Graph",
    text: "Conecta tu tenant de Microsoft 365 para importar incidencias reales de Exchange, Teams, SharePoint y Power Platform.",
  },
  {
    title: "Mapa mundial interactivo",
    text: "Cada incidencia se geolocaliza por región. El mapa permite zoom, paneo y un panel lateral con detalle de incidencias por zona.",
  },
  {
    title: "Herramientas de red integradas",
    text: "DNS Lookup con soporte para múltiples tipos de registro y servidores (Google, Cloudflare). Historial de consultas persistente.",
  },
  {
    title: "SLA y cumplimiento",
    text: "Define objetivos de uptime por provider, genera reportes periódicos automáticos y detecta breaches con métricas de confianza.",
  },
  {
    title: "Seguridad por JWT + refresh tokens",
    text: "Autenticación con tokens de acceso y refresco, control de roles (admin/usuario) y rutas protegidas por React Router.",
  },
  {
    title: "Panel de administración",
    text: "Gestiona usuarios del tenant, alterna permisos de administrador, configura SMTP para alertas y envía correos de prueba.",
  },
  {
    title: "Backend .NET con SignalR",
    text: "API REST robusta con arquitectura limpia, repositorios, servicios y SignalR para push de eventos hacia el frontend.",
  },
];

/* ── animated counter hook ── */
function useCountUp(end: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          let startTime: number | null = null;
          function step(ts: number) {
            if (startTime === null) startTime = ts;
            const progress = Math.min((ts - startTime) / duration, 1);
            setCount(Math.floor(progress * end));
            if (progress < 1) requestAnimationFrame(step);
          }
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [end, duration]);

  return { count, ref };
}

/* ── section reveal hook ── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, visible };
}

export function LandingPage() {
  const { isAuthenticated } = useAuth();
  const uptimeCounter = useCountUp(99, 1800);
  const providersCounter = useCountUp(6, 1500);
  const daysCounter = useCountUp(365, 2200);
  const { ref: featuresRef, visible: featuresVisible } = useReveal();
  const { ref: detailsRef, visible: detailsVisible } = useReveal();
  const { ref: stepsRef, visible: stepsVisible } = useReveal();
  useEffect(() => {
    document.title = "Cloud Alert Hub — Observabilidad cloud y monitoreo SaaS";
  }, []);

  return (
    <main
      className="relative"
      onMouseMove={(e) => {
        const main = e.currentTarget;
        main.style.setProperty("--glow-x", `${e.clientX}px`);
        main.style.setProperty("--glow-y", `${e.clientY}px`);
      }}
    >
      {/* ── KEYFRAME STYLES ── */}
      <style>{`
        @keyframes float {
          0%,100% { transform: translateY(0px); }
          50% { transform: translateY(-18px); }
        }
        @keyframes blob {
          0%,100% { transform: translate(0,0) scale(1); }
          33% { transform: translate(30px,-50px) scale(1.1); }
          66% { transform: translate(-20px,20px) scale(0.95); }
        }
        @keyframes aurora {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes scan {
          0% { transform: translateY(-100%); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        @keyframes pulse-glow {
          0%,100% { box-shadow: 0 0 20px rgba(0,212,255,0.15), 0 0 60px rgba(124,58,237,0.08); }
          50% { box-shadow: 0 0 30px rgba(0,212,255,0.25), 0 0 80px rgba(124,58,237,0.15); }
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes ring-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-blob { animation: blob 10s ease-in-out infinite; }
        .animate-blob-delay { animation: blob 12s ease-in-out infinite 3s; }
        .animate-aurora {
          background-size: 400% 400%;
          animation: aurora 8s ease-in-out infinite;
        }
        .animate-pulse-glow { animation: pulse-glow 4s ease-in-out infinite; }
        .animate-marquee { animation: marquee 25s linear infinite; }
        .glass-card {
          background: rgba(15,23,42,0.55);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,0.06);
        }
        .reveal {
          opacity: 0;
          transform: translateY(28px);
          transition: opacity 0.7s ease, transform 0.7s ease;
        }
        .reveal.visible {
          opacity: 1;
          transform: translateY(0);
        }
        .stagger-1 { transition-delay: 0.08s; }
        .stagger-2 { transition-delay: 0.16s; }
        .stagger-3 { transition-delay: 0.24s; }
        .stagger-4 { transition-delay: 0.32s; }
        .stagger-5 { transition-delay: 0.40s; }
        .stagger-6 { transition-delay: 0.48s; }
        .stagger-7 { transition-delay: 0.56s; }
        .stagger-8 { transition-delay: 0.64s; }
        .stagger-9 { transition-delay: 0.72s; }
        .cursor-glow {
          position: fixed;
          left: var(--glow-x, 50%);
          top: var(--glow-y, 50%);
          transform: translate(-50%, -50%);
          width: 320px;
          height: 320px;
          pointer-events: none;
          z-index: 2;
          background: radial-gradient(circle at center, rgba(139,92,246,0.30) 0%, rgba(124,58,237,0.12) 40%, transparent 70%);
          filter: blur(40px);
        }
        @media (pointer: coarse) {
          .cursor-glow { display: none !important; }
        }
      `}</style>

      {/* Cursor glow effect */}
      <div className="cursor-glow" />

      {/* ── HERO ── */}
      <section className="relative overflow-hidden border-b border-slate-800 bg-slate-950">
        {/* Aurora background */}
        <div className="absolute inset-0 animate-aurora bg-[linear-gradient(135deg,rgba(0,212,255,0.08),rgba(124,58,237,0.06),rgba(0,212,255,0.04),rgba(124,58,237,0.08))]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_40%,#000_30%,transparent_100%)]" />
        <div className="absolute top-1/4 left-1/4 h-[600px] w-[600px] rounded-full bg-cyan-500/10 blur-[140px] animate-blob" />
        <div className="absolute bottom-1/4 right-1/4 h-[500px] w-[500px] rounded-full bg-violet-500/10 blur-[120px] animate-blob-delay" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
            {/* Left: Copy */}
            <div className="max-w-xl lg:max-w-none">
              <div className="flex items-center gap-3">
                <CloudAlertLogo className="h-10 w-10" />
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
                  </span>
                  Plataforma de Observabilidad Cloud
                </div>
              </div>

              <h1 className="mt-6 text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
                Tu centro de comando para{" "}
                <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">
                  uptime e incidentes
                </span>{" "}
                cloud
              </h1>

              <p className="mt-6 text-lg leading-8 text-slate-400">
                Monitorea proveedores cloud, detecta interrupciones en tiempo real,
                analiza impacto financiero y traduce incidentes al español. Todo en
                una sola plataforma operativa.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                {isAuthenticated ? (
                  <Link
                    to="/centro-estado-cloud"
                    className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-900/30 transition-all hover:-translate-y-0.5 hover:shadow-cyan-900/50 animate-pulse-glow"
                  >
                    Ir al Centro de Estado
                    <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/register"
                      className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-900/30 transition-all hover:-translate-y-0.5 hover:shadow-cyan-900/50 animate-pulse-glow"
                    >
                      Comenzar gratis
                      <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/50 px-6 py-3 text-sm font-semibold text-slate-200 shadow-lg backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-slate-500 hover:bg-slate-800/60 hover:text-white"
                    >
                      Iniciar sesión
                    </Link>
                  </>
                )}
              </div>

              <div className="mt-10 flex items-center gap-6 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <IconShield className="h-4 w-4 text-cyan-400" />
                  <span>Multi-tenant</span>
                </div>
                <div className="flex items-center gap-2">
                  <IconZap className="h-4 w-4 text-amber-400" />
                  <span>Realtime</span>
                </div>
                <div className="flex items-center gap-2">
                  <IconCloud className="h-4 w-4 text-violet-400" />
                  <span>10+ providers</span>
                </div>
              </div>
            </div>

            {/* Right: Dashboard Mockup with 3D tilt */}
            <div className="relative hidden lg:block" style={{ perspective: "1200px" }}>
              <div className="relative rounded-2xl border border-slate-700/60 bg-slate-900/80 p-4 shadow-2xl shadow-black/50 backdrop-blur-xl transition-transform duration-500 hover:rotate-y-2" style={{ transform: "rotateY(-5deg) rotateX(2deg)" }}>
                {/* Window chrome */}
                <div className="mb-4 flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500/80" />
                  <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                  <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                  <div className="ml-4 flex-1 rounded-md bg-slate-800/80 py-1 px-3 text-xs text-slate-500 font-mono">
                    cloudalerthub.com/centro-estado-cloud
                  </div>
                </div>

                {/* Dashboard content */}
                <div className="grid gap-3">
                  {/* Top stats row */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/30 p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">Uptime</span>
                      </div>
                      <div className="mt-2 text-2xl font-bold text-white">99.98%</div>
                      <div className="mt-1 h-1 w-full rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full w-[99%] rounded-full bg-emerald-500/60" />
                      </div>
                    </div>
                    <div className="rounded-xl border border-amber-500/20 bg-amber-950/30 p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-300">Alertas</span>
                      </div>
                      <div className="mt-2 text-2xl font-bold text-white">3</div>
                      <div className="mt-1 text-[10px] text-amber-300/70">2 críticas, 1 menor</div>
                    </div>
                    <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/30 p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan-300">Providers</span>
                      </div>
                      <div className="mt-2 text-2xl font-bold text-white">8</div>
                      <div className="mt-1 text-[10px] text-cyan-300/70">2 con incidencias</div>
                    </div>
                  </div>

                  {/* Chart area */}
                  <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300">Tendencia de disponibilidad</span>
                      <span className="text-[10px] text-slate-500">Últimos 7 días</span>
                    </div>
                    <div className="mt-4 flex items-end gap-1.5 h-20">
                      {[65, 78, 55, 92, 88, 95, 98].map((h, i) => (
                        <div key={i} className="flex-1 rounded-sm bg-gradient-to-t from-cyan-500/40 to-violet-400/60 transition-all hover:from-cyan-500/60 hover:to-violet-400/80" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                    <div className="mt-2 flex justify-between text-[10px] text-slate-600">
                      <span>Lun</span><span>Mar</span><span>Mie</span><span>Jue</span><span>Vie</span><span>Sab</span><span>Dom</span>
                    </div>
                  </div>

                  {/* Incident list */}
                  <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300">Incidentes recientes</span>
                      <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-300">2 activos</span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {[
                        { name: "Cloudflare CDN", sev: "Minor", color: "bg-amber-500" },
                        { name: "GitLab CI", sev: "Critical", color: "bg-red-500" },
                      ].map((inc) => (
                        <div key={inc.name} className="flex items-center justify-between rounded-lg bg-slate-900/50 px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full ${inc.color}`} />
                            <span className="text-xs text-slate-300">{inc.name}</span>
                          </div>
                          <span className="text-[10px] font-semibold text-slate-500">{inc.sev}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating badge */}
              <div className="absolute -bottom-4 -left-4 rounded-xl border border-cyan-500/30 bg-cyan-950/80 px-4 py-3 shadow-xl backdrop-blur-sm animate-float">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="text-xs font-semibold text-cyan-300">Todo operativo</span>
                </div>
                <div className="mt-1 text-[10px] text-cyan-400/70">Último check: hace 30s</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── METRICS STRIP ── */}
      <section className="relative overflow-hidden border-b border-slate-800 bg-slate-950 px-6 py-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(59,130,246,0.08),_transparent_70%)]" />
        <div className="relative z-10 mx-auto grid max-w-7xl gap-6 sm:grid-cols-3">
          {[
            { ref: uptimeCounter.ref, value: `${uptimeCounter.count}.98%`, label: "Uptime promedio", lineColor: "bg-gradient-to-r from-emerald-500/50 to-emerald-400/30", textColor: "bg-gradient-to-br from-emerald-400 to-emerald-300" },
            { ref: providersCounter.ref, value: `${providersCounter.count}+`, label: "Providers monitoreados", lineColor: "bg-gradient-to-r from-sky-500/50 to-sky-400/30", textColor: "bg-gradient-to-br from-sky-400 to-sky-300" },
            { ref: daysCounter.ref, value: `${daysCounter.count}/7`, label: "Días de monitoreo", lineColor: "bg-gradient-to-r from-blue-500/50 to-blue-400/30", textColor: "bg-gradient-to-br from-blue-400 to-blue-300" },
          ].map((stat) => (
            <div
              key={stat.label}
              ref={stat.ref}
              className="group relative rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center shadow-lg backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-slate-700 hover:shadow-xl hover:shadow-blue-900/10"
            >
              <div className={`absolute inset-x-0 top-0 h-px ${stat.lineColor} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
              <div className={`text-5xl font-black tracking-tight ${stat.textColor} bg-clip-text text-transparent sm:text-6xl`}>
                {stat.value}
              </div>
              <div className="mt-3 text-sm font-semibold uppercase tracking-widest text-slate-500">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── INFINITE MARQUEE ── */}
      <section className="relative overflow-hidden border-b border-slate-800 bg-slate-900/40 py-8">
        <div className="relative z-10 flex">
          <div className="animate-marquee flex shrink-0 gap-8 pr-8">
            {[...providerBadges, ...providerBadges].map((p, i) => (
              <div
                key={`${p.name}-${i}`}
                className={`flex items-center gap-3 rounded-2xl border ${p.color} px-6 py-4 text-base font-semibold shadow-lg`}
              >
                <IconGlobe className="h-5 w-5 shrink-0 opacity-80" />
                {p.name}
              </div>
            ))}
          </div>
          <div className="animate-marquee flex shrink-0 gap-8 pr-8" aria-hidden="true">
            {[...providerBadges, ...providerBadges].map((p, i) => (
              <div
                key={`dup-${p.name}-${i}`}
                className={`flex items-center gap-3 rounded-2xl border ${p.color} px-6 py-4 text-base font-semibold shadow-lg`}
              >
                <IconGlobe className="h-5 w-5 shrink-0 opacity-80" />
                {p.name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="relative overflow-hidden bg-slate-950 px-6 py-28">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(0,212,255,0.05),_transparent_50%),radial-gradient(ellipse_at_bottom_right,_rgba(124,58,237,0.04),_transparent_50%)]" />
        <div ref={featuresRef} className="relative z-10 mx-auto max-w-7xl">
          <div className={`mx-auto max-w-3xl text-center reveal ${featuresVisible ? "visible" : ""}`}>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
              <IconZap className="h-3 w-3" />
              Capacidades operativas
            </div>
            <h2 className="mt-6 text-4xl font-black tracking-tight text-white md:text-5xl">
              Todo lo que tu equipo de{" "}
              <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
                operaciones necesita
              </span>
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-400">
              Diseñado para equipos que exigen claridad: desde checks uptime
              hasta incidentes externos, mapas y navegación operativa sin fricción.
            </p>
          </div>

          <div className="mt-20 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {featureCards.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className={`group relative rounded-2xl border border-slate-800/60 bg-slate-900/30 p-7 backdrop-blur-sm transition-all duration-500 hover:-translate-y-2 hover:border-slate-700/80 hover:bg-slate-900/50 hover:shadow-2xl hover:shadow-cyan-900/5 reveal ${featuresVisible ? "visible" : ""} stagger-${Math.min(idx + 1, 9)}`}
                >
                  <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${feature.accent} opacity-0 transition-opacity duration-500 group-hover:opacity-100`} />
                  <div className={`absolute -inset-px rounded-2xl bg-gradient-to-br ${feature.accent} opacity-0 blur-sm transition-opacity duration-500 group-hover:opacity-[0.08]`} />
                  <div className="relative">
                    <div className="mb-5 flex items-center gap-4">
                      <div className={`inline-flex rounded-xl bg-gradient-to-br ${feature.accent} p-3 shadow-lg ${feature.shadow} transition-transform duration-300 group-hover:scale-110`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-white">
                        {feature.title}
                      </h3>
                    </div>
                    <p className="text-sm leading-7 text-slate-400">
                      {feature.description}
                    </p>
                    <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-cyan-400/70 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      <span>Explorar</span>
                      <IconArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── ARCHITECTURE / DETAILS ── */}
      <section className="relative overflow-hidden border-y border-slate-800/40 bg-slate-950 px-6 py-28">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(124,58,237,0.05),_transparent_50%),radial-gradient(ellipse_at_top_left,_rgba(0,212,255,0.04),_transparent_50%)]" />
        <div ref={detailsRef} className="relative z-10 mx-auto max-w-7xl">
          <div className={`mx-auto mb-16 max-w-3xl text-center reveal ${detailsVisible ? "visible" : ""}`}>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">
              <IconLayers className="h-3 w-3" />
              Arquitectura
            </div>
            <h2 className="mt-6 text-4xl font-black tracking-tight text-white md:text-5xl">
              Construido para{" "}
              <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                escalar y operar
              </span>
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-400">
              Una plataforma robusta que crece con tu organización, desde
              monitoreo básico hasta operaciones enterprise con múltiples equipos.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {details.map((d, idx) => (
              <div
                key={d.title}
                className={`group relative rounded-2xl border border-slate-800/60 bg-slate-900/30 p-7 backdrop-blur-sm transition-all duration-500 hover:-translate-y-2 hover:border-slate-700/80 hover:bg-slate-900/50 hover:shadow-2xl hover:shadow-violet-900/5 reveal ${detailsVisible ? "visible" : ""} stagger-${Math.min(idx + 1, 9)}`}
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-violet-500 to-cyan-500 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 opacity-0 blur-sm transition-opacity duration-500 group-hover:opacity-[0.08]" />
                <div className="relative">
                  <div className="mb-5 inline-flex rounded-xl bg-violet-500/10 p-3 transition-colors group-hover:bg-violet-500/15">
                    <IconTrendingUp className="h-5 w-5 text-violet-400 transition-colors group-hover:text-violet-300" />
                  </div>
                  <h3 className="text-lg font-bold text-white">
                    {d.title}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-slate-400">
                    {d.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="relative overflow-hidden bg-slate-950 px-6 py-28">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(0,212,255,0.05),_transparent_50%),radial-gradient(ellipse_at_bottom_left,_rgba(124,58,237,0.04),_transparent_50%)]" />
        <div ref={stepsRef} className="relative z-10 mx-auto max-w-7xl">
          <div className={`mx-auto mb-16 max-w-3xl text-center reveal ${stepsVisible ? "visible" : ""}`}>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
              <IconArrowRight className="h-3 w-3" />
              Cómo funciona
            </div>
            <h2 className="mt-6 text-4xl font-black tracking-tight text-white md:text-5xl">
              De la señal a la{" "}
              <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
                acción en tres pasos
              </span>
            </h2>
          </div>

          <div className="relative grid gap-8 lg:grid-cols-3">
            {/* connecting line */}
            <div className="absolute top-[3.25rem] left-[16.67%] right-[16.67%] hidden h-px bg-gradient-to-r from-cyan-500/30 via-violet-500/30 to-cyan-500/30 lg:block" />
            {/* dots */}
            <div className="absolute top-[3.125rem] left-[16.67%] hidden h-1 w-1 rounded-full bg-cyan-400 lg:block" />
            <div className="absolute top-[3.125rem] left-[50%] hidden h-1 w-1 -translate-x-1/2 rounded-full bg-violet-400 lg:block" />
            <div className="absolute top-[3.125rem] right-[16.67%] hidden h-1 w-1 rounded-full bg-cyan-400 lg:block" />

            {[
              {
                step: "01",
                title: "Conecta señales operativas",
                text: "Consume checks internos, estado cloud externo de RSS/JSON y SignalR para una vista consolidada. Incluye Microsoft 365 si tu tenant está registrado.",
              },
              {
                step: "02",
                title: "Prioriza incidentes con contexto",
                text: "Visualiza timeline paginado, severidad, estado, servicios afectados, traducción inline y mapa geográfico para decisiones más rápidas.",
              },
              {
                step: "03",
                title: "Opera desde un centro unificado",
                text: "Mantén monitores, estado cloud, mapa de regiones e incidentes dentro de un layout operativo consistente con filtros aplicados en tiempo real.",
              },
            ].map((item, idx) => (
              <div
                key={item.step}
                className={`group relative rounded-2xl border border-slate-800/60 bg-slate-900/30 p-7 backdrop-blur-sm transition-all duration-500 hover:-translate-y-2 hover:border-slate-700/80 hover:bg-slate-900/50 hover:shadow-2xl hover:shadow-cyan-900/5 reveal ${stepsVisible ? "visible" : ""} stagger-${Math.min(idx + 1, 9)}`}
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-cyan-500 to-violet-500 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-500 opacity-0 blur-sm transition-opacity duration-500 group-hover:opacity-[0.08]" />
                <div className="relative">
                  <div className="relative z-10 mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-base font-bold text-white shadow-lg shadow-cyan-500/25 transition-transform duration-300 group-hover:scale-110">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-bold text-white">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-400">{item.text}</p>
                  <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-cyan-400/70 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <span>Ver más</span>
                    <IconArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative overflow-hidden bg-slate-950 px-6 py-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,212,255,0.08),_transparent_60%)]" />
        <div className="relative z-10 mx-auto max-w-5xl">
          <div className="overflow-hidden rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-cyan-600/20 to-blue-600/20 p-px shadow-2xl shadow-cyan-900/20">
            <div className="relative rounded-3xl bg-slate-950/80 px-8 py-16 text-center backdrop-blur-xl sm:px-12 sm:py-20">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,212,255,0.15),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.12),transparent_40%)]" />
              <div className="relative">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                  Listo para operar
                </div>
                <h2 className="mt-6 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                  Centraliza toda tu señal operativa
                </h2>
                <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-400">
                  Accede a una capa pública profesional y entra a tu workspace
                  interno protegido con rutas autenticadas y notificaciones configurables.
                </p>
                <div className="mt-10 flex flex-wrap justify-center gap-4">
                  {isAuthenticated ? (
                    <Link
                      to="/dashboard"
                      className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-8 py-3.5 text-sm font-semibold text-white shadow-xl shadow-cyan-900/40 transition-all hover:-translate-y-0.5 hover:shadow-cyan-900/60 animate-pulse-glow"
                    >
                      Abrir Centro de Monitoreo
                      <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  ) : (
                    <>
                      <Link
                        to="/register"
                        className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-8 py-3.5 text-sm font-semibold text-white shadow-xl shadow-cyan-900/40 transition-all hover:-translate-y-0.5 hover:shadow-cyan-900/60 animate-pulse-glow"
                      >
                        Crear cuenta gratis
                        <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Link>
                      <Link
                        to="/login"
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/50 px-8 py-3.5 text-sm font-semibold text-slate-200 shadow-lg backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-slate-500 hover:bg-slate-800/60 hover:text-white"
                      >
                        Iniciar sesión
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative border-t border-slate-800/40 bg-slate-950 px-6 pt-16 pb-8">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
            {/* Brand */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-3">
                <CloudAlertLogo className="h-8 w-8" />
                <div>
                  <div className="text-lg font-black tracking-tight text-white">Cloud Alert</div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">Hub</div>
                </div>
              </div>
              <p className="mt-4 max-w-sm text-sm leading-7 text-slate-400">
                Observabilidad cloud y monitoreo SaaS para equipos operativos.
                Centraliza uptime, estado de proveedores e incidentes en una sola plataforma.
              </p>
              <div className="mt-6 flex items-center gap-4">
                <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                <span className="text-xs font-medium text-slate-500">Todos los sistemas operativos</span>
              </div>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Plataforma</h4>
              <div className="mt-4 flex flex-col gap-3">
                <Link to="/login" className="text-sm text-slate-400 transition-colors hover:text-cyan-400">Iniciar sesión</Link>
                <Link to="/register" className="text-sm text-slate-400 transition-colors hover:text-cyan-400">Registrarse</Link>
                <Link to="/centro-estado-cloud" className="text-sm text-slate-400 transition-colors hover:text-cyan-400">Centro de Estado Cloud</Link>
                <a href="#features" className="text-sm text-slate-400 transition-colors hover:text-cyan-400">Funcionalidades</a>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Recursos</h4>
              <div className="mt-4 flex flex-col gap-3">
                <a href="#how-it-works" className="text-sm text-slate-400 transition-colors hover:text-cyan-400">Cómo funciona</a>
                <a href="#providers" className="text-sm text-slate-400 transition-colors hover:text-cyan-400">Providers</a>
                <span className="text-sm text-slate-600">Documentación (próximamente)</span>
                <span className="text-sm text-slate-600">API (próximamente)</span>
              </div>
            </div>
          </div>

          <div className="mt-12 border-t border-slate-800/40 pt-8">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <div className="text-xs text-slate-600">
                Cloud Alert Hub. Todos los derechos reservados.
              </div>
              <div className="flex items-center gap-6 text-xs text-slate-600">
                <span className="hover:text-slate-400 cursor-default">Privacidad</span>
                <span className="hover:text-slate-400 cursor-default">Términos</span>
                <span className="hover:text-slate-400 cursor-default">Contacto</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
