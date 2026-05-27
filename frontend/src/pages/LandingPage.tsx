import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

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
function IconFilter(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
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
      "Centraliza el estado de Cloudflare, GitHub, OpenAI, AWS, Microsoft 365 y Power Platform en un solo tablero.",
    icon: IconCloud,
    accent: "from-sky-500 to-blue-600",
    shadow: "shadow-sky-500/20",
  },
  {
    title: "Timeline + paginación",
    description:
      "Visualiza incidencias cloud y Microsoft 365 ordenadas cronológicamente, con paginación inteligente para grandes volúmenes.",
    icon: IconLayers,
    accent: "from-violet-500 to-purple-600",
    shadow: "shadow-violet-500/20",
  },
  {
    title: "Mapa interactivo por región",
    description:
      "Navega un mapa mundial con zoom y paneo. Marcadores dinámicos agrupan incidencias por región geográfica.",
    icon: IconMap,
    accent: "from-rose-500 to-pink-600",
    shadow: "shadow-rose-500/20",
  },
  {
    title: "Traducción automática",
    description:
      "Convierte descripciones técnicas de incidentes al español directamente desde la interfaz para acelerar el análisis.",
    icon: IconTranslate,
    accent: "from-amber-500 to-orange-600",
    shadow: "shadow-amber-500/20",
  },
  {
    title: "Realtime + fallback",
    description:
      "SignalR transmite eventos en tiempo real. Si falla, un polling automático mantiene la información siempre fresca.",
    icon: IconZap,
    accent: "from-yellow-500 to-amber-600",
    shadow: "shadow-yellow-500/20",
  },
  {
    title: "Filtros avanzados",
    description:
      "Filtra incidencias por proveedor, severidad, estado activo y rango de fechas. Aplican al timeline y al mapa a la vez.",
    icon: IconFilter,
    accent: "from-teal-500 to-cyan-600",
    shadow: "shadow-teal-500/20",
  },
  {
    title: "Alertas y notificaciones",
    description:
      "Configura preferencias de alerta por email, envía alertas de prueba y gestiona notificaciones por tenant.",
    icon: IconBell,
    accent: "from-orange-500 to-red-500",
    shadow: "shadow-orange-500/20",
  },
  {
    title: "Gestión multi-tenant",
    description:
      "Crea usuarios, asigna roles de administrador y controla configuraciones de email a nivel de tenant.",
    icon: IconUsers,
    accent: "from-cyan-500 to-blue-500",
    shadow: "shadow-cyan-500/20",
  },
];

const providerBadges = [
  { name: "Cloudflare", color: "border-orange-500/30 text-orange-200 bg-orange-500/10" },
  { name: "GitHub", color: "border-slate-500/30 text-slate-200 bg-slate-500/10" },
  { name: "OpenAI", color: "border-emerald-500/30 text-emerald-200 bg-emerald-500/10" },
  { name: "AWS", color: "border-amber-500/30 text-amber-200 bg-amber-500/10" },
  { name: "Microsoft 365", color: "border-blue-500/30 text-blue-200 bg-blue-500/10" },
  { name: "Power Platform", color: "border-sky-500/30 text-sky-200 bg-sky-500/10" },
];

const benefits = [
  "Visibilidad consolidada de uptime y ecosistema SaaS",
  "Señales operativas en tiempo real para reacción más rápida",
  "Historial de incidentes útil para análisis post-mortem",
  "Arquitectura preparada para crecer hacia integraciones enterprise",
];

