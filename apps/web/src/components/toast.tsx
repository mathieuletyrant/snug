import { createContext, type ReactNode, useCallback, useContext, useRef, useState } from "react";

interface Toast {
  message: string;
  action?: { label: string; run: () => void };
}

const ToastContext = createContext<(toast: Toast) => void>(() => {});

export const useToast = () => useContext(ToastContext);

/** One toast at a time, 5 seconds, above the bottom navigation. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback((t: Toast) => {
    clearTimeout(timer.current);
    setToast(t);
    timer.current = setTimeout(() => setToast(null), 5000);
  }, []);

  return (
    <ToastContext value={show}>
      {children}
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 md:bottom-8" role="status">
          <div className="pointer-events-auto flex items-center gap-4 rounded-2xl border border-line bg-raised px-4 py-3 shadow-2xl shadow-black/50">
            <span className="text-sm">{toast.message}</span>
            {toast.action && (
              <button
                className="text-sm font-bold text-accent"
                onClick={() => {
                  toast.action?.run();
                  setToast(null);
                }}
              >
                {toast.action.label}
              </button>
            )}
          </div>
        </div>
      )}
    </ToastContext>
  );
}
