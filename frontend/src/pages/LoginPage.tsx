import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { AuthCard } from "../components/AuthCard";
import { useAuth } from "../hooks/useAuth";
import { authService } from "../services/auth";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function LoginPage() {
  const location = useLocation();
  useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    document.title = "Cloud Alert Hub — Iniciar sesión";
  }, []);

  const fromPath =
    (location.state as { from?: { pathname?: string } } | null)?.from
      ?.pathname ?? null;

  const errors = useMemo(() => {
    const nextErrors: Record<string, string | null> = {
      email: null,
      password: null,
    };

    if (!email.trim()) {
      nextErrors.email = "El correo es obligatorio.";
    } else if (!isValidEmail(email)) {
      nextErrors.email = "Ingresa un correo válido.";
    }

    if (!password.trim()) {
      nextErrors.password = "La contraseña es obligatoria.";
    }

    return nextErrors;
  }, [email, password]);

  const canSubmit = !errors.email && !errors.password;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({ email: true, password: true });
    setError(null);

    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);
    try {
      const session = await authService.login({
        email: email.trim(),
        password,
      });
      const isAdmin = session.user.roles.includes("Admin");
      let target: string;
      if (fromPath) {
        target = fromPath;
      } else if (isAdmin) {
        target = "/admin";
      } else {
        target = "/centro-estado-cloud";
      }
      // Forzar recarga completa para limpiar cualquier estado de navegación
      window.location.href = target;
    } catch (submissionError) {
      const raw = submissionError instanceof Error ? submissionError.message : "";
      const msg = raw.toLowerCase();
      let friendly: string;
      if (msg.includes("invalid") || msg.includes("incorrect") || msg.includes("wrong") || msg.includes("credentials") || msg.includes("password") || msg.includes("email") || msg.includes("correo") || msg.includes("contraseña")) {
        friendly = "Correo o contraseña incorrectos. Verifica tus datos.";
      } else if (msg.includes("lock") || msg.includes("bloque") || msg.includes("suspend")) {
        friendly = "Tu cuenta ha sido bloqueada. Contacta al administrador.";
      } else if (msg.includes("not found") || msg.includes("no existe") || msg.includes("no encontrado")) {
        friendly = "No existe una cuenta con ese correo. Regístrate primero.";
      } else if (msg.includes("network") || msg.includes("fetch") || msg.includes("internet") || msg.includes("conexión")) {
        friendly = "Problema de conexión. Verifica tu red e intenta de nuevo.";
      } else if (raw && raw !== "Unexpected API error") {
        friendly = raw;
      } else {
        friendly = "No se pudo iniciar sesión. Intenta de nuevo.";
      }
      setError(friendly);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard
      eyebrow="Acceso"
      title="Inicia sesión"
      description="Entra a tu entorno interno para gestionar monitores, revisar estado cloud e investigar incidentes desde el centro operativo."
      submitLabel="Entrar"
      isSubmitting={isSubmitting}
      error={error}
      onSubmit={handleSubmit}
      footerText="¿Todavía no tienes cuenta?"
      footerLinkLabel="Regístrate"
      footerLinkTo="/register"
      fields={[
        {
          id: "login-email",
          label: "Correo electrónico",
          type: "email",
          value: email,
          placeholder: "equipo@empresa.com",
          autoComplete: "email",
          error: touched.email ? errors.email : null,
          hint: "Usa el correo con el que registrarás tu acceso local.",
          onChange: setEmail,
          onBlur: () => setTouched((current) => ({ ...current, email: true })),
        },
        {
          id: "login-password",
          label: "Contraseña",
          type: showPassword ? "text" : "password",
          value: password,
          placeholder: "••••••••",
          autoComplete: "current-password",
          error: touched.password ? errors.password : null,
          onChange: setPassword,
          onBlur: () =>
            setTouched((current) => ({ ...current, password: true })),
          togglePassword: () => setShowPassword((v) => !v),
          passwordVisible: showPassword,
        },
      ]}
    />
  );
}