const details = [
  {
    title: "Checks de uptime personalizables",
    text: "Define endpoints, intervalos de verificación y umbrales de respuesta. El sistema registra disponibilidad histórica y alerta ante caídas.",
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
    <main>
      {/* ── KEYFRAME STYLES ── */}
      <style>{`
        @keyframes float {
          0%,100% { transform: translateY(0px); }
          50% { transform: translateY(-18px); }
        }
        @keyframes floatSlow {
          0%,100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(3deg); }
        }
        @keyframes blob {
          0%,100% { transform: translate(0,0) scale(1); }
          33% { transform: translate(30px,-50px) scale(1.1); }
          66% { transform: translate(-20px,20px) scale(0.95); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-delay { animation: float 7s ease-in-out infinite 1s; }
        .animate-blob { animation: blob 10s ease-in-out infinite; }
        .animate-blob-delay { animation: blob 12s ease-in-out infinite 3s; }
        .animate-shimmer {
          background-size: 200% auto;
          animation: shimmer 4s linear infinite;
        }
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
      `}</style>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden border-b border-slate-800 bg-slate-950">
        {/* animated background blobs */}
        <div className="absolute -top-20 -left-20 h-[500px] w-[500px] rounded-full bg-blue-600/20 blur-[120px] animate-blob" />
        <div className="absolute top-40 -right-20 h-[400px] w-[400px] rounded-full bg-cyan-500/15 blur-[100px] animate-blob-delay" />
        <div className="absolute -bottom-20 left-1/3 h-[300px] w-[300px] rounded-full bg-indigo-500/12 blur-[90px] animate-blob" style={{ animationDelay: "5s" }} />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_40%,transparent_100%)]" />

        <div className="relative mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-28">
          <div className="animate-[fadeIn_0.8s_ease-out]">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-blue-200">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Plataforma SaaS de observabilidad
            </div>
            <h1 className="mt-6 max-w-4xl text-5xl font-semibold tracking-tight text-white md:text-6xl">
              Monitorea uptime, estado cloud e incidentes SaaS desde un{" "}
              <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-sky-400 bg-clip-text text-transparent animate-shimmer">
                único centro operativo
              </span>
              .
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Cloud Alert Hub centraliza disponibilidad, proveedores cloud,
              timeline de incidentes con paginación, mapa geográfico interactivo,
              traducción automática y eventos realtime para que tu equipo
              reaccione más rápido y con mejor contexto.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="group relative overflow-hidden rounded-full bg-blue-600 px-7 py-3.5 text-sm font-semibold text-white shadow-xl shadow-blue-900/40 transition-all hover:-translate-y-0.5 hover:bg-blue-500 hover:shadow-blue-900/60"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Ir al Centro de Monitoreo
                    <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="group relative overflow-hidden rounded-full bg-blue-600 px-7 py-3.5 text-sm font-semibold text-white shadow-xl shadow-blue-900/40 transition-all hover:-translate-y-0.5 hover:bg-blue-500 hover:shadow-blue-900/60"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      Comenzar ahora
                      <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </Link>
                  <Link
                    to="/login"
                    className="group relative overflow-hidden rounded-full border border-slate-700 bg-slate-900/50 px-7 py-3.5 text-sm font-semibold text-slate-100 shadow-lg transition-all hover:-translate-y-0.5 hover:border-slate-500 hover:bg-slate-800/60"
                  >
                    Iniciar sesión
                  </Link>
                </>
              )}
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {benefits.map((benefit, i) => (
                <div
                  key={benefit}
                  className={`flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-4 text-sm text-slate-200 shadow-lg shadow-slate-950/30 backdrop-blur-sm transition-all hover:border-slate-700 hover:bg-slate-800/60 hover:-translate-y-0.5 hover:shadow-xl ${i % 2 === 0 ? "animate-float" : "animate-float-delay"}`}
                >
                  <div className="inline-flex rounded-lg bg-blue-500/10 p-1.5">
                    <IconShield className="h-4 w-4 text-blue-400" />
                  </div>
                  {benefit}
                </div>
              ))}
            </div>
          </div>

          {/* hero visual card */}
          <div className="animate-float relative rounded-3xl border border-slate-700/60 bg-slate-900/50 p-6 shadow-2xl shadow-slate-950/50 backdrop-blur-xl">
            <div className="absolute -inset-px rounded-3xl bg-gradient-to-br from-blue-500/20 via-transparent to-cyan-500/20 opacity-60" />
            <div className="relative grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 transition-all hover:-translate-y-0.5 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
                    Uptime
                  </span>
                </div>
                <div className="mt-3 text-3xl font-bold text-white">
                  99.98%
                </div>
                <div className="mt-2 text-sm text-emerald-200/70">
                  Checks de disponibilidad con histórico y métricas.
                </div>
                <div className="mt-3 flex gap-1">
                  {[80, 65, 90, 70, 95, 85, 100].map((h, i) => (
                    <div
                      key={i}
                      className="w-full rounded-sm bg-emerald-500/30"
                      style={{ height: `${h / 3}px` }}
                    />
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 transition-all hover:-translate-y-0.5 hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/10">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                    Incidentes activos
                  </span>
                </div>
                <div className="mt-3 text-3xl font-bold text-white">
                  Realtime
                </div>
                <div className="mt-2 text-sm text-amber-200/70">
                  SignalR + polling automático para datos siempre frescos.
                </div>
                <div className="mt-3 flex gap-1.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-1.5 w-1.5 rounded-full bg-amber-400/60" />
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4 transition-all hover:-translate-y-0.5 hover:border-sky-500/40 hover:shadow-lg hover:shadow-sky-500/10 md:col-span-2">
                <div className="flex items-center gap-2">
                  <IconTrendingUp className="h-4 w-4 text-sky-400" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-sky-300">
                    Centro de Estado Cloud
                  </span>
                </div>
                <div className="mt-3 text-xl font-bold text-white">
                  Timeline, mapa, paginación y contexto operativo
                </div>
                <div className="mt-2 text-sm leading-6 text-sky-200/70">
                  Visualiza incidencias de múltiples proveedores, filtra por
                  severidad y fechas, explora el mapa geográfico y traduce
                  contenido inline.
                </div>
                <div className="mt-4 flex gap-2">
                  {["Cloud", "Mapa", "Filtros", "Traducción"].map((tag) => (
                    <span key={tag} className="rounded-full bg-sky-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-sky-300">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── METRICS STRIP ── */}
      <section className="border-b border-slate-800 bg-slate-950 px-6 py-14">
        <div className="mx-auto grid max-w-7xl gap-8 sm:grid-cols-3">
          <div ref={uptimeCounter.ref} className="text-center">
            <div className="text-4xl font-extrabold text-white">
              {uptimeCounter.count}.98%
            </div>
            <div className="mt-1 text-sm font-medium tracking-wide text-slate-400 uppercase">
              Uptime objetivo
            </div>
          </div>
          <div ref={providersCounter.ref} className="text-center">
            <div className="text-4xl font-extrabold text-white">
              {providersCounter.count}+
            </div>
            <div className="mt-1 text-sm font-medium tracking-wide text-slate-400 uppercase">
              Providers cloud
            </div>
          </div>
          <div ref={daysCounter.ref} className="text-center">
            <div className="text-4xl font-extrabold text-white">
              {daysCounter.count}/7
            </div>
            <div className="mt-1 text-sm font-medium tracking-wide text-slate-400 uppercase">
              Monitoreo continuo
            </div>
          </div>
        </div>
      </section>

      {/* ── INFINITE MARQUEE ── */}
      <section className="overflow-hidden border-b border-slate-800 bg-slate-900/40 py-8">
        <div className="relative flex">
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
      <section id="features" className="bg-slate-950 px-6 py-24">
        <div ref={featuresRef} className="mx-auto max-w-7xl">
          <div className={`max-w-3xl reveal ${featuresVisible ? "visible" : ""}`}>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-blue-300">
              <IconZap className="h-3 w-3" />
              Funcionalidades clave
            </div>
            <h2 className="mt-5 text-4xl font-bold text-white md:text-5xl">
              Todo lo que tu equipo de operaciones necesita.
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-400">
              Diseñado para equipos que exigen claridad: desde checks uptime
              hasta incidentes externos, mapas y navegación operativa sin
              fricción.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {featureCards.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className={`group relative rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-slate-700 hover:shadow-xl hover:shadow-${feature.accent.split(" ")[1].replace("to-", "")}/10 reveal ${featuresVisible ? "visible" : ""} stagger-${Math.min(idx + 1, 9)}`}
                >
                  <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${feature.accent} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
                  <div className={`mb-5 inline-flex rounded-xl bg-gradient-to-br ${feature.accent} p-3 shadow-lg ${feature.shadow}`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-slate-400">
                    {feature.description}
                  </p>
                  <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-slate-500 transition-colors group-hover:text-slate-300">
                    Saber más
                    <IconArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── DETAILS GRID ── */}
      <section className="border-y border-slate-800 bg-slate-900/60 px-6 py-24">
        <div ref={detailsRef} className="mx-auto max-w-7xl">
          <div className={`mb-14 max-w-3xl reveal ${detailsVisible ? "visible" : ""}`}>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-blue-300">
              <IconLayers className="h-3 w-3" />
              Arquitectura
            </div>
            <h2 className="mt-5 text-4xl font-bold text-white">
              Construido para escalar y para operar.
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-400">
              Una plataforma robusta que crece con tu organización, desde
              monitoreo básico hasta operaciones enterprise con múltiples
              equipos y tenants.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {details.map((d, idx) => (
              <div
                key={d.title}
                className={`group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60 p-6 shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-700 hover:shadow-xl reveal ${detailsVisible ? "visible" : ""} stagger-${Math.min(idx + 1, 9)}`}
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-blue-500 to-cyan-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="mb-4 inline-flex rounded-lg bg-blue-500/10 p-2">
                  <IconTrendingUp className="h-4 w-4 text-blue-400" />
                </div>
                <h3 className="text-base font-semibold text-white">
                  {d.title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-400">
                  {d.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="relative bg-slate-950 px-6 py-24">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
        <div ref={stepsRef} className="mx-auto max-w-7xl">
          <div className={`mb-14 max-w-3xl reveal ${stepsVisible ? "visible" : ""}`}>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-blue-300">
              <IconArrowRight className="h-3 w-3" />
              Cómo funciona
            </div>
            <h2 className="mt-5 text-4xl font-bold text-white">
              De la señal a la acción en tres pasos.
            </h2>
          </div>

          <div className="relative grid gap-8 lg:grid-cols-3">
            {/* connecting line */}
            <div className="absolute top-12 left-0 hidden h-0.5 w-full bg-gradient-to-r from-blue-500/30 via-cyan-500/30 to-blue-500/30 lg:block" />

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
                className={`relative rounded-2xl border border-slate-800 bg-slate-900/60 p-7 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-slate-700 hover:shadow-xl reveal ${stepsVisible ? "visible" : ""} stagger-${Math.min(idx + 1, 9)}`}
              >
                <div className="relative z-10 mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-sm font-bold text-white shadow-lg shadow-blue-500/30">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-400">{item.text}</p>
              </div>
            ))}
          </div>

          {/* CTA banner */}
          <div className="mt-20 overflow-hidden rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-600/20 to-cyan-600/20 p-px shadow-2xl shadow-blue-900/20">
            <div className="relative rounded-3xl bg-slate-950/80 px-8 py-14 text-center backdrop-blur-sm">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.15),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.12),transparent_40%)]" />
              <div className="relative">
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-blue-300">
                  Listo para operar
                </div>
                <h3 className="mt-5 text-3xl font-bold text-white md:text-4xl">
                  Entra a Cloud Alert Hub y centraliza toda tu señal operativa.
                </h3>
                <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-slate-400">
                  Accede a una capa pública profesional y luego entra a tu workspace
                  interno protegido con rutas autenticadas, administración de
                  usuarios y notificaciones configurables.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  {isAuthenticated ? (
                    <Link
                      to="/dashboard"
                      className="group relative overflow-hidden rounded-full bg-blue-600 px-8 py-3.5 text-sm font-semibold text-white shadow-xl shadow-blue-900/40 transition-all hover:-translate-y-0.5 hover:bg-blue-500"
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        Abrir Centro de Monitoreo
                        <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    </Link>
                  ) : (
                    <>
                      <Link
                        to="/register"
                        className="group relative overflow-hidden rounded-full bg-blue-600 px-8 py-3.5 text-sm font-semibold text-white shadow-xl shadow-blue-900/40 transition-all hover:-translate-y-0.5 hover:bg-blue-500"
                      >
                        <span className="relative z-10 flex items-center gap-2">
                          Crear cuenta
                          <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </span>
                      </Link>
                      <Link
                        to="/login"
                        className="group relative overflow-hidden rounded-full border border-slate-600 bg-slate-900/50 px-8 py-3.5 text-sm font-semibold text-slate-100 shadow-lg transition-all hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-800/60"
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
      <footer className="border-t border-slate-800 bg-slate-950 px-6 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="text-sm font-medium text-slate-400">
            Cloud Alert Hub — Observabilidad cloud y monitoreo SaaS
          </div>
          <div className="text-sm text-slate-600">
            Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </main>
  );
}
