import { AnimatePresence, motion } from "framer-motion";
import { JellyPanel } from "../jelly/JellyPanel";
import { JellyButton } from "../jelly/JellyButton";
import "./confirmDialog.css";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Удалить",
  cancelLabel = "Отмена",
  danger = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="confirm-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <JellyPanel radius="lg" className="confirm-panel">
              <div className="confirm-title">{title}</div>
              <div className="confirm-message">{message}</div>
              <div className="confirm-actions">
                <JellyButton variant="ghost" onClick={onCancel}>
                  {cancelLabel}
                </JellyButton>
                <JellyButton variant={danger ? "danger" : "primary"} onClick={onConfirm}>
                  {confirmLabel}
                </JellyButton>
              </div>
            </JellyPanel>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
