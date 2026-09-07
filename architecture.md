# Архитектура

Фронтенд к backend-сервису из соседнего репозитория `F:\sandbox` (Spring Boot, порт 8080, без
аутентификации). Этот документ описывает только фронтенд; API-контракт — источник истины
[F:\sandbox\architecture.md](F:/sandbox/architecture.md) и код контроллеров/DTO там же — при
любом расхождении между этим файлом и реальным кодом бэкенда прав бэкенд.

## Слои

```
routes/*Page.tsx           — страницы (роуты react-router), собирают фичи в layout
        │
features/*                 — экранная логика: формы, палитра, панели управления прогоном
        │
graph/*                     — граф-движок: ноды/рёбра/маппинг/layout, общий для editor и monitor
        │
queries/*                   — React Query хуки (useScenarios, useRun, useStartRun, ...)
        │
api/*                       — типизированный HTTP-клиент, ни одного `any` на границе с бэкендом
        │
Spring Boot backend (localhost:8080, /api/v1/*, за Vite dev-proxy)
```

`components/jelly/*` и `components/feedback/*` — сквозные примитивы (design system + тосты/баннеры/
диалоги), используются на любом слое выше `api`.

## Маршруты

| Путь | Компонент | Назначение |
|---|---|---|
| `/` | `ScenarioListPage` | список сценариев, запуск, удаление |
| `/scenarios/new` | `ScenarioEditorPage` | создание (POST при первом save) |
| `/scenarios/:scenarioId/edit` | `ScenarioEditorPage` | редактирование (PUT) |
| `/runs` | `RunsListPage` | журнал запущенных прогонов (локальный, см. ниже) |
| `/runs/:runId` | `RunMonitorPage` | live-мониторинг прогона |

## API-клиент (`src/api`)

- `types.ts` — DTO 1:1 с Java-record'ами бэкенда, включая нюансы: `RunStatus` — один enum и для
  `RunResponse.status`, и для `StepRunResponse.status` (отдельного `StepRunStatus` на бэкенде нет);
  `QueueStepConfig.maxRetray` — опечатка самого бэкенда, сохранена как есть в типе (не пытаться
  "исправить" при рефакторинге — это сломает контракт); `QueueItemResponse.createdAt` — единственное
  поле `LocalDateTime` без смещения, все остальные даты — `OffsetDateTime`.
- `client.ts` — `apiClient.get/post/put/delete`, единая обработка ошибок: `ApiError extends Error
  implements ErrorResponse`. `parseErrorBody` дружелюбен к не-JSON ответам (Vite proxy сам отдаёт
  html/text `500`, когда бэкенд недоступен — это не `ErrorResponse`, но должно попадать в UI так же,
  просто с `code: "UNKNOWN"`).
- `scenarios.ts`/`runs.ts`/`cleanup.ts` — по функции на эндпоинт, без дополнительной логики (она в
  `queries/*`).

## Состояние сервера (`src/queries`, React Query)

- `queryKeys.ts` — единая точка ключей, чтобы инвалидация после мутаций не разъезжалась по файлам.
- Мутации (`useCreateScenario`, `useUpdateScenario`, `useDeleteScenario`, `useStartRun`,
  `useStopRun`, `useCleanupScenario`) не показывают тосты сами — это делает глобальный
  `MutationCache.onError` в `app/queryClient.ts`. Мутации запуска/стопа/cleanup принимают id
  аргументом `mutate()`, а не хука (`useStartRun()` без параметров, `mutate({scenarioId})`) —
  так один и тот же хук переиспользуется и списком сценариев (произвольный `scenarioId` на карточку),
  и редактором (текущий сценарий).
- `useRun(runId)` — поллинг `refetchInterval` как **функция** от `query.state.data?.status`
  (react-query v5): возвращает `false` на терминальном статусе (авто-стоп, ничего вручную чистить не
  нужно — сам `useQuery` перестаёт рефетчить), иначе `2500`. `refetchIntervalInBackground: false` —
  не поллить в неактивной вкладке. `meta: { silent: true }` читается в `queryClient.ts`, чтобы
  повторяющиеся ошибки поллинга не заваливали тостами — за это отвечает `ErrorBanner` на самой
  странице монитора.
