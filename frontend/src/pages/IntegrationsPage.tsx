import { useEffect, useState } from 'react';
import {
  getMicrosoftIntegration,
  saveMicrosoftIntegration,
  deleteMicrosoftIntegration,
  testMicrosoftConnection,
  type SaveMicrosoftIntegrationRequest,
} from '../services/microsoftIntegration';

export function IntegrationsPage() {
  const [configured, setConfigured] = useState(false);
  const [microsoftTenantId, setMicrosoftTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const [form, setForm] = useState<SaveMicrosoftIntegrationRequest>({
    microsoftTenantId: '',
    clientId: '',
    clientSecret: '',
  });

  const loadIntegration = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMicrosoftIntegration();
      setConfigured(data.configured);
      setMicrosoftTenantId(data.microsoftTenantId ?? null);
      if (data.configured && data.microsoftTenantId) {
        setForm((prev) => ({ ...prev, microsoftTenantId: data.microsoftTenantId! }));
      } else {
        setForm({ microsoftTenantId: '', clientId: '', clientSecret: '' });
      }
    } catch (err: unknown) {
      const msg =
        (err instanceof Error ? err.message : null) ||
        'No se pudo cargar la configuracion.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadIntegration();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await saveMicrosoftIntegration(form);
      await loadIntegration();
      setIsEditing(false);
      setSuccess('Credenciales guardadas correctamente.');
    } catch (err: unknown) {
      const msg =
        (err instanceof Error ? err.message : null) ||
        'No se pudieron guardar las credenciales.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Seguro que deseas eliminar esta integracion?')) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await deleteMicrosoftIntegration();
      await loadIntegration();
      setIsEditing(false);
      setSuccess('Integracion eliminada.');
    } catch (err: unknown) {
      const msg =
        (err instanceof Error ? err.message : null) ||
        'No se pudo eliminar la integracion.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await testMicrosoftConnection();
      setSuccess(result.message);
    } catch (err: unknown) {
      const msg =
        (err instanceof Error ? err.message : null) ||
        'La prueba de conexion fallo.';
      setError(msg);
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-48 animate-pulse rounded-lg bg-slate-700" />
        <div className="h-4 w-64 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
        <div className="h-32 max-w-xl animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Integraciones</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Conecta tu tenant Microsoft 365 para consultar incidencias de servicio en tiempo real.</p>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-900/40 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-start gap-3 rounded-lg border border-emerald-900/40 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
          <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          {success}
        </div>
      )}

      {configured && !isEditing ? (
        <div className="max-w-2xl overflow-hidden rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/80 shadow-lg shadow-slate-950/20">
          <div className="flex items-center gap-3 border-b border-slate-300 dark:border-slate-700/60 bg-slate-100 dark:bg-slate-800/40 px-6 py-4">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" /></svg>
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Microsoft 365</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Service Health via Microsoft Graph</div>
            </div>
            <div className="ml-auto">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 ring-1 ring-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Conectado
              </span>
            </div>
          </div>
          <div className="px-6 py-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Tenant ID</div>
                <div className="mt-1 break-all text-sm text-slate-800 dark:text-slate-200 font-mono">{microsoftTenantId}</div>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={testing}
                onClick={handleTest}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 px-3 py-2 text-sm font-medium text-slate-800 dark:text-slate-200 transition-colors hover:bg-slate-700 hover:text-white disabled:opacity-50"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                {testing ? 'Probando...' : 'Probar conexion'}
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-sm font-medium text-blue-400 transition-colors hover:bg-blue-500/20"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Editar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleDelete}
                className="inline-flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-400 transition-colors hover:bg-rose-500/20 disabled:opacity-50"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                Desconectar
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-2xl overflow-hidden rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/80 shadow-lg shadow-slate-950/20">
          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            className="flex w-full items-center gap-3 border-b border-slate-300 dark:border-slate-700/60 bg-slate-100 dark:bg-slate-800/40 px-6 py-4 text-left transition-colors hover:bg-slate-100 dark:bg-slate-800/60"
          >
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" /></svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Configurar Microsoft 365</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Ingresa las credenciales de tu aplicacion registrada en Azure AD</div>
            </div>
            <svg
              className={`h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}
          >
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
            <div>
              <label htmlFor="microsoftTenantId" className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-200">
                <svg className="h-4 w-4 text-slate-500 dark:text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                Microsoft Tenant ID
              </label>
              <p className="mt-1 text-xs text-slate-500">El dominio o GUID de tu tenant de Azure AD (ej. contoso.onmicrosoft.com)</p>
              <input
                id="microsoftTenantId"
                name="microsoftTenantId"
                type="text"
                required
                value={form.microsoftTenantId}
                onChange={handleChange}
                className="mt-2 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-600 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                placeholder="contoso.onmicrosoft.com o 550e8400-e29b-41d4-a716-446655440000"
              />
            </div>

            <div>
              <label htmlFor="clientId" className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-200">
                <svg className="h-4 w-4 text-slate-500 dark:text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Client ID
              </label>
              <p className="mt-1 text-xs text-slate-500">Application (client) ID de tu App Registration en Azure AD</p>
              <input
                id="clientId"
                name="clientId"
                type="text"
                required
                value={form.clientId}
                onChange={handleChange}
                className="mt-2 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-600 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                placeholder="550e8400-e29b-41d4-a716-446655440000"
              />
            </div>

            <div>
              <label htmlFor="clientSecret" className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-200">
                <svg className="h-4 w-4 text-slate-500 dark:text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Client Secret
              </label>
              <p className="mt-1 text-xs text-slate-500">El secreto generado en Certificates & secrets de tu App Registration</p>
              <div className="relative mt-2">
                <input
                  id="clientSecret"
                  name="clientSecret"
                  type={showSecret ? 'text' : 'password'}
                  required
                  value={form.clientSecret}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 py-2.5 pl-3 pr-10 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-600 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                  placeholder="Valor del secreto"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200"
                  tabIndex={-1}
                >
                  {showSecret ? (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-3.72 3.72L1 1"/></svg>
                  ) : (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                {saving ? 'Guardando...' : configured ? 'Actualizar credenciales' : 'Guardar credenciales'}
              </button>

              {configured && (
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 px-5 py-2.5 text-sm font-medium text-slate-800 dark:text-slate-200 transition-colors hover:bg-slate-700 hover:text-white"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
          </div>
        </div>
      )}
    </div>
  );
}
