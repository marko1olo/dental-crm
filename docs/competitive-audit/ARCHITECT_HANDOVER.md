# ARCHITECT_HANDOVER.md — Передача дел Нейросети-Архитектору (AI Architect Briefing)

> **КРИТИЧЕСКИ ВАЖНО ДЛЯ НОВОГО АГЕНТА/АРХИТЕКТОРА:**
> Этот документ содержит исчерпывающее руководство по результатам масштабного конкурентного аудита и дип-документирования монорепозитория **Dental CRM (DENTE)**. Прочти его перед началом планирования и внедрения фич.

---

## 1. Чем занимался предшествующий агент (Резюме этапа)

1. **Режим работы**: Был активирован режим **«Документируем, не внедряем»** (Аддендум 2). Продуктовый код CRM не подвергался деструктивным правкам, не создавались сырые миграции. Конечный продукт этапа — **полный монолит системной документации**.
2. **Аудит источника конкурентов**: Полностью разобран 2961-строчный текстовый дамп возможностей конкурентов (**IDENT**, **DentalPRO**, **iStom**).
3. **Извлечение и систематизация**: Извлечено **63 уникальных канонических фичи**, для каждой присвоен свой `feature_key`, статус в нашей CRM, оценка ценности (1–5), сложность и привязка к исходным строкам.
4. **Сквозной аудит нашей Dental CRM**:
   - Задокументированы все **48 бэкенд-файлов API-маршрутов** (`apps/api/src/routes/*.ts`).
   - Задокументирована база данных PostgreSQL (Drizzle ORM `schema.ts`, все энумы и **31 вид юридических документов**).
   - Задокументированы все фронтенд-компоненты (`apps/web/src`), 3D DICOM MPR просмотрщик, WebWorker КТ-реконструкции, шлюз речевой диктовки и 170+ смоук-тестов.
5. **Создание инфраструктуры правил**: Все документы привязаны к конституциям агентов ([GEMINI.md](file:///C:/Clinic_MVP/dental-crm/GEMINI.md), [CLAUDE.md](file:///C:/Clinic_MVP/dental-crm/CLAUDE.md), [.clauderules](file:///C:/Clinic_MVP/dental-crm/.clauderules), [AGENTS.md](file:///C:/Clinic_MVP/dental-crm/AGENTS.md), [.agents/INDEX.md](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md)).

---

## 2. Что у нас теперь нового в проекте

В директории **`C:\Clinic_MVP\dental-crm\docs\competitive-audit\`** создан полный арсенал планирования:

- 📋 **[FEATURES_REGISTRY.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/FEATURES_REGISTRY.md)** — Главная матрица паритета 63 фич конкурентов со статусами (`[ЛУЧШЕ У НАС]`, `[ЧАСТИЧНО]`, `[НЕТ]`).
- 🗺️ **[OUR_CRM_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/OUR_CRM_MAP.md)** — Карта возможностей нашей CRM по всем 9 модулям.
- 🗄️ **[DATABASE_DEEP_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/DATABASE_DEEP_MAP.md)** — Карта PostgreSQL, Drizzle ORM энумы и 31 вид юридических бланков.
- 🔌 **[API_ROUTES_DEEP_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/API_ROUTES_DEEP_MAP.md)** — Реестр всех API-эндпоинтов по 48 серверным файлам.
- 🖥️ **[FRONTEND_COMPONENTS_DEEP_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/FRONTEND_COMPONENTS_DEEP_MAP.md)** — Карта React 18 компонентов, предпросмотров и панелей.
- 🧮 **[ALGORITHMS_AND_SHARED_DEEP_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/ALGORITHMS_AND_SHARED_DEEP_MAP.md)** — Справочник пакета `@dental/shared`, 3D КТ WebWorker и STT-шлюза.
- 🧪 **[SCRIPTS_AND_CLI_DEEP_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/SCRIPTS_AND_CLI_DEEP_MAP.md)** — Каталог 170+ смоук-тестов и Playwright аудитов.
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
3. **Проверка при внедрении**:
   - После любого изменения кодовой базы запусти компиляцию: `npm run typecheck`.
   - Запусти соответствующие смоук-тесты из [SCRIPTS_AND_CLI_DEEP_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/SCRIPTS_AND_CLI_DEEP_MAP.md).

---

## 4. Главные КИЛЛЕР-ФИЧИ первого приоритета для планирования

| # | feature_key | Модуль | Приоритет | Что делать |
|---|---|---|---|---|
| 1 | `маркетинг::фильтр_потерянных_пациентов_в_отчете` | Аналитика / Пациенты | **KILLER** | Добавить SQL-фильтр пациентов без будущей записи, листа ожидания и задач |
| 2 | `коммуникации::подтверждение_приема_при_обработке_обращения` | Чаты / Звонки | **KILLER** | Встроить плашку быстрой записи/подтверждения визита в окно чата/звонка |
| 3 | `расписание::виджет_срочные_обращения_под_календарем` | Расписание | **KILLER** | Добавить красный виджет отмен/переносов под мини-календарем |
| 4 | `прием::рабочий_стол_врача` | Приём (EHR) | **KILLER** | Разработать стартовый виджет врача с таймером приема и визиткой пациента |
| 5 | `прием::раздел_проверка_историй_болезни_главврачом` | EHR / Главврач | **KILLER** | Собрать доску контроля качества ЭМК со статусами `Не заполнен` -> `Утверждено` |
| 6 | `расписание::буфер_обмена_в_расписании_для_быстрого_переноса` | Расписание | **KILLER** | Реализовать визуальный плавающий буфер переносимой записи |
| 7 | `финансы::отображение_суммы_начислений_врачам_в_прайс_листе` | Прайс-лист / ЗП | **KILLER** | Вывести рассчетную ЗП врача рядом с каждой позицией прейскуранта |
| 8 | `пациенты::причины_списания_в_архив_и_запрет_записи` | Пациенты / CRM | **KILLER** | Добавить флаг блокировки записи (Черный список) во всех модалках |
