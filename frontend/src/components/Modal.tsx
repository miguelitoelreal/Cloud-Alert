import { useEffect } from 'react';

type ModalProps = {
  open: boolean;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
  size?: "md" | "lg";
};

export function Modal({ open, title, children, footer, onClose, size = "md" }: ModalProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label="Cerrar"
        onClick={onClose}
      />

      <div className={`relative flex w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white max-h-[calc(100vh-2rem)] shadow-2xl shadow-slate-200/40 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/40 ${size === "lg" ? "max-w-4xl" : "max-w-xl"}`}>
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </header>

        <div className="overflow-auto px-5 py-4">{children}</div>

        {footer ? <footer className="flex items-center justify-end gap-3 border-t border-slate-200 px-5 py-4 dark:border-slate-700">{footer}</footer> : null}
      </div>
    </div>
  );
}
