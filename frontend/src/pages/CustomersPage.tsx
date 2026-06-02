import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  importCustomers,
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
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Search & filter
  const [searchQuery, setSearchQuery] = useState("");
  const [providerFilter, setProviderFilter] = useState<string>("");

  // Import CSV
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<CreateCustomerPayload[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  function openDeleteConfirm(id: string) {
    setDeleteTarget(id);
    setDeleteConfirmOpen(true);
  }

  function closeDeleteConfirm() {
    setDeleteConfirmOpen(false);
    setDeleteTarget(null);
    setIsDeleting(false);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeletingId(deleteTarget);
    try {
      await deleteCustomer(deleteTarget);
      await loadData();
      closeDeleteConfirm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al eliminar.");
    } finally {
      setDeletingId(null);
      setIsDeleting(false);
    }
  }

  const activeCustomers = useMemo(
    () => customers.filter((c) => c.isActive).length,
    [customers],
  );

  const filteredCustomers = useMemo(() => {
    let result = customers;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.companyName.toLowerCase().includes(q) ||
          c.contactName.toLowerCase().includes(q) ||
          c.contactEmail.toLowerCase().includes(q) ||
          (c.contactPhone ?? "").toLowerCase().includes(q)
      );
    }
    if (providerFilter) {
      result = result.filter((c) =>
        c.cloudProviders.some((p) => p.id === providerFilter)
      );
    }
    return result;
  }, [customers, searchQuery, providerFilter]);

  function handleExportCSV() {
    if (filteredCustomers.length === 0) return;
    const headers = [
      "Empresa",
      "Contacto",
      "Correo",
      "Telefono",
      "Tipo",
      "Industria",
      "Estado",
      "Proveedores",
    ];
    const rows = filteredCustomers.map((c) => [
      c.companyName,
      c.contactName,
      c.contactEmail,
      c.contactPhone ?? "",
      CUSTOMER_TYPE_LABELS[c.customerType] ?? "",
      c.industry ?? "",
      c.isActive ? "Activo" : "Inactivo",
      c.cloudProviders.map((p) => p.name).join("; "),
    ]);
    const csvContent =
      [headers, ...rows]
        .map((row) =>
          row
            .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
            .join(",")
        )
        .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `clientes_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function parseCSV(text: string): { rows: CreateCustomerPayload[]; errors: string[] } {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length === 0) {
      return { rows: [], errors: ["El archivo está vacío."] };
    }
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const required = ["empresa", "contacto", "correo"];
    const missing = required.filter((r) => !headers.includes(r));
    if (missing.length > 0) {
      return { rows: [], errors: [`Columnas faltantes: ${missing.join(", ")}`] };
    }

    const rows: CreateCustomerPayload[] = [];
    const errors: string[] = [];
    const providerMap = new Map(providers.map((p) => [p.name.toLowerCase(), p.id]));

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",");
      if (cols.length < required.length) {
        errors.push(`Fila ${i + 1}: número de columnas insuficiente.`);
        continue;
      }
      const get = (name: string) => {
        const idx = headers.indexOf(name);
        return idx >= 0 ? cols[idx]?.trim() ?? "" : "";
      };

      const companyName = get("empresa");
      const contactName = get("contacto");
      const contactEmail = get("correo");
      const contactPhone = get("telefono");
      const industry = get("industria");
      const tipoStr = get("tipo").toLowerCase();
      const tipoMap: Record<string, number> = {
        prueba: 0,
        estándar: 1,
        estandar: 1,
        premium: 2,
        estratégico: 3,
        estrategico: 3,
      };
      const customerType = (tipoMap[tipoStr] ?? 1) as 0 | 1 | 2 | 3;

      const providersRaw = get("proveedores");
      const cloudProviderIds: string[] = [];
      if (providersRaw) {
        providersRaw.split(";").forEach((name) => {
          const key = name.trim().toLowerCase();
          if (providerMap.has(key)) {
            cloudProviderIds.push(providerMap.get(key)!);
          }
        });
      }

      if (!companyName) {
        errors.push(`Fila ${i + 1}: empresa es obligatoria.`);
        continue;
      }
      if (!contactName) {
        errors.push(`Fila ${i + 1}: contacto es obligatorio.`);
        continue;
      }
      if (!contactEmail || !contactEmail.includes("@")) {
        errors.push(`Fila ${i + 1}: correo inválido.`);
        continue;
      }

      rows.push({
        companyName,
        contactName,
        contactEmail,
        contactPhone: contactPhone || undefined,
        customerType,
        industry: industry || undefined,
        notes: undefined,
        cloudProviderIds,
      });
    }
    return { rows, errors };
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = String(ev.target?.result ?? "");
      const { rows, errors } = parseCSV(text);
      setImportPreview(rows);
      setImportErrors(errors);
      setImportModalOpen(true);
      setImportSuccess(null);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleImport() {
    if (importPreview.length === 0) return;
    setIsImporting(true);
    setError(null);
    try {
      const result = await importCustomers({ customers: importPreview });
      if (result.failedCount > 0 && result.importedCount === 0) {
        setError(`Importación fallida. Errores: ${result.errors.join("; ")}`);
      } else {
        setImportSuccess(
          `Importación completada correctamente. ${result.importedCount} registros importados.`
        );
        if (result.failedCount > 0) {
          setImportErrors(result.errors);
        }
        await loadData();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al importar.");
    } finally {
      setIsImporting(false);
    }
  }

  function closeImportModal() {
    setImportModalOpen(false);
    setImportPreview([]);
    setImportErrors([]);
    setImportSuccess(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Cartera de Clientes</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Registra a tus clientes y vincúlalos con los proveedores cloud que utilizan.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setIsCreating((v) => !v)} variant="secondary">
            {isCreating ? "Cancelar" : "+ Nuevo cliente"}
          </Button>
          <Button onClick={handleExportCSV} variant="secondary">
            <span className="flex items-center gap-1.5">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Exportar CSV
            </span>
          </Button>
          <Button onClick={() => fileInputRef.current?.click()} variant="secondary">
            <span className="flex items-center gap-1.5">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              Importar CSV
            </span>
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2">
        <input
          type="text"
          placeholder="Buscar empresa, contacto o correo..."
          className="w-full sm:w-auto rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-600"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select
          className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-xs text-slate-800 dark:text-slate-200"
          value={providerFilter}
          onChange={(e) => setProviderFilter(e.target.value)}
        >
          <option value="">Todos los proveedores</option>
          {providers.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            setSearchQuery("");
            setProviderFilter("");
          }}
          className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200"
        >
          Limpiar filtros
        </button>
        <span className="ml-auto text-xs text-slate-500">
          {filteredCustomers.length} resultados
        </span>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-800 bg-red-950/30 p-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <div className="text-xs font-medium uppercase tracking-wider text-slate-500">Total clientes</div>
          <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{customers.length}</div>
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
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {editingId ? "Editar cliente" : "Nuevo cliente"}
          </h2>
          <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Empresa *</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Nombre de la empresa"
                required
                className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Contacto *</label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Nombre del contacto principal"
                required
                className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Correo *</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="correo@empresa.com"
                required
                className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Teléfono</label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+51 999 999 999"
                className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Tipo de cliente *</label>
              <select
                value={customerType}
                onChange={(e) => setCustomerType(Number(e.target.value))}
                required
                className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value={0}>Prueba</option>
                <option value={1}>Estándar</option>
                <option value={2}>Premium</option>
                <option value={3}>Estratégico</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Industria</label>
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="Ej: Finanzas, Retail, Salud"
                className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Notas</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Información adicional relevante..."
                rows={3}
                className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Proveedores cloud que utiliza</label>
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
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-700",
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
                  className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="is-active" className="text-sm text-slate-700 dark:text-slate-300">
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
          <div className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">Cargando clientes…</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
            {customers.length === 0
              ? "No hay clientes registrados. Presiona \"+ Nuevo cliente\" para comenzar."
              : "No se encontraron resultados para los filtros actuales."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <th className="py-2 pr-4 font-medium">Empresa</th>
                  <th className="py-2 pr-4 font-medium">Contacto</th>
                  <th className="py-2 pr-4 font-medium">Tipo</th>
                  <th className="py-2 pr-4 font-medium">Proveedores</th>
                  <th className="py-2 pr-4 font-medium">Estado</th>
                  <th className="py-2 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((c) => (
                  <tr key={c.id} className="border-b border-slate-200 dark:border-slate-800/60">
                    <td className="py-3 pr-4">
                      <div className="font-medium text-slate-900 dark:text-slate-100">{c.companyName}</div>
                      {c.industry ? (
                        <div className="text-xs text-slate-500">{c.industry}</div>
                      ) : null}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="text-slate-800 dark:text-slate-200">{c.contactName}</div>
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
                              className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs text-slate-700 dark:text-slate-300"
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
                          onClick={() => openDeleteConfirm(c.id)}
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

      {importModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-white">Importar clientes desde CSV</h3>
            <p className="mt-1 text-sm text-slate-400">
              Columnas requeridas: <span className="font-mono text-slate-300">empresa, contacto, correo</span>. Opcionales: telefono, tipo, industria, proveedores.
            </p>

            {importSuccess ? (
              <div className="mt-4 rounded-lg border border-emerald-900/30 bg-emerald-900/20 p-3 text-sm text-emerald-300">
                {importSuccess}
              </div>
            ) : null}
            {importErrors.length > 0 && !importSuccess ? (
              <div className="mt-4 rounded-lg border border-amber-900/30 bg-amber-900/20 p-3 text-sm text-amber-300 max-h-32 overflow-y-auto">
                <div className="font-medium mb-1">Errores detectados:</div>
                <ul className="list-disc pl-4 space-y-0.5">
                  {importErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-4">
              <div className="text-sm font-medium text-slate-300 mb-2">
                Registros válidos a importar: <span className="text-white">{importPreview.length}</span>
              </div>
              {importPreview.length > 0 ? (
                <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-700">
                  <table className="min-w-full text-left text-xs">
                    <thead className="bg-slate-800 text-slate-400 sticky top-0">
                      <tr>
                        <th className="px-3 py-2">Empresa</th>
                        <th className="px-3 py-2">Contacto</th>
                        <th className="px-3 py-2">Correo</th>
                        <th className="px-3 py-2">Tipo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {importPreview.map((row, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 text-slate-300">{row.companyName}</td>
                          <td className="px-3 py-2 text-slate-300">{row.contactName}</td>
                          <td className="px-3 py-2 text-slate-300">{row.contactEmail}</td>
                          <td className="px-3 py-2 text-slate-300">{CUSTOMER_TYPE_LABELS[row.customerType] ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-700 p-4 text-center text-sm text-slate-500">
                  No hay registros válidos para importar.
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={closeImportModal}
                disabled={isImporting}
                className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-50"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => void handleImport()}
                disabled={isImporting || importPreview.length === 0}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {isImporting ? "Importando..." : `Importar ${importPreview.length} registros`}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl border border-red-900/30 bg-white dark:bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-950/60">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Eliminar cliente</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  ¿Seguro que deseas eliminar este cliente? Esta acción no se puede deshacer.
                </p>
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={closeDeleteConfirm}
                disabled={isDeleting}
                className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-700 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={isDeleting}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
              >
                {isDeleting ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
