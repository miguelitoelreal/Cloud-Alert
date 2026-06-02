import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthCard } from "../components/AuthCard";
import { useAuth } from "../hooks/useAuth";
import { authService } from "../services/auth";

const MIN_PASSWORD_LENGTH = 8;

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    document.title = "Cloud Alert Hub — Crear cuenta";
  }, []);

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
      const session = await authService.getSession();
      const isAdmin = session?.user?.roles?.includes("Admin") ?? false;
      const target = isAdmin ? "/admin" : "/centro-estado-cloud";
      navigate(target, { replace: true });
    } catch (submissionError) {
      const raw = submissionError instanceof Error ? submissionError.message : "";
      const msg = raw.toLowerCase();
      let friendly: string;
      if (msg.includes("already exists") || msg.includes("taken") || msg.includes("registered") || msg.includes("ya existe") || msg.includes("ya registrado") || msg.includes("duplicado") || msg.includes("duplicate")) {
        friendly = "Este correo ya está registrado. Inicia sesión en su lugar.";
      } else if (msg.includes("password") && (msg.includes("weak") || msg.includes("débil") || msg.includes("short") || msg.includes("corta"))) {
        friendly = "La contraseña es demasiado débil. Usa al menos 8 caracteres con letras y números.";
      } else if (msg.includes("lock") || msg.includes("bloque")) {
        friendly = "Tu cuenta ha sido bloqueada. Contacta al administrador.";
      } else if (msg.includes("network") || msg.includes("fetch") || msg.includes("internet") || msg.includes("conexión")) {
        friendly = "Problema de conexión. Verifica tu red e intenta de nuevo.";
      } else if (raw && raw !== "Unexpected API error") {
        friendly = raw;
      } else {
        friendly = "No se pudo crear la cuenta. Intenta de nuevo.";
      }
      setError(friendly);
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
          type: showPassword ? "text" : "password",
          value: password,
          placeholder: "••••••••",
          autoComplete: "new-password",
          error: touched.password ? errors.password : null,
          hint: `Mínimo ${MIN_PASSWORD_LENGTH} caracteres.`,
          onChange: setPassword,
          onBlur: () =>
            setTouched((current) => ({ ...current, password: true })),
          togglePassword: () => setShowPassword((v) => !v),
          passwordVisible: showPassword,
        },
        {
          id: "register-confirm-password",
          label: "Confirmar contraseña",
          type: showConfirmPassword ? "text" : "password",
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
          togglePassword: () => setShowConfirmPassword((v) => !v),
          passwordVisible: showConfirmPassword,
        },
      ]}
    />
  );
}
