type ButtonVariant = 'primary' | 'secondary' | 'danger';

type ButtonProps = {
  children: React.ReactNode;
  type?: 'button' | 'submit';
  variant?: ButtonVariant;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
  onClick?: () => void;
};

function classesForVariant(variant: ButtonVariant): string {
  switch (variant) {
    case 'danger':
      return 'bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-900/40 disabled:text-rose-300/60';
    case 'secondary':
      return 'bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700 disabled:bg-slate-800/50 disabled:text-slate-500';
    case 'primary':
    default:
      return 'bg-blue-600 text-white hover:bg-blue-500 disabled:bg-blue-900/40 disabled:text-blue-300/60';
  }
}

export function Button({ children, type = 'button', variant = 'primary', disabled, isLoading, className, onClick }: ButtonProps) {
  const isDisabled = Boolean(disabled || isLoading);

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={[
        'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium',
        classesForVariant(variant),
        className ?? '',
      ].join(' ')}
    >
      {isLoading ? 'Procesando…' : children}
    </button>
  );
}
