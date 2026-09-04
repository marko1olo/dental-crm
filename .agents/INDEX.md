# 🗺️ DENTE Dental CRM — Master Documentation Index & Cross-Linking Highway

> **ГЛАВНЫЙ ИНТЕРТЕКСТУАЛЬНЫЙ НАВИГАЦИОННЫЙ ХАБ СИСТЕМЫ**  
> ⚠️ **Высшая Конституция (Supreme Law):** **[THE_HAMMER_MASTER_PROMPT.md](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md)**  
> 📜 **Системная Конституция:** **[.agents/AGENTS.md](file:///C:/Clinic_MVP/dental-crm/.agents/AGENTS.md)** (Мандаты 1..11, Mandate 8e — Запрет на палки в колёса врачам)  
> 🚪 **Корневой входной файл:** **[AGENTS.md (Root)](file:///C:/Clinic_MVP/dental-crm/AGENTS.md)**  
> ⚙️ **Шимы платформ:** **[GEMINI.md](file:///C:/Clinic_MVP/dental-crm/GEMINI.md)** | **[CLAUDE.md](file:///C:/Clinic_MVP/dental-crm/CLAUDE.md)**  
> 📚 **Портал документации docs/:** **[docs/README.md](file:///C:/Clinic_MVP/dental-crm/docs/README.md)**  

---

## ⚡ AI Agent Navigation Matrix (Матрица Быстрого Перехода)

> **ПРАВИЛО ДЛЯ ВСЕХ ИИ-АГЕНТОВ:** Не блуждай по дереву файлов наугад. Найди свою задачу в таблице ниже, прочитай указанные документы целиком от первого до последнего символа, и только после этого открывай файлы кодовой базы.

| Если твоя задача (Task Domain) | Читай обязательные документы (Target Docs) | Ключевые файлы кода в репозитории |
|:---|:---|:---|
| **Архитектура монорепо, шина WS, прокси** | 1. **[ARCHITECTURE.md](file:///C:/Clinic_MVP/dental-crm/.agents/ARCHITECTURE.md)**<br>2. **[00-product-architecture.md](file:///C:/Clinic_MVP/dental-crm/docs/00-product-architecture.md)** | `apps/api/src/server.ts`<br>`apps/api/src/services/websocketBroker.ts`<br>`packages/shared/` |
| **База данных PostgreSQL, Drizzle, RLS, миграции** | 1. **[DATABASE.md](file:///C:/Clinic_MVP/dental-crm/.agents/DATABASE.md)**<br>2. **[DATABASE_DEEP_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/DATABASE_DEEP_MAP.md)** | `apps/api/src/db/schema.ts`<br>`apps/api/src/db/client.ts`<br>`drizzle/*.sql` |
| **Развёртывание локальной БД, `uuidv7()`** | 1. **[DATABASE_SETUP.md](file:///C:/Clinic_MVP/dental-crm/.agents/DATABASE_SETUP.md)**<br>2. **[DATABASE.md](file:///C:/Clinic_MVP/dental-crm/.agents/DATABASE.md)** | `apps/api/src/scripts/migrate.ts`<br>`apps/api/drizzle.config.ts` |
| **Бэкенд-маршруты Fastify, контроллеры, API** | 1. **[API_ROUTES_DEEP_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/API_ROUTES_DEEP_MAP.md)**<br>2. **[ARCHITECTURE.md](file:///C:/Clinic_MVP/dental-crm/.agents/ARCHITECTURE.md)** | `apps/api/src/routes/*.ts`<br>`apps/api/src/services/` |
| **Фронтенд React 19, экраны, вьюпорты, модалки** | 1. **[UI_STANDARDS.md](file:///C:/Clinic_MVP/dental-crm/.agents/UI_STANDARDS.md)**<br>2. **[FRONTEND_COMPONENTS_DEEP_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/FRONTEND_COMPONENTS_DEEP_MAP.md)** | `apps/web/src/*.tsx`<br>`apps/web/src/components/` |
| **God Context (`useAppLogic.tsx`), стейты** | 1. **[UI_STANDARDS.md](file:///C:/Clinic_MVP/dental-crm/.agents/UI_STANDARDS.md)**<br>2. **[.agents/AGENTS.md (Правило 11)](file:///C:/Clinic_MVP/dental-crm/.agents/AGENTS.md)** | `apps/web/src/useAppLogic.tsx`<br>`apps/web/src/contexts/AppLogicContext.tsx`<br>`apps/web/src/store/` |
| **Клинический контур, ЭМК, дневник 043/у, МКБ-10** | 1. **[01_CLINICAL_RAILS.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/01_CLINICAL_EHR_AND_ODONTOGRAM_RAILS.md)**<br>2. **[CLINICAL_RULES.md](file:///C:/Clinic_MVP/dental-crm/.agents/CLINICAL_RULES.md)**<br>3. **[THE_HAMMER_MASTER_PROMPT.md (Разд. VII)](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md)** | `apps/web/src/VisitView.tsx`<br>`apps/web/src/components/visit/`<br>`apps/api/src/routes/clinical.ts` |
| **Зубная формула (FDI 11–48), одонтограмма, эндо** | 1. **[ARCHITECTURE.md (docs)](file:///C:/Clinic_MVP/dental-crm/docs/ARCHITECTURE.md)**<br>2. **[01_CLINICAL_RAILS.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/01_CLINICAL_EHR_AND_ODONTOGRAM_RAILS.md)** | `apps/web/src/components/odontogram/`<br>`apps/web/src/components/odontogram/ToothChart.tsx` |
| **Планы лечения, сметы, 3 тарифа лечения** | 1. **[STOM_PLAN_PREMIUM_SPEC.md](file:///C:/Clinic_MVP/dental-crm/docs/architecture/STOM_PLAN_PREMIUM_SPEC.md)**<br>2. **[CLINICAL_USER_MANUAL.md](file:///C:/Clinic_MVP/dental-crm/docs/CLINICAL_USER_MANUAL.md)** | `apps/web/src/components/treatment-plans/`<br>`apps/api/src/routes/treatmentPlans.ts` |
| **Касса 54-ФЗ, чеки ОФД, платежи, скидки, авансы** | 1. **[BILLING_AND_FINANCE.md](file:///C:/Clinic_MVP/dental-crm/.agents/BILLING_AND_FINANCE.md)**<br>2. **[02_FINANCIAL_RAILS.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/02_FINANCIAL_CASHBOXES_INSTALLMENTS_AND_PAYROLL_RAILS.md)**<br>3. **[THE_HAMMER_MASTER_PROMPT.md (Разд. VII)](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md)** | `apps/web/src/components/finance/`<br>`apps/api/src/routes/billing.ts`<br>`apps/api/src/routes/fiscal.ts` |
| **Семейные балансы, кошельки, списание средств** | 1. **[BILLING_AND_FINANCE.md](file:///C:/Clinic_MVP/dental-crm/.agents/BILLING_AND_FINANCE.md)** | `apps/api/src/routes/finance_family.ts`<br>`apps/web/src/components/finance/FamilyWalletModal.tsx` |
| **Зарплата врачей Т-51 Net Revenue, наряды ЗТЛ** | 1. **[02_FINANCIAL_RAILS.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/02_FINANCIAL_CASHBOXES_INSTALLMENTS_AND_PAYROLL_RAILS.md)**<br>2. **[STOMX_BIBLE.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/STOMX_REVERSE_ENGINEERING_BIBLE.md)** | `apps/api/src/services/finance/doctorPayouts.ts`<br>`apps/api/src/routes/labOrders.ts` |
| **Склад, материалы, СанПиН 3.3686-21, карпулы** | 1. **[03_LEGAL_AND_WAREHOUSE_RAILS.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/03_LEGAL_DOCUMENTS_UKEP_AND_WAREHOUSE_RAILS.md)**<br>2. **[THE_HAMMER_MASTER_PROMPT.md (Разд. VII)](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md)** | `apps/web/src/components/warehouse/`<br>`apps/api/src/routes/warehouse/`<br>`apps/web/src/components/sterilization/` |
| **Печать документов, PDF, ИДС, 13% НДФЛ** | 1. **[DOCUMENTS_LIFECYCLE.md](file:///C:/Clinic_MVP/dental-crm/.agents/DOCUMENTS_LIFECYCLE.md)**<br>2. **[12-document-generation-forms.md](file:///C:/Clinic_MVP/dental-crm/docs/12-document-generation-forms.md)** | `apps/api/src/routes/documents.ts`<br>`apps/web/src/DocumentsView.tsx`<br>`apps/api/src/services/documents/` |
| **3D DICOM PACS, томограммы КЛКТ, MPR срезы** | 1. **[DICOM_3D_MPR_SPEC.md](file:///C:/Clinic_MVP/dental-crm/docs/architecture/DICOM_3D_MPR_SPEC.md)**<br>2. **[CLINICAL_USER_MANUAL.md](file:///C:/Clinic_MVP/dental-crm/docs/CLINICAL_USER_MANUAL.md)** | `apps/web/src/ImagingView.tsx`<br>`apps/web/src/components/imaging/`<br>`apps/web/src/workers/mprWorker.ts` |
| **Телефония (Mango/Zadarma/UIS), софтфон, звонки** | 1. **[TELEPHONY_AND_PORTAL.md](file:///C:/Clinic_MVP/dental-crm/.agents/TELEPHONY_AND_PORTAL.md)** | `apps/api/src/routes/telephony.ts`<br>`apps/web/src/components/telephony/`<br>`apps/web/src/components/IncomingCallToast.tsx` |
| **Пациентский портал PWA, OTP-авторизация** | 1. **[TELEPHONY_AND_PORTAL.md](file:///C:/Clinic_MVP/dental-crm/.agents/TELEPHONY_AND_PORTAL.md)** | `apps/web/src/components/portal/`<br>`apps/api/src/routes/portal.ts` |
| **Мессенджеры (WhatsApp WABA, VK MAX, Telegram)** | 1. **[MESSENGERS.md](file:///C:/Clinic_MVP/dental-crm/.agents/MESSENGERS.md)** | `apps/api/src/routes/whatsapp.ts`<br>`apps/api/src/routes/max.ts`<br>`apps/api/src/routes/telegram.ts` |
| **Голосовой ввод, Whisper STT, AI Copilot** | 1. **[05-speech-transcription-plan.md](file:///C:/Clinic_MVP/dental-crm/docs/05-speech-transcription-plan.md)**<br>2. **[ARCHITECTURE.md](file:///C:/Clinic_MVP/dental-crm/.agents/ARCHITECTURE.md)** | `apps/api/src/speech/`<br>`apps/api/src/routes/speech.ts`<br>`apps/web/src/components/speech/` |
| **Паритет фич конкурентов (IDENT, DentalPRO, iStom)** | 1. **[FEATURES_REGISTRY.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/FEATURES_REGISTRY.md)**<br>2. **[OUR_CRM_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/OUR_CRM_MAP.md)**<br>3. **[BACKLOG.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/BACKLOG.md)** | Все модули репозитория |
| **Библия реверс-инжиниринга StomX** | 1. **[STOMX_BIBLE.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/STOMX_REVERSE_ENGINEERING_BIBLE.md)** | 133 API, 68 RBAC, 89 дефектов, 448 протоколов 043/у |
| **Тестирование, тайпчек, сборка, линтеры** | 1. **[COMMANDS_AND_TESTS.md](file:///C:/Clinic_MVP/dental-crm/.agents/COMMANDS_AND_TESTS.md)**<br>2. **[SCRIPTS_AND_CLI_DEEP_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/SCRIPTS_AND_CLI_DEEP_MAP.md)** | `scripts/*.mjs`<br>`scripts/*.cjs`<br>`package.json` |
| **Инквизиция интерфейса, аудит тем, ликвидация блоата** | 1. **[inquisition/00_INDEX.md](file:///C:/Clinic_MVP/dental-crm/docs/inquisition/00_INDEX.md)**<br>2. **[BLOAT_CENSUS_PHASE_3.md](file:///C:/Clinic_MVP/dental-crm/docs/audit/BLOAT_CENSUS_PHASE_3.md)**<br>3. **[THE_HAMMER_MASTER_PROMPT.md (Разд. IV, VI)](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md)** | `apps/web/src/styles/`<br>Playwright скриншоты 4-State |

---

## 🗺️ Полная Карта Документации Репозитория

### 1. Конституция и Системное Управление (`.agents/`)
1. **[THE_HAMMER_MASTER_PROMPT.md](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md)** — Высшая Конституция проекта (CTO Supremacy, презумпция брака, запрет сикофантии, стандарты macOS/iOS HIG, мандат автономии врачей 8e).
2. **[MASTER_PROMPT.md](file:///C:/Clinic_MVP/dental-crm/.agents/MASTER_PROMPT.md)** — Идентичное зеркало Высшей Конституции.
3. **[AGENTS.md (.agents)](file:///C:/Clinic_MVP/dental-crm/.agents/AGENTS.md)** — Системный закон монорепозитория: мандаты 1..11, PostgreSQL 18 на 127.0.0.1:5432, правила компиляторов, ast-grep read/write split, пофайловый git add, точность денег до копейки.
4. **[AGENTS.md (Корневой)](file:///C:/Clinic_MVP/dental-crm/AGENTS.md)** — Точка входа для агентов (Codex, Copilot, Windsurf, Claude).
5. **[GEMINI.md](file:///C:/Clinic_MVP/dental-crm/GEMINI.md)** — Платформенный шим для агентов Google Gemini / Antigravity.
6. **[CLAUDE.md](file:///C:/Clinic_MVP/dental-crm/CLAUDE.md)** — Платформенный шим для агентов Anthropic Claude Code.
7. **[BRIEFING.md](file:///C:/Clinic_MVP/dental-crm/.agents/BRIEFING.md)** — Постоянный операционный брифинг и протоколы передачи управления.
8. **[ORIGINAL_REQUEST.md](file:///C:/Clinic_MVP/dental-crm/.agents/ORIGINAL_REQUEST.md)** — Летопись требований и спринтов (NIGHT WATCH, Red Team, Клинический аудит).

### 2. Техническая Архитектура и База Данных (`.agents/`)
9. **[ARCHITECTURE.md](file:///C:/Clinic_MVP/dental-crm/.agents/ARCHITECTURE.md)** — Архитектура монорепозитория (`apps/api`, `apps/web`, `packages/shared`), Fastify API, React 19, WebSocket-брокер, ротация STT ключей.
10. **[DATABASE.md](file:///C:/Clinic_MVP/dental-crm/.agents/DATABASE.md)** — Drizzle ORM PostgreSQL 18.4 (`.data/pg18`, порт 5432), пул соединений, RLS, замеры таблиц, регламент миграций.
11. **[DATABASE_SETUP.md](file:///C:/Clinic_MVP/dental-crm/.agents/DATABASE_SETUP.md)** — Развёртывание PostgreSQL, обход ошибки `0040`, PL/pgSQL полифилл `uuidv7()`.
12. **[COMMANDS_AND_TESTS.md](file:///C:/Clinic_MVP/dental-crm/.agents/COMMANDS_AND_TESTS.md)** — Справочник команд сборки, 5-этапный typecheck, проверка кодировок UTF-8 и E2E smoke-тесты.
13. **[UI_STANDARDS.md](file:///C:/Clinic_MVP/dental-crm/.agents/UI_STANDARDS.md)** — Стандарты Tailwind CSS, Vanilla CSS, правила God Context `useAppLogic.tsx` и предзагрузка вьюпортов (`workspacePreload.ts`).

### 3. Функциональные Модули CRM (`.agents/`)
14. **[CLINICAL_RULES.md](file:///C:/Clinic_MVP/dental-crm/.agents/CLINICAL_RULES.md)** — Движок клинических правил, проверка противопоказаний, триггеры услуг и связывание с Мандатом 8e.
15. **[BILLING_AND_FINANCE.md](file:///C:/Clinic_MVP/dental-crm/.agents/BILLING_AND_FINANCE.md)** — Идемпотентность платежей по `clientMutationId`, 54-ФЗ, общие семейные кошельки.
16. **[DOCUMENTS_LIFECYCLE.md](file:///C:/Clinic_MVP/dental-crm/.agents/DOCUMENTS_LIFECYCLE.md)** — Жизненный цикл документов (draft / issued / voided), headless Chromium/Edge генератор PDF, SHA-256 подпись.
17. **[TELEPHONY_AND_PORTAL.md](file:///C:/Clinic_MVP/dental-crm/.agents/TELEPHONY_AND_PORTAL.md)** — Вебхуки АТС Mango/Zadarma, WebSocket-нотификации входящих звонков, OTP-авторизация личного кабинета.
18. **[MESSENGERS.md](file:///C:/Clinic_MVP/dental-crm/.agents/MESSENGERS.md)** — WhatsApp Cloud API WABA, VK MAX bot, маршруты и конфигурации каналов связи.

### 4. Реестр Конкурентного Аудита и Реверс-Инжиниринг (`docs/competitive-audit/`)
19. **[FEATURES_REGISTRY.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/FEATURES_REGISTRY.md)** — Таблица 63 канонических фич конкурентов (IDENT, DentalPRO, iStom) с оценкой ценности и строками доказательств.
20. **[OUR_CRM_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/OUR_CRM_MAP.md)** — Детальная карта возможностей нашей CRM по всем 10 функциональным доменам.
21. **[BACKLOG.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/BACKLOG.md)** — Архитектурные спецификации и файлы реализации для фич со статусами `[НЕТ]` и `[ЧАСТИЧНО]`.
22. **[GAP_REPORT_2026-07-27.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/GAP_REPORT_2026-07-27.md)** — Отчёт по закрытию функциональных разрывов с конкурентами.
23. **[STOMX_REVERSE_ENGINEERING_BIBLE.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/STOMX_REVERSE_ENGINEERING_BIBLE.md)** — Библия реверс-инжиниринга StomX (133 API, 68 RBAC, 89 дефектов, 448 шаблонов 043/у, 49 бланков, УКЭП).
24. **[01_CLINICAL_RAILS.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/01_CLINICAL_EHR_AND_ODONTOGRAM_RAILS.md)** — Рельсы клинического контура (55 зубов/челюстей, 91 дефект, 1841 статья МКБ-10).
25. **[02_FINANCIAL_RAILS.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/02_FINANCIAL_CASHBOXES_INSTALLMENTS_AND_PAYROLL_RAILS.md)** — Рельсы финансового контура (6 счетов, рассрочки, наряды ЗТЛ, зарплата Т-51).
26. **[03_LEGAL_AND_WAREHOUSE_RAILS.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/03_LEGAL_DOCUMENTS_UKEP_AND_WAREHOUSE_RAILS.md)** — Рельсы склада и документов (49 бланков, техкарты BOM, МДЛП, списание карпул).
27. **[API_ROUTES_DEEP_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/API_ROUTES_DEEP_MAP.md)** — Полный каталог 48 файлов эндпоинтов Fastify.
28. **[DATABASE_DEEP_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/DATABASE_DEEP_MAP.md)** — Полный каталог таблиц, энумов и связей PostgreSQL 18.
29. **[FRONTEND_COMPONENTS_DEEP_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/FRONTEND_COMPONENTS_DEEP_MAP.md)** — Каталог компонентов фронтенда на React 19.
30. **[ALGORITHMS_AND_SHARED_DEEP_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/ALGORITHMS_AND_SHARED_DEEP_MAP.md)** — Алгоритмы пакета `@dental/shared`, валидаторы Zod, WebWorker 3D DICOM.
31. **[SCRIPTS_AND_CLI_DEEP_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/SCRIPTS_AND_CLI_DEEP_MAP.md)** — Каталог свыше 170 скриптов E2E и валидаторов качества.
32. **[ARCHITECT_HANDOVER.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/ARCHITECT_HANDOVER.md)** — Передача архитектурного контроля.
33. **[FEATURE_SPECS/](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/FEATURE_SPECS)** — Карточки детальных спецификаций по 13 полям.

### 5. База Знаний и Спецификации Проекта (`docs/`)
34. **[docs/README.md](file:///C:/Clinic_MVP/dental-crm/docs/README.md)** — Главный шлюз документации папки `docs/`.
35. **[00-product-architecture.md](file:///C:/Clinic_MVP/dental-crm/docs/00-product-architecture.md)** — Архитектура продукта и целевые пользовательские потоки.
36. **[05-speech-transcription-plan.md](file:///C:/Clinic_MVP/dental-crm/docs/05-speech-transcription-plan.md)** — Архитектура голосовой диктовки и медицинского транскрибирования.
37. **[07-competitive-voice-and-crm-audit.md](file:///C:/Clinic_MVP/dental-crm/docs/07-competitive-voice-and-crm-audit.md)** — Индекс конкурентного аудита речевых и CRM-модулей.
38. **[12-document-generation-forms.md](file:///C:/Clinic_MVP/dental-crm/docs/12-document-generation-forms.md)** — Шаблоны медицинских бланков и юридических актов.
39. **[CLINICAL_USER_MANUAL.md](file:///C:/Clinic_MVP/dental-crm/docs/CLINICAL_USER_MANUAL.md)** — Клиническое руководство пользователя: КЛКТ, Хаунсфилд (D1–D4), сметы, Dental UX.
40. **[docs/ARCHITECTURE.md](file:///C:/Clinic_MVP/dental-crm/docs/ARCHITECTURE.md)** — Автомат состояний зуба FDI 11–48 и финансовые инварианты.
41. **[DEEP_SYSTEM_AUDIT_REPORT.md](file:///C:/Clinic_MVP/dental-crm/docs/architecture/DEEP_SYSTEM_AUDIT_REPORT.md)** — Глубокий аудит бэкенда, фронтенда, клиники и финансов.
42. **[DICOM_3D_MPR_SPEC.md](file:///C:/Clinic_MVP/dental-crm/docs/architecture/DICOM_3D_MPR_SPEC.md)** — Архитектурная спецификация 3D DICOM MPR.
43. **[STOM_PLAN_PREMIUM_SPEC.md](file:///C:/Clinic_MVP/dental-crm/docs/architecture/STOM_PLAN_PREMIUM_SPEC.md)** — Спецификация 3-уровневого интерактивного плана лечения.
44. **[SYSTEM_AUDIT_AND_DEBT_SPEC.md](file:///C:/Clinic_MVP/dental-crm/docs/architecture/SYSTEM_AUDIT_AND_DEBT_SPEC.md)** — Спецификация техдолга и производительности.
45. **[BLOAT_CENSUS_PHASE_3.md](file:///C:/Clinic_MVP/dental-crm/docs/audit/BLOAT_CENSUS_PHASE_3.md)** — Перепись и ликвидация академического блоата (~9 140 строк).
46. **[CODEBASE_BLOAT_CENSUS_V2.md](file:///C:/Clinic_MVP/dental-crm/docs/audit/CODEBASE_BLOAT_CENSUS_V2.md)** — Вторая фаза ликвидации мертвого кода.
47. **[NIGHT_WATCH_DEFECT_REGISTRY.md](file:///C:/Clinic_MVP/dental-crm/docs/audits/NIGHT_WATCH_DEFECT_REGISTRY.md)** — Реестр устранённых дефектов верстки и эргономики.
48. **[inquisition/00_INDEX.md](file:///C:/Clinic_MVP/dental-crm/docs/inquisition/00_INDEX.md)** — Реестр инквизиции интерфейса (12 стандартов проверки).
49. **[AgentTasks/TASK_BACKLOG_AND_SPECIFICATIONS.md](file:///C:/Clinic_MVP/dental-crm/docs/AgentTasks/TASK_BACKLOG_AND_SPECIFICATIONS.md)** — Общий реестр задач агентов.

---

## 🚨 КРИТИЧЕСКИЕ ИНВАРИАНТЫ АРХИТЕКТУРЫ (THE IRON GATES)

1. **Никаких моков (Zero-Mocks Policy):**
   - Запрещено писать фиктивные API-ответы, симуляторы на Canvas или плейсхолдеры в UI.
   - Всё подключается строго к реальной базе данных PostgreSQL 18 через типизированные запросы Drizzle ORM.
2. **Мандат 8e: Запрет на палки в колёса врачам и персоналу (Doctor Autonomy):**
   - Софт обязан помогать врачу лечить людей, а не служить бюрократическим цербером.
   - Кнопки «Сохранить», «Завершить приём», «Добавить услугу», «Печать» НИКОГДА не блокируются (`disabled`) из-за незаполненных второстепенных полей.
   - Физиологическая норма («Соматически здоров / Осмотр в норме») заполняется в 1 клик.
   - Свобода черновиков 043/у с debounced autosave. Смена вкладки или звонок никогда не уничтожают черновик.
   - Печать документов в любой момент (незакрытый приём — штамп «ЧЕРНОВИК», закрытый — «ПОДПИСАНО ВРАЧОМ»).
   - Врач свободно применяет скидки до 100% на переделки и персонал без мастер-паролей администратора.
   - Касса 54-ФЗ не требует ИНН с физических лиц при оплате налом/картой; принимает комбинированную оплату в 1 клик.
   - Медсестра списывает пустые карпулы анестетиков в 1 клик без комиссии из 3 человек.
3. **Стандарты Эргономики и Верстки Apple & Mac (Studio Clinical HIG):**
   - **80% Десктоп ПК:** Плотная профессиональная вёрстка (панель пилота), компактные тулбары 32–36px, быстрые хоткеи (`Cmd/Ctrl+K`, `Esc`), 150ms Hover HUD, 0-клик касса 54-ФЗ.
   - **10% Планшет у кресла:** Тач-таргеты строго >= 44x44px, нативный Segmented Control вместо 2500px скролла смет.
   - **10% Портал пациента:** Стандарт Apple Health, 1-тап запись, 1-клик справка 13% НДФЛ (ФНС КНД 1151156).
   - **Анти-Матрёшка:** Максимальная глубина модальных окон — СТРОГО 1. Никаких карточек внутри карточек.
   - **Строгая медицинская типографика:** Никаких эмодзи в картах 043/у, актах, чеках — только векторные иконки Lucide.
4. **Технологический Стек и Окружение:**
   - **Фронтенд:** React **19** (19.2.7) + Vite + Tailwind CSS. (Не React 18!).
   - **Бэкенд:** Node.js + Fastify 4+ + TypeScript.
   - **СУБД:** Нативный PostgreSQL **18.4** по TCP на `127.0.0.1:5432` (`.data/pg18`). (PGlite НЕ установлен!).
   - **Бизнес-логика:** Пакет `packages/shared/` (@dental/shared).
5. **Ограничения God Context (`apps/web/src/useAppLogic.tsx`):**
   - Монолитный хук состояния экспортирует массивный объект контекста `AppLogicContext`.
   - Запрещено удалять или менять сигнатуры существующих полей без обновления всех зависимых UI-компонентов.
6. **Финансовая и Юридическая Точность (ACID):**
   - Все денежные суммы хранятся и рассчитываются ИСКЛЮЧИТЕЛЬНО в целочисленных копейках (типы `BIGINT`). Запрещен `float`/`double`.
   - Все транзакции, изменяющие финансовый или клинический статус, выполняются в строгих ACID-транзакциях.
7. **Кодировка UTF-8 и Пофайловый Git:**
   - Запрет моджибаке: PowerShell here-strings и `node -e` для ЗАПИСИ кириллицы запрещены. Все файлы — строгий UTF-8.
   - `git add <файл>` строго по конкретным изменённым файлам. Запрещено использовать `git add .`, чтобы не затереть работу соседних агентов роя.
