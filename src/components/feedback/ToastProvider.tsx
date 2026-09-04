import { useEffect, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toastStore, type Toast } from "./toastStore";
import "./toast.css";

function ToastItem({ toast }: { toast: Toast }) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (toast.kind === "error") return; // ошибки не закрываются сами — их нужно прочитать
    const timer = setTimeout(() => toastStore.dismiss(toast.id), 4500);
    return () => clearTimeout(timer);
  }, [toast.id, toast.kind]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 40, scale: 0.85 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.15 } }}
      transition={{ type: "spring", stiffness: 400, damping: 26 }}
      className={`toast toast-${toast.kind}`}
    >
      <div className="toast-body">
        <div className="toast-title">{toast.title}</div>
        <div className="toast-message">{toast.message}</div>
        {toast.details.length > 0 ? (
          <button type="button" className="toast-details-toggle" onClick={() => setExpanded((v) => !v)}>
            {expanded ? "Скрыть детали" : `Показать детали (${toast.details.length})`}
          </button>
        ) : null}
        <AnimatePresence>
          {expanded && toast.details.length > 0 ? (
            <motion.ul
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="toast-details-list"
            >
              {toast.details.map((detail, i) => (
                <li key={i}>{detail}</li>
              ))}
            </motion.ul>
          ) : null}
        </AnimatePresence>
      </div>
      <button type="button" className="toast-close" onClick={() => toastStore.dismiss(toast.id)} aria-label="Закрыть">
        ×
      </button>
    </motion.div>
  );
}

export function ToastViewport() {
  const toasts = useSyncExternalStore(toastStore.subscribe, toastStore.getSnapshot);

  return (
    <div className="toast-viewport">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  );
}
