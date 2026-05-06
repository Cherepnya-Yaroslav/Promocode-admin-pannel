import { SurfaceCard } from './SurfaceCard';
import { StatusBadge } from './StatusBadge';

interface MetricCardProps {
  label: string;
  value: string;
  delta?: string;
  tone?: 'positive' | 'warning' | 'critical' | 'neutral' | 'info';
}

export function MetricCard({
  label,
  value,
  delta,
  tone = 'neutral'
}: MetricCardProps): JSX.Element {
  return (
    <SurfaceCard className="metric-card">
      <div className="metric-card__header">
        <span>{label}</span>
        {delta ? <StatusBadge label={delta} tone={tone} /> : null}
      </div>
      <strong className="metric-card__value">{value}</strong>
    </SurfaceCard>
  );
}
