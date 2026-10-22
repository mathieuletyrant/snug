import { Toast as RadixToast } from "radix-ui";
import { createContext, type ReactNode, useCallback, useContext, useState } from "react";

interface Toast {
  message: string;
  action?: { label: string; run: () => void };
}

const ToastContext = createContext<(toast: Toast) => void>(() => {});

export const useToast = () => useContext(ToastContext);

/** One toast at a time, 5 seconds, above the bottom navigation; swipe it down to dismiss. */
export function ToastProvider({ children }: { children: ReactNode }) {
  // A new id remounts the toast, so a second one restarts the 5 seconds.
  const [toast, setToast] = useState<(Toast & { id: number }) | null>(null);
  const show = useCallback((t: Toast) => setToast({ ...t, id: Date.now() }), []);

  return (
    <ToastContext value={show}>
      <RadixToast.Provider duration={5000} swipeDirection="down">
        {children}
        {toast && (
          <RadixToast.Root
            key={toast.id}
            onOpenChange={(open) => !open && setToast(null)}
            className="flex items-center gap-4 rounded-2xl border border-line bg-raised px-4 py-3 shadow-2xl shadow-black/50 data-[state=open]:animate-sheet-in data-[swipe=move]:translate-y-(--radix-toast-swipe-move-y) data-[swipe=end]:opacity-0 data-[swipe=end]:transition"
          >
            <RadixToast.Description className="text-sm">{toast.message}</RadixToast.Description>
            {toast.action && (
              <RadixToast.Action asChild altText={toast.action.label}>
                <button className="text-sm font-bold text-accent" onClick={toast.action.run}>
                  {toast.action.label}
                </button>
              </RadixToast.Action>
            )}
          </RadixToast.Root>
        )}
        <RadixToast.Viewport className="fixed inset-x-0 bottom-24 z-50 mx-auto flex w-fit max-w-[calc(100vw-2rem)] flex-col outline-none md:bottom-8" />
      </RadixToast.Provider>
    </ToastContext>
  );
}
