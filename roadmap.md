# Roadmap

Фронтенд для backend-сервиса автоматизации тестирования RPA-сценариев (см. соседний репозиторий
`F:\sandbox`, его `roadmap.md`/`architecture.md`/`agents.md` — источник истины по API-контракту).
Визуальный DAG-конструктор сценариев (JOB/QUEUE/QUEUE_CHECK) + live-мониторинг прогонов. Термины и
слои — см. [architecture.md](architecture.md).

Статусы: `TODO` / `IN PROGRESS` / `DONE`.

## Sprint 0 — Bootstrap — DONE
- [x] Vite scaffold (`react-ts` template), React зафиксирован на 18.3 (шаблон по умолчанию ставил
      19 — не то, что просили)
- [x] `tsconfig.app.json`: `strict: true`, `noUncheckedIndexedAccess: true`
- [x] Vite 8 (rolldown) не завёлся на этой машине — не устанавливался нативный биндинг под
      win32-x64 (известный npm-баг с optional dependencies), даунгрейд на стабильный Vite 5.4 —
      завёлся с первого раза
- [x] `vite.config.ts`: `server.proxy['/api'] → http://localhost:8080`
- [x] Зависимости: `react-router-dom` v7, `@tanstack/react-query` v5, `@xyflow/react` v12,
      `framer-motion` v11→v13 (что реально подтянулось), `nanoid` (зафиксирован на v5 — v6 требует
      Node 22+, тут Node 20.16), `@dagrejs/dagre`, `zod` v4, `react-hook-form` + `@hookform/resolvers`,
      `clsx`

## Sprint 1 — API-слой — DONE
- [x] `src/api/types.ts` — все DTO 1:1 сверены построчным чтением кода бэкенда (не по описанию/памяти)
- [x] `src/api/client.ts` — fetch-обёртка, `ApiError extends Error implements ErrorResponse`,
      единая точка парсинга тела ошибки с fallback на нераспарсиваемые ответы (важно — прокси Vite
      сам отдаёт свой `500`-текст, когда бэкенд недоступен, это не JSON)
- [x] `src/api/scenarios.ts`, `runs.ts`, `cleanup.ts` — по одной функции на эндпоинт
- [x] Проверено вживую: список сценариев уходит через `/api` на `:8080`, ошибка (backend недоступен)
      корректно доходит до `ErrorBanner`

## Sprint 2 — React Query + роутинг + список сценариев — DONE
- [x] `src/app/queryClient.ts` — `MutationCache`/`QueryCache` с единым `onError` → тост, без
      дублирования `onError` в каждой мутации
- [x] Роуты: `/`, `/scenarios/new`, `/scenarios/:scenarioId/edit`, `/runs/:runId`
- [x] `ScenarioListPage` + `ScenarioCard`: список, запуск (сразу переход на монитор), удаление
      (подтверждение через `ConfirmDialog`)

## Sprint 3 — Jelly design system — DONE
- [x] `components/jelly/tokens.css` — палитра light/dark через `prefers-color-scheme` +
      `[data-theme]`, отдельные цвета JOB/QUEUE/QUEUE_CHECK
- [x] `Blob`, `JellyButton`, `JellyPanel`, `JellyField`/`JellyInput`/`JellySelect`,
      `JellyToggle`/`JellySegmented`, `JellyBadge` — все анимации через `framer-motion` spring
      (`whileHover`/`whileTap`), не linear-transition
- [x] Проверено вживую в обеих темах (браузер, скриншоты) — выглядит как желейные объекты, не
      плоские прямоугольники

## Sprint 4 — Граф-движок (редактор) — DONE
- [x] `graph/ScenarioGraph.tsx` — обёртка над `@xyflow/react`, `mode: 'edit'|'view'`,
      `ReactFlowProvider` внутри (нужен для `useReactFlow().screenToFlowPosition` при drop из палитры)
- [x] `graph/nodes/StepNode.tsx` — единая нода и для редактора, и для монитора (различаются
      наличием `data.runtime`)
- [x] `graph/edges/JellyEdge.tsx` — bezier + анимированный `strokeDashoffset`, включается через
      `data.animated`
- [x] `features/scenarioEditor/StepPalette.tsx` — HTML5 drag-n-drop (`draggable` + `dataTransfer`);
      **важно** — motion.div несовместим по типам с нативным `onDragStart` (framer-motion
      переопределяет это под pan-жест), поэтому draggable-обёртка — обычный `div`, анимация hover —
      на вложенном `motion.div`
- [x] Проверено вживую браузером: drag-n-drop блока из палитры на холст, выбор ноды → конфиг-панель,
      соединение рёбер (см. риск про автотестирование ниже)

## Sprint 5 — Маппинг граф↔DTO + позиции нод — DONE
- [x] `graph/mapping/toScenarioRequest.ts` / `fromScenarioResponse.ts` / `toRunOverlay.ts`
- [x] `graph/layout/layoutStorage.ts` — решение по координатам нод (бэкенд их не хранит): localStorage
      браузера, ключ `rpa-scenario-layout:{scenarioId}`, полная перезапись после каждого save по
      zip-индексу `request.steps[i] ↔ response.steps[i]` (обосновано в architecture.md)
- [x] `graph/layout/autoLayout.ts` — `dagre`, включается для сценария без сохранённой раскладки
      (новый браузер/машина)

## Sprint 6 — ConfigPanel и формы конфига — DONE
- [x] `react-hook-form` + `zod` (v4 API — `z.record(keyType, valueType)` требует оба аргумента,
      отличие от v3), `mode: 'onChange'`
- [x] `JobConfigForm` — переключатель `id`/`name` физически показывает только одно поле
      (`JellySegmented`), `superRefine` — вторая линия защиты
