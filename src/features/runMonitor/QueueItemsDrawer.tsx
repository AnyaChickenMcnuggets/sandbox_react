import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useQueueItems } from "../../queries/runQueries";
import { JellyPanel } from "../../components/jelly/JellyPanel";
import { JellyButton } from "../../components/jelly/JellyButton";
import { ErrorBanner } from "../../components/feedback/ErrorBanner";
import { parseLocalDateTime } from "../../lib/dates";
import "./queueItemsDrawer.css";

interface QueueItemsDrawerProps {
  runId: number;
  stepId: number;
  stepName: string;
  onClose: () => void;
}

const PAGE_SIZE = 100;

export function QueueItemsDrawer({ runId, stepId, stepName, onClose }: QueueItemsDrawerProps) {
  const [pageNumber, setPageNumber] = useState(0);
  const { data, isLoading, error } = useQueueItems(runId, stepId, pageNumber, true);

  return (
    <AnimatePresence>
      <motion.div
        key={stepId}
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 24 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
      >
        <JellyPanel radius="lg" className="queue-items-drawer">
          <div className="queue-items-header">
            <div className="queue-items-title">Транзакции очереди · {stepName}</div>
            <button type="button" className="queue-items-close" onClick={onClose} aria-label="Закрыть">
              ×
            </button>
          </div>

          {error ? <ErrorBanner error={error} title="Не удалось загрузить транзакции" /> : null}
          {isLoading ? <div className="queue-items-loading">Загрузка…</div> : null}

          {data ? (
            <>
              <div className="queue-items-table-wrap">
                <table className="queue-items-table">
                  <thead>
                    <tr>
                      <th>naturalKey</th>
                      <th>value</th>
                      <th>событие</th>
                      <th>создано</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((item) => (
                      <tr key={item.id}>
                        <td>{item.naturalKey}</td>
                        <td className="queue-items-value">{item.value}</td>
                        <td>{item.lastEventType ?? "—"}</td>
                        <td>{parseLocalDateTime(item.createdAt).toLocaleString("ru-RU")}</td>
                      </tr>
                    ))}
                    {data.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="queue-items-empty">
                          Пусто
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              <div className="queue-items-pagination">
                <JellyButton
                  size="sm"
                  variant="ghost"
                  onClick={() => setPageNumber((p) => Math.max(0, p - 1))}
                  disabled={pageNumber === 0}
                >
                  ← Назад
                </JellyButton>
                <span>Страница {pageNumber + 1}</span>
                <JellyButton
                  size="sm"
                  variant="ghost"
                  onClick={() => setPageNumber((p) => p + 1)}
                  disabled={data.length < PAGE_SIZE}
                >
                  Вперёд →
                </JellyButton>
              </div>
            </>
          ) : null}
        </JellyPanel>
      </motion.div>
    </AnimatePresence>
  );
}
