import { useEffect, useState } from "react";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { useAuth } from "../auth/useAuth";
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getEmailConfig,
  updateEmailConfig,
} from "../services/admin";
import type { UserListItem, TenantEmailConfig } from "../types/admin";

export function AdminPage() {
  const { user } = useAuth();
  const currentUserId = user?.id;

  const [activeTab, setActiveTab] = useState<"users" | "email">("users");

  const [users, setUsers] = useState<UserListItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [isEditingUser, setIsEditingUser] = useState(false);

  const [emailConfig, setEmailConfig] = useState<TenantEmailConfig>({
    smtpHost: "",
    smtpPort: 587,
    smtpUsername: "",
    smtpPassword: "",
    senderEmail: "",
    senderName: "",
    useSsl: true,
    emailEnabled: true,
    emailProvider: "Smtp",
    brevoApiKey: "",
  });
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [backupEmailConfig, setBackupEmailConfig] = useState<TenantEmailConfig | null>(null);

  useEffect(() => {
    document.title = "Cloud Alert Hub — Administración";
    loadUsers();
    loadEmailConfig();
  }, []);

  async function loadUsers() {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : "No se pudieron cargar los usuarios.");
    } finally {
      setUsersLoading(false);
    }
  }

  async function loadEmailConfig() {
    setEmailLoading(true);
    setEmailError(null);
    try {
      const data = await getEmailConfig();
      const merged = {
        ...emailConfig,
        ...data,
        emailProvider: (data.emailProvider as "Smtp" | "Brevo") ?? "Smtp",
        brevoApiKey: data.brevoApiKey ?? "",
      };
      setEmailConfig(merged);
      setBackupEmailConfig(merged);
    } catch (err) {
      console.error("Failed to load email config:", err);
      setEmailError(err instanceof Error ? err.message : "No se pudo cargar la configuración.");
    } finally {
      setEmailLoading(false);
    }
  }

  function handleCancelEmailEdit() {
    if (backupEmailConfig) {
      setEmailConfig(backupEmailConfig);
    }
    setIsEditingEmail(false);
    setEmailError(null);
    setEmailSuccess(null);
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setIsCreatingUser(true);
    setUsersError(null);
    try {
      await createUser({
        name: newName.trim(),
        email: newEmail.trim(),
        password: newPassword,
        isAdmin: newIsAdmin,
      });
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      setNewIsAdmin(false);
      await loadUsers();
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : "No se pudo crear el usuario.");
    } finally {
      setIsCreatingUser(false);
    }
  }

  async function handleToggleAdmin(user: UserListItem) {
    try {
      await updateUser(user.id, { isAdmin: !user.isAdmin });
      await loadUsers();
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : "No se pudo actualizar el usuario.");
    }
  }

  function handleStartEdit(user: UserListItem) {
    setEditingUserId(user.id);
    setEditName(user.name);
    setEditEmail(user.email);
    setUsersError(null);
  }

  function handleCancelEdit() {
    setEditingUserId(null);
    setEditName("");
    setEditEmail("");
  }

  async function handleSaveEdit(e: React.FormEvent, id: string) {
    e.preventDefault();
    setIsEditingUser(true);
    setUsersError(null);
    try {
      await updateUser(id, { name: editName.trim(), email: editEmail.trim() });
      setEditingUserId(null);
      await loadUsers();
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : "No se pudo actualizar el usuario.");
    } finally {
      setIsEditingUser(false);
    }
  }

  async function handleDeleteUser(id: string) {
    if (!window.confirm("¿Eliminar este usuario?")) return;
    try {
      await deleteUser(id);
      await loadUsers();
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : "No se pudo eliminar el usuario.");
    }
  }

  async function handleSaveEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailSaving(true);
    setEmailError(null);
    setEmailSuccess(null);
    try {
      await updateEmailConfig(emailConfig);
      setEmailSuccess("Configuracion guardada correctamente.");
      setBackupEmailConfig(emailConfig);
      setIsEditingEmail(false);
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : "No se pudo guardar la configuracion.");
    } finally {
      setEmailSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-white">Administracion</h1>

      <div className="flex gap-2 border-b border-slate-700">
        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "users"
              ? "border-b-2 border-blue-500 text-blue-400"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Usuarios
        </button>
        <button
          onClick={() => setActiveTab("email")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "email"
              ? "border-b-2 border-blue-500 text-blue-400"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Configuracion de email
        </button>
      </div>

      {activeTab === "users" && (
        <Card title="Gestion de usuarios">
          <div className="space-y-4">
            {usersError && (
              <div className="rounded-lg border border-red-900/40 bg-red-950/40 px-4 py-3 text-sm font-medium text-red-300">
                {usersError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <label className="block text-xs font-medium text-slate-400">Nombre</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nombre completo"
                  className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 shadow-sm placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="min-w-0 flex-1">
                <label className="block text-xs font-medium text-slate-400">Correo</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="correo@empresa.com"
                  className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 shadow-sm placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="min-w-0 flex-1">
                <label className="block text-xs font-medium text-slate-400">Contrasena</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 shadow-sm placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                  minLength={8}
                />
              </div>
              <div className="flex items-center gap-2 pb-2">
                <input
                  id="new-is-admin"
                  type="checkbox"
                  checked={newIsAdmin}
                  onChange={(e) => setNewIsAdmin(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 text-blue-600"
                />
                <label htmlFor="new-is-admin" className="text-xs text-slate-400">
                  Admin
                </label>
              </div>
              <Button type="submit" isLoading={isCreatingUser}>
                Crear
              </Button>
            </form>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-500">
                    <th className="py-2 pr-4 font-medium">Nombre</th>
                    <th className="py-2 pr-4 font-medium">Correo</th>
                    <th className="py-2 pr-4 font-medium">Rol</th>
                    <th className="py-2 pr-4 font-medium">Creado</th>
                    <th className="py-2 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usersLoading ? (
                    <tr>
                      <td colSpan={5} className="py-3 text-xs text-slate-500">
                        Cargando usuarios…
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-3 text-xs text-slate-500">
                        No hay usuarios.
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => {
                      const isSelf = u.id === currentUserId;
                      return (
                        <tr key={u.id} className="border-b border-slate-800">
                          {editingUserId === u.id ? (
                            <>
                              <td className="py-2 pr-4" colSpan={2}>
                                <form
                                  onSubmit={(e) => handleSaveEdit(e, u.id)}
                                  className="flex flex-wrap items-center gap-2"
                                  id={`edit-form-${u.id}`}
                                >
                                  <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    placeholder="Nombre"
                                    className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    required
                                  />
                                  <input
                                    type="email"
                                    value={editEmail}
                                    onChange={(e) => setEditEmail(e.target.value)}
                                    placeholder="Correo"
                                    className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    required
                                  />
                                </form>
                              </td>
                              <td className="py-2 pr-4">
                                <span
                                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                                    u.isAdmin
                                      ? "bg-purple-500/10 text-purple-400"
                                      : "bg-slate-700 text-slate-400"
                                  }`}
                                >
                                  {u.isAdmin ? "Admin" : "Usuario"}
                                </span>
                              </td>
                              <td className="py-2 pr-4 text-slate-400">
                                {new Date(u.createdAt).toLocaleDateString("es-PE", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" })}
                              </td>
                              <td className="py-2">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="submit"
                                    form={`edit-form-${u.id}`}
                                    disabled={isEditingUser}
                                    className="text-xs text-emerald-400 hover:underline disabled:opacity-50"
                                  >
                                    {isEditingUser ? "Guardando..." : "Guardar"}
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    className="text-xs text-slate-500 hover:text-slate-300 hover:underline"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="py-2 pr-4 text-slate-200">{u.name}</td>
                              <td className="py-2 pr-4 text-slate-400">{u.email}</td>
                              <td className="py-2 pr-4">
                                <span
                                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                                    u.isAdmin
                                      ? "bg-purple-500/10 text-purple-400"
                                      : "bg-slate-700 text-slate-400"
                                  }`}
                                >
                                  {u.isAdmin ? "Admin" : "Usuario"}
                                </span>
                              </td>
                              <td className="py-2 pr-4 text-slate-400">
                                {new Date(u.createdAt).toLocaleDateString("es-PE", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" })}
                              </td>
                              <td className="py-2">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleStartEdit(u)}
                                    className="text-xs text-blue-400 hover:underline"
                                  >
                                    Editar
                                  </button>
                                  {!u.isAdmin && (
                                    <button
                                      onClick={() => handleToggleAdmin(u)}
                                      className="text-xs text-blue-400 hover:underline"
                                    >
                                      Hacer admin
                                    </button>
                                  )}
                                  {u.isAdmin && !isSelf && (
                                    <button
                                      onClick={() => handleToggleAdmin(u)}
                                      className="text-xs text-amber-400 hover:underline"
                                    >
                                      Quitar admin
                                    </button>
                                  )}
                                  {!u.isAdmin && (
                                    <button
                                      onClick={() => handleDeleteUser(u.id)}
                                      className="text-xs text-red-400 hover:underline"
                                    >
                                      Eliminar
                                    </button>
                                  )}
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {activeTab === "email" && (
        <Card title="Configuracion de correo">
          {emailLoading ? (
            <div className="text-xs text-slate-400">Cargando configuracion…</div>
          ) : (
            <div className="space-y-6">
              {emailError && (
                <div className="rounded-lg border border-red-900/40 bg-red-950/40 px-4 py-3 text-sm font-medium text-red-300">
                  {emailError}
                </div>
              )}
              {emailSuccess && (
                <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/40 px-4 py-3 text-sm font-medium text-emerald-300">
                  {emailSuccess}
                </div>
              )}

              {/* Status card */}
              <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${emailConfig.emailEnabled ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-700 text-slate-400"}`}>
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-100">Envio de emails</p>
                      <p className="text-xs text-slate-400">
                        {emailConfig.emailEnabled
                          ? emailConfig.emailProvider === "Brevo"
                            ? "Proveedor: Brevo (API)"
                            : emailConfig.smtpHost
                              ? `Servidor SMTP: ${emailConfig.smtpHost}:${emailConfig.smtpPort}`
                              : "Activado pero sin servidor configurado"
                          : "Desactivado. Las alertas no se enviaran por correo."}
                      </p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${emailConfig.emailEnabled ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-700 text-slate-400"}`}>
                    {emailConfig.emailEnabled ? "Activo" : "Inactivo"}
                  </span>
                </div>
              </div>

              {!isEditingEmail ? (
                /* Read-only summary */
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-700/60 bg-slate-900/30 p-4">
                    <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Configuracion actual</h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-slate-600">Proveedor</p>
                        <p className="text-sm font-medium text-slate-200">
                          {emailConfig.emailProvider === "Brevo" ? "Brevo (API)" : "Servidor SMTP"}
                        </p>
                      </div>
                      {emailConfig.emailProvider === "Smtp" ? (
                        <>
                          <div>
                            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-600">Servidor</p>
                            <p className="text-sm font-medium text-slate-200">{emailConfig.smtpHost || "—"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-600">Puerto</p>
                            <p className="text-sm font-medium text-slate-200">{emailConfig.smtpPort || "—"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-600">Usuario</p>
                            <p className="text-sm font-medium text-slate-200">{emailConfig.smtpUsername || "—"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-600">Contrasena</p>
                            <p className="text-sm font-medium text-slate-200">{emailConfig.smtpPassword ? "••••••••" : "—"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-600">SSL / TLS</p>
                            <p className="text-sm font-medium text-slate-200">{emailConfig.useSsl ? "Activado" : "Desactivado"}</p>
                          </div>
                        </>
                      ) : (
                        <div>
                          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-600">API Key</p>
                          <p className="text-sm font-medium text-slate-200">{emailConfig.brevoApiKey ? "••••••••" : "—"}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-slate-600">Email remitente</p>
                        <p className="text-sm font-medium text-slate-200">{emailConfig.senderEmail || "—"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-slate-600">Nombre remitente</p>
                        <p className="text-sm font-medium text-slate-200">{emailConfig.senderName || "—"}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setIsEditingEmail(true)}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-500"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      Editar configuracion
                    </button>
                  </div>
                </div>
              ) : (
                /* Edit mode */
                <form onSubmit={handleSaveEmail} className="space-y-6">
                  <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${emailConfig.emailEnabled ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-700 text-slate-400"}`}>
                          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-100">Envio de emails</p>
                          <p className="text-xs text-slate-400">
                            {emailConfig.emailEnabled ? "Activado" : "Desactivado. Las alertas no se enviaran por correo."}
                          </p>
                        </div>
                      </div>
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input
                          type="checkbox"
                          checked={emailConfig.emailEnabled}
                          onChange={(e) => setEmailConfig((c) => ({ ...c, emailEnabled: e.target.checked }))}
                          className="peer sr-only"
                        />
                        <div className="h-6 w-11 rounded-full bg-slate-700 peer-checked:bg-blue-600 peer-focus:ring-4 peer-focus:ring-blue-900/40 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-700 after:bg-slate-900/60 after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-blue-400" />
                      </label>
                    </div>
                  </div>

                  {emailConfig.emailEnabled ? (
                    <>
                      <div className="space-y-4">
                        <p className="text-sm font-semibold text-slate-300">Proveedor</p>
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => setEmailConfig((c) => ({ ...c, emailProvider: "Smtp" }))}
                            className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                              emailConfig.emailProvider === "Smtp"
                                ? "border-blue-500 bg-blue-900/20 text-blue-400"
                                : "border-slate-700 bg-slate-900/40 text-slate-400 hover:bg-slate-800"
                            }`}
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                              <rect x="2" y="3" width="20" height="14" rx="2" />
                              <line x1="2" y1="6" x2="22" y2="6" />
                              <path d="M2 6l10 7 10-7" />
                            </svg>
                            Servidor SMTP
                          </button>
                          <button
                            type="button"
                            onClick={() => setEmailConfig((c) => ({ ...c, emailProvider: "Brevo" }))}
                            className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                              emailConfig.emailProvider === "Brevo"
                                ? "border-blue-500 bg-blue-900/20 text-blue-400"
                                : "border-slate-700 bg-slate-900/40 text-slate-400 hover:bg-slate-800"
                            }`}
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                            </svg>
                            Brevo (API)
                          </button>
                        </div>
                      </div>

                      {emailConfig.emailProvider === "Smtp" ? (
                        <>
                          <div className="space-y-4">
                            <p className="text-sm font-semibold text-slate-300">Servidor de salida</p>
                            <div className="grid gap-4 sm:grid-cols-2">
                              <div>
                                <label className="mb-1 block text-xs font-medium text-slate-400">Servidor SMTP</label>
                                <input
                                  type="text"
                                  value={emailConfig.smtpHost}
                                  onChange={(e) => setEmailConfig((c) => ({ ...c, smtpHost: e.target.value }))}
                                  placeholder="smtp.gmail.com"
                                  required
                                  className="block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 shadow-sm placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-slate-400">Puerto</label>
                                <input
                                  type="number"
                                  value={emailConfig.smtpPort}
                                  onChange={(e) => setEmailConfig((c) => ({ ...c, smtpPort: Number(e.target.value) }))}
                                  required
                                  className="block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-slate-400">Usuario SMTP</label>
                                <input
                                  type="text"
                                  value={emailConfig.smtpUsername}
                                  onChange={(e) => setEmailConfig((c) => ({ ...c, smtpUsername: e.target.value }))}
                                  placeholder="correo@gmail.com"
                                  required
                                  className="block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 shadow-sm placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-slate-400">Contrasena SMTP</label>
                                <input
                                  type="password"
                                  value={emailConfig.smtpPassword}
                                  onChange={(e) => setEmailConfig((c) => ({ ...c, smtpPassword: e.target.value }))}
                                  placeholder="App password o contrasena"
                                  required
                                  className="block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 shadow-sm placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                            </div>
                          </div>
                          <label className="flex items-center gap-2 text-sm text-slate-300">
                            <input
                              type="checkbox"
                              checked={emailConfig.useSsl}
                              onChange={(e) => setEmailConfig((c) => ({ ...c, useSsl: e.target.checked }))}
                              className="h-4 w-4 rounded border-slate-700 text-blue-600"
                            />
                            Usar SSL / TLS
                          </label>
                        </>
                      ) : (
                        <div className="space-y-4">
                          <p className="text-sm font-semibold text-slate-300">Credenciales Brevo</p>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-400">API Key</label>
                            <input
                              type="password"
                              value={emailConfig.brevoApiKey}
                              onChange={(e) => setEmailConfig((c) => ({ ...c, brevoApiKey: e.target.value }))}
                              placeholder="xkeysib-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                              required
                              className="block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 shadow-sm placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <p className="mt-1 text-xs text-slate-500">
                              Consigue tu API key en{" "}
                              <a
                                href="https://app.brevo.com/settings/keys/smtp"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:underline"
                              >
                                app.brevo.com/settings/keys/smtp
                              </a>
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="space-y-4">
                        <p className="text-sm font-semibold text-slate-300">Remitente</p>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-400">Email remitente</label>
                            <input
                              type="email"
                              value={emailConfig.senderEmail}
                              onChange={(e) => setEmailConfig((c) => ({ ...c, senderEmail: e.target.value }))}
                              placeholder="noreply@empresa.com"
                              required
                              className="block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 shadow-sm placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-400">Nombre remitente</label>
                            <input
                              type="text"
                              value={emailConfig.senderName}
                              onChange={(e) => setEmailConfig((c) => ({ ...c, senderName: e.target.value }))}
                              placeholder="Cloud Alert Hub"
                              required
                              className="block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 shadow-sm placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-lg border border-slate-700/60 bg-slate-900/30 p-6 text-center">
                      <p className="text-sm text-slate-400">
                        Activa el envio de emails para configurar los parametros del proveedor.
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 border-t border-slate-700 pt-4">
                    <button
                      type="button"
                      onClick={handleCancelEmailEdit}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-transparent px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
                    >
                      Cancelar
                    </button>
                    <Button type="submit" isLoading={emailSaving}>
                      Guardar configuracion
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
