import type { PropsWithChildren } from 'react';

interface SurfaceCardProps extends PropsWithChildren {
  className?: string;
}

export function SurfaceCard({
  children,
  className
}: SurfaceCardProps): JSX.Element {
  return <section className={`surface-card ${className ?? ''}`.trim()}>{children}</section>;
}
