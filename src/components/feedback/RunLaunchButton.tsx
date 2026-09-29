import { JellyButton } from "../jelly/JellyButton";
import { IconPlay } from "../jelly/icons";
import { formatRobotsAvailability, useRobotsAvailability } from "../../queries/orchestratorQueries";

interface RunLaunchButtonProps {
  onClick: () => void;
  isStarting: boolean;
  size?: "sm" | "md";
}

// "Запустить" — общая кнопка для ScenarioCard (список) и EditorHeader (редактор): оба места
// одинаково гейтят её доступностью роботов на оркестраторе (см. useRobotsAvailability), раньше
// этот блок (хук + disabled + одинаковый title/aria-label) был дословно продублирован в обоих
// файлах.
export function RunLaunchButton({ onClick, isStarting, size }: RunLaunchButtonProps) {
  // Пока данные не загрузились/эндпоинт недоступен — не блокируем кнопку сами, это только
  // проактивная подсказка поверх реальной защиты на бэкенде (409 на POST /run остаётся как fallback
  // именно на этот случай и на гонку между опросом и кликом).
  const { data: robots } = useRobotsAvailability();
  const blocked = robots ? !robots.launchAllowed : false;
  const label = isStarting ? "Запуск…" : blocked && robots ? formatRobotsAvailability(robots) : "Запустить";

  return (
    <JellyButton
      iconOnly
      size={size}
      variant="success"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={isStarting || blocked}
    >
      <IconPlay />
    </JellyButton>
  );
}
