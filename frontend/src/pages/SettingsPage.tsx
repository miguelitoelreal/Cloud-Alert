import { useState } from "react";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { FormField } from "../components/FormField";
import { useAuth } from "../auth/useAuth";
import { authService } from "../services/auth";

export function SettingsPage() {
  const { user } = useAuth();

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [showEmailForm, setShowEmailForm] = useState(false);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);
    setIsSavingProfile(true);

    try {
      await authService.updateProfile({ name, email });
      setProfileSuccess("Perfil actualizado correctamente.");
    } catch (err) {
      setProfileError(
        err instanceof Error ? err.message : "No se pudo actualizar el perfil.",
      );
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleSaveEmail() {
    setEmailError(null);
    setEmailSuccess(null);
    try {
      await authService.updateProfile({ name, email });
      setEmailSuccess("Correo actualizado correctamente.");
      setShowEmailForm(false);
    } catch (err) {
      setEmailError(
        err instanceof Error ? err.message : "No se pudo actualizar el correo.",
      );
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword !== confirmPassword) {
      setPasswordError("Las contraseñas nuevas no coinciden.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setIsChangingPassword(true);
    try {
      await authService.changePassword({
        currentPassword,
        newPassword,
      });
      setPasswordSuccess("Contraseña cambiada correctamente.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(
        err instanceof Error
          ? err.message
          : "No se pudo cambiar la contraseña.",
      );
    } finally {
      setIsChangingPassword(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-white">Configuración</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Right column — Profile & Security (takes 1/3 on large screens) */}
        <div className="space-y-6">
          <Card title="Perfil y cuenta">
            <div className="space-y-4">
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <FormField label="Nombre completo" htmlFor="settings-name">
                  <input
                    id="settings-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    minLength={2}
                    maxLength={120}
                    className="block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </FormField>

                <FormField label="Empresa / Tenant" htmlFor="settings-tenant">
                  <input
                    id="settings-tenant"
                    type="text"
                    value={user?.tenantName ?? ""}
                    disabled
                    className="block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/40 px-3 py-2 text-sm text-slate-500 dark:text-slate-400 shadow-sm"
                  />
                </FormField>

                {profileError ? (
                  <div className="rounded-md border border-red-900/40 bg-red-950/40 px-3 py-2 text-xs font-medium text-red-300">
                    {profileError}
                  </div>
                ) : null}
                {profileSuccess ? (
                  <div className="rounded-md border border-emerald-900/40 bg-emerald-950/40 px-3 py-2 text-xs font-medium text-emerald-300">
                    {profileSuccess}
                  </div>
                ) : null}

                <div className="flex justify-end">
                  <Button type="submit" isLoading={isSavingProfile}>
                    Guardar cambios
                  </Button>
                </div>
              </form>

              {!showEmailForm ? (
                <div className="flex items-center justify-between rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/40 px-3 py-2">
                  <div>
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Correo electrónico</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setShowEmailForm(true); setEmailError(null); setEmailSuccess(null); }}
                    className="text-xs font-medium text-blue-400 hover:text-blue-300"
                  >
                    Editar
                  </button>
                </div>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); handleSaveEmail(); }} className="space-y-2">
                  <FormField label="Correo electrónico" htmlFor="settings-email">
                    <input
                      id="settings-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      maxLength={256}
                      className="block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </FormField>
                  {emailError ? (
                    <div className="rounded-md border border-red-900/40 bg-red-950/40 px-3 py-2 text-xs font-medium text-red-300">
                      {emailError}
                    </div>
                  ) : null}
                  {emailSuccess ? (
                    <div className="rounded-md border border-emerald-900/40 bg-emerald-950/40 px-3 py-2 text-xs font-medium text-emerald-300">
                      {emailSuccess}
                    </div>
                  ) : null}
                  <div className="flex gap-2">
                    <Button type="button" variant="secondary" onClick={() => setShowEmailForm(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit">
                      Guardar correo
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </Card>

          <Card title="Seguridad">
            <div className="space-y-3">
              {!showPasswordForm ? (
                <div className="flex items-center justify-between rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/40 px-3 py-2">
                  <div>
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Contraseña</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">••••••••</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setShowPasswordForm(true); setPasswordError(null); setPasswordSuccess(null); }}
                    className="text-xs font-medium text-blue-400 hover:text-blue-300"
                  >
                    Cambiar
                  </button>
                </div>
              ) : (
                <form onSubmit={handleChangePassword} className="space-y-3">
                  <FormField label="Contraseña actual" htmlFor="settings-current-password">
                    <input
                      id="settings-current-password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      className="block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </FormField>

                  <FormField label="Nueva contraseña" htmlFor="settings-new-password">
                    <input
                      id="settings-new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                      className="block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </FormField>

                  <FormField label="Confirmar nueva contraseña" htmlFor="settings-confirm-password">
                    <input
                      id="settings-confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                      className="block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </FormField>

                  {passwordError ? (
                    <div className="rounded-md border border-red-900/40 bg-red-950/40 px-3 py-2 text-xs font-medium text-red-300">
                      {passwordError}
                    </div>
                  ) : null}
                  {passwordSuccess ? (
                    <div className="rounded-md border border-emerald-900/40 bg-emerald-950/40 px-3 py-2 text-xs font-medium text-emerald-300">
                      {passwordSuccess}
                    </div>
                  ) : null}

                  <div className="flex gap-2">
                    <Button type="button" variant="secondary" onClick={() => setShowPasswordForm(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" isLoading={isChangingPassword}>
                      Cambiar contraseña
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
