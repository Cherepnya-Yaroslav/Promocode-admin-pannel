import {
  createContext,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren
} from 'react';

type ToastTone = 'success' | 'error' | 'info';

interface ToastRecord {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface ToastContextValue {
  pushToast: (toast: Omit<ToastRecord, 'id'>) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({
  children
}: PropsWithChildren): JSX.Element {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  const value = useMemo<ToastContextValue>(
    () => ({
      pushToast: (toast) => {
        const id = crypto.randomUUID();
        setToasts((current) => [...current, { ...toast, id }]);
        window.setTimeout(() => {
          setToasts((current) => current.filter((item) => item.id !== id));
        }, 4000);
      }
    }),
    []
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <article
            key={toast.id}
            className={`toast toast--${toast.tone}`}
          >
            <strong>{toast.title}</strong>
            {toast.description ? <p>{toast.description}</p> : null}
          </article>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within ToastProvider.');
  }

  return context;
}
