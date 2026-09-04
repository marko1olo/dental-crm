# GEMINI.md — Clinic MVP / DENTE Dental CRM Authority Shim

## ⛔ КОНСТИТУЦИЯ И ОБЯЗАТЕЛЬНЫЙ ПОРЯДОК ЧТЕНИЯ ДОКУМЕНТАЦИИ

Перед выполнением ВСЕХ задач в монорепозитории Dental CRM (`C:\Clinic_MVP\dental-crm`) ТРЕБУЕТСЯ изучить документацию проекта. Запрещено угадывать типы, бэкенд-маршруты или структуру БД.

> ⚠️ **ВЫСШАЯ КОНСТИТУЦИЯ:** **[`C:\Clinic_MVP\dental-crm\.agents\THE_HAMMER_MASTER_PROMPT.md`](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md)** (и `MASTER_PROMPT.md`) — обязателен к прочтению целиком от первого до последнего символа перед началом любых действий!

---

## 📖 СИСТЕМА ДОКУМЕНТАЦИИ ПРОЕКТА (ОБЯЗАТЕЛЬНЫЕ ПУТИ)

### 1. Системная документация кодовой базы (`.agents/`)
- **[Documentation Index & Navigation Matrix](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md)** — Главная точка входа и матрица быстрого перехода для ИИ-агентов.
- **[Supreme Law: THE HAMMER](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md)** — Абсолютная конституция: презумпция брака, запрет сикофантии, HIG, Мандат 8e.
- **[AGENTS.md (.agents)](file:///C:/Clinic_MVP/dental-crm/.agents/AGENTS.md)** — Главная конституция (Мандаты 1..11, доказательство скриншотами, запрет мождибаке, отчётность HEAD).
- **[System Architecture](file:///C:/Clinic_MVP/dental-crm/.agents/ARCHITECTURE.md)** — Архитектура монорепозитория (`apps/web`, `apps/api`, `packages/shared`, React 19).
- **[Database Registry](file:///C:/Clinic_MVP/dental-crm/.agents/DATABASE.md)** — Схема Drizzle ORM PostgreSQL 18.4 (`.data/pg18`, порт 5432).
- **[Database Setup & Recovery](file:///C:/Clinic_MVP/dental-crm/.agents/DATABASE_SETUP.md)** — Развёртывание PostgreSQL, полифилл `uuidv7()`, push-процедуры.
- **[Telephony & Portal Details](file:///C:/Clinic_MVP/dental-crm/.agents/TELEPHONY_AND_PORTAL.md)** — АТС, интеграция UIS/Mango/Zadarma, личный кабинет пациента.
- **[Commands & Tests](file:///C:/Clinic_MVP/dental-crm/.agents/COMMANDS_AND_TESTS.md)** — Гейты компиляции, typecheck и E2E-тесты.
- **[UI Standards](file:///C:/Clinic_MVP/dental-crm/.agents/UI_STANDARDS.md)** — Правила Tailwind, Vanilla CSS и ограничения God Context `useAppLogic.tsx`.
- **[Clinical Rules](file:///C:/Clinic_MVP/dental-crm/.agents/CLINICAL_RULES.md)** — Движок клинических правил.
- **[Billing & Finance](file:///C:/Clinic_MVP/dental-crm/.agents/BILLING_AND_FINANCE.md)** — Платежи, касса 54-ФЗ и семейные кошельки.
- **[Documents Lifecycle](file:///C:/Clinic_MVP/dental-crm/.agents/DOCUMENTS_LIFECYCLE.md)** — PDF-генерация, ИДС, справки НДФЛ.
- **[Messengers](file:///C:/Clinic_MVP/dental-crm/.agents/MESSENGERS.md)** — WhatsApp WABA, Telegram Bot, VK MAX.
- **[Documentation Knowledge Hub](file:///C:/Clinic_MVP/dental-crm/docs/README.md)** — Центральный шлюз документации папки `docs/`.

### 2. Аудит конкурентов и реестр паритета фич (`docs/competitive-audit/`)
- **[FEATURES_REGISTRY.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/FEATURES_REGISTRY.md)** — Таблица 63 канонических фич конкурентов (IDENT, DentalPRO, iStom) со статусами, ценностью и строками доказательств.
- **[OUR_CRM_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/OUR_CRM_MAP.md)** — Детальная карта возможностей нашей CRM по всем модулям.
- **[BACKLOG.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/BACKLOG.md)** — Варианты внедрения, архитектурные решения и задействованные файлы для всех фич со статусами `[НЕТ]` и `[ЧАСТИЧНО]`.
- **[GAP_REPORT_2026-07-27.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/GAP_REPORT_2026-07-27.md)** — Актуальный отчёт по разрывам.
- **[STOMX_REVERSE_ENGINEERING_BIBLE.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/STOMX_REVERSE_ENGINEERING_BIBLE.md)** — Библия реверс-инжиниринга StomX.
- **[FEATURE_SPECS/](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/FEATURE_SPECS)** — Карточки детальных спецификаций по 13 полям Аддендума 2.

---

## 🚨 ГЛАВНЫЕ ПРАВИЛА

Канонический источник — `.agents/AGENTS.md` и `.agents/THE_HAMMER_MASTER_PROMPT.md`.

1. **Читай код и документацию перед правками**: Всегда полностью считывай целевой файл перед изменениями. Дописывать быстрый патч в конец непрочитанного файла — критическое нарушение.
2. **Никаких моков**: Всё должно быть типизировано и подключено к реальным запросам к БД. Заглушки и UI-плейсхолдеры запрещены.
3. **Никаких хардкодов**: Использовать переменные окружения, типы Zod и интерфейсы TypeScript. Ни портов, ни эндпоинтов, ни учётных данных, ни магических строк в коде.
4. **Раздельные коммиты**: `git add` строго по конкретным изменённым файлам задачи — рядом параллельно работают другие агенты.
5. **Запрет мождибаке (UTF-8)**: Не использовать PowerShell here-strings и `node -e` для ЗАПИСИ кириллицы. Для read-only проверок `node -e` допустим.
6. **Запрет на палки в колёса врачам и персоналу (Мандат 8e)**: Софт обязан помогать врачу лечить людей, а не служить бюрократическим цербером. Никаких disabled кнопок без объяснения, никаких запретов на черновики, никаких 403 при печати договоров регистратором, свобода скидок врача (вплоть до 100%), касса 54-ФЗ без требования ИНН с физлиц, снимок визиографа <50мс без зависаний на ИИ. Любой барьер или лишний клик — это брак.
7. **Стандарты Apple & Mac HIG (Studio Clinical HIG)**: Десктопная плотность панели пилота (тулбары 32–36px), мобильные тач-таргеты $\ge 44\times 44\text{px}$, глубина модалок строго 1 (Анти-Матрёшка), никаких эмодзи в медицинских и финансовых документах.
8. **Запрет на выдумывание дефектов по памяти (T.A.R.S. 100% честность)**: Проблемы и баги существуют ТОЛЬКО тогда, когда они найдены прямым чтением живых файлов кода, личным просмотром PNG-скриншотов или логом компилятора. Никаких выдумок «по памяти».
9. **Правило не равно задаче (Rule != Task)**: Текст стандартов и правил в промптах — это эталон качества и приёмки, а не несделанная задача! Запрещено объявлять задачу «отсутствующей» или «долгом», не проверив её реальное наличие в коде (`grep_search`/`fd`). Если уже сделано — не трогать работающий код!
10. **Динамический синхрон документации и бэклогов (No duplicate work)**: Реализовал или подтвердил фичу — немедленно обнови `BACKLOG.md`, `FEATURES_REGISTRY.md` и чек-листы, переведя в `[ЕСТЬ] / [ЗАКРЫТО]`. Запрещено гонять агентов по кругу по уже сделанным вещам.

