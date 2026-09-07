# Guide for future development (agents.md)

Правила для тех, кто (человек или агент) продолжает разработку этого фронтенда. Архитектура и
API-контракт — см. [architecture.md](architecture.md); история решений — [roadmap.md](roadmap.md).

## Структура директорий

```
src/
├── api/                       # типизированный HTTP-клиент, граница с бэкендом
├── queries/                   # React Query хуки (queryKeys, *Queries, *Mutations)
├── app/                       # QueryClient и прочая app-wide инфраструктура
├── routes/                    # страницы роутов (тонкие — собирают features/graph в layout)
├── features/                  # экранная логика по фиче (scenarioList, scenarioEditor, runMonitor)
├── graph/                     # DAG-движок: ноды/рёбра/маппинг/layout/физика драга — общий для editor и monitor
├── components/jelly/          # design system примитивы (Blob, JellyButton, ...)
├── components/feedback/       # тосты/баннеры/диалоги подтверждения
├── components/layout/         # AppShell
└── lib/                       # чистые утилиты без React (dates, runStatus)
```

Правило: `api/*` не знает про React (`queries/*` — единственный потребитель `api/*` из UI-кода).
`graph/*` не знает про конкретные страницы — `routes/*` передают ему данные и колбэки, не наоборот.

## Синхронизация с бэкендом при изменении контракта

Бэкенд (`F:\sandbox`) — источник истины. Если меняется DTO/эндпоинт на бэкенде:

1. **Не гадать по памяти или по этому файлу** — прочитать актуальный код контроллера/DTO/record'а
   в `F:\sandbox\src\main\java\com\rpatest`. `roadmap.md`/`architecture.md` фронта могут отставать.
2. Обновить `src/api/types.ts` (поле в поле, включая nullability) и функцию в `api/scenarios.ts`/
   `runs.ts`/`cleanup.ts`.
3. Если меняется форма `config` (JOB/QUEUE/QUEUE_CHECK) — обновить
   `graph/mapping/stepConfigDefaults.ts` (дефолты) и соответствующую zod-схему в
   `features/scenarioEditor/ConfigPanel/validation/stepConfigSchemas.ts` + форму.
4. Обновить таблицу эндпоинтов в `architecture.md`.

## Как добавить новый тип шага (4-й, помимо JOB/QUEUE/QUEUE_CHECK)