- Поллинг **не завершается**, просто вернувшись к 404/500 — `query.state.data` остаётся `undefined`,
  `status` в колбэке `refetchInterval` тоже `undefined`, значит условие терминальности не сработает и
  поллинг продолжится. Это осознанное поведение: если бэкенд временно недоступен, страница монитора
  сама "оживёт", когда он вернётся, без перезагрузки.

## Локальный журнал прогонов (`src/lib/runHistory.ts`)

Бэкенд не даёт эндпоинта "список прогонов" — ни по сценарию, ни глобально (`GET /api/v1/runs/{id}`
единственный способ узнать о конкретном прогоне, id нужно знать заранее). Чтобы пользователь вообще
мог вернуться к прогону, который уже запустил — в том числе ещё выполняющемуся — фронт сам ведёт
журнал в `localStorage` (тот же паттерн, что `layoutStorage.ts`): при каждом успешном
`useStartRun` (список сценариев и редактор) вызывается `runHistory.record({runId, scenarioId,
scenarioName, startedAt})`. `RunsListPage` подписан на изменения через `useRunHistory()`
(`useSyncExternalStore`) и рендерит по строке на прогон (`RunHistoryRow`), каждая строка сама
поллит свой статус через уже существующий `useRun` — отдельного "списочного" API не потребовалось.

Технический нюанс модуля: `list()`/снимок для `useSyncExternalStore` **обязан** отдавать стабильную
(`===`) ссылку между вызовами, пока данные не менялись, иначе React уходит в бесконечный ре-рендер
("getSnapshot should be cached"). Поэтому `runHistory` держит `cachedSnapshot` в памяти и
пересчитывает его только внутри `persist()` (на `record()`), а не заново на каждый `list()` —
в отличие от `toastStore.ts`, где массив `toasts` и так переприсваивается только при реальном
изменении, тут это пришлось сделать явно.

## Граф-движок (`src/graph`)

Общая проблема экранов 2 и 3 — один и тот же визуальный DAG, но редактируемый в одном случае и
read-only+live в другом. Решение — единый `ScenarioGraph` (`mode: 'edit'|'view'`) и единый тип ноды:

```ts
interface StepNodeData {
  localId: string;       // ключ, которым шаги ссылаются друг на друга в ScenarioRequest
  stepId?: number;        // появляется после сохранения — числовой id из ScenarioResponse
  type: ScenarioStepType;
  name: string;
  config: StepConfig;
  runtime?: StepRuntimeOverlay;  // только в mode='view' — статус/detail/errorMessage/orchestratorQueueId
}
```

`StepNode.tsx` — единственный компонент ноды для обоих режимов: рендерит статусный бейдж/detail
только когда `data.runtime` присутствует. `JellyEdge.tsx` — общий кастомный edge, `data.animated`
включает бегущий градиент (в view — когда исходная нода `RUNNING`), `data.nodeDragging` — "натянутое"
состояние во время драга (см. ниже).

### Физика драга и коллизий (`StepNode.tsx`, `collisionBus.ts`)

Растяжение ноды при перетаскивании — не по осям X/Y независимо (так было и давало заметно неверный
результат на диагональном движении — растяжение "не туда"), а единым скаляром вдоль направления
реальной скорости мыши: три вложенных `motion.div`, внешний поворачивается на угол движения
(`atan2(vy, vx)`), средний растягивает по локальной оси X/сжимает по Y (`scaleX/scaleY` через
`useMotionValue`+`useTransform`), внутренний поворачивает обратно на `-angle`, чтобы контент
(текст, бейджи) остался читаемым. Направление и величина растяжения считаются в `useEffect` на
изменение `positionAbsoluteX/Y` (эти поля — часть `NodeProps` из `@xyflow/react`, обновляются на
каждый тик реального драга xyflow), скорость = `Δposition / Δt` между соседними вызовами эффекта.

