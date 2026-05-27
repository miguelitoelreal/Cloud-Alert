type AppLoaderProps = {
  title?: string;
  message?: string;
};

export function AppLoader({
  title = "Preparando Cloud Alert Hub",
  message = "Cargando tu sesión y configurando la aplicación...",
}: AppLoaderProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-50">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-8 text-center shadow-2xl shadow-slate-950/40 backdrop-blur">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-blue-400" />
        <div className="mt-6 text-lg font-semibold">{title}</div>
        <div className="mt-2 text-sm text-slate-400">{message}</div>
      </div>
    </div>
  );
}
