import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  toast: (type: ToastType, title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const colors = {
    success: 'border-[var(--alert-green)] bg-[rgba(0,230,118,0.08)]',
    error: 'border-[var(--alert-red)] bg-[rgba(255,51,102,0.08)]',
    warning: 'border-[var(--alert-amber)] bg-[rgba(245,158,11,0.08)]',
    info: 'border-[var(--accent-cyan)] bg-[rgba(0,212,255,0.08)]',
  };

  const iconColors = {
    success: 'text-[var(--alert-green)]',
    error: 'text-[var(--alert-red)]',
    warning: 'text-[var(--alert-amber)]',
    info: 'text-[var(--accent-cyan)]',
  };

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => {
          const Icon = icons[t.type];
          return (
            <div
              key={t.id}
              role="alert"
              aria-live="polite"
              className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-lg border-l-4 shadow-lg bg-bg-card ${colors[t.type]} animate-toast-in`}
              style={{ minWidth: '320px', maxWidth: '420px' }}
            >
              <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColors[t.type]}`} aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">{t.title}</p>
                {t.message && (
                  <p className="text-xs text-text-secondary mt-0.5">{t.message}</p>
                )}
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="p-0.5 rounded hover:bg-black/5 transition-colors shrink-0"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4 text-text-tertiary" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
