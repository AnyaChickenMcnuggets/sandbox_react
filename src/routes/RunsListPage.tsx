import { useState } from "react";
import { motion } from "framer-motion";
import { useRuns } from "../queries/runQueries";
import { RunHistoryRow } from "../features/runMonitor/RunHistoryRow";
import { ErrorBanner } from "../components/feedback/ErrorBanner";
import { JellyButton } from "../components/jelly/JellyButton";
import "./runsListPage.css";

const PAGE_SIZE = 20;

export function RunsListPage() {
  const [page, setPage] = useState(0);
  const { data, isLoading, error } = useRuns({ page, size: PAGE_SIZE });

  return (
    <div className="runs-list-page">
      <div className="runs-list-toolbar">
        <h1>Запуски</h1>
        <p className="runs-list-subtitle">Все запуски, в том числе других пользователей — статусы обновляются сами</p>
      </div>

      {error ? <ErrorBanner error={error} title="Не удалось загрузить запуски" /> : null}

      {isLoading ? <div className="runs-list-empty">Загрузка…</div> : null}

      {data && data.content.length === 0 ? (
        <div className="runs-list-empty">
          Пока ничего не запускалось. Запустите сценарий из списка или редактора — запуск появится здесь.
        </div>
      ) : null}

      {data && data.content.length > 0 ? (
        <motion.div layout className="runs-list-stack">
          {data.content.map((run) => (
            <RunHistoryRow key={run.id} run={run} />
          ))}
        </motion.div>
      ) : null}

      {data && data.totalPages > 1 ? (
        <div className="runs-list-pager">
          <JellyButton size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>
            Назад
          </JellyButton>
          <span className="runs-list-pager-info">
            Страница {data.page + 1} из {data.totalPages}
          </span>
          <JellyButton
            size="sm"
            variant="secondary"
            disabled={page + 1 >= data.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Вперёд
          </JellyButton>
        </div>
      ) : null}
    </div>
  );
}
