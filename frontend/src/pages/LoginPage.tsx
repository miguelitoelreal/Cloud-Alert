import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthCard } from "../components/AuthCard";
import { useAuth } from "../hooks/useAuth";
import { authService } from "../services/auth";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    document.title = "Cloud Alert Hub — Iniciar sesión";
  }, []);

  const fromPath =
    (location.state as { from?: { pathname?: string } } | null)?.from
      ?.pathname ?? "/dashboard";

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
      const target = isAdmin && fromPath === "/dashboard" ? "/admin" : fromPath;
      navigate(target, { replace: true });
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "No se pudo iniciar sesión.",
      );
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
          type: "password",
          value: password,
          placeholder: "••••••••",
          autoComplete: "current-password",
          error: touched.password ? errors.password : null,
          onChange: setPassword,
          onBlur: () =>
            setTouched((current) => ({ ...current, password: true })),
        },
      ]}
    />
  );
}
