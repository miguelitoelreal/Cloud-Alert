import { useAuth } from "../hooks/useAuth";

export function WorkspacePage() {
  const { user } = useAuth();

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Workspace</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configuración básica del tenant asociado a tu sesión actual.
        </p>
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Nombre
            </dt>
            <dd className="mt-1 text-sm text-gray-900">{user?.tenantName}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Slug
            </dt>
            <dd className="mt-1 text-sm text-gray-900">{user?.tenantSlug}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Tenant ID
            </dt>
            <dd className="mt-1 break-all text-sm text-gray-900">{user?.tenantId}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
