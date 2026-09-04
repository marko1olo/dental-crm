# 🧭 .agents/ — Системный Каталог и Архитектурный Центр Управления

> 🧭 **Навигация:** [🗺️ Главный Индекс (.agents/INDEX.md)](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md) | [📚 Портал Документации (docs/README.md)](file:///C:/Clinic_MVP/dental-crm/docs/README.md) | [⚖️ Высшая Конституция (THE_HAMMER)](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md)

---

## ⛔ СТРОЖАЙШЕЕ ПРЕДУПРЕЖДЕНИЕ ДЛЯ ВСЕХ ИИ-АГЕНТОВ (CRITICAL WARNING)

> ⚠️ **АРХИВНЫЙ СТАТУС ВЛОЖЕННЫХ ПАПОК:**
> Все поддиректории вида `.agents/orchestrator_r*`, `.agents/worker_r*`, `.agents/sentinel_r*`, `.agents/archon*`, `.agents/reviewer_*` представляют собой **ИСТОРИЧЕСКИЙ РАБОЧИЙ АРХИВ (SCRATCHPADS & AUDIT LOGS) ПРОШЛЫХ РАУНДОВ**.
> 
> **КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО:**
> 1. Брать задачи, «незавершенные» бэклоги или требования из старых файлов `plan.md`, `BRIEFING.md`, `TODO.md` или `handoff.md` внутри этих папок!
> 2. Считать описанные там промежуточные проблемы актуальными дефектами без живой инструментальной проверки (Мандат 8f — Запрет на выдумывание дефектов по памяти).
> 3. Запускать повторную реализацию уже внедренных фич (Мандат 8h — No duplicate work).
>
> **АКТУАЛЬНЫЙ СТАТУС ПРОЕКТА:**
> - Все 63 канонические фичи конкурентов (IDENT, DentalPRO, iStom) имеют статус **`[ДА] [100% ВНЕДРЕНО В КОД]`** (см. [FEATURES_REGISTRY.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/FEATURES_REGISTRY.md) и [FEATURE_SPECS/](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/FEATURE_SPECS)).
> - База данных: Нативный PostgreSQL 18.4 TCP на `127.0.0.1:5432` (`.data/pg18`, 203 таблицы в 20 модульных схемах `apps/api/src/db/schema/*.ts`).
> - Бэкенд: Fastify 5.3.3 (`apps/api/`), 771 маршрут, Zod валидация, ALS-контекст `withTenantCtx`.
> - Фронтенд: Vite + React 19 (`apps/web/`), 14 основных представлений `AppView`, эргономика Apple/Mac HIG, Мандат 8e (Zero-Friction Doctor Autonomy).
> - Тесты: 5,388+ проходящих тестов, 0 ошибок кодировки, 0 ошибок CSS-токенов.

---

## 📖 Действующие Канонические Документы (Sources of Truth)

1. **[THE_HAMMER_MASTER_PROMPT.md](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md)** — Высшая Конституция проекта: CTO Supremacy, zero mocks, презумпция дефекта, Мандат 8e (автономия врача), Мандат 8k (CRM != Simulator), Мандат 8l (Fresh Context), Мандат 8m (Mandatory Red Teaming).
2. **[AGENTS.md](file:///C:/Clinic_MVP/dental-crm/.agents/AGENTS.md)** — Системная конституция проекта, правила взаимодействия агентов, инструментальное бремя доказательства (Мандат 8d).
3. **[INDEX.md](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md)** — Главный навигационный шлюз и матрица быстрого перехода для ИИ-агентов.
4. **[ARCHITECTURE.md](file:///C:/Clinic_MVP/dental-crm/.agents/ARCHITECTURE.md)** — Архитектура монорепозитория, Fastify API, React 19 client, WebSocket broker.
5. **[DATABASE.md](file:///C:/Clinic_MVP/dental-crm/.agents/DATABASE.md)** — Реестр схемы базы данных PostgreSQL 18.4 (203 таблицы, Drizzle ORM).
6. **[DATABASE_SETUP.md](file:///C:/Clinic_MVP/dental-crm/.agents/DATABASE_SETUP.md)** — Инструкции локального развертывания PostgreSQL и полифилл `uuidv7()`.
7. **[API_ROUTES_CATALOG.md](file:///C:/Clinic_MVP/dental-crm/.agents/API_ROUTES_CATALOG.md)** — Исчерпывающий каталог всех 771 маршрутов Fastify API.
8. **[FRONTEND_VIEWS_MAP.md](file:///C:/Clinic_MVP/dental-crm/.agents/FRONTEND_VIEWS_MAP.md)** — Карта 14 представлений фронтенда и 3-tier архитектура.
9. **[UI_STANDARDS.md](file:///C:/Clinic_MVP/dental-crm/.agents/UI_STANDARDS.md)** — Стандарты Apple/Mac HIG, Tailwind/Vanilla CSS токены, эргономика тач-таргетов >= 44x44px.
10. **[CLINICAL_RULES.md](file:///C:/Clinic_MVP/dental-crm/.agents/CLINICAL_RULES.md)** — Движок клинических правил и мягкие предупреждения без блокировок.
11. **[CLINICAL_PROTOCOLS_REGISTRY.md](file:///C:/Clinic_MVP/dental-crm/.agents/CLINICAL_PROTOCOLS_REGISTRY.md)** — Клинические протоколы 043/у, номенклатура 804н, формуляр анестезии.
12. **[BILLING_AND_FINANCE.md](file:///C:/Clinic_MVP/dental-crm/.agents/BILLING_AND_FINANCE.md)** — Финансы в копейках, касса 54-ФЗ без ИНН физлиц, семейные балансы.
13. **[DOCUMENTS_LIFECYCLE.md](file:///C:/Clinic_MVP/dental-crm/.agents/DOCUMENTS_LIFECYCLE.md)** — PDF-генерация, штамп ЧЕРНОВИК, форма 043/у, справки НДФЛ КНД 1151156.
14. **[WAREHOUSE_AND_SUPPLY.md](file:///C:/Clinic_MVP/dental-crm/.agents/WAREHOUSE_AND_SUPPLY.md)** — Складской учет, 1-клик списание карпул медсестрой, мягкий овердрафт.
15. **[TELEPHONY_AND_PORTAL.md](file:///C:/Clinic_MVP/dental-crm/.agents/TELEPHONY_AND_PORTAL.md)** — Телефония UIS/Mango/Zadarma, тихий режим для врача, портал пациента.
16. **[MESSENGERS.md](file:///C:/Clinic_MVP/dental-crm/.agents/MESSENGERS.md)** — WhatsApp WABA, Telegram Bot, VK MAX.
17. **[COMMANDS_AND_TESTS.md](file:///C:/Clinic_MVP/dental-crm/.agents/COMMANDS_AND_TESTS.md)** — Команды компиляции, typecheck, pre-commit гейты и E2E смоук-тесты.
