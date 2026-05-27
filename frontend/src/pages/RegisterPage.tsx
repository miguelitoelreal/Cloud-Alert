import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthCard } from "../components/AuthCard";
import { useAuth } from "../hooks/useAuth";

const MIN_PASSWORD_LENGTH = 8;

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    document.title = "Cloud Alert Hub — Crear cuenta";
  }, []);

  const redirectPath =
    (location.state as { from?: { pathname?: string } } | null)?.from
      ?.pathname ?? "/dashboard";

  const errors = useMemo(() => {
    const nextErrors: Record<string, string | null> = {
      name: null,
      email: null,
      password: null,
      confirmPassword: null,
    };

    if (!name.trim()) {
      nextErrors.name = "El nombre es obligatorio.";
    }

    if (!email.trim()) {
      nextErrors.email = "El correo es obligatorio.";
    } else if (!isValidEmail(email)) {
      nextErrors.email = "Ingresa un correo válido.";
    }

    if (!password.trim()) {
      nextErrors.password = "La contraseña es obligatoria.";
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      nextErrors.password = `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
    }

    if (!confirmPassword.trim()) {
      nextErrors.confirmPassword = "Debes confirmar la contraseña.";
    } else if (confirmPassword !== password) {
      nextErrors.confirmPassword = "Las contraseñas no coinciden.";
    }

    return nextErrors;
  }, [confirmPassword, email, name, password]);

  const canSubmit =
    !errors.name &&
    !errors.email &&
    !errors.password &&
    !errors.confirmPassword;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({
      name: true,
      email: true,
      password: true,
      confirmPassword: true,
    });
    setError(null);

    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
      });
      navigate(redirectPath, { replace: true });
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "No se pudo crear la cuenta.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard
      eyebrow="Nuevo acceso"
      title="Crea tu cuenta"
      description="Registra un acceso local para entrar a la plataforma y continuar hacia el centro de monitoreo protegido."
      submitLabel="Crear cuenta"
      isSubmitting={isSubmitting}
      error={error}
      onSubmit={handleSubmit}
      footerText="¿Ya tienes una cuenta?"
      footerLinkLabel="Inicia sesión"
      footerLinkTo="/login"
      fields={[
        {
          id: "register-name",
          label: "Nombre",
          value: name,
          placeholder: "Tu nombre o el del equipo",
          autoComplete: "name",
          error: touched.name ? errors.name : null,
          onChange: setName,
          onBlur: () => setTouched((current) => ({ ...current, name: true })),
        },
        {
          id: "register-email",
          label: "Correo electrónico",
          type: "email",
          value: email,
          placeholder: "equipo@empresa.com",
          autoComplete: "email",
          error: touched.email ? errors.email : null,
          onChange: setEmail,
          onBlur: () => setTouched((current) => ({ ...current, email: true })),
        },
        {
          id: "register-password",
          label: "Contraseña",
          type: "password",
          value: password,
          placeholder: "••••••••",
          autoComplete: "new-password",
          error: touched.password ? errors.password : null,
          hint: `Mínimo ${MIN_PASSWORD_LENGTH} caracteres.`,
          onChange: setPassword,
          onBlur: () =>
            setTouched((current) => ({ ...current, password: true })),
        },
        {
          id: "register-confirm-password",
          label: "Confirmar contraseña",
          type: "password",
          value: confirmPassword,
          placeholder: "••••••••",
          autoComplete: "new-password",
          error: touched.confirmPassword ? errors.confirmPassword : null,
          onChange: setConfirmPassword,
          onBlur: () =>
            setTouched((current) => ({
              ...current,
              confirmPassword: true,
            })),
        },
      ]}
    />
  );
}
