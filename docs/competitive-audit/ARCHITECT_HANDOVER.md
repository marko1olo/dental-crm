# ARCHITECT_HANDOVER.md — Передача дел Нейросети-Архитектору (AI Architect Briefing)

> 🧭 **Навигация:** [🗺️ Главный Индекс (.agents/INDEX.md)](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md) | [📚 Портал Документации (docs/README.md)](file:///C:/Clinic_MVP/dental-crm/docs/README.md)  
> ⚠️ **Высшая Конституция:** [THE_HAMMER_MASTER_PROMPT.md](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md) | [Системная Конституция (.agents/AGENTS.md)](file:///C:/Clinic_MVP/dental-crm/.agents/AGENTS.md)  
> 🛑 **Клиническая Автономия Врача:** [Мандат 8e (Zero-Friction)](file:///C:/Clinic_MVP/dental-crm/.agents/AGENTS.md) | [CLINICAL_RULES.md](file:///C:/Clinic_MVP/dental-crm/.agents/CLINICAL_RULES.md)  
>
> **КРИТИЧЕСКИ ВАЖНО ДЛЯ НОВОГО АГЕНТА/АРХИТЕКТОРА:**  
> Этот документ содержит исчерпывающее руководство по результатам масштабного конкурентного аудита и дип-документирования монорепозитория **Dental CRM (DENTE)**. Прочти его перед началом планирования и внедрения фич.

---

## 1. Чем занимался предшествующий агент (Резюме этапа)

1. **Режим работы**: Был активирован режим **«Документируем, не внедряем»** (Аддендум 2). Продуктовый код CRM не подвергался деструктивным правкам, не создавались сырые миграции. Конечный продукт этапа — **полный монолит системной документации**.
2. **Аудит источника конкурентов**: Полностью разобран 2961-строчный текстовый дамп возможностей конкурентов (**IDENT**, **DentalPRO**, **iStom**).
3. **Извлечение и систематизация**: Извлечено **63 уникальных канонических фичи**, для каждой присвоен свой `feature_key`, статус в нашей CRM, оценка ценности (1–5), сложность и привязка к исходным строкам.
4. **Сквозной аудит нашей Dental CRM**:
   - Задокументированы все **48 бэкенд-файлов API-маршрутов** (`apps/api/src/routes/*.ts`).
   - Задокументирована база данных PostgreSQL 18 (Drizzle ORM `schema.ts`, все энумы и **31 вид юридических документов**).
   - Задокументированы все фронтенд-компоненты (`apps/web/src`), 14 представлений (`AppView`), 3-уровневая архитектура (Tier 1/2/3), 3D DICOM MPR просмотрщик, WebWorker КТ-реконструкции, шлюз речевой диктовки и 170+ смоук-тестов.
   - Зафиксированы 6 обязательных pre-commit гейтов качества кода (`check-encoding.mjs`, `check-css-tokens.mjs`, `check-dynamic-imports.mjs`, `check-applogic-stub-overrides.mjs`, `check-fetch-response-guard.mjs`, `check-env-contract.mjs`).
5. **Создание инфраструктуры правил**: Все документы привязаны к конституциям агентов ([GEMINI.md](file:///C:/Clinic_MVP/dental-crm/GEMINI.md), [CLAUDE.md](file:///C:/Clinic_MVP/dental-crm/CLAUDE.md), [.clauderules](file:///C:/Clinic_MVP/dental-crm/.clauderules), [AGENTS.md](file:///C:/Clinic_MVP/dental-crm/AGENTS.md), [.agents/INDEX.md](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md)).

---

## 2. Что у нас теперь нового в проекте

В директории **`C:\Clinic_MVP\dental-crm\docs\competitive-audit\`** создан полный арсенал планирования:

- 📋 **[FEATURES_REGISTRY.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/FEATURES_REGISTRY.md)** — Главная матрица паритета 63 фич конкурентов со статусами (`[ЛУЧШЕ У НАС]`, `[ЧАСТИЧНО]`, `[НЕТ]`).
- 🗺️ **[OUR_CRM_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/OUR_CRM_MAP.md)** — Карта возможностей нашей CRM по всем 10 функциональным модулям.
- 🗄️ **[DATABASE_DEEP_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/DATABASE_DEEP_MAP.md)** — Карта PostgreSQL, Drizzle ORM энумы и 31 вид юридических бланков.
- 🔌 **[API_ROUTES_DEEP_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/API_ROUTES_DEEP_MAP.md)** — Реестр всех API-эндпоинтов по 48 серверным файлам Fastify.
- 🖥️ **[FRONTEND_COMPONENTS_DEEP_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/FRONTEND_COMPONENTS_DEEP_MAP.md)** — Карта React 19 компонентов, 14 основных представлений (`AppView`), 3-tier архитектура и соблюдение Мандата 8e (мягкие предупреждения вместо блокировок врача, автосейв в IndexedDB, норма в 1 клик).
- 🧮 **[ALGORITHMS_AND_SHARED_DEEP_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/ALGORITHMS_AND_SHARED_DEEP_MAP.md)** — Исчерпывающий справочник модулей пакета `@dental/shared` (деньги в копейках, 54-ФЗ, СанПиН 3.3686-21, ЕГИСЗ РЭМД CDA R3, калькулятор анестезии, техкарты BOM), 3D КТ WebWorker и STT-шлюза.
- 🧪 **[SCRIPTS_AND_CLI_DEEP_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/SCRIPTS_AND_CLI_DEEP_MAP.md)** — Каталог обязательных pre-commit гейтов (кодировки UTF-8, токены CSS, динамические импорты, защита хуков useAppLogic, проверки fetch-ответов, контракт .env), 170+ смоук-тестов и визуального аудита.
- 📐 **[BACKLOG.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/BACKLOG.md)** — Архитектурные варианты внедрения (фичи `[НЕТ]` и `[ЧАСТИЧНО]`).
- 📂 **[FEATURE_SPECS/](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/FEATURE_SPECS)** — 63 детальные карточки спецификаций по 13 обязательным полям.

---

## 3. Как Нейросети-Архитектору работать с этими материалами

1. **Перед взятием фичи в разработку**:
   - Открой [FEATURES_REGISTRY.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/FEATURES_REGISTRY.md) и найди необходимый `feature_key` (например, `маркетинг::фильтр_потерянных_пациентов_в_отчете`).
   - Перейди в файл спецификации `FEATURE_SPECS/<feature_key>.md`. В нем содержатся пользовательская проблема, подробный сценарий, UI-детали, сущности БД и доказательства из выгрузки конкурентов.
2. **Оценка готового бэкенд/фронтенд кода**:
   - Открой [BACKLOG.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/BACKLOG.md). Для каждой фичи описаны варианты реализации с указанием конкретных файлов (`apps/web/src/ScheduleView.tsx`, `apps/api/src/routes/patients.ts`).
   - Используй [API_ROUTES_DEEP_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/API_ROUTES_DEEP_MAP.md) и [DATABASE_DEEP_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/DATABASE_DEEP_MAP.md) для проверки существующих типов и эндпоинтов — в 70% случаев база данных или API уже имеют нужные структуры, нужно лишь дописать фронтенд UI.
3. **Проверка при внедрении (The Iron Gate)**:
   - Перед коммитом обязательно запусти весь комплекс валидаторов:
     * `npm run check:encoding` (строгий UTF-8, защита от можибаки и U+FFFD)
     * `npm run check:css-tokens` (проверка `var(--x)` во всех темах)
     * `npm run check:dynamic-imports` (наличие файлов динамических импортов)
     * `npm run check:stub-overrides` (защита `useAppLogic` от перекрытия хуков заглушками)
     * `npm run check:fetch-response` (обязательная проверка `.ok` / `.status` у `fetch`)
     * `npm run check:env-contract` (проверка контракта `.env.example` с `REQUIRED_ENV`)
     * `npm run typecheck` (полный тайпчек монорепозитория, Exit Code 0)
   - Запусти соответствующие смоук-тесты из [SCRIPTS_AND_CLI_DEEP_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/SCRIPTS_AND_CLI_DEEP_MAP.md).
   - Выполни пофайловый `git add <файл>` (запрещено делать слепой `git add .`!).

---

## 4. Главные КИЛЛЕР-ФИЧИ первого приоритета для планирования

| # | feature_key | Модуль | Приоритет | Что делать |
|---|---|---|---|---|
| 1 | `маркетинг::фильтр_потерянных_пациентов_в_отчете` | Аналитика / Пациенты | **KILLER** | Добавить SQL-фильтр пациентов без будущей записи, листа ожидания и задач |
| 2 | `коммуникации::подтверждение_приема_при_обработке_обращения` | Чаты / Звонки | **KILLER** | Встроить плашку быстрой записи/подтверждения визита в окно чата/звонка |
| 3 | `расписание::виджет_срочные_обращения_под_календарем` | Расписание | **KILLER** | Добавить красный виджет отмен/переносов под мини-календарем |
| 4 | `прием::рабочий_стол_врача` | Приём (EHR) | **KILLER** | Разработать стартовый виджет врача с таймером приема и визиткой пациента |
| 5 | `прием::раздел_проверка_историй_болезни_главврачом` | EHR / Главврач | **KILLER** | Собрать доску контроля качества ЭМК со статусами `Не заполнен` -> `Утверждено` *(Мандат 8e: проверка носит экспертный характер без блокировки врача замками намертво)* |
| 6 | `расписание::буфер_обмена_в_расписании_для_быстрого_переноса` | Расписание | **KILLER** | Реализовать визуальный плавающий буфер переносимой записи |
| 7 | `финансы::отображение_суммы_начислений_врачам_в_прайс_листе` | Прайс-лист / ЗП | **KILLER** | Вывести рассчетную ЗП врача рядом с каждой позицией прейскуранта |
| 8 | `пациенты::причины_списания_в_архив_и_запрет_записи` | Пациенты / CRM | **KILLER** | Добавить флаг блокировки записи (Черный список) во всех модалках |

---

## 🔗 Перекрестные Ссылки
- 🗺️ [Главный Навигационный Индекс (.agents/INDEX.md)](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md)
- 📚 [Портал Технической Документации (docs/README.md)](file:///C:/Clinic_MVP/dental-crm/docs/README.md)
- 🖥️ [Карта Компонентов Фронтенда (FRONTEND_COMPONENTS_DEEP_MAP.md)](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/FRONTEND_COMPONENTS_DEEP_MAP.md)
- 🧪 [Справочник Скриптов и Гейтов (SCRIPTS_AND_CLI_DEEP_MAP.md)](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/SCRIPTS_AND_CLI_DEEP_MAP.md)
- 🧮 [Алгоритмы и Пакет @dental/shared (ALGORITHMS_AND_SHARED_DEEP_MAP.md)](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/ALGORITHMS_AND_SHARED_DEEP_MAP.md)

