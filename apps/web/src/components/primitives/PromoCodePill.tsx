import { StatusBadge } from './StatusBadge';

interface PromoCodePillProps {
  code: string;
  status: string;
}

export function PromoCodePill({
  code,
  status
}: PromoCodePillProps): JSX.Element {
  return (
    <div className="promo-pill">
      <span className="promo-pill__code">{code}</span>
      <StatusBadge
        label={status}
        tone={status === 'Active' ? 'positive' : status === 'Scheduled' ? 'info' : 'neutral'}
      />
    </div>
  );
}
