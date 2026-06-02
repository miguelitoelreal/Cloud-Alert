import { Card } from './Card';

type Tone = 'neutral' | 'success' | 'danger' | 'warning';

function toneDotClass(tone: Tone): string {
  switch (tone) {
    case 'success':
      return 'bg-green-500';
    case 'danger':
      return 'bg-red-500';
    case 'warning':
      return 'bg-amber-500';
    case 'neutral':
    default:
      return 'bg-slate-500';
  }
}

type StatCardProps = {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  tone?: Tone;
};

export function StatCard({ title, value, subtitle, tone = 'neutral' }: StatCardProps) {
  return (
    <Card
      title={title}
      right={<span className={['h-2 w-2 rounded-full', toneDotClass(tone)].join(' ')} />}
      className="h-full"
    >
      <div className="text-3xl font-semibold tracking-tight text-white">{value}</div>
      {subtitle ? <div className="mt-1 text-xs text-slate-400">{subtitle}</div> : null}
    </Card>
  );
}
