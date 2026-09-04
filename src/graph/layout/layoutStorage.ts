// Позиции нод на холсте — чисто presentation-state, бэкенд их не хранит (в ScenarioResponse нет x/y).
// Решение: хранить локально в браузере по stepId, полностью перезаписывая набор после каждого save.
// См. обоснование в плане (F:\sandbox_react — плейбук проекта): stepId нестабилен между PUT-запросами,
// поэтому raw-запись синхронизируется по индексу steps[i] сразу после успешного create/update.

export interface NodePosition {
  x: number;
  y: number;
}

type LayoutMap = Record<string, NodePosition>;

function storageKey(scenarioId: number): string {
  return `rpa-scenario-layout:${scenarioId}`;
}

export function loadLayout(scenarioId: number): LayoutMap {
  try {
    const raw = localStorage.getItem(storageKey(scenarioId));
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    return parsed as LayoutMap;
  } catch {
    return {};
  }
}

export function replaceLayout(scenarioId: number, positions: Record<number, NodePosition>) {
  try {
    const map: LayoutMap = {};
    for (const [stepId, pos] of Object.entries(positions)) {
      map[stepId] = pos;
    }
    localStorage.setItem(storageKey(scenarioId), JSON.stringify(map));
  } catch {
    // localStorage недоступен (приватный режим и т.п.) — раскладка просто не переживёт reload
  }
}

export function getPosition(scenarioId: number, stepId: number): NodePosition | undefined {
  return loadLayout(scenarioId)[String(stepId)];
}
