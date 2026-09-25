# 🧪 Справочник Автоматизации, Pre-Commit Гейтов и Тестов Dental CRM (`scripts/`)

> 🧭 **Навигация:** [🗺️ Главный Индекс (.agents/INDEX.md)](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md) | [📚 Портал Документации (docs/README.md)](file:///C:/Clinic_MVP/dental-crm/docs/README.md)  
> ⚠️ **Высшая Конституция:** [THE_HAMMER_MASTER_PROMPT.md](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md) | [Системная Конституция (.agents/AGENTS.md)](file:///C:/Clinic_MVP/dental-crm/.agents/AGENTS.md)  
> 🛠️ **Команды и Сборка:** [COMMANDS_AND_TESTS.md](file:///C:/Clinic_MVP/dental-crm/.agents/COMMANDS_AND_TESTS.md) | [UI_STANDARDS.md](file:///C:/Clinic_MVP/dental-crm/.agents/UI_STANDARDS.md)  
> 📦 **Каталог инструментов:** 282 скрипта автоматизации, прекоммит-гейтов, смоук-тестов и визуального аудита в [`scripts/`](file:///C:/Clinic_MVP/dental-crm/scripts/).

---

## 🛡️ 1. Обязательные Pre-Commit Quality Gates (Шлюзы Качества)

Перед выполнением любого коммита в репозитории действует заслон автоматических валидаторов («The Iron Gate»). Эти скрипты предотвращают скрытые дефекты, которые не отлавливаются стандартным компилятором `tsc` или линтерами:

```mermaid
graph TD
    subgraph PRE_COMMIT_GATES["🛡️ ОБЯЗАТЕЛЬНЫЕ ПРЕКОММИТ-ГЕЙТЫ (EXIT CODE 0)"]
        G1["check:encoding<br/>(check-encoding.mjs)"]
        G2["check:css-tokens<br/>(check-css-tokens.mjs)"]
        G3["check:dynamic-imports<br/>(check-dynamic-imports.mjs)"]
        G4["check:stub-overrides<br/>(check-applogic-stub-overrides.mjs)"]
        G5["check:fetch-response<br/>(check-fetch-response-guard.mjs)"]
        G6["check:env-contract<br/>(check-env-contract.mjs)"]
        G7["check:test-safety<br/>(check-test-safety.mjs)"]
        G8["check:declared-guards<br/>(check-declared-guards.mjs)"]
    end

    G1 -->|UTF-8 без BOM и можибаке| PASS["✅ Чистый коммит"]
    G2 -->|Все токены тем разрешимы| PASS
    G3 -->|Файлы импортов на диске| PASS
    G4 -->|useAppLogic не затерт заглушками| PASS
    G5 -->|fetch guarded: .ok / .status| PASS
    G6 -->|REQUIRED_ENV в .env.example| PASS
    G7 -->|Anti-RAM-hog, тайм-ауты <= 60s| PASS
    G8 -->|Все роуты покрыты guard| PASS
```

### Детальное описание обязательных гейтов:

### 1. [`scripts/check-encoding.mjs`](file:///C:/Clinic_MVP/dental-crm/scripts/check-encoding.mjs) (`npm run check:encoding`)
- **Назначение:** Тотальная проверка кодировки всех 5130+ текстовых файлов репозитория на строгое соответствие **UTF-8 без BOM**.
- **Ловит 4 класса критических дефектов:**
  1. *Не-UTF-8 байты:* файлы в кодировке Windows-1251 (CP1251) или иных ANSI кодировках.
  2. *Символ замены `U+FFFD` (``):* следы уже произошедшей необратимой порчи кириллицы при некорректном чтении/записи скриптами.
  3. *Можибака CP1252:* UTF-8, ошибочно прочитанный как Windows-1252 (характерные пары «D с чертой» `Ð` и «N с тильдой» `Ñ` перед знаками верхней половины ASCII).
  4. *Можибака CP1251:* UTF-8, прочитанный как Windows-1251 (байты `0xD0`/`0xD1` превращаются в кириллические «Р» и «С» подряд, маскируясь под валидный русский текст).
- **Особое правило:** В самом скрипте искомые маркеры записаны только Unicode escape-последовательностями (`\uFFFD`, `\u00D0` и т.д.), исключая ложное самосрабатывание.

### 2. [`scripts/check-css-tokens.mjs`](file:///C:/Clinic_MVP/dental-crm/scripts/check-css-tokens.mjs) (`npm run check:css-tokens`)
- **Назначение:** Поиск обращений к CSS-переменным `var(--x)`, которые не могут быть разрешены ни в одной из тем оформления приложения (`data-theme`).
- **Почему это критично:** Несуществующая переменная в CSS не валит сборку и не дает предупреждений в консоли; свойство становится `invalid at computed-value time`. Для `color` это означает «текст исчез/пропал», для `background` — прозрачная плашка, ломающая верстку. Компилятор TypeScript этого не видит.
- **Особенности алгоритма:**
  - Проверяет наличие fallback-значения по месту вызова.
  - Очищает комментарии CSS перед анализом, чтобы примеры дефектов в документации не считались объявлениями.
  - Учитывает переменные, объявляемые через `@property` или динамически выставляемые из TypeScript/JS через `style.setProperty`.

### 3. [`scripts/check-dynamic-imports.mjs`](file:///C:/Clinic_MVP/dental-crm/scripts/check-dynamic-imports.mjs) (`npm run check:dynamic-imports`)
- **Назначение:** Валидация всех динамических импортов вида `await import("./path/module.js")` и `import("...")` с относительными путями в `apps/api/src`, `apps/web/src`, `packages/shared/src`.
- **Почему это критично:** Компилятор TypeScript не проверяет физическое существование файлов при строковых динамических импортах. Если модуль удален или переименован, `tsc` дает Exit Code 0, а сервер или клиент падает во время выполнения (Runtime Crash) при первом обращении к роуту.
- **Особенности:** Разрешает относительные пути на диске, учитывая расширения `.ts`, `.tsx`, `.js`, `.mjs`, и возвращает ненулевой код при обнаружении «висячих» ссылок.

### 4. [`scripts/check-applogic-stub-overrides.mjs`](file:///C:/Clinic_MVP/dental-crm/scripts/check-applogic-stub-overrides.mjs) (`npm run check:stub-overrides`)
- **Назначение:** TypeScript AST-гейт для центрального стейт-менеджера `apps/web/src/useAppLogic.tsx`.
- **Почему это критично:** `useAppLogic` собирает финальный возвращаемый объект, сначала раскрывая доменные хуки (`...useImagingQueries()`, `...useClinicalVisitLogic()`), а затем перечисляя вспомогательные свойства. В литерале объекта JS побеждает последний объявленный ключ. Случайная заглушка `pickBrowserImagingFiles: () => {}` или `: null`, объявленная ниже spread-оператора, **молча перекрывает живую реализацию из модуля**. Поскольку типы совпадают (`() => void`), `typecheck` остается чистым, но кнопка в UI перестает работать.
- **Особенности:** Полный обход AST-дерева через TypeScript Compiler API, сверка экспортов каждого раскрытого модуля с ключами литерала.

### 5. [`scripts/check-fetch-response-guard.mjs`](file:///C:/Clinic_MVP/dental-crm/scripts/check-fetch-response-guard.mjs) (`npm run check:fetch-response`)
- **Назначение:** Обязательная проверка HTTP-статуса ответа `fetch` (`response.ok` или `response.status`) до вызова метода десериализации тела `response.json()`.
- **Почему это критично:** Нативный промис `fetch` в JavaScript отклоняется (`reject`) **исключительно при аппаратном сбое сети**. Ответы с кодами 403 Forbidden, 404 Not Found, 500 Internal Server Error возвращаются как успешно разрешенный промис. Без проверки `if (!res.ok)` тело ошибки `{ error: "Access Denied" }` попадает в стейт вместо массива данных, провоцируя `TypeError: data.map is not a function` или пустые экраны.
- **Особенности:** Парсинг AST, отслеживание имени переменной ответа и обязательный поиск обращений к полям `.ok` или `.status` в области видимости функции до разбора данных.

### 6. [`scripts/check-env-contract.mjs`](file:///C:/Clinic_MVP/dental-crm/scripts/check-env-contract.mjs) (`npm run check:env-contract`)
- **Назначение:** Проверка синхронизации файла-шаблона `.env.example` с программным контрактом обязательных переменных окружения `REQUIRED_ENV` (`apps/api/src/env/requiredEnv.ts`).
- **Почему это критично:** Если разработчик добавляет новый секрет или эндпоинт в схему приложения, но забывает добавить строку объявления в `.env.example`, развертывание нового стенда или контейнера завершается аварийным падением при старте сервера.

### 7. [`scripts/check-test-safety.mjs`](file:///C:/Clinic_MVP/dental-crm/scripts/check-test-safety.mjs) (`npm run check:test-safety`)
- **Назначение:** Реализация Anti-RAM-Hog & Test Memory Leak Law.
- **Проверки:**
  - Запрет бесконечных тайм-аутов (`--test-timeout=0`) в тестах.
  - Лимит тайм-аута: $\le 10\text{с}$ на юнит-тест, $\le 60\text{с}$ на тестовый сьют.
  - Запрет кустарных рекурсивных DOM-моков (`setupMockDom`, циклы `parentNode`/`children`), вызывающих утечки Node.js heap до 25+ ГБ.
  - Обязательный клининг таймеров и подписок (`clearInterval`, `root.unmount()`).

### 8. [`scripts/check-declared-guards.mjs`](file:///C:/Clinic_MVP/dental-crm/scripts/check-declared-guards.mjs) (`npm run check:guards`)
- **Назначение:** Верификация наличия авторизационных гардов и контекста тенанта на всех маршрутах API.

---

## 🔍 2. Дополнительные Гейты Целостности и Архитектуры

* **[`scripts/check-tracked-ignored.mjs`](file:///C:/Clinic_MVP/dental-crm/scripts/check-tracked-ignored.mjs)** — Поиск файлов, попавших в индекс Git вопреки правилам `.gitignore`.
* **[`scripts/check-guarded-route-headers.mjs`](file:///C:/Clinic_MVP/dental-crm/scripts/check-guarded-route-headers.mjs)** — Валидация передачи обязательных заголовков авторизации и тенант-контекста во всех клиентах API.
* **[`scripts/check-route-callers.mjs`](file:///C:/Clinic_MVP/dental-crm/scripts/check-route-callers.mjs)** — Реестр клиентских вызовов эндпоинтов для выявления сиротских маршрутов.
* **[`scripts/check-schema-type-drift.mjs`](file:///C:/Clinic_MVP/dental-crm/scripts/check-schema-type-drift.mjs)** — Проверка дрейфа типов между Drizzle ORM схемой PostgreSQL и TypeScript DTO.
* **[`scripts/check-imports-in-git.mjs`](file:///C:/Clinic_MVP/dental-crm/scripts/check-imports-in-git.mjs)** — Проверка корректности импортов отслеживаемых файлов.

---

## 📸 3. Скрипты Визуального Аудита и 4-State Proof

В соответствии с правилами визуальной верификации (Mandatory 4-State Visual Proof: PC Light, PC Dark, Mobile Light, Mobile Dark) применяются следующие инструменты:

* **[`scripts/comprehensive-visual-audit.mjs`](file:///C:/Clinic_MVP/dental-crm/scripts/comprehensive-visual-audit.mjs)** — Комплексный визуальный аудит всех 14 экранов CRM с поиском выпадений текста и ошибок адаптивности.
* **[`scripts/screenshot-all-views.mjs`](file:///C:/Clinic_MVP/dental-crm/scripts/screenshot-all-views.mjs)** — Автоматический захват скриншотов главных представлений (`Shift`, `Schedule`, `Patients`, `Imaging`, `Visit`, `Documents`, `Finance`, `Settings`, `Analytics`).
* **[`scripts/capture-honest-screenshot.cjs`](file:///C:/Clinic_MVP/dental-crm/scripts/capture-honest-screenshot.cjs)** — Захват физического состояния интерфейса строго с работающего dev-сервера с валидацией HTTP 200 OK.
* **[`scripts/capture-real-lifecycle-proofs.mjs`](file:///C:/Clinic_MVP/dental-crm/scripts/capture-real-lifecycle-proofs.mjs)** — Снятие визуальных доказательств сквозного жизненного цикла пациента (от онлайн-записи до чека 54-ФЗ).
* **[`scripts/detect-overflows.mjs`](file:///C:/Clinic_MVP/dental-crm/scripts/detect-overflows.mjs)** — Автоматический сканер горизонтального паразитного скролла (`overflow-x`) и наездов элементов на мобильных вьюпортах (390px iPhone 14).
* **[`scripts/dente-redesign-shots.mjs`](file:///C:/Clinic_MVP/dental-crm/scripts/dente-redesign-shots.mjs)** — Сквозная фиксация экранов редизайна студии.
* **[`scripts/form043-viewport-shots.mjs`](file:///C:/Clinic_MVP/dental-crm/scripts/form043-viewport-shots.mjs)** — Проверка рендеринга типографских бланков Формы 043/у.

---

## 🧪 4. Набор Smoke-Тестов Проверки Качества (Quality Gates Suite)

В репозитории развернуто свыше 140 смоук-тестов и проверочных сценариев:

* **[`scripts/run-smoke-suite.mjs`](file:///C:/Clinic_MVP/dental-crm/scripts/run-smoke-suite.mjs)** (`npm run smoke:all`) — Главный консольный раннер автономных smoke-тестов проекта.
* **[`scripts/run-chain-proofs.mjs`](file:///C:/Clinic_MVP/dental-crm/scripts/run-chain-proofs.mjs)** (`npm run chains`) — Прогон сквозных цепочек доказательств бизнес-логики.
* **[`scripts/smoke-tax-knd-xml.mjs`](file:///C:/Clinic_MVP/dental-crm/scripts/smoke-tax-knd-xml.mjs)** — Проверка корректности формирования XML справок 13% НДФЛ по стандарту ФНС РФ (КНД 1151156).
* **[`scripts/smoke-dicom-folder-workup.mjs`](file:///C:/Clinic_MVP/dental-crm/scripts/smoke-dicom-folder-workup.mjs)** — Проверка парсинга бинарных 16-bit DICOM файлов, вычисления срезов MPR и денситометрии Хаунсфилда.
* **[`scripts/smoke-speech-groq-chunk-floor.mjs`](file:///C:/Clinic_MVP/dental-crm/scripts/smoke-speech-groq-chunk-floor.mjs)** — Валидация устойчивости голосового шлюза диктовки при неравномерном аудиопотоке.
* **[`scripts/smoke-payment-idempotency.mjs`](file:///C:/Clinic_MVP/dental-crm/scripts/smoke-payment-idempotency.mjs)** — Тестирование защиты от повторных списаний средств по UUIDv7 ключам идемпотентности.
* **[`scripts/smoke-telegram-bot.mjs`](file:///C:/Clinic_MVP/dental-crm/scripts/smoke-telegram-bot.mjs)** — Валидация командного интерфейса и вебхуков Telegram-бота.
* **[`scripts/smoke-clinical-mutation-guard.mjs`](file:///C:/Clinic_MVP/dental-crm/scripts/smoke-clinical-mutation-guard.mjs)** — Проверка невозможности несанкционированной мутации закрытых медицинских протоколов.
* **[`scripts/smoke-import-contracts.mjs`](file:///C:/Clinic_MVP/dental-crm/scripts/smoke-import-contracts.mjs)** — Проверка парсеров миграции баз данных из сторонних CRM (IDENT, DentalPRO, Инфодент).
* **[`scripts/smoke-document-guards.mjs`](file:///C:/Clinic_MVP/dental-crm/scripts/smoke-document-guards.mjs)** — Тестирование прав доступа и юридической защиты документов.
* **Волновые сценарии граничных условий:** `smoke:wave6` .. `smoke:wave15` (тестирование редких клинических коллизий, многопоточных кассовых смен, нестандартных кодировок).

---

## 🤖 5. Инструменты Оркестрации и Реанимации Субагентов (`antigravity_*`)

* **[`scripts/antigravity_transcript_relay.cjs`](file:///C:/Clinic_MVP/dental-crm/scripts/antigravity_transcript_relay.cjs)** — Глубокий парсер транскриптов упавших или заблокированных субагентов (извлечение измененных файлов, команд, блоков `thinking` и подготовка Handover Prompt).
* **[`scripts/antigravity_binary_patcher.cjs`](file:///C:/Clinic_MVP/dental-crm/scripts/antigravity_binary_patcher.cjs)** — Прямой патчер бинарника `language_server.exe` (нейтрализация проверки пустой таблицы детей `7E rel8` -> `90 90` NOP NOP).
* **[`scripts/antigravity_asar_bridge.cjs`](file:///C:/Clinic_MVP/dental-crm/scripts/antigravity_asar_bridge.cjs)** — Мост взаимодействия с пакетами расширений IDE.
* **[`scripts/antigravity_resuscitation_watchdog.cjs`](file:///C:/Clinic_MVP/dental-crm/scripts/antigravity_resuscitation_watchdog.cjs)** — Фоновый сторожевой процесс мониторинга зависания субагентов.
* **[`scripts/antigravity_swarm_resuscitation.cjs`](file:///C:/Clinic_MVP/dental-crm/scripts/antigravity_swarm_resuscitation.cjs)** — Автоматизированный реаниматор роя субагентов при перезапуске сервера.

---

## 📋 6. Сводная Таблица Команд Валидации в `package.json`

| Команда CLI | Исполняемый скрипт / команда | Область проверки |
|---|---|---|
| `npm run check:encoding` | `node scripts/check-encoding.mjs` | Кодировка UTF-8, поиск U+FFFD и можибаки во всех 5130+ файлах |
| `npm run check:css-tokens` | `node scripts/check-css-tokens.mjs` | Валидность CSS-переменных во всех темах приложения |
| `npm run check:dynamic-imports` | `node scripts/check-dynamic-imports.mjs` | Физическое наличие файлов динамических импортов на диске |
| `npm run check:stub-overrides` | `node scripts/check-applogic-stub-overrides.mjs` | Защита от перекрытия хуков заглушками в useAppLogic |
| `npm run check:fetch-response` | `node scripts/check-fetch-response-guard.mjs` | Наличие проверок .ok/.status перед response.json() |
| `npm run check:env-contract` | `node --import tsx scripts/check-env-contract.mjs` | Соответствие .env.example схеме REQUIRED_ENV |
| `npm run check:test-safety` | `node scripts/check-test-safety.mjs` | Anti-RAM-Hog и таймауты тестов |
| `npm run check:guards` | `node scripts/check-declared-guards.mjs` | Наличие авторизационных гардов на маршрутах API |
| `npm run check:tracked-ignored` | `node scripts/check-tracked-ignored.mjs` | Отсутствие заигноренных файлов в индексе Git |
| `npm run typecheck` | `tsc` во всех воркспейсах монорепо | Статическая проверка типов TypeScript (Exit Code 0) |
| `npm run lint` | Комплекс прекоммит-проверок + `typecheck` | Сводный гейт перед коммитом в репозиторий |
| `npm run smoke:all` | `node scripts/run-smoke-suite.mjs` | Полный прогон всех функциональных смоук-тестов |
| `npm run chains` | `node scripts/run-chain-proofs.mjs` | Прогон сквозных цепочек доказательств бизнес-логики |

---

## 🔗 Перекрестные Ссылки
- 🗺️ [Главный Навигационный Индекс (.agents/INDEX.md)](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md)
- 📚 [Портал Технической Документации (docs/README.md)](file:///C:/Clinic_MVP/dental-crm/docs/README.md)
- 🖥️ [Карта Компонентов Фронтенда (FRONTEND_COMPONENTS_DEEP_MAP.md)](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/FRONTEND_COMPONENTS_DEEP_MAP.md)
- 🛣️ [Карта Маршрутов API (API_ROUTES_DEEP_MAP.md)](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/API_ROUTES_DEEP_MAP.md)
- 🗄️ [Карта Базы Данных (DATABASE_DEEP_MAP.md)](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/DATABASE_DEEP_MAP.md)
- 🧮 [Алгоритмы и Пакет @dental/shared (ALGORITHMS_AND_SHARED_DEEP_MAP.md)](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/ALGORITHMS_AND_SHARED_DEEP_MAP.md)
