import { useSyncExternalStore } from "react";

// Бэкенд не даёт эндпоинта "список прогонов" (ни по сценарию, ни глобально) — GET /api/v1/runs/{id}
// это единственный способ узнать про конкретный прогон. Чтобы пользователь вообще мог вернуться
// к прогону, который уже запустил (в том числе ещё выполняющемуся), фронт сам ведёт локальный
// журнал запусков в localStorage — аналогично layoutStorage.ts, тот же осознанный компромисс
// ("видно только то, что запускали в этом браузере").

export interface RunHistoryEntry {
  runId: number;
  scenarioId: number;
  scenarioName: string;
  startedAt: string; // ISO, время локального запуска (не с сервера — сервер отдаёт своё в RunResponse)
}

const STORAGE_KEY = "rpa-run-history";
const MAX_ENTRIES = 50;

type Listener = () => void;
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) listener();
}

function readFromStorage(): RunHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RunHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

// useSyncExternalStore требует стабильную (===) ссылку от getSnapshot, пока данные не менялись —
// пересчитываем сортированный снимок один раз и держим в памяти, а не заново на каждый list().
let cachedSnapshot: RunHistoryEntry[] = readFromStorage().sort((a, b) => b.runId - a.runId);

function persist(entries: RunHistoryEntry[]) {
  cachedSnapshot = entries;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // localStorage недоступен — журнал просто не переживёт reload
  }
  emit();
}

export const runHistory = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  list(): RunHistoryEntry[] {
    return cachedSnapshot;
  },
  record(entry: RunHistoryEntry) {
    const withoutDupe = cachedSnapshot.filter((e) => e.runId !== entry.runId);
    persist([entry, ...withoutDupe].sort((a, b) => b.runId - a.runId));
  },
  lastForScenario(scenarioId: number): RunHistoryEntry | undefined {
    return cachedSnapshot.find((e) => e.scenarioId === scenarioId);
  },
};

export function useRunHistory(): RunHistoryEntry[] {
  return useSyncExternalStore(runHistory.subscribe, runHistory.list);
}
