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

История двух неудачных попыток (см. `roadmap.md`, Sprint 11-12) — поворот+нелинейный scale в трёх
слоях, затем скорость-через-EMA с `useTransform`-clamp — не устраняла жалобу "нода остаётся
сплющенной после перетаскивания" до конца, потому что **обе версии чинили не ту причину**. Реальный
источник бага был не в математике инерции, а в том, что на элементе одновременно жили **две
независимые жестовые системы**.

**Настоящая причина (найдена в Sprint 14).** `whileHover`/`whileTap` — декларативные пропы
framer-motion — слушают `pointerenter`/`pointerdown` НЕЗАВИСИМО от `d3-drag`, на котором построен
node-drag в `@xyflow/system`. В первые несколько пикселей реального перетаскивания `dragging` из
`NodeProps` ещё `false` (d3-drag не объявил жест драгом, есть свой clickDistance-порог) — за это
время framer успевает включить `whileTap` (`scaleX:1.1, scaleY:0.88`). Как только `dragging`
становится `true` и проп `whileTap` меняется на `undefined` (условие `dragging ? undefined :
{...}`), framer не всегда корректно "отпускает" уже запущенную к тому моменту tap-анимацию — нода
залипает ровно в её промежуточном значении навсегда. Никакая правка МОЕЙ анимации инерции не могла
это починить, потому что ломала не она — ломала вторая, никак с ней не связанная система.

**Фикс — `whileHover`/`whileTap` убраны из компонента полностью.** Hover/press реализованы как
обычный React state:

```tsx
const [hovered, setHovered] = useState(false);
const [pressed, setPressed] = useState(false);
// onMouseEnter={() => setHovered(true)}, onMouseLeave={() => setHovered(false)}
// onPointerDown={() => setPressed(true)}
// + window.addEventListener('pointerup'/'pointercancel', () => setPressed(false))
//   (отпускание ГДЕ УГОДНО на странице обязано снимать pressed, не только над нодой)
```

Единственный, кто вообще анимирует ноду — один `useAnimationControls()`-объект, управляемый одним
`useEffect` с приоритетом состояний `dragging > pressed > RUNNING > hovered > idle`
(`restingAnimation()` в `StepNode.tsx`, возвращает `{target, transition}` для каждого случая).
Никакой конкурирующей системы больше нет — framer гарантированно корректно интерполирует переход
между состояниями при любом прерывании (ровно то же свойство, на котором год держится пульсация
`RUNNING`).

`dragging=true` — не одноразовый расчёт, а зацикленная предопределённая "жестикуляция"
(`scale:[1,1.07,0.95,1.04,0.98,1], rotate:[0,-2.5,2.5,-1.5,1,0]`, `repeat: Infinity`) — читается как
"нода ожила, пока её тащат", не завязана на скорость/позицию мыши вообще, поэтому не может
"дёргаться" на медленном драге (нечему шуметь — тут нет входных данных от мыши, кроме самого факта
`dragging`).

