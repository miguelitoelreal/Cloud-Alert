import { useMemo, useState } from "react";
import { Button } from "./Button";
import { FormField } from "./FormField";
import { StateBanner } from "./StateBanner";

export type MonitorFormValues = {
  name: string;
  url: string;
  intervalInSeconds: number;
};

type MonitorFormProps = {
  initialValues: MonitorFormValues;
  submitLabel: string;
  isSubmitting?: boolean;
  error?: string | null;
  onSubmit: (values: MonitorFormValues) => void | Promise<void>;
  onCancel: () => void;
};

function isValidUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;

  // Ya tiene protocolo
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const u = new URL(trimmed);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }

  // Sin protocolo: validar como dominio simple
  return /^[a-zA-Z0-9][a-zA-Z0-9\-]*(?:\.[a-zA-Z0-9][a-zA-Z0-9\-]*)+(?:\:\d+)?(?:\/\S*)?$/.test(trimmed);
}

function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

const COMMON_URLS = [
  "google.com",
  "youtube.com",
  "facebook.com",
  "twitter.com",
  "github.com",
  "linkedin.com",
  "amazon.com",
  "netflix.com",
  "reddit.com",
  "stackoverflow.com",
  "microsoft.com",
  "apple.com",
  "cloudflare.com",
  "aws.amazon.com",
  "azure.microsoft.com",
];

export function MonitorForm({
  initialValues,
  submitLabel,
  isSubmitting,
  error,
  onSubmit,
  onCancel,
}: MonitorFormProps) {
  const [name, setName] = useState(initialValues.name);
  const [url, setUrl] = useState(initialValues.url);
  const [intervalInSeconds, setIntervalInSeconds] = useState<number>(
    initialValues.intervalInSeconds,
  );
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const errors = useMemo(() => {
    const e: Record<string, string | null> = {
      name: null,
      url: null,
      intervalInSeconds: null,
    };

    if (!name.trim()) e.name = "El nombre es obligatorio.";
    if (!url.trim()) e.url = "La URL es obligatoria.";
    else if (!isValidUrl(url.trim()))
      e.url = "Escribe un dominio válido (ej: google.com) o una URL completa.";

    if (!Number.isFinite(intervalInSeconds))
      e.intervalInSeconds = "Intervalo inválido.";
    else if (intervalInSeconds < 10)
      e.intervalInSeconds = "El intervalo mínimo es 10 segundos.";

    return e;
  }, [name, url, intervalInSeconds]);

  const canSubmit = !errors.name && !errors.url && !errors.intervalInSeconds;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ name: true, url: true, intervalInSeconds: true });
    if (!canSubmit) return;

    await onSubmit({
      name: name.trim(),
      url: normalizeUrl(url),
      intervalInSeconds,
    });
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {error ? (
        <StateBanner tone="error" title="No se pudo guardar" message={error} />
      ) : null}

      <FormField
        label="Nombre"
        htmlFor="monitor-name"
        error={touched.name ? errors.name : null}
        hint="Nombre visible para el equipo."
      >
        <input
          id="monitor-name"
          className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, name: true }))}
          placeholder="Ej. API principal"
          autoComplete="off"
        />
      </FormField>

      <FormField
        label="URL"
        htmlFor="monitor-url"
        error={touched.url ? errors.url : null}
        hint="Puedes escribir directamente el dominio (ej: google.com) o la URL completa (https://...)"
      >
        <input
          id="monitor-url"
          list="url-suggestions"
          className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, url: true }))}
          placeholder="google.com o https://example.com"
          autoComplete="off"
        />
        <datalist id="url-suggestions">
          {COMMON_URLS.map((u) => (
            <option key={u} value={u} />
          ))}
        </datalist>
      </FormField>

      <FormField
        label="Intervalo (segundos)"
        htmlFor="monitor-interval"
        error={touched.intervalInSeconds ? errors.intervalInSeconds : null}
        hint="Frecuencia de verificación. Mínimo 10s."
      >
        <input
          id="monitor-interval"
          type="number"
          min={10}
          step={1}
          className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          value={intervalInSeconds}
          onChange={(e) => setIntervalInSeconds(Number(e.target.value))}
          onBlur={() => setTouched((t) => ({ ...t, intervalInSeconds: true }))}
        />
      </FormField>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" isLoading={isSubmitting} disabled={!canSubmit}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