**Двойной clamp против инверсии.** `scaleX = 1 + clamp(stretch, 0, MAX)`, `scaleY = 1 -
clamp(stretch, 0, MAX) * 0.5` — clamp применяется **внутри** `useTransform`, то есть на каждый
рендер производного значения, а не только при записи `stretch.set(...)`. Это значит: даже если
пружина осседания (`animate(stretch, 0, {type:'spring', damping:13})`) на отпускании кратковременно
перелетит через 0 в отрицательную область — видимый `scaleX/scaleY` всё равно останется в
безопасном диапазоне, "вывернутая" (инвертированная) нода математически невозможна. Это прямое
следствие реального бага, найденного в проде этой фичи (см. `roadmap.md`, Sprint 11): без такого
clamp'а раньше растяжение по X и Y считалось раздельно с перекрёстными членами и без ограничения
итогового `useTransform`, и на резком отпускании ноду могло на кадр-два "вывернуть".

**`whileHover`/`whileTap` отключены на время `dragging`.** framer-motion детектирует hover/tap
независимо от собственной drag-системы xyflow (`d3-drag`, отдельный набор слушателей) — во время
реального перетаскивания курсор всё время "над" нодой и физически "зажат" (`pointerdown` активен),
поэтому оба framer-жеста остаются включёнными на всю длительность драга и накладывают свои
scale/scaleX/scaleY поверх динамического сквоша от скорости — это и была причина "странной" тряски
при движении. Проверка `dragging ? undefined : {...}` на `whileHover`/`whileTap` полностью убирает
конфликт.

**Коллизия (`collisionBus.ts`)** — при приближении перетаскиваемой ноды к соседней (проверка в
`ScenarioGraph.handleNodeDrag` по приблизительным габаритам `NODE_WIDTH/HEIGHT`, с кулдауном на
ноду) соседняя нода получает `collisionBus.bump(neighborId, pushAngleDeg)` — направленный импульс
(угол — от толкающей ноды к этой), реализованный тем же `stretch`/`angle`, что и драг: визуально
читается как "желейный блок толкнули".

**Находка про тестирование через синтетические события браузера.** `d3-drag` регистрирует
`mousemove.drag`/`mouseup.drag` на `event.view` (`select(event.view).on(...)`), а `new
MouseEvent(type, {...})` без явного `view: window` в опциях создаётся с `view: null` — слушатели
тихо не навешиваются, драг не происходит, ошибок нет. Для ручного/скриптового тестирования
xyflow-взаимодействий через `dispatchEvent` обязательно указывать `view: window` явно.

### Маппинг граф ↔ DTO (`graph/mapping`)

- `toScenarioRequest(nodes, edges, name, description)` — собирает `ScenarioRequest`. `nextLocalIds`
  каждого шага — по исходящим `edges`, в порядке `nodes` (этот порядок и определяет порядок
  `request.steps`, что важно для следующего пункта).
- `fromScenarioResponse(scenario)` — `ScenarioResponse → {nodes, edges}`. `localId` ноды = `String(
  stepId)` — переиспользуем числовой id как строковый ключ, бэкенду всё равно, что `localId`
  "выглядит как число", лишь бы был уникален в рамках запроса.
- `toRunOverlay.ts` (`applyRunOverlay`) — берёт статичный граф сценария (топология+config) и
  `RunResponse.steps[]`, сопоставляет по `stepId` (не по `localId` холста напрямую — совпадает,
  потому что `fromScenarioResponse` уже сделал `localId = String(stepId)`), добавляет `runtime` в
  `data` каждой ноды и `animated` каждому ребру.

### Позиции нод: почему localStorage, а не бэкенд

`ScenarioResponse`/`StepResponse` не содержат `x`/`y` — бэкенд координаты холста не хранит и не
должен (это чисто presentation state, не часть доменной модели сценария). Решение —
`graph/layout/layoutStorage.ts`: `localStorage`, ключ `rpa-scenario-layout:{scenarioId}` →
`Record<stepId, {x,y}>`.

Ключевая сложность: `ScenarioService.update()` на бэкенде **полностью пересоздаёт** все
`ScenarioStep` при каждом `PUT` — числовые `id` шагов меняются на каждое сохранение, даже если
топология не менялась (см. `F:\sandbox\...\ScenarioService.java`). Опираться на `stepId` как на
стабильный ключ между сохранениями нельзя. Но `ScenarioResponse.steps[i]` в ответе на `POST`/`PUT`
всегда соответствует по индексу `ScenarioRequest.steps[i]`, отправленному в том же запросе — это и
есть механизм синхронизации:

