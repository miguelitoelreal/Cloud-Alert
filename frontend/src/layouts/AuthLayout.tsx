import { Link, Outlet } from "react-router-dom";
import { CloudAlertLogo } from "../components/CloudAlertLogo";

function IconCheck(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function AuthLayout() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-50">
      {/* Background effects */}
      <style>{`
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
        .animate-blob { animation: blob 10s ease-in-out infinite; }
        .animate-blob-delay { animation: blob 12s ease-in-out infinite 3s; }
        .animate-aurora {
          background-size: 400% 400%;
          animation: aurora 8s ease-in-out infinite;
        }
      `}</style>
      <div className="absolute inset-0 animate-aurora bg-[linear-gradient(135deg,rgba(0,212,255,0.06),rgba(124,58,237,0.05),rgba(0,212,255,0.03),rgba(124,58,237,0.06))]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_40%,transparent_100%)]" />
      <div className="absolute top-1/4 -left-20 h-[500px] w-[500px] rounded-full bg-cyan-500/8 blur-[120px] animate-blob" />
      <div className="absolute bottom-1/4 -right-20 h-[400px] w-[400px] rounded-full bg-violet-500/8 blur-[100px] animate-blob-delay" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-6 py-12">
        <div className="grid w-full gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          {/* Left: Branding */}
          <section className="hidden space-y-8 lg:block">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition-colors hover:text-white"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Volver al inicio
            </Link>

            <div className="flex items-center gap-3">
              <CloudAlertLogo className="h-10 w-10" />
              <div>
                <div className="text-sm font-black tracking-tight text-white">
                  Cloud Alert
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                  Hub
                </div>
              </div>
            </div>

            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
                Plataforma de Observabilidad
              </div>
              <h1 className="mt-5 max-w-2xl text-4xl font-black tracking-tight text-white md:text-5xl">
                Monitoreo, incidentes y estado cloud{" "}
                <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
                  en una sola plataforma
                </span>
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-slate-400 md:text-lg">
                Accede a tu espacio operativo para centralizar uptime, estado de
                proveedores SaaS, incidentes cloud y señales en tiempo real.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                "Centro de Monitoreo con estado operativo",
                "Realtime con SignalR y fallback por polling",
                "Centro de Estado Cloud con providers múltiples",
                "Timeline de incidentes con traducción inline",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-300 backdrop-blur-sm transition-all hover:border-slate-700 hover:bg-slate-900/70"
                >
                  <div className="mt-0.5 inline-flex rounded-md bg-cyan-500/10 p-1">
                    <IconCheck className="h-3.5 w-3.5 text-cyan-400" />
                  </div>
                  {item}
                </div>
              ))}
            </div>
          </section>

          {/* Right: Form */}
          <section className="w-full">
            <Outlet />
          </section>
        </div>
      </div>
    </main>
  );
}
