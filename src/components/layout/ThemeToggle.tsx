import { JellySegmented } from "../jelly/JellyToggle";
import { IconMonitor, IconSun, IconMoon } from "../jelly/icons";
import { themeStore, useThemePreference } from "../../lib/theme";

export function ThemeToggle() {
  const preference = useThemePreference();

  return (
    <JellySegmented
      compact
      value={preference}
      onChange={(next) => themeStore.set(next)}
      options={[
        { value: "system", label: <IconMonitor width={15} height={15} />, ariaLabel: "Системная тема" },
        { value: "light", label: <IconSun width={15} height={15} />, ariaLabel: "Светлая тема" },
        { value: "dark", label: <IconMoon width={15} height={15} />, ariaLabel: "Тёмная тема" },
      ]}
    />
  );
}
