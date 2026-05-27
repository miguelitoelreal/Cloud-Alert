import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "../services/customer";
import { getCloudProviderOptions } from "../services/alerts";
import type { Customer, CreateCustomerPayload, UpdateCustomerPayload } from "../types/customer";
import type { CloudProviderOption } from "../types/alerts";

const CUSTOMER_TYPE_LABELS: Record<number, string> = {
  0: "Prueba",
  1: "Estándar",
  2: "Premium",
  3: "Estratégico",
};

const CUSTOMER_TYPE_COLORS: Record<number, string> = {
  0: "bg-gray-100 text-gray-700",
  1: "bg-blue-100 text-blue-700",
  2: "bg-violet-100 text-violet-700",
  3: "bg-amber-100 text-amber-700",
};

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [providers, setProviders] = useState<CloudProviderOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [customerType, setCustomerType] = useState<number>(1);
  const [industry, setIndustry] = useState("");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [selectedProviderIds, setSelectedProviderIds] = useState<Set<string>>(new Set());

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [customersData, providersData] = await Promise.all([
        getCustomers(),
        getCloudProviderOptions(),
      ]);
      setCustomers(customersData);
      setProviders(providersData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar datos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function resetForm() {
    setCompanyName("");
    setContactName("");
    setContactEmail("");
    setContactPhone("");
    setCustomerType(1);
    setIndustry("");
    setNotes("");
    setIsActive(true);
    setSelectedProviderIds(new Set());
    setEditingId(null);
    setIsCreating(false);
  }

  function startEdit(customer: Customer) {
    setCompanyName(customer.companyName);
    setContactName(customer.contactName);
    setContactEmail(customer.contactEmail);
    setContactPhone(customer.contactPhone ?? "");
    setCustomerType(customer.customerType);
    setIndustry(customer.industry ?? "");
    setNotes(customer.notes ?? "");
    setIsActive(customer.isActive);
    setSelectedProviderIds(new Set(customer.cloudProviders.map((p) => p.id)));
    setEditingId(customer.id);
    setIsCreating(true);
  }

  function toggleProvider(providerId: string) {
    setSelectedProviderIds((prev) => {
      const next = new Set(prev);
      if (next.has(providerId)) {
        next.delete(providerId);
      } else {
        next.add(providerId);
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName.trim()) return;

    setSaving(true);
    try {
      const payload = {
        companyName: companyName.trim(),
        contactName: contactName.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim() || undefined,
        customerType: customerType as 0 | 1 | 2 | 3,
        industry: industry.trim() || undefined,
        notes: notes.trim() || undefined,
        cloudProviderIds: Array.from(selectedProviderIds),
      };

      if (editingId) {
        const updatePayload: UpdateCustomerPayload = {
          ...payload,
          isActive,
        };
        await updateCustomer(editingId, updatePayload);
      } else {
        await createCustomer(payload as CreateCustomerPayload);
      }

      resetForm();
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("¿Eliminar este cliente? Esta acción no se puede deshacer.")) return;
    setDeletingId(id);
    try {
      await deleteCustomer(id);
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al eliminar.");
    } finally {
      setDeletingId(null);
    }
  }

  const activeCustomers = useMemo(
    () => customers.filter((c) => c.isActive).length,
    [customers],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Cartera de Clientes</h1>
          <p className="mt-1 text-sm text-slate-400">
            Registra a tus clientes y vincúlalos con los proveedores cloud que utilizan.
          </p>
        </div>
        <Button onClick={() => setIsCreating((v) => !v)} variant="secondary">
          {isCreating ? "Cancelar" : "+ Nuevo cliente"}
        </Button>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-800 bg-red-950/30 p-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <div className="text-xs font-medium uppercase tracking-wider text-slate-500">Total clientes</div>
          <div className="mt-1 text-2xl font-bold text-slate-100">{customers.length}</div>
        </Card>
        <Card>
          <div className="text-xs font-medium uppercase tracking-wider text-slate-500">Activos</div>
          <div className="mt-1 text-2xl font-bold text-emerald-400">{activeCustomers}</div>
        </Card>
        <Card>
          <div className="text-xs font-medium uppercase tracking-wider text-slate-500">Estratégicos</div>
          <div className="mt-1 text-2xl font-bold text-amber-400">
            {customers.filter((c) => c.customerType === 3).length}
          </div>
        </Card>
      </div>

      {isCreating ? (
        <Card>
          <h2 className="text-lg font-semibold text-slate-100">
            {editingId ? "Editar cliente" : "Nuevo cliente"}
          </h2>
          <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-400">Empresa *</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Nombre de la empresa"
                required
                className="mt-1 block w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400">Contacto *</label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Nombre del contacto principal"
                required
                className="mt-1 block w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400">Correo *</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="correo@empresa.com"
                required
                className="mt-1 block w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400">Teléfono</label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+51 999 999 999"
                className="mt-1 block w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400">Tipo de cliente *</label>
              <select
                value={customerType}
                onChange={(e) => setCustomerType(Number(e.target.value))}
                required
                className="mt-1 block w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value={0}>Prueba</option>
                <option value={1}>Estándar</option>
                <option value={2}>Premium</option>
                <option value={3}>Estratégico</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400">Industria</label>
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="Ej: Finanzas, Retail, Salud"
                className="mt-1 block w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-400">Notas</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Información adicional relevante..."
                rows={3}
                className="mt-1 block w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-400">Proveedores cloud que utiliza</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {providers.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleProvider(p.id)}
                    className={[
                      "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                      selectedProviderIds.has(p.id)
                        ? "bg-blue-600 text-white"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700",
                    ].join(" ")}
                  >
                    {selectedProviderIds.has(p.id) ? "✓ " : ""}
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
            {editingId ? (
              <div className="flex items-center gap-2 md:col-span-2">
                <input
                  id="is-active"
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="is-active" className="text-sm text-slate-300">
                  Cliente activo
                </label>
              </div>
            ) : null}
            <div className="flex gap-2 md:col-span-2">
              <Button type="submit" isLoading={saving}>
                {editingId ? "Guardar cambios" : "Crear cliente"}
              </Button>
              <Button type="button" variant="secondary" onClick={resetForm}>
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card>
        {loading ? (
          <div className="py-6 text-center text-sm text-slate-400">Cargando clientes…</div>
        ) : customers.length === 0 ? (
          <div className="py-6 text-center text-sm text-slate-400">
            No hay clientes registrados. Presiona "+ Nuevo cliente" para comenzar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500">
                  <th className="py-2 pr-4 font-medium">Empresa</th>
                  <th className="py-2 pr-4 font-medium">Contacto</th>
                  <th className="py-2 pr-4 font-medium">Tipo</th>
                  <th className="py-2 pr-4 font-medium">Proveedores</th>
                  <th className="py-2 pr-4 font-medium">Estado</th>
                  <th className="py-2 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="border-b border-slate-800/60">
                    <td className="py-3 pr-4">
                      <div className="font-medium text-slate-100">{c.companyName}</div>
                      {c.industry ? (
                        <div className="text-xs text-slate-500">{c.industry}</div>
                      ) : null}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="text-slate-200">{c.contactName}</div>
                      <div className="text-xs text-slate-500">{c.contactEmail}</div>
                      {c.contactPhone ? (
                        <div className="text-xs text-slate-500">{c.contactPhone}</div>
                      ) : null}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${CUSTOMER_TYPE_COLORS[c.customerType] ?? "bg-slate-100 text-slate-700"}`}
                      >
                        {CUSTOMER_TYPE_LABELS[c.customerType] ?? "Desconocido"}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-1">
                        {c.cloudProviders.length === 0 ? (
                          <span className="text-xs text-slate-600">—</span>
                        ) : (
                          c.cloudProviders.map((p) => (
                            <span
                              key={p.id}
                              className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300"
                            >
                              {p.name}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      {c.isActive ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEdit(c)}
                          className="text-xs text-blue-400 hover:text-blue-300 hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          disabled={deletingId === c.id}
                          className="text-xs text-rose-400 hover:text-rose-300 hover:underline disabled:opacity-50"
                        >
                          {deletingId === c.id ? "Eliminando…" : "Eliminar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
