import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

/** How long a message stays (ux-fundamentals, owner's rule 4; docs/spec.md §7.7). */
export const TOAST_MS = 2500;
/** With Undo, a little longer, so there's time to tap it. */
export const TOAST_UNDO_MS = 5000;

export interface ToastMessage {
  text: string;
  /** Puts things back as they were; shown as an Undo button. */
  undo?: () => void;
}

type Show = (message: ToastMessage) => void;

const ToastContext = createContext<Show>(() => {});

/** Shows a short message: `useToast()({ text: 'Hidden', undo })`. */
export const useToast = () => useContext(ToastContext);

/**
 * One message at a time, just above the tab bar. A new one replaces the old
 * and starts its own timer; nothing ever waits to be closed.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<(ToastMessage & { key: number }) | null>(null);

  const show = useCallback<Show>((message) => {
    setToast((current) => ({ ...message, key: (current?.key ?? 0) + 1 }));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.undo ? TOAST_UNDO_MS : TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {/* Always present, so screen readers announce each message. */}
      <div className="toast-region" role="status">
        {toast && (
          <div className="toast" key={toast.key}>
            <span>{toast.text}</span>
            {toast.undo && (
              <button
                type="button"
                onClick={() => {
                  toast.undo?.();
                  setToast(null);
                }}
              >
                Undo
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
