# 📚 DENTE Dental CRM — Documentation Hub & Knowledge Base

> **Центральный шлюз документации проекта DENTE Dental CRM**  
> Высшая Конституция: **[THE_HAMMER_MASTER_PROMPT.md](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md)**  
> Системная Конституция: **[.agents/AGENTS.md](file:///C:/Clinic_MVP/dental-crm/.agents/AGENTS.md)**  
> Главный Индекс и Матрица Навигации: **[.agents/INDEX.md](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md)**  

---

## 🗺️ Структура Документации (Documentation Map)

Вся техническая и прикладная документация проекта разделена на специализированные разделы. Перед началом любых разработок, аудитов или рефакторинга изучите соответствующие спецификации.

### 1. Архитектура, Маршруты API и Базовые Спецификации
*   **[INDEX.md](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md)** — Главный интерактивный граф навигации и матрица быстрого перехода для ИИ-агентов.
*   **[API_ROUTES_CATALOG.md](file:///C:/Clinic_MVP/dental-crm/.agents/API_ROUTES_CATALOG.md)** — Исчерпывающий каталог всех 771 роутов Fastify (14 доменов, Zod схемы, RBAC).
*   **[FRONTEND_VIEWS_MAP.md](file:///C:/Clinic_MVP/dental-crm/.agents/FRONTEND_VIEWS_MAP.md)** — Карта всех 14 представлений фронтенда, шторок (Drawers) и модалок по 3-уровневой модели (Tier 1/2/3).
*   **[UI_STANDARDS.md](file:///C:/Clinic_MVP/dental-crm/.agents/UI_STANDARDS.md)** — Стандарты вёрстки Apple/Mac HIG, Tailwind/Vanilla CSS токены, God Context `useAppLogic.tsx`.
*   **[ARCHITECTURE.md (.agents)](file:///C:/Clinic_MVP/dental-crm/.agents/ARCHITECTURE.md)** — Архитектура монорепозитория, Fastify API, Vite + React 19, WebSocket-брокер, ALS контекст `withTenantCtx`.
*   **[00-product-architecture.md](file:///C:/Clinic_MVP/dental-crm/docs/00-product-architecture.md)** — Продуктовая архитектура, роли пользователей и целевые бизнес-процессы.
*   **[ARCHITECTURE.md (docs)](file:///C:/Clinic_MVP/dental-crm/docs/ARCHITECTURE.md)** — Базовая спецификация конечного автомата зуба (FDI 11–48) и финансовых инвариантов СБП.
*   **[DATABASE.md](file:///C:/Clinic_MVP/dental-crm/.agents/DATABASE.md)** — Реестр схемы PostgreSQL 18.4 (`.data/pg18`), 18 модулей, 203 таблицы Drizzle ORM, RLS и миграции.
*   **[DATABASE_SETUP.md](file:///C:/Clinic_MVP/dental-crm/.agents/DATABASE_SETUP.md)** — Инфраструктура развёртывания локальной базы данных, polyfill `uuidv7()` и push-процедуры.
*   **[COMMANDS_AND_TESTS.md](file:///C:/Clinic_MVP/dental-crm/.agents/COMMANDS_AND_TESTS.md)** — Все консольные команды, 5-этапный typecheck, гейты кодировки и E2E smoke-тесты.

### 2. Клинический Контур, Документы и Речевой Ввод
*   **[CLINICAL_RULES.md](file:///C:/Clinic_MVP/dental-crm/.agents/CLINICAL_RULES.md)** — Движок клинических правил, проверка противопоказаний, триггеры и Мандат 8e (Zero-Friction).
*   **[CLINICAL_PROTOCOLS_REGISTRY.md](file:///C:/Clinic_MVP/dental-crm/.agents/CLINICAL_PROTOCOLS_REGISTRY.md)** — Реестр клинических шаблонов 043/у (K02–K08), пакетов комплексных услуг 804н, циклов автоклава B и формуляра анестезии.
*   **[CLINICAL_USER_MANUAL.md](file:///C:/Clinic_MVP/dental-crm/docs/CLINICAL_USER_MANUAL.md)** — Клиническое руководство: работа с КЛКТ, расчёт Хаунсфилда (D1–D4), сметы, импорт и Dental UX законы.
*   **[DOCUMENTS_LIFECYCLE.md](file:///C:/Clinic_MVP/dental-crm/.agents/DOCUMENTS_LIFECYCLE.md)** — Жизненный цикл документов, генерация PDF через headless Chromium/Edge, хеширование SHA-256, штамп ЧЕРНОВИК и УКЭП.
*   **[12-document-generation-forms.md](file:///C:/Clinic_MVP/dental-crm/docs/12-document-generation-forms.md)** — Спецификации медицинских бланков (ИДС, договоры, справки НДФЛ КНД 1151156, акты 804н).
*   **[05-speech-transcription-plan.md](file:///C:/Clinic_MVP/dental-crm/docs/05-speech-transcription-plan.md)** — Архитектура распознавания речи (Whisper/Yandex/Groq), нормализация терминов и защита от галлюцинаций.

### 3. Финансы, Касса 54-ФЗ и Склад
*   **[BILLING_AND_FINANCE.md](file:///C:/Clinic_MVP/dental-crm/.agents/BILLING_AND_FINANCE.md)** — Идемпотентность платежей (`clientMutationId`), касса 54-ФЗ без ИНН у физлиц, комбинированные оплаты, семейные балансы и кошельки.
*   **[WAREHOUSE_AND_SUPPLY.md](file:///C:/Clinic_MVP/dental-crm/.agents/WAREHOUSE_AND_SUPPLY.md)** — Складской учёт, 1-клик списание пустых карпул медсестрой, техкарты BOM, мягкий овердрафт при задержке накладных.
*   **[02_FINANCIAL_CASHBOXES_INSTALLMENTS_AND_PAYROLL_RAILS.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/02_FINANCIAL_CASHBOXES_INSTALLMENTS_AND_PAYROLL_RAILS.md)** — Многокассовость, рассрочки, наряды ЗТЛ и расчёт зарплат Т-51 Net Revenue.
*   **[03_LEGAL_DOCUMENTS_UKEP_AND_WAREHOUSE_RAILS.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/03_LEGAL_DOCUMENTS_UKEP_AND_WAREHOUSE_RAILS.md)** — Техкарты склада (BOM), СанПиН 3.3686-21, МДЛП Честный Знак.

### 4. Коммуникации, Телефония и Пациентский Портал
*   **[TELEPHONY_AND_PORTAL.md](file:///C:/Clinic_MVP/dental-crm/.agents/TELEPHONY_AND_PORTAL.md)** — Вебхуки Mango/Zadarma/UIS, тихий режим софтфона для врача, ambient-баннер для регистратуры, OTP-авторизация и PWA портал.
*   **[MESSENGERS.md](file:///C:/Clinic_MVP/dental-crm/.agents/MESSENGERS.md)** — Интеграция WhatsApp Cloud API, VK MAX bot, единый лог входящих сообщений.

### 5. Реестр Конкурентного Паритета и Реверс-Инжиниринг (`competitive-audit/`)
*   **[FEATURES_REGISTRY.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/FEATURES_REGISTRY.md)** — Канонический реестр 63 уникальных фич конкурентов (IDENT, DentalPRO, iStom) с доказательствами и статусами.
*   **[OUR_CRM_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/OUR_CRM_MAP.md)** — Полная карта возможностей кодовой базы DENTE по всем модулям.
*   **[BACKLOG.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/BACKLOG.md)** — Архитектурные варианты реализации для фич со статусами `[НЕТ]` и `[ЧАСТИЧНО]`.
*   **[GAP_REPORT_2026-07-27.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/GAP_REPORT_2026-07-27.md)** — Актуальный отчёт по ликвидации функциональных разрывов.
*   **[STOMX_REVERSE_ENGINEERING_BIBLE.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/STOMX_REVERSE_ENGINEERING_BIBLE.md)** — Полная библия реверс-инжиниринга StomX (133 API, 68 RBAC, 89 дефектов зубов, 448 протоколов 043/у, 49 бланков, УКЭП).
*   **[01_CLINICAL_EHR_AND_ODONTOGRAM_RAILS.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/01_CLINICAL_EHR_AND_ODONTOGRAM_RAILS.md)** — Рельсы миграции клинического контура (55 зубов/челюстей, 91 дефект, 1841 статья МКБ-10).
*   **Глубокие карты системы:**
    *   **[API_ROUTES_DEEP_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/API_ROUTES_DEEP_MAP.md)** — Каталог всех 48 файлов бэкенд-маршрутов Fastify.
    *   **[DATABASE_DEEP_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/DATABASE_DEEP_MAP.md)** — Детальный разбор таблиц, энумов и связей PostgreSQL 18.
    *   **[FRONTEND_COMPONENTS_DEEP_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/FRONTEND_COMPONENTS_DEEP_MAP.md)** — Каталог компонентов React 19, вьюпортов и модальных окон.
    *   **[ALGORITHMS_AND_SHARED_DEEP_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/ALGORITHMS_AND_SHARED_DEEP_MAP.md)** — Алгоритмы пакета `@dental/shared`, валидация Zod, расчёты НДФЛ и 3D DICOM WebWorker.
    *   **[SCRIPTS_AND_CLI_DEEP_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/SCRIPTS_AND_CLI_DEEP_MAP.md)** — Каталог свыше 170 скриптов автоматизации, E2E и визуального аудита.
    *   **[ARCHITECT_HANDOVER.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/ARCHITECT_HANDOVER.md)** — Акт передачи архитектурного контроля и исторический контекст.
    *   **[FEATURE_SPECS/](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/FEATURE_SPECS)** — Карточки детальных спецификаций по 13 обязательным полям.

### 6. Системные Аудиты и Борьба с Блоатом (`architecture/` и `audit/`)
*   **[DEEP_SYSTEM_AUDIT_REPORT.md](file:///C:/Clinic_MVP/dental-crm/docs/architecture/DEEP_SYSTEM_AUDIT_REPORT.md)** — Глубокий аудит бэкенда, фронтенда, клиники и финансов от 16 августа 2026.
*   **[DICOM_3D_MPR_SPEC.md](file:///C:/Clinic_MVP/dental-crm/docs/architecture/DICOM_3D_MPR_SPEC.md)** — Архитектурная спецификация 3D DICOM Multi-Planar Reconstruction (MPR).
*   **[STOM_PLAN_PREMIUM_SPEC.md](file:///C:/Clinic_MVP/dental-crm/docs/architecture/STOM_PLAN_PREMIUM_SPEC.md)** — Спецификация 3-уровневого интерактивного плана лечения (Эконом, Оптимум, Премиум).
*   **[SYSTEM_AUDIT_AND_DEBT_SPEC.md](file:///C:/Clinic_MVP/dental-crm/docs/architecture/SYSTEM_AUDIT_AND_DEBT_SPEC.md)** — Спецификация технического долга и оптимизации производительности.
*   **[BLOAT_CENSUS_PHASE_3.md](file:///C:/Clinic_MVP/dental-crm/docs/audit/BLOAT_CENSUS_PHASE_3.md)** — Перепись академического блоата и процедурных симуляций (ликвидировано ~9 140 строк).
*   **[CODEBASE_BLOAT_CENSUS_V2.md](file:///C:/Clinic_MVP/dental-crm/docs/audit/CODEBASE_BLOAT_CENSUS_V2.md)** — Вторая фаза ликвидации дублирующих модулей.
*   **[NIGHT_WATCH_DEFECT_REGISTRY.md](file:///C:/Clinic_MVP/dental-crm/docs/audits/NIGHT_WATCH_DEFECT_REGISTRY.md)** — Реестр устранённых дефектов верстки, тач-таргетов и контрастности.

### 7. Инквизиция Интерфейса и Стандарты Эргономики (`inquisition/`)
*   **[00_INDEX.md (Inquisition)](file:///C:/Clinic_MVP/dental-crm/docs/inquisition/00_INDEX.md)** — Главный реестр инквизиции интерфейса (12 стандартов проверки).
*   Руководства по ликвидации дефектов:
    *   `01_DARK_MODE_CONTRAST_DEFECTS.md` — Гигиена контраста в Dark Mode (WCAG AAA >= 4.5:1, отсутствие слепящих белых пятен).
    *   `02_LIGHT_MODE_CONTRAST_DEFECTS.md` — Гигиена контраста в Light Mode (запрет бледного серого текста).
    *   `03_MOBILE_390PX_OVERFLOW_DEFECTS.md` — Адаптивность 390px без горизонтального скролла.
    *   `04_ZINDEX_COLLISION_DEFECTS.md` — Единая шкала z-index без коллизий виджетов и модалок.
    *   `05_FITTS_TOUCH_TARGET_DEFECTS.md` — Закон Фиттса: мобильные тач-таргеты строго >= 44x44px.
    *   `06_HICKS_MILLER_OVERLOAD_DEFECTS.md` — Законы Хика и Миллера: максимум 1 главное действие, скрытие в `...`.
    *   `07_CBCT_RADIOLOGY_TRUTH_DEFECTS.md` — Реальный 16-bit DICOM без бутафорских Canvas-диорам.
    *   `08_MEDICAL_DENSITY_DEFECTS.md` — Медицинская плотность macOS HIG (32–36px тулбары на десктопе).
    *   `09_TYPOGRAPHY_EMOJIS_DEFECTS.md` — Строгая медицинская типографика, абсолютный запрет эмодзи в картах и актах.
    *   `10_ANTI_MATRYOSHKA_DEFECTS.md` — Закон Анти-Матрёшки (глубина карточек и модалок <= 1).
    *   `11_SCREENSHOT_PIPELINE_AUTHENTICITY.md` — Доказательство скриншотами с живого сервера.
    *   `12_WORKER_SQUADS_DISPATCH_PROMPTS.md` — Инструкции и шаблоны вызова субагентов-ликвидаторов.

### 8. Бэклог Задач и Спринтов (`AgentTasks/`)
*   **[TASK_BACKLOG_AND_SPECIFICATIONS.md](file:///C:/Clinic_MVP/dental-crm/docs/AgentTasks/TASK_BACKLOG_AND_SPECIFICATIONS.md)** — Общий реестр задач агентов и спецификации модулей.
*   **[TASK_BACKLOG_SPRINT_5.md](file:///C:/Clinic_MVP/dental-crm/docs/AgentTasks/TASK_BACKLOG_SPRINT_5.md)** — Задачи Спринта 5.
*   **[TASK_BACKLOG_SPRINT_6.md](file:///C:/Clinic_MVP/dental-crm/docs/AgentTasks/TASK_BACKLOG_SPRINT_6.md)** — Задачи Спринта 6.

---

## 🚨 Фундаментальные Принципы Разработки

1. **Никаких моков (Zero Mocks):** Все API и UI привязаны к реальным данным PostgreSQL 18. Заглушки, `// TODO`, плейсхолдеры запрещены.
2. **Мандат 8e: Запрет на палки в колёса врачам и персоналу:**
   - Никаких неактивных (`disabled`) кнопок без объяснения причины.
   - Физиологическая норма («Соматически здоров / Осмотр в норме») заполняется в 1 клик.
   - Свобода сохранения черновиков 043/у с debounced autosave.
   - Печать документов в любой момент (со штампом «ЧЕРНОВИК» при незакрытом визите).
   - Свобода скидок врача до 100% на переделки без мастер-паролей.
   - Касса 54-ФЗ без требования ИНН с физлиц, комбинированная оплата в 1 клик.
   - Медсестра списывает пустые карпулы анестетиков в 1 клик без комиссии из 3 человек.
3. **Стандарты Apple & Mac HIG (Studio Clinical HIG):**
   - Десктопная плотность (тулбары 32–36px, хоткеи Cmd/Ctrl+K, Esc, 150ms Hover HUD).
   - Мобильная эргономика (тач-таргеты >= 44x44px, нативный Segmented Control вместо 2500px скролла).
   - Максимальная глубина модалок — СТРОГО 1 (Анти-Матрёшка).
   - Никаких эмодзи в медицинских и финансовых документах — только строгие векторные иконки Lucide.
4. **Строгий UTF-8 и пофайловый `git add`:** Запрет использования PowerShell here-strings для записи кириллицы. Коммиты атомарны, только по конкретным изменённым файлам задачи.
