type StateBannerProps = {
  tone: 'error' | 'info' | 'success';
  title: string;
  message?: string;
};

export function StateBanner({ tone, title, message }: StateBannerProps) {
  const classes =
    tone === 'error'
      ? 'border-red-900/40 bg-red-950/40 text-red-300'
      : tone === 'success'
        ? 'border-emerald-900/40 bg-emerald-950/40 text-emerald-300'
        : 'border-blue-900/40 bg-blue-950/40 text-blue-300';

  return (
    <div className={['rounded-lg border p-4 text-sm', classes].join(' ')}>
      <div className="font-semibold">{title}</div>
      {message ? <div className="mt-1 opacity-90">{message}</div> : null}
    </div>
  );
}
