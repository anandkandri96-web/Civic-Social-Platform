import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const ToastContext = createContext(null);

const TOAST_DURATION_MS = 3500;

const buildToast = (message, options = {}) => {
  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    id,
    message,
    tone: options.tone || 'info',
  };
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (message, options) => {
      if (!message) return null;
      const next = buildToast(message, options);
      setToasts((prev) => [...prev, next]);
      const timer = setTimeout(() => {
        dismissToast(next.id);
      }, TOAST_DURATION_MS);
      timers.current.set(next.id, timer);
      return next.id;
    },
    [dismissToast]
  );

  useEffect(() => {
    return () => {
      timers.current.forEach((timer) => clearTimeout(timer));
      timers.current.clear();
    };
  }, []);

  const value = useMemo(() => ({ showToast, dismissToast }), [showToast, dismissToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-viewport" role="region" aria-live="polite" aria-label="Notifications">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast toast--${toast.tone}`}
            onClick={() => dismissToast(toast.id)}
            role="status"
          >
            <span className="toast__message">{toast.message}</span>
            <button
              type="button"
              className="toast__close"
              aria-label="Dismiss notification"
              onClick={(event) => {
                event.stopPropagation();
                dismissToast(toast.id);
              }}
            >
              Close
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
};