1. Пока сценарий редактируется, позиции живут в reactflow state, привязанные к `localId`.
2. После успешного `create`/`update` — `zipStepIdsWithPositions(nodes, response.steps.map(s=>s.id))`:
   позиция i-й ноды (в том порядке, в котором она попала в `request.steps`) присваивается
   `response.steps[i].id`.
3. `replaceLayout(scenarioId, positions)` **полностью перезаписывает** сохранённый набор для этого
   сценария (не мёржит со старым) — старые `stepId` всё равно уже невалидны после `PUT`.
4. При открытии сценария (`fromScenarioResponse`) — если хотя бы у одной ноды нет сохранённой
   позиции (новый браузер, первое сохранение, localStorage очищен), раскладывается **весь граф
   целиком** через `dagre` (`autoLayout.ts`) — осознанно не мешаем частично ручную и частично
   авто-раскладку в одном графе, это выглядело бы рассинхронизированно.

Следствие: раскладка не переживает переход на другой браузер/машину. Это компромисс, о котором в UI
редактора есть явная подпись ("расположение блоков сохраняется локально в этом браузере") — сделано
осознанно, не задокументированный явно в исходных требованиях момент, см. `roadmap.md`.

## Формы конфига шага (`features/scenarioEditor/ConfigPanel`)

`react-hook-form` + `zod` (v4 — в отличие от v3, `z.record` требует явную схему ключа:
`z.record(z.string(), z.string())`). Каждая форма (`JobConfigForm`/`QueueConfigForm`/
`QueueCheckConfigForm`) держит собственный `useForm`, синхронизируется с `data.config` ноды через
`useEffect` на `watch()` (форма — источник истины, пока открыта; `onChange` пробрасывает
нормализованный конфиг наверх в `ScenarioEditorPage`, которая пишет его в `node.data.config`).

`JobConfigForm` — `refMode: 'id'|'name'` (UI-only поле, не уходит в запрос) физически показывает
только одно из полей `rpaProjectId`/`rpaProjectName` и обнуляет второе при переключении —
невозможно ввести оба одновременно через форму. `zod.superRefine` — вторая линия защиты. Важно:
бэкенд **не проверяет** это правило на `POST`/`PUT` сценария — только в момент `run` (внутри
`JobStepExecutor`, ошибка всплывает как `502 ORCHESTRATOR_API_ERROR`, не как `400` при сохранении).
Поэтому фронт тоже не блокирует save на этом — только подсказывает.

## Дизайн-система (`components/jelly`)

Все цвета/тени/радиусы — CSS custom properties в `tokens.css`, определены на `:root` (light) и
переопределены под `@media (prefers-color-scheme: dark)` + `[data-theme]` (на случай явного
переключателя темы в будущем — сейчас его нет, тема следует только системной настройке). Ни одного
захардкоженного hex-цвета вне `tokens.css` — каждый компонент читает переменные.

`Blob` — базовый примитив ("капсула" с multi-layer тенью + glossy highlight через
`::before`-градиент), на нём построены `JellyPanel`, `StepNode`, тосты. Все интерактивные состояния
(`JellyButton`, `StepNode` hover/tap, статусные бейджи) — `framer-motion` spring-transitions
(`type: 'spring'`), никогда `ease: 'linear'`.

### Liquid Glass поверх желе

Задача — не заменить желейный стиль, а добавить стеклянный слой на "хромовые" поверхности (панели,
шапку, строки списков), оставив цветные ноды/кнопки непрозрачным насыщенным "мармеладом" — иначе
JOB/QUEUE/QUEUE_CHECK перестали бы визуально различаться по цвету. `Blob` получил проп `glass`:
включает `background: var(--glass-bg)` (полупрозрачный тон `--surface`), `backdrop-filter:
blur(var(--glass-blur)) saturate(1.7)` (+ `-webkit-` для Safari), тонкий светлый ободок
`var(--glass-border)` и заменяет вертикальный `--jelly-highlight` на диагональный `--glass-shine` —
все три токена определены в `tokens.css` **в тех же трёх местах**, что остальная палитра
(`:root`, `@media(prefers-color-scheme:dark)`, `[data-theme="dark"]`).

