interface ErrorStateProps {
  title: string;
  description: string;
  onRetry?: () => void;
}

export function ErrorState({
  title,
  description,
  onRetry
}: ErrorStateProps): JSX.Element {
  return (
    <div className="error-state">
      <strong>{title}</strong>
      <p>{description}</p>
      {onRetry ? (
        <button className="button button--ghost" onClick={onRetry} type="button">
          Retry
        </button>
      ) : null}
    </div>
  );
}