Предполагает, что бэкенд уже умеет новый `ScenarioStepType` (см. `F:\sandbox\agents.md`, "Новый тип
шага"). На фронте:

1. `api/types.ts` — новое значение в `ScenarioStepType`, новый `XxxStepConfig` интерфейс, добавить
   в union `StepConfig`.
2. `graph/mapping/stepConfigDefaults.ts` — `defaultXxxConfig()`, ветка в `defaultConfigForType`,
   `normalizeConfig` (уже общий, ничего не трогать), `DEFAULT_STEP_NAME`.
3. `lib/runStatus.ts` — `STEP_TYPE_LABELS`/`STEP_TYPE_DESCRIPTIONS` для нового типа.
4. `components/jelly/tokens.css` — новая пара `--color-xxx`/`--color-xxx-dark`/`--color-xxx-soft`
   (light + dark блоки — **все три места**, см. "Дизайн-система" ниже).
5. `graph/nodes/stepNode.css` — класс `.step-node-xxx { background-color: var(--color-xxx); }`,
   добавить в `TYPE_CLASS` в `StepNode.tsx`.
6. `features/scenarioEditor/StepPalette.tsx` — добавить в массив `TYPES`, класс в `TYPE_CLASS`,
   стиль в `stepPalette.css`.
7. Новая форма `XxxConfigForm.tsx` рядом с `JobConfigForm`/`QueueConfigForm` (свой `useForm` +
   zod-схема в `validation/stepConfigSchemas.ts`) + ветка в `ConfigPanel.tsx`.
8. `features/scenarioList/ScenarioCard.tsx` — `TYPE_TONE` для бейджа счётчика шагов по типу.

Движок графа (`ScenarioGraph`, маппинг, `StepNode`) новый тип шага не требует трогать — он работает
с `ScenarioStepType` как с непрозрачным ключом (та же идея, что `ScenarioExecutionEngine` на
бэкенде обходит DAG независимо от типа шага).

## Правила графа (`graph/*`)

- **`StepNode` — одна нода на оба режима.** Не заводить отдельный компонент для монитора — различие
  только в наличии `data.runtime` (см. `architecture.md`). Дублирование визуальной логики между
  editor/monitor — то, чего специально избегали с самого начала.
- **`localId` vs `stepId`.** `localId` — то, чем шаги ссылаются друг на друга внутри одного запроса
  (`ScenarioRequest`), генерируется через `nanoid()` при создании новой ноды в редакторе и живёт,
  пока не наступит следующий save. `stepId` — числовой id из ответа бэкенда, **меняется при каждом
  `PUT`** (см. `architecture.md`, "Позиции нод"). Никогда не полагаться на то, что `stepId` одного и
  того же логического шага одинаков между двумя сохранениями — использовать индексное сопоставление
  (`zipStepIdsWithPositions`), не искать по `stepId` "тот же" шаг после save.
- **Позиции нод — `layoutStorage`, не бэкенд.** Не пытаться протащить `x`/`y` через `config` шага
  (там строго типизированные `JobStepConfig`/`QueueStepConfig`/`QueueCheckStepConfig` на бэкенде,
  подсовывать туда служебные UI-поля — полагаться на недокументированное поведение Jackson) и не
  заводить под это бэкенд-эндпоинт (это экранный presentation state, не часть домена сценария).
- **`ReactFlowProvider` — внутри `ScenarioGraph`, не снаружи.** `useReactFlow()` (нужен для
  `screenToFlowPosition` при drop из палитры) вызывается в `ScenarioGraphInner`, отдельном
  компоненте-ребёнке `ReactFlowProvider` — хук не может быть вызван в той же функции, что
  инстанцирует сам провайдер (React рендерит JSX-дерево после выполнения тела компонента).
- **HTML5 drag-n-drop и framer-motion не смешивать на одном DOM-узле.** `motion.*` компоненты
  переопределяют `onDrag`/`onDragStart`/`onDragEnd`/`onAnimationStart`/`onAnimationEnd`/
  `onAnimationIteration` под свою жестовую систему — несовместимо с нативным `draggable`+
  `onDragStart(dataTransfer)`. Паттерн (см. `StepPalette.tsx`): внешний обычный `div` с
  `draggable`/`onDragStart`, `motion.div` — только вложенный, для hover/tap.
- **Хэндлы соединения (`.react-flow__handle`) должны оставаться достаточно большими для клика** —
  расширены через `::after { inset: -10px }` (см. `stepNode.css`). Если меняется размер ноды/хэндла,
  не уменьшать хитбокс обратно к дефолтным 10×10 без причины — это реальная проблема при точном
  наведении, не только для автотестов.
- **Растяжение при драге — единый скаляр вдоль вектора скорости, не отдельные X/Y.** Раньше
  считали `stretchX`/`stretchY` независимо с перекрёстными членами — на диагональном движении это
  визуально "не совпадало" с жестом пользователя. Правильная схема (см. `StepNode.tsx`): поворот на
  угол скорости → `scaleX/scaleY` вдоль локальной оси → обратный поворот. Если понадобится похожая
  анимация где-то ещё — переиспользовать этот паттерн, не изобретать по-осевой вариант заново.
- **Clamp растяжения — внутри `useTransform`, не только при `.set()`.** `scaleX = 1 +
  clamp(stretch, 0, MAX)` считается на каждый рендер производного значения — это гарантия, что
  даже перелёт пружины осседания в отрицательную область не даст видимую инверсию ноды. Просто
  ограничивать значение при записи мотион-вэлью недостаточно (сам `animate()` не знает о ваших
  границах и может временно увести значение за них при низком damping).
- **`whileHover`/`whileTap` должны быть отключены (`dragging ? undefined : {...}`), пока xyflow
  реально тащит ноду.** framer-motion детектирует hover/tap независимо от `d3-drag`, на котором
  построен node-drag в `@xyflow/system` — оба остаются активными на всю длительность реального
  перетаскивания и накладывают свои transform-значения поверх любой кастомной драг-анимации. Это
  причина конкретного бага (см. `roadmap.md`, Sprint 11) — держите это правило в голове при
  добавлении новых hover/tap-эффектов на ноду.
- **Тестирование xyflow-взаимодействий через `dispatchEvent` (вручную в консоли или скриптом) —
  указывайте `view: window` в конструкторе `MouseEvent` явно.** `d3-drag` регистрирует
  `mousemove`/`mouseup` через `select(event.view).on(...)`, а `new MouseEvent(type, {...})` без
  явного `view` создаётся с `view: null` — слушатели тихо не навешиваются, ошибок нет, драг просто
  не двигается. `XYHandle` (соединение рёбер) этой особенности не имеет — оттуда и путаница, если
  проверяете сначала connect, потом drag, и что-то вдруг "перестаёт работать".

## Хранение локального состояния

- **React Query** — весь серверный стейт (`queries/*`). Не дублировать в `useState`, кроме
  редактируемых форм.
- **`useNodesState`/`useEdgesState` (`@xyflow/react`)** — локальное состояние холста в редакторе,
  живёт только пока открыта `ScenarioEditorPage`. Синхронизируется из `useScenario(id)` один раз
  через `useEffect` при первой загрузке данных (см. `ScenarioEditorPage.tsx`,
  `loadedScenarioId`-guard) — не пересинхронизировать на каждый рефетч, иначе слетят
  несохранённые правки пользователя.
- **`localStorage`** — только два осознанных исключения из "источник истины — сервер": layout нод
  (`layoutStorage.ts`) и журнал прогонов (`runHistory.ts`, см. `architecture.md`) — оба существуют
  потому, что бэкенд физически не хранит/не отдаёт эту информацию. Не заводить туда что-то ещё без
  такой же причины.
- **Модульный стор (`toastStore.ts`, `runHistory.ts`)** — для состояния, которое нужно мутировать
  из кода вне React дерева (`queryClient.ts` создаётся до рендера) или читать вне компонента
  (`ScenarioCard` читает `runHistory.lastForScenario` напрямую, без подписки). Если используете с
  `useSyncExternalStore` — снимок (`getSnapshot`) обязан быть стабильной (`===`) ссылкой между
  вызовами, пока данные не менялись (см. `runHistory.cachedSnapshot`) — пересчитывать заново на
  каждый вызов `list()` нельзя, React уйдёт в бесконечный ре-рендер. Не заводить новый стор без
  необходимости — если состояние доступно из компонента, обычный `useState`/React Query
  предпочтительнее.

## Дизайн-система

- Каждый новый цвет — CSS custom property в `tokens.css`, определяется в **трёх местах**: `:root`
  (light по умолчанию), `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }`,
  `:root[data-theme="dark"]` (на случай будущего явного переключателя — сейчас не используется, но
  оставлено готовым). Забыть одно из трёх — цвет "не переключится" в одном из путей темизации.
- Никаких захардкоженных hex/rgb цветов внутри компонентов — только `var(--...)`.
- Все интерактивные transition — `framer-motion` со `type: 'spring'`. Обычный CSS
  `transition: ... ease` допустим только для мелких некритичных штрихов (например, фокус на инпуте),
  не для hover/tap/статусных переходов, которые и есть суть "желейности" по требованиям задачи.
- **Liquid Glass — только для "хромовых" поверхностей, не для цветных нод/кнопок.** `Blob`/
  `JellyPanel` принимают `glass` (в `JellyPanel` — `true` по умолчанию): полупрозрачный фон +
  `backdrop-filter: blur() saturate()` + стеклянный ободок вместо сплошного `--surface`. Токены
  `--glass-bg`/`--glass-border`/`--glass-blur`/`--glass-shine` — в тех же трёх местах `tokens.css`,
  что и остальная палитра. Не включать `glass` на `StepNode`/`JellyButton` с их собственным
  насыщенным цветом типа — так JOB/QUEUE/QUEUE_CHECK перестанут различаться на глаз; стекло — для
  панелей/строк списков/шапки, которые "плавают" над контентом, а не сами являются контентом.

## Формы конфига шага

- Форма — источник истины, пока панель открыта; `onChange` пробрасывает нормализованный объект
  наверх при каждом изменении (`useEffect` на `JSON.stringify(watch())` — сознательный компромисс,
  не оптимизация производительности, а простота; если формы станут тяжелее, рассмотреть
  `useWatch`+debounce).
- zod — **v4**, не v3: `z.record` требует двух аргументов (`z.record(keySchema, valueSchema)`),
  синтаксис из туториалов под v3 (`z.record(valueSchema)`) не скомпилируется.
- Не блокировать `save` на фронтовой валидации специфичной для типа шага логики (например,
  "id либо name" для JOB) сверх UI-подсказки — бэкенд сам не проверяет это на `create`/`update`,
  только в момент `run`. Ужесточать одновременно с бэкендом, не раньше (иначе разойдётся с
  реальным поведением API).

## Стиль кода

- Без комментариев "что делает код" — только там, где неочевидна причина (нестабильность `stepId`
  между сохранениями, опечатка `maxRetray`, несовместимость framer-motion с HTML5 dnd и т.п. — уже
  оставлены рядом с соответствующим кодом, не дублировать их в новых местах "для верности").
- Строгая типизация на границе с бэкендом (`api/types.ts`) — никаких `any`. Данные `config`
  (`Record<string, unknown>` с бэкенда) приводятся к типу через `normalizeConfig`
  (`stepConfigDefaults.ts`), не через слепой `as`.
- Один компонент — один файл, соответствующий `.css` рядом (не CSS-in-JS, не Tailwind — по
  умолчанию проекта, см. `roadmap.md` Sprint 3).
- Списки — строки на всю ширину (`flex-direction: column`), не CSS grid карточек: грид с
  несколькими текстовыми кнопками в узкой колонке переполняется и тихо обрезается `overflow:hidden`
  у `Blob` (реальный баг, см. `roadmap.md` Sprint 10). Действие с длинной подписью в тесном ряду —
  кандидат на icon-кнопку (`JellyButton iconOnly` + иконка из `components/jelly/icons.tsx`,
  обязательно с `title`/`aria-label`), а не на уменьшение текста.

## Проверка перед PR

Тестов (unit/e2e) в проекте пока нет (см. `roadmap.md`, Backlog) — проверка чисто через:

1. `npx tsc -b --noEmit` — обязательно чисто (strict mode).
2. `npm run build` — должен пройти (иначе прод не соберётся).
3. `npm run lint` (oxlint) — новые warning'и объяснимы (см. пример `set-state-in-effect` в
   `ScenarioEditorPage.tsx` — осознанный, не подавлять произвольно чужие).
4. Вручную в браузере: если менялся граф/формы — собрать сценарий с разветвлением, сохранить,
   перезагрузить страницу, убедиться что топология и config не потерялись. Если менялся монитор —
   прогнать реальный запуск против бэкенда (нужен поднятый Postgres + `F:\sandbox` jar, см.
   `roadmap.md` "Открытые риски").
