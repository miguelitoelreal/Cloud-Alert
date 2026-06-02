import { Link } from "react-router-dom";
import { Button } from "./Button";
import { FormField } from "./FormField";
import { StateBanner } from "./StateBanner";

type AuthField = {
  id: string;
  label: string;
  type?: string;
  value: string;
  placeholder?: string;
  autoComplete?: string;
  error?: string | null;
  hint?: string;
  onChange: (value: string) => void;
  onBlur: () => void;
};

type AuthCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  submitLabel: string;
  isSubmitting?: boolean;
  error?: string | null;
  fields: AuthField[];
  footerText: string;
  footerLinkLabel: string;
  footerLinkTo: string;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
};

export function AuthCard({
  eyebrow,
  title,
  description,
  submitLabel,
  isSubmitting,
  error,
  fields,
  footerText,
  footerLinkLabel,
  footerLinkTo,
  onSubmit,
}: AuthCardProps) {
  return (
    <div className="rounded-4xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl shadow-slate-950/40 backdrop-blur">
      <div className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-300">
        {eyebrow}
      </div>
      <h2 className="mt-3 text-3xl font-semibold text-white">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-300">{description}</p>

      <form className="mt-8 space-y-4" onSubmit={onSubmit}>
        {error ? (
          <StateBanner
            tone="error"
            title="No se pudo continuar"
            message={error}
          />
        ) : null}

        {fields.map((field) => (
          <FormField
            key={field.id}
            label={field.label}
            htmlFor={field.id}
            error={field.error}
            hint={field.hint}
            labelClassName="text-slate-100"
            hintClassName="text-slate-400"
            errorClassName="text-red-300"
          >
            <input
              id={field.id}
              type={field.type ?? "text"}
              value={field.value}
              placeholder={field.placeholder}
              autoComplete={field.autoComplete}
              onChange={(event) => field.onChange(event.target.value)}
              onBlur={field.onBlur}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </FormField>
        ))}

        <div className="pt-2">
          <Button type="submit" isLoading={isSubmitting}>
            {submitLabel}
          </Button>
        </div>
      </form>

      <div className="mt-6 text-sm text-slate-400">
        {footerText}{" "}
        <Link
          to={footerLinkTo}
          className="font-medium text-blue-300 hover:text-blue-200"
        >
          {footerLinkLabel}
        </Link>
      </div>
    </div>
  );
}