- [x] `QueueConfigForm` + `TransactionTemplateListEditor` (вложенный `useFieldArray` на
      `transactions[].metadata`)
- [x] `QueueCheckConfigForm` — 5 полей `expectedStatusCounts` по ключам `QueueItemDerivedStatus`
- [x] Поле `maxRetray` оставлено как есть (опечатка самого бэкенда) — см. `agents.md`, не чинить

## Sprint 7 — Мониторинг прогона — DONE
- [x] `queries/runQueries.ts` — `useRun`: `refetchInterval` как функция от `query.state.data?.status`,
      авто-стоп на терминальном статусе, `meta: { silent: true }` — ошибки поллинга не спамят тостами,
      обрабатываются `ErrorBanner`
- [x] `RunMonitorPage` — топология сценария (`useScenario(run.scenarioId)`) + live-оверлей
      (`applyRunOverlay`) поверх одного и того же `ScenarioGraph`, `mode="view"`
- [x] `StepNodeBadge` — статусные framer-motion варианты (pulse на RUNNING, bounce на SUCCEEDED,
      shake на FAILED)

## Sprint 8 — Stop/Cleanup/аудит очереди — DONE
- [x] `RunControls` — Stop, пока не терминальный статус; Cleanup — после
- [x] `QueueItemsDrawer` — таблица по `GET /runs/{runId}/steps/{stepId}/queue-items`, постранично
- [x] `lib/dates.ts` — два отдельных парсера: `OffsetDateTime` (везде) и `LocalDateTime`
      (`QueueItemResponse.createdAt` — единственное исключение на бэкенде)

## Sprint 9 — Финальная проверка — DONE
- [x] `npx tsc -b --noEmit` — чисто
- [x] `npm run build` (`tsc -b && vite build`) — чисто (один info-warning от Rollup про
      PURE-комментарии внутри `zod`, не наш код)
- [x] `npm run lint` (oxlint; тоже упирался в тот же баг с нативным биндингом — переустановка
      `@oxlint/binding-win32-x64-msvc` починила) — один advisory `set-state-in-effect` в
      `ScenarioEditorPage.tsx` (осознанный паттерн синхронизации query→local state при загрузке
      сценария в редактор, не баг)
- [x] Обе темы (light/dark) проверены вживую в браузере

## Открытые риски
- **End-to-end прогон против реального бэкенда не подтверждён в этой сессии.** Postgres
  (`postgresql-x64-16`) на машине разработки был остановлен, запуск службы требует прав
  администратора, которых не было у агента. Само приложение (компиляция, все три экрана, error
  handling, drag-n-drop, конфиг-панели) проверено вживую в браузере при недоступном бэкенде —
  полный цикл save→run→live-мониторинг→stop→cleanup нужно пройти отдельно, когда бэкенд поднят.
- **Соединение рёбер (`onConnect`) в браузерной автоматизации не воспроизводилось нативным
  drag** — синтетический `left_click_drag` инструмента браузера использует `PointerEvent`, на
  которые внутренний `XYHandle` из `@xyflow/system` в установленной версии не реагирует; сработало
  только через явную симуляцию `MouseEvent`-последовательности (`mousedown`→`mousemove`→`mouseup`)
  напрямую через `dispatchEvent`. Сам код (`ReactFlow onConnect` + `addEdge`) — стандартный паттерн
  из документации `@xyflow/react`, но реальное соединение рёбер мышью в настоящем браузере
  пользователя стоит перепроверить руками при первом использовании — это не то же самое, что
  автоматизированная проверка через синтетические события.
- **`npm run dev`/`build` предупреждают про размер бандла** (746 KB минифицированного JS,
  `@xyflow/react` + `framer-motion` — основной вес). Не блокер для внутреннего инструмента, но
  если появится необходимость — code-splitting через `React.lazy` по роутам (`ScenarioEditorPage`/
  `RunMonitorPage` тяжелее списка).
- **Проверка на среднем экране (< 1280px) не проводилась** — `resize_window` в этой сессии
  использовался только для смены темы, не для сужения вьюпорта. Хедер/тулбары используют flex без
  жёстких `min-width`, холст скроллится сам через `@xyflow/react`, но это не проверено вживую на
  реальном 1024px-экране.
- **Node 20.16.0 на машине разработки — ниже минимально заявленного рядом пакетов** (`vite@8`,
  `oxlint@1.81`, `nanoid@6` требуют Node ≥20.19/22) — отсюда и даунгрейд Vite/nanoid. Если на
  другой машине окажется более новый Node, эти пины можно снять и обновиться на актуальные мажорные
  версии, но тогда стоит заново пройти Sprint 0 (сборка/линт могли вести себя иначе на "родных"
  версиях).

## Backlog (за рамками текущего скоупа)
- Автотесты (unit на маппинг граф↔DTO — самое хрупкое место; e2e через Playwright на весь цикл
  save→run→monitor). В этой сессии верификация была полностью ручная (браузер + `tsc`/`build`/`lint`).
- Поддержка fan-in на фронте пока не нужна — бэкенд сам не умеет ждать несколько родителей одного
  шага (см. `F:\sandbox\agents.md`), поэтому UI намеренно не проверяет и не подсказывает на этот счёт;
  если/когда бэкенд научится — сюда же добавить валидацию редактора.
- Специфичная для типа шага валидация (например "ровно одно из `rpaProjectId`/`rpaProjectName`")
  сейчас только предупреждает в форме, не блокирует save — потому что и сам бэкенд её не проверяет
  на create/update, только в момент `run` (см. `architecture.md`). Если это изменится на бэкенде —
  ужесточить и здесь.
- Code-splitting по роутам, если размер бандла станет проблемой на практике.
- Пагинация/виртуализация списка сценариев, если их станет много (сейчас — простой grid без пагинации).
