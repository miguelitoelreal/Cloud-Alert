export function CloudAlertLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="cal-grad" x1="0" y1="0" x2="64" y2="64">
          <stop offset="0%" stopColor="#00d4ff" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id="cal-ring" x1="0" y1="0" x2="64" y2="64">
          <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.6" />
        </linearGradient>
        <filter id="cal-glow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle
        cx="32"
        cy="32"
        r="28"
        stroke="url(#cal-ring)"
        strokeWidth="1.5"
        fill="none"
        opacity="0.4"
        strokeDasharray="6 4"
      />
      <path
        d="M44 38c0 5-6 10-13 10s-16-5-16-10c0-3 2-6 6-7-.5-1.5-.5-3 0-5 2-4.5 7.5-6 12-3 .5-3 4-5.5 8.5-4.5 4.5 1 6.5 5.5 5.5 9 2.5 1.5 4 4.5 4 8z"
        fill="url(#cal-grad)"
        filter="url(#cal-glow)"
        opacity="0.95"
      />
      <circle
        cx="48"
        cy="18"
        r="4.5"
        fill="#f59e0b"
        filter="url(#cal-glow)"
      >
        <animate
          attributeName="opacity"
          values="1;0.3;1"
          dur="2s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="r"
          values="4.5;5.5;4.5"
          dur="2s"
          repeatCount="indefinite"
        />
      </circle>
    </svg>
  );
}

export function CloudAlertLogoText({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <CloudAlertLogo className="h-8 w-8" />
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-black tracking-tight text-slate-900 dark:text-white">
          Cloud Alert
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
          Hub
        </span>
      </div>
    </div>
  );
}
