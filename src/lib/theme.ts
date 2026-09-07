import { useSyncExternalStore } from "react";

// "system" — тема следует prefers-color-scheme (как было раньше, без явного выбора).
// tokens.css уже поддерживает принудительный выбор через [data-theme="light"|"dark"] на :root —
// этот модуль только читает/пишет localStorage и проставляет/снимает атрибут, вся палитра уже
// была готова к этому заранее.
export type ThemePreference = "system" | "light" | "dark";

const STORAGE_KEY = "rpa-theme-preference";

function readStored(): ThemePreference {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
  } catch {
    // localStorage недоступен — просто следуем системной теме
  }
  return "system";
}

function applyToDocument(pref: ThemePreference) {
  const root = document.documentElement;
  if (pref === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", pref);
  }
}

let current: ThemePreference = readStored();
const listeners = new Set<() => void>();

export const themeStore = {
  // Вызывается один раз в main.tsx до рендера — проставляет атрибут максимально рано, чтобы не
  // было вспышки "не той" темы на старте.
  init() {
    applyToDocument(current);
  },
  get(): ThemePreference {
    return current;
  },
  set(pref: ThemePreference) {
    current = pref;
    try {
      localStorage.setItem(STORAGE_KEY, pref);
    } catch {
      // не критично — просто не переживёт reload
    }
    applyToDocument(pref);
    listeners.forEach((listener) => listener());
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(themeStore.subscribe, themeStore.get);
}
