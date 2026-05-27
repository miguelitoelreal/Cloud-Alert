type CloudProviderAvatarProps = {
  name: string;
  logoUrl: string;
  sizeClassName?: string;
};

function providerInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function CloudProviderAvatar({
  name,
  logoUrl,
  sizeClassName = 'h-10 w-10',
}: CloudProviderAvatarProps) {
  return (
    <div className={['relative shrink-0 overflow-hidden rounded-full border border-slate-700 bg-slate-900', sizeClassName].join(' ')}>
      <img
        src={logoUrl}
        alt={name}
        className="h-full w-full object-contain bg-slate-900 p-1"
        onError={(event) => {
          event.currentTarget.style.display = 'none';
          const fallback = event.currentTarget.nextElementSibling as HTMLElement | null;
          if (fallback) fallback.style.display = 'flex';
        }}
      />
      <div className="hidden h-full w-full items-center justify-center bg-slate-900 text-xs font-semibold text-white">
        {providerInitials(name)}
      </div>
    </div>
  );
}
