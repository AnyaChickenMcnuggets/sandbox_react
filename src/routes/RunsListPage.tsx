import { motion } from "framer-motion";
import { useRunHistory } from "../lib/runHistory";
import { RunHistoryRow } from "../features/runMonitor/RunHistoryRow";
import "./runsListPage.css";

export function RunsListPage() {
  const history = useRunHistory();

  return (
    <div className="runs-list-page">
      <div className="runs-list-toolbar">
        <h1>Прогоны</h1>
        <p className="runs-list-subtitle">
          Журнал запусков в этом браузере — бэкенд не хранит общий список прогонов, каждая строка
          живо отражает текущий статус
        </p>
      </div>

      {history.length === 0 ? (
        <div className="runs-list-empty">
          Пока ничего не запускалось. Запустите сценарий из списка или редактора — прогон появится
          здесь, и вы сможете вернуться к нему в любой момент, даже пока он ещё выполняется.
        </div>
      ) : (
        <motion.div layout className="runs-list-stack">
          {history.map((entry) => (
            <RunHistoryRow key={entry.runId} entry={entry} />
          ))}
        </motion.div>
      )}
    </div>
  );
}
