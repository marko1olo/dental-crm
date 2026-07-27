# GEMINI.md — Clinic MVP / DENTE Dental CRM Authority Shim

## ⛔ КОНСТИТУЦИЯ И ОБЯЗАТЕЛЬНЫЙ ПОРЯДОК ЧТЕНИЯ ДОКУМЕНТАЦИИ

Перед выполнением ВСЕХ задач в монорепозитории Dental CRM (`C:\Clinic_MVP\dental-crm`) ТРЕБУЕТСЯ изучить документацию проекта. Запрещено угадывать типы, бэкенд-маршруты или структуру БД.

---

## 📖 СИСТЕМА ДОКУМЕНТАЦИИ ПРОЕКТА (ОБЯЗАТЕЛЬНЫЕ ПУТИ)

### 1. Системная документация кодовой базы (`.agents/`)
- **[Documentation Index](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md)** — Главная точка входа.
- **[AGENTS.md](file:///C:/Clinic_MVP/dental-crm/AGENTS.md)** — Главная конституция (8 базовых правил, доказательство скриншотами, запрет мождибаке, отчётность HEAD).
- **[System Architecture](file:///C:/Clinic_MVP/dental-crm/.agents/ARCHITECTURE.md)** — Архитектура монорепозитория (`apps/web`, `apps/api`, `packages/shared`).
- **[Database Registry](file:///C:/Clinic_MVP/dental-crm/.agents/DATABASE.md)** — Схема Drizzle ORM PostgreSQL (`apps/api/src/db/schema.ts`).
- **[Telephony & Portal Details](file:///C:/Clinic_MVP/dental-crm/.agents/TELEPHONY_AND_PORTAL.md)** — АТС, интеграция UIS/Mango/Zadarma, личный кабинет пациента.
- **[Commands & Tests](file:///C:/Clinic_MVP/dental-crm/.agents/COMMANDS_AND_TESTS.md)** — Гейты компиляции, typecheck и E2E-тесты.
- **[UI Standards](file:///C:/Clinic_MVP/dental-crm/.agents/UI_STANDARDS.md)** — Правила Tailwind, Vanilla CSS и ограничения God Context `useAppLogic.tsx`.
- **[Clinical Rules](file:///C:/Clinic_MVP/dental-crm/.agents/CLINICAL_RULES.md)** — Движок клинических правил.
- **[Billing & Finance](file:///C:/Clinic_MVP/dental-crm/.agents/BILLING_AND_FINANCE.md)** — Платежи, касса 54-ФЗ и семейные кошельки.
- **[Documents Lifecycle](file:///C:/Clinic_MVP/dental-crm/.agents/DOCUMENTS_LIFECYCLE.md)** — PDF-генерация, ИДС, справки НДФЛ.
- **[Messengers](file:///C:/Clinic_MVP/dental-crm/.agents/MESSENGERS.md)** — WhatsApp WABA, Telegram Bot, VK API.

### 2. Аудит конкурентов и реестр паритета фич (`docs/competitive-audit/`)
- **[FEATURES_REGISTRY.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/FEATURES_REGISTRY.md)** — Таблица 63 канонических фич конкурентов (IDENT, DentalPRO, iStom) со статусами, ценностью и строками доказательств.
- **[OUR_CRM_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/OUR_CRM_MAP.md)** — Детальная карта возможностей нашей CRM по всем модулям.
- **[BACKLOG.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/BACKLOG.md)** — Варианты внедрения, архитектурные решения и задействованные файлы для всех фич со статусами `[НЕТ]` и `[ЧАСТИЧНО]`.
- **[GAP_REPORT_2026-07-27.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/GAP_REPORT_2026-07-27.md)** — Актуальный отчёт по разрывам. Заменяет старый `PROGRESS.md`, которого больше нет на диске.
- **[FEATURE_SPECS/](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/FEATURE_SPECS)** — Карточки детальных спецификаций по 13 полям Аддендума 2.

---

## 🚨 ГЛАВНЫЕ ПРАВИЛА

Канонический источник — `.agents/AGENTS.md`. Этот список и список в `CLAUDE.md` — одни и те же пять
законов: они молча разошлись (у Claude не было «читай сначала», у Gemini не было «никаких моков»),
сведены 2026-07-27. Держать идентичными либо удалить оба и указывать на конституцию.

1. **Читай код и документацию перед правками**: Всегда полностью считывай целевой файл перед изменениями. Дописывать быстрый патч в конец непрочитанного файла — критическое нарушение.
2. **Никаких моков**: Всё должно быть типизировано и подключено к реальным запросам к БД. Заглушки и UI-плейсхолдеры запрещены.
3. **Никаких хардкодов**: Использовать переменные окружения, типы Zod и интерфейсы TypeScript. Ни портов, ни эндпоинтов, ни учётных данных, ни магических строк в коде.
4. **Раздельные коммиты**: `git add` строго по конкретным изменённым файлам задачи — рядом параллельно работают другие агенты.
5. **Запрет мождибаке (UTF-8)**: Не использовать PowerShell here-strings и `node -e` для ЗАПИСИ кириллицы. Для read-only проверок `node -e` допустим.
