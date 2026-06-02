type ButtonVariant = 'primary' | 'secondary' | 'danger';

type ButtonProps = {
  children: React.ReactNode;
  type?: 'button' | 'submit';
  variant?: ButtonVariant;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
  onClick?: () => void;
  title?: string;
};

function classesForVariant(variant: ButtonVariant): string {
  switch (variant) {
    case 'danger':
      return 'bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-900/40 disabled:text-rose-300/60';
    case 'secondary':
      return 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 disabled:bg-slate-100/50 disabled:text-slate-400 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 dark:border-slate-700 dark:disabled:bg-slate-800/50 dark:disabled:text-slate-500';
    case 'primary':
    default:
      return 'bg-blue-600 text-white hover:bg-blue-500 disabled:bg-blue-900/40 disabled:text-blue-300/60';
  }
}

export function Button({ children, type = 'button', variant = 'primary', disabled, isLoading, className, onClick, title }: ButtonProps) {
  const isDisabled = Boolean(disabled || isLoading);

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      title={title}
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
