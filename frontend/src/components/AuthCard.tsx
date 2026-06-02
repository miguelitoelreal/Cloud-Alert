import { Link } from "react-router-dom";
import { CloudAlertLogo } from "./CloudAlertLogo";
import { FormField } from "./FormField";

function IconMail(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}
function IconLock(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
function IconUser(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function IconShieldCheck(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 12 15 16 10" />
    </svg>
  );
}
function IconArrowRight(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}
function IconEye(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function IconEyeOff(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function getFieldIcon(type: string) {
  switch (type) {
    case "email": return IconMail;
    case "password": return IconLock;
    case "name": return IconUser;
    default: return IconShieldCheck;
  }
}

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
  togglePassword?: () => void;
  passwordVisible?: boolean;
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
    <div className="mx-auto w-full max-w-md">
      {/* Mobile logo */}
      <div className="mb-8 flex items-center gap-3 lg:hidden">
        <CloudAlertLogo className="h-8 w-8" />
        <div>
          <div className="text-sm font-black tracking-tight text-white">Cloud Alert</div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">Hub</div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-2xl shadow-black/40 backdrop-blur-xl">
        {/* Top glow line */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />

        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
          {eyebrow}
        </div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          {error ? (
            <div className="rounded-xl border border-red-500/20 bg-red-950/30 p-3 text-sm text-red-300 backdrop-blur-sm">
              {error}
            </div>
          ) : null}

          {fields.map((field) => {
            const FieldIcon = getFieldIcon(field.id.includes("email") ? "email" : field.id.includes("password") ? "password" : field.id.includes("name") ? "name" : "");
            return (
              <FormField
                key={field.id}
                label={field.label}
                htmlFor={field.id}
                error={field.error}
                hint={field.hint}
                labelClassName="text-slate-200 text-xs font-semibold uppercase tracking-wider"
                hintClassName="text-slate-500 text-xs"
                errorClassName="text-red-400 text-xs"
              >
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                    <FieldIcon className="h-4 w-4" />
                  </div>
                  <input
                    id={field.id}
                    type={field.type ?? "text"}
                    value={field.value}
                    placeholder={field.placeholder}
                    autoComplete={field.autoComplete}
                    onChange={(event) => field.onChange(event.target.value)}
                    onBlur={field.onBlur}
                    className={`w-full rounded-xl border border-slate-700/60 bg-slate-950/50 py-3 pl-10 text-sm text-slate-100 placeholder:text-slate-600 transition-all focus:border-cyan-500/50 focus:bg-slate-950/70 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 ${field.togglePassword ? "pr-10" : "pr-4"}`}
                  />
                  {field.togglePassword ? (
                    <button
                      type="button"
                      onClick={field.togglePassword}
                      tabIndex={-1}
                      className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500 transition-colors hover:text-slate-300"
                      aria-label={field.passwordVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {field.passwordVisible ? (
                        <IconEyeOff className="h-4 w-4" />
                      ) : (
                        <IconEye className="h-4 w-4" />
                      )}
                    </button>
                  ) : null}
                </div>
              </FormField>
            );
          })}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-900/30 transition-all hover:-translate-y-0.5 hover:shadow-cyan-900/50 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {isSubmitting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeDasharray="60" strokeDashoffset="20" strokeLinecap="round" />
                    </svg>
                    Procesando...
                  </>
                ) : (
                  <>
                    {submitLabel}
                    <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </span>
            </button>
          </div>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          {footerText}{" "}
          <Link
            to={footerLinkTo}
            className="font-semibold text-cyan-400 transition-colors hover:text-cyan-300"
          >
            {footerLinkLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
