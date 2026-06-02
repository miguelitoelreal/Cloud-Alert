import { Link, Outlet } from "react-router-dom";

export function AuthLayout() {
  return (
    <main className="relative overflow-hidden bg-slate-950 px-6 py-12 text-slate-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.16),transparent_24%)]" />
      <div className="relative mx-auto grid min-h-[calc(100vh-6rem)] max-w-7xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white"
          >
            ← Volver al inicio
          </Link>

          <div>
            <div className="inline-flex rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-blue-200">
              Cloud Alert Hub
            </div>
            <h1 className="mt-5 max-w-2xl text-4xl font-semibold tracking-tight text-white md:text-5xl">
              Monitoreo, incidentes y estado cloud en una sola plataforma.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-300 md:text-lg">
              Accede a tu espacio operativo para centralizar uptime, estado de
              proveedores SaaS, incidentes cloud, timeline histórico y señales
              en tiempo real.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              "Centro de Monitoreo con estado operativo",
              "Realtime con SignalR y fallback por polling",
              "Centro de Estado Cloud con providers múltiples",
              "Timeline de incidentes con traducción inline",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-200 shadow-lg shadow-slate-950/30"
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="w-full">
          <Outlet />
        </section>
      </div>
    </main>
  );
}