`JellyPanel` включает `glass` по умолчанию (используется в `ConfigPanel`, `RunHeader`,
`QueueItemsDrawer`, `StepPalette`, `ConfirmDialog`, `ErrorBanner` — все "плавающие" над холстом/
страницей поверхности). `ScenarioCard`/`RunHistoryRow` передают `glass` в `Blob` напрямую (это
строки списка, не через `JellyPanel`). `AppShell` шапка — `position: sticky` + тот же
`backdrop-filter` напрямую в CSS (не через `Blob`, это не React-компонент), поэтому при скролле
контент реально просвечивает/размывается под панелью навигации — эффект нагляднее всего виден
именно там.

Списки (`ScenarioListPage`, `RunsListPage`) — строки на всю ширину (`flex-direction: column`), не
CSS grid карточек: грид ломался, когда несколько текстовых кнопок не помещались в
`minmax(300px,1fr)` (переполнение тихо обрезалось `overflow:hidden` у `Blob`). Действия с длинной
подписью заменены на круглые icon-кнопки (`JellyButton iconOnly` + `components/jelly/icons.tsx` —
инлайн SVG, без иконочного пакета) с `title`/`aria-label` вместо видимого текста.

Технический нюанс: `motion.div`/`motion.button` переопределяют часть нативных DOM-событий
(`onDrag`, `onDragStart`, `onAnimationStart` и т.п.) под свою жестовую систему — несовместимо по
типам и по семантике с нативным HTML5 drag-and-drop. Поэтому в `StepPalette` draggable-элемент —
обычный `div`, а `motion.div` вложен внутрь только для hover/tap-анимации (см. `agents.md`).

## Обработка ошибок

Единая точка — `app/queryClient.ts`: `MutationCache`/`QueryCache` с общим `onError` →
`toastStore.pushError`. `toastStore.ts` — модульный pub/sub стор (не React Context), потому что
`QueryClient` создаётся вне дерева компонентов и должен уметь звать `pushError` напрямую.
`ToastViewport` подписывается через `useSyncExternalStore`.

- Ошибка мутации → тост (код + message + разворачиваемый список `details[]`).
- Ошибка page-level query (например, `useScenario(id)` → 404 при открытии несуществующего
  сценария) → `ErrorBanner` на странице, не тост.
- Ошибка поллинга (`useRun`) → подавлена в `QueryCache.onError` через `meta.silent`, видна только
  как `ErrorBanner`, если `runQuery.error` есть, а не как повторяющийся тост на каждый неудачный тик.

## Backend API — сводка контракта

Полный контракт см. в истории разработки/бэкенде; здесь — таблица для быстрой сверки при правках
фронта.

| Метод | Путь | Ответ | Примечание |
|---|---|---|---|
| POST | `/api/v1/scenarios` | 201 `ScenarioResponse` | |
| GET | `/api/v1/scenarios` | 200 `ScenarioResponse[]` | |
| GET | `/api/v1/scenarios/{id}` | 200 `ScenarioResponse` | |
| PUT | `/api/v1/scenarios/{id}` | 200 `ScenarioResponse` | не 201/202; пересоздаёт все шаги (новые id) |
| DELETE | `/api/v1/scenarios/{id}` | 204 | |
| POST | `/api/v1/scenarios/{id}/run` | 202 `RunResponse` | тело `{triggeredBy}` опционально |
| GET | `/api/v1/runs/{runId}` | 200 `RunResponse` | поллинг 2.5с, авто-стоп на терминальном статусе |
| POST | `/api/v1/runs/{runId}/stop` | 200 `RunResponse` | идемпотентен для терминальных прогонов |
| POST | `/api/v1/scenarios/{id}/cleanup` | 200 `{success, failures[]}` | 404, если прогонов не было |
| GET | `/api/v1/runs/{runId}/steps/{stepId}/queue-items` | 200 `QueueItemResponse[]` | `?pageNumber&pageSize` |

Коды ошибок (`ErrorResponse{code,message,details[]}`): `400 VALIDATION_FAILED` (bean validation),
`400 INVALID_REQUEST` (DAG — дублирующийся/несуществующий `localId`, цикл), `404 NOT_FOUND`,
`409 CONFLICT` (заведён на бэкенде, но ничем сейчас не выбрасывается — фронт обрабатывает как
generic `ApiError`, не полагаясь на конкретный текст), `502 ORCHESTRATOR_AUTH_FAILED` /
`502 ORCHESTRATOR_API_ERROR`.