**Коллизия (`collisionBus.ts`)** — при приближении перетаскиваемой ноды к соседней (проверка в
`ScenarioGraph.handleNodeDrag` по приблизительным габаритам `NODE_WIDTH/HEIGHT`, с кулдауном на
ноду) соседняя нода получает `collisionBus.bump(neighborId)`: `controls.start(...)` с коротким
one-off импульсом сжатия/отскока, **после которого явно возвращаемся к `restingAnimation`** через
`.then()` — a не оставляем одноразовое состояние висеть (тот же принцип "всегда возврат к одному из
предопределённых состояний").

**Находки про тестирование, обе актуальны для будущей отладки анимаций:**
- `d3-drag` регистрирует `mousemove.drag`/`mouseup.drag` на `event.view`
  (`select(event.view).on(...)`), а `new MouseEvent(type, {...})` без явного `view: window` в
  опциях создаётся с `view: null` — слушатели тихо не навешиваются, драг не происходит, ошибок нет.
  Для ручного/скриптового тестирования xyflow-взаимодействий через `dispatchEvent` обязательно
  указывать `view: window` явно.
- Пока вкладка браузера свёрнута/не в фокусе, Chrome останавливает `requestAnimationFrame`, на
  котором построены все анимации framer-motion — спринг застывает на полпути и не продолжается, пока
  вкладку не покажут снова. Проверяя анимацию через `javascript_exec` без предшествующего показа
  вкладки, можно принять этот артефакт throttling'а за реальное "залипание". Чередовать с
  `computer`-действием (`screenshot`/`hover`), не полагаться на чистый `setTimeout`-wait вслепую.

### Удаление рёбер — клавиатурой, не кнопкой

Клик по ребру выделяет его (`selected` в `EdgeProps`, штатное поведение xyflow при
`elementsSelectable`). Удаление — `deleteKeyCode={isEdit ? ['Backspace', 'Delete'] : null}` на
`<ReactFlow>` (`ScenarioGraph.tsx`): xyflow сам слушает нажатие и вызывает
`deleteElements({edges: [...]})` для всех выбранных рёбер/нод, что в контролируемом режиме
(`edges`+`onEdgesChange` переданы явно) проходит через `onEdgesChange` в `ScenarioEditorPage` как
обычно. Дефолт самого xyflow — только `'Backspace'`; `'Delete'` добавлен явно. В `mode="view"` —
`null` (в мониторе рёбра не редактируются).

Обнаруживаемость (без отдельной кнопки) — `.react-flow__edge.selected .jelly-edge-base` рисует
выбранное ребро толще, ярче и пунктиром (`stroke-dasharray`), плюс текстовая подсказка в тулбаре
`ScenarioEditorPage`. Ранее пробовали кнопку × через `EdgeLabelRenderer` — сознательно убрали
целиком по запросу: пользователю привычнее выбор+Delete, отдельный UI-элемент был лишним. Заодно
раньше был найден смежный баг (уже неактуален вместе с кнопкой, но правило осталось полезным для
будущих HTML-оверлеев внутри `motion.*`-элементов, см. `agents.md`): framer-motion сам вычисляет и
перезаписывает CSS `transform` на каждый кадр анимации, поэтому вручную заданная строка
`style.transform` для позиционирования молча затирается.

Важно: `isInputDOMNode` в `@xyflow/system` намеренно **не даёт** `Backspace`/`Delete` удалить
выбранный элемент, пока фокус находится в поле ввода (input/textarea/contentEditable) — это штатное
поведение (иначе Backspace при редактировании текста в конфиг-панели удалял бы выбранную ноду), не
баг, не нужно "чинить".

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

### Панель без анимации входа

`ConfigPanel.tsx` рендерит содержимое в обычном `<div key={nodeId}>`, не в `AnimatePresence`/
`motion.div` — по прямому запросу панель должна появляться мгновенно при выборе ноды. `key={nodeId}`
при этом не про анимацию, а про корректность: без него React переиспользовал бы тот же instance
`*ConfigForm` при переключении между двумя нодами ОДНОГО типа (тот же тип компонента в том же месте
дерева), и `useForm({defaultValues: toFormValues(config)})` внутри не пересоздался бы — панель
показывала бы значения предыдущей ноды поверх выбранной. `key` форсирует полный remount, обнуляя
локальный стейт форм на каждый выбор ноды — единственное, что реально нужно от смены `key`, эффект
анимации был лишь побочным следствием прежней реализации через `AnimatePresence`.

### Альтернативный JSON-ввод транзакций (`QueueConfigForm`)

`QueueStepConfig.transactions` можно вводить двумя способами — по одной транзакции (форма с полями
`naturalKey`/`value`/`metadata` на каждую) или всем массивом сразу как один JSON-блок.
Переключатель — `JellySegmented` в `TransactionsEditor.tsx`.

**`transactions` (react-hook-form field array) — единственный источник истины в обоих режимах.**
JSON-режим не хранит параллельное состояние, которое пришлось бы мержить при сохранении — это
просто альтернативный UI поверх того же field array: валидный JSON на каждое изменение сразу
применяется через `useFieldArray().replace(parsed)`. Благодаря этому `toConfig()` в
`QueueConfigForm.tsx` вообще не знает о существовании JSON-режима — читает `values.transactions`
как раньше, независимо от того, через какой UI данные туда попали.

Конвертация API↔форма↔JSON — общие функции в `transactionMapping.ts` (`transactionApiToFormItem`/
`transactionFormItemToApi`/`parseTransactionsJson`/`transactionsToJson`/`apiTransactionsToJson`), не
продублированы между `QueueConfigForm.tsx` (начальная загрузка/финальная сборка конфига) и
`TransactionsEditor.tsx` (переключение режимов). `parseTransactionsJson` терпима к неточной форме
входа (нестроковые значения `metadata` приводятся к строке через `JSON.stringify`, а не отбрасывают
всю транзакцию) — но `null`, если весь блок не парсится как JSON или не массив: в этом случае
`replace()` не вызывается вообще, последние валидные данные в `transactions` остаются как есть
(невалидный ввод не уничтожает то, что уже было сохранено), а под текстовым полем — инлайн-ошибка.

## Дизайн-система (`components/jelly`)

Все цвета/тени/радиусы — CSS custom properties в `tokens.css`, определены на `:root` (light) и
переопределены под `@media (prefers-color-scheme: dark)` + `[data-theme]` (на случай явного
переключателя темы в будущем — сейчас его нет, тема следует только системной настройке). Ни одного
захардкоженного hex-цвета вне `tokens.css` — каждый компонент читает переменные.

`Blob` — базовый примитив ("капсула" с multi-layer тенью + glossy highlight через
`::before`-градиент), на нём построены `JellyPanel`, `StepNode`, тосты. Все интерактивные состояния
(`JellyButton`, `StepNode` hover/tap, статусные бейджи) — `framer-motion` spring-transitions
(`type: 'spring'`), никогда `ease: 'linear'`.

### Liquid Glass — везде, не только на "хромовых" поверхностях

Первая версия стекла была только на панелях/шапке/строках списков, цветные ноды/кнопки оставались
непрозрачным "мармеладом" (чтобы JOB/QUEUE/QUEUE_CHECK не потеряли различимость по цвету). По
явному запросу пользователя ("Liquid Glass надо везде, полный редизайн") это расширено на все
цветные поверхности — включая ноды и кнопки — но с сохранением различимости типа: тон остаётся
насыщенным на `82%` непрозрачности (`--glass-tint-pct`), это "цветное стекло", не блёклая пастель.

Два уровня токенов в `tokens.css` (все — в тех же трёх местах, что остальная палитра: `:root`,
`@media(prefers-color-scheme:dark)`, `[data-theme="dark"]`, кроме двух чисто числовых ниже, которым
тема не нужна):

- **Крупные "хромовые" поверхности** (панели, шапка, контролы холста) — `--glass-bg` (тон
  `--surface`), `--glass-border`, `--glass-blur: 22px`, `--glass-shine` (диагональный блик вместо
  вертикального `--jelly-highlight`). `Blob` получил проп `glass`, включён по умолчанию в
  `JellyPanel`. `AppShell` шапка — `position: sticky` + тот же `backdrop-filter` напрямую в CSS (не
  через `Blob`, это не React-компонент) — при скролле контент реально просвечивает/размывается под
  панелью навигации.
- **Компактные цветные элементы** (ноды, кнопки, бейджи, тумблеры, крестики-кнопки удаления) —
  `--glass-tint-blur: 14px` (тяжёлый 22px на 30-40px кнопке был бы избыточен и дорог по
  перформансу) + `--glass-tint-pct: 82%`, применяются через `color-mix(in srgb, var(--color-X)
  var(--glass-tint-pct), transparent)` вместо сплошного `background-color`. `StepNode` — самый
  наглядный случай: сквозь полупрозрачную желейную карточку видна точечная сетка холста под ней,
  при этом JOB/QUEUE/QUEUE_CHECK остаются легко различимы по цвету.

`JellyInput`/`JellySelect`/`JellyTextarea` — не "стекло поверх фона", а "утопленная стеклянная
лунка": полупрозрачный `--surface-muted` + `inset` тень вместо плоской заливки, чтобы читались как
углубление в стеклянной панели, а не отдельный непрозрачный блок. Статусные бейджи на нодах
(`StepNodeBadge`) — исключение: остаются высокой непрозрачности (лёгкий блюр+ободок, не сильная
прозрачность) — это критичная для мониторинга информация (статус шага), не декоративный элемент, ей
нужна безусловная читаемость на любом фоне.

Списки (`ScenarioListPage`, `RunsListPage`) — строки на всю ширину (`flex-direction: column`), не
CSS grid карточек: грид ломался, когда несколько текстовых кнопок не помещались в
`minmax(300px,1fr)` (переполнение тихо обрезалось `overflow:hidden` у `Blob`). Действия с длинной
подписью заменены на круглые icon-кнопки (`JellyButton iconOnly` + `components/jelly/icons.tsx` —
инлайн SVG, без иконочного пакета) с `title`/`aria-label` вместо видимого текста.

Технический нюанс: `motion.div`/`motion.button` переопределяют часть нативных DOM-событий
(`onDrag`, `onDragStart`, `onAnimationStart` и т.п.) под свою жестовую систему — несовместимо по
типам и по семантике с нативным HTML5 drag-and-drop. Поэтому в `StepPalette` draggable-элемент —
обычный `div`, а `motion.div` вложен внутрь только для hover/tap-анимации (см. `agents.md`).

### Переключатель темы (`lib/theme.ts`)

Три состояния — `system` (по умолчанию, следует `prefers-color-scheme`, как было до этого спринта)
/ `light` / `dark`. Модульный стор (тот же паттерн, что `toastStore`/`runHistory`) —
`themeStore.set(pref)` пишет в `localStorage` (`rpa-theme-preference`) и
проставляет/снимает атрибут `data-theme` на `document.documentElement`. `tokens.css` был готов к
этому заранее (см. Sprint 11-12): `:root[data-theme="dark"]` — принудительный тёмный,
`@media(prefers-color-scheme:dark){:root:not([data-theme="light"])}` — системный тёмный, который
явный `data-theme="light"` корректно перебивает обратно в светлый. Добавление свелось к JS-обвязке
поверх уже готовой трёхблочной CSS-структуры палитры — самих цветов трогать не пришлось.

`themeStore.init()` вызывается в `main.tsx` **до** `createRoot(...).render(...)` — атрибут
проставляется раньше первого рендера/пейнта, без вспышки "не той" темы на старте у пользователей с
сохранённым явным выбором.

`ThemeToggle.tsx` в шапке — `JellySegmented` с тремя иконками (`IconMonitor`/`IconSun`/`IconMoon`).
Понадобилось обобщить `JellySegmented`: `SegmentOption.label` был `string`, стал `ReactNode` (под
иконки), добавлен `compact` проп (плотнее паддинг для групп из одних иконок без текста) и
`ariaLabel` на опцию (для скринридеров, раз видимого текста в лейбле больше нет).

### Копирование/вставка ноды (`ScenarioEditorPage.tsx`)

`Ctrl/Cmd+C` на выбранной ноде → `structuredClone(node.data)` + текущая позиция в `useRef` (буфер
обмена, не модульный стор — сознательно не переживает переход на другой сценарий, см. `agents.md`).
`Ctrl/Cmd+V` → новая нода с новым `localId` (через `nanoid()`, как и любая другая новая нода) и
**без** `stepId` из скопированной — вставленная нода становится реальным сохранённым шагом только
после следующего `save`, до этого момента `stepId` не должен указывать на чужой сохранённый шаг.
Позиция — со смещением `+32px` от координат скопированной ноды, накапливающимся при нескольких
`Ctrl+V` подряд (`pasteCountRef`), чтобы вставленные копии не ложились точно друг на друга.

Слушатель на `window` явно игнорирует событие, если `event.target` — `input`/`textarea`/
`contentEditable` (та же проверка `isTypingTarget`, что уже применялась для `Backspace`/`Delete` на
рёбрах) — иначе перехватывал бы обычный копипаст текста в полях формы (название сценария,
поля конфиг-панели).

### Адаптивная раскладка (телефон → 34″ монитор)

Высота "на весь экран" построена flex-цепочкой, не вычитанием пикселей из `100vh`: `.app-shell`
(`flex-column`, `min-height: 100dvh`, `100vh` — запасной вариант для браузеров без `dvh`) →
`.app-main` (тоже `flex-column`, `flex: 1`) → `.editor-page`/`.run-monitor-page` (`flex: 1;
min-height: 0`) → `.editor-body`/`.editor-canvas` — тоже с `min-height: 0` на каждом уровне
(без явного `min-height:0` на промежуточном flex-контейнере `min-height:auto` по умолчанию не даёт
содержимому сжаться меньше собственного контента — цепочка "отваливается" на первом же пропущенном
звене). Это устойчиво к переменной высоте шапки (двухстрочная на телефоне, однострочная на
десктопе) — в отличие от прежнего `height: calc(100vh - 110px)`.

Брейкпоинты (единообразно во всех местах, где это применимо):
- `max-width: 1180px` — боковые панели редактора/монитора чуть теснее (`gap` уменьшается), раскладка
  ещё трёхколоночная.
- `max-width: 880px` — переключение в мобильную раскладку: `.editor-body`/`.run-monitor-body` →
  `flex-direction: column`; `StepPalette` становится горизонтальной лентой с прокруткой
  (`flex-direction: row; overflow-x: auto`) вместо вертикальной колонки, чтобы не отнимать высоту у
  холста; `ConfigPanel`/`QueueItemsDrawer` — на всю ширину под холстом, а не сбоку.
- `max-width: 720px`/`480px` — шапка приложения: сначала прячется текстовая часть логотипа (иконка
  остаётся), затем сжимаются паддинги/шрифт навигации.
- `max-width: 560px` — строки списков (`ScenarioCard`, аналогично `RunHistoryRow`) переносятся
  (`flex-wrap`) вместо сжатия в нечитаемую кашу: инфо-блок занимает первую строку целиком, метаданные
  и действия — следующей.

На широких мониторах — списки (`ScenarioListPage`/`RunsListPage`) получили увеличенный, но всё ещё
capped `max-width` (`min(2200px, 94vw)` / `min(1400px, 92vw)`) — растянутые без предела строки
списка на 3440px выглядели бы нелепо (контент прижат по краям одной сверхширокой строки). У
`.editor-page`/`.run-monitor-page` `max-width` убран вовсе — холст-граф осмысленно использует всю
доступную ширину (граф реально удобнее с бо́льшим холстом, там нет "строк", которые могли бы
выглядеть нелепо растянутыми). На 3440×1440 холст редактора занимает 3112px из 3440 (остаток —
фиксированная 220px палитра + отступы).

**Найденный и исправленный баг с порядком CSS-правил** — см. `agents.md`, раздел "Адаптивность":
`@media`-блок, расположенный РАНЬШЕ безусловного правила с той же специфичностью в одном файле,
проигрывает каскад независимо от того, совпадает ли медиа-условие. Диагностируется только через
`matchMedia(...).matches` + `getComputedStyle(...)` в консоли реального узкого вьюпорта — визуально
неотличимо от "адаптивность не работает вообще".

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
