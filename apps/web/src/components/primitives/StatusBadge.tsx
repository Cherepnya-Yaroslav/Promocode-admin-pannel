type StatusTone = 'positive' | 'warning' | 'critical' | 'neutral' | 'info';

interface StatusBadgeProps {
  label: string;
  tone?: StatusTone;
}

export function StatusBadge({
  label,
  tone = 'neutral'
}: StatusBadgeProps): JSX.Element {
  return <span className={`status-badge status-badge--${tone}`}>{label}</span>;
}
