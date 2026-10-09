import { JellyToggle } from "../jelly/JellyToggle";
import { useReportSettings } from "../../queries/reportSettingsQueries";

interface MailReportToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

// Показывается только если на сервере включена отправка (mailAvailable) — иначе запуск с флагом
// вернул бы 400. Письмо уходит тому, под кем залогинены, по завершении прогона.
export function MailReportToggle({ checked, onChange }: MailReportToggleProps) {
  const { data } = useReportSettings();
  if (!data?.mailAvailable) return null;
  return <JellyToggle checked={checked} onChange={onChange} label="Отчёт на почту" />;
}
