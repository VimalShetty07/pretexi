"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, AlertTriangle, Info } from "lucide-react";

type ToastTone = "success" | "error" | "info";

type ToastItem = {
  id: string;
  tone: ToastTone;
  message: string;
};

type ToastContextValue = {
  showToast: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback((message: string, tone: ToastTone = "info") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setItems((prev) => [...prev, { id, tone, message }]);
    window.setTimeout(() => remove(id), 3200);
  }, [remove]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(92vw,360px)] flex-col gap-2">
        {items.map((item) => {
          const toneCls =
            item.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : item.tone === "error"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-slate-200 bg-white text-slate-800";
          return (
            <div key={item.id} className={`pointer-events-auto rounded-lg border px-3 py-2 text-sm shadow-sm ${toneCls}`}>
              <div className="flex items-start gap-2">
                {item.tone === "success" ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                ) : item.tone === "error" ? (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                ) : (
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                )}
                <span>{item.message}</span>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
