import clsx from "clsx";
import { useRobotsAvailability } from "../../queries/orchestratorQueries";
import "./robotsAvailabilityIndicator.css";

// Маленькая "лампочка" доступности роботов на оркестраторе — постоянно видна там, где стоит
// кнопка "Запустить" (не только в момент, когда запуск уже заблокирован), чтобы пользователь видел
// текущее состояние заранее, а не только натыкался на задизейбленную кнопку без объяснения. Данные
// — тот же поллинг useRobotsAvailability, что уже дизейблит саму кнопку (см. EditorHeader/
// ScenarioCard) — здесь просто его визуализация, ничего заново не запрашивается.
export function RobotsAvailabilityIndicator() {
  const { data } = useRobotsAvailability();
  if (!data) return null;

  const ok = data.launchAllowed;

  return (
    <div
      className={clsx("robots-indicator", ok ? "robots-indicator-ok" : "robots-indicator-blocked")}
      title={`Свободно роботов: ${data.freeRobots} из ${data.totalRobots} · для запуска нужно минимум ${data.minFreeRobots}`}
    >
      <span className="robots-indicator-lamp" aria-hidden="true" />
      <span className="robots-indicator-text">
        {data.freeRobots}/{data.totalRobots} роботов свободно
      </span>
    </div>
  );
}
