type FormFieldProps = {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
  labelClassName?: string;
  hintClassName?: string;
  errorClassName?: string;
};

export function FormField({
  label,
  htmlFor,
  hint,
  error,
  children,
  labelClassName,
  hintClassName,
  errorClassName,
}: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className={[
          "block text-sm font-medium text-gray-900",
          labelClassName ?? "",
        ].join(" ")}
      >
        {label}
      </label>
      {children}
      {hint ? (
        <div
          className={["text-xs text-gray-500", hintClassName ?? ""].join(" ")}
        >
          {hint}
        </div>
      ) : null}
      {error ? (
        <div
          className={[
            "text-xs font-medium text-red-700",
            errorClassName ?? "",
          ].join(" ")}
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}
