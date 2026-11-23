# Project: DENTE Dental CRM — Clinical MIS & Dental Practice Operating System

> 🧭 **Навигация:** [🗺️ Главный Индекс (.agents/INDEX.md)](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md) | [📚 Портал Документации (docs/README.md)](file:///C:/Clinic_MVP/dental-crm/docs/README.md) | [🏗️ Архитектура (ARCHITECTURE.md)](file:///C:/Clinic_MVP/dental-crm/ARCHITECTURE.md)
> ⚠️ Высшая Конституция: **[THE_HAMMER_MASTER_PROMPT.md](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md)**

## 1. Project Passport & Identity
- **Официальное название:** DENTE Dental CRM & Clinical MIS.
- **Назначение:** Высокопроизводительная медицинская информационная система (МИС) и CRM для частной амбулаторной стоматологии, созданная на замену устаревшим монолитам прошлого поколения (IDENT, StomX, DentalPRO, iStom).
- **Стратегический приоритет №1 (Мандат 8n):** Соло-врач (1–2 кресла, аренда, ИП/самозанятый) и малая частная клиника (1–3 кресла) с бесшовным масштабированием до сетевых филиалов (Zero Dead-Ends).
- **Ключевой принцип (Мандат 8e):** Автономия врача и персонала (Zero-Friction Law). Ноль заблокированных кнопок (`disabled`), норма в 1 клик, сохранение черновиков на лету (Autosave).

## 2. Core Technical Architecture
- **Frontend:** React 19 (`react: ^19.2.7`), Vite 6, Tailwind CSS v4, Zustand v5, React Query v5. Плотная профессиональная вёрстка Studio Mac HIG (десктопные строки 36px `h-9`) и сенсорная эргономика Apple iOS HIG (тач-таргеты $\ge 44\times 44$px).
- **Backend:** Node.js Fastify v5 (`fastify: ^5.3.3`), TypeScript 5.8+, Zod v3.24 валидация, ALS-контекст тенантов `withTenantCtx`.
- **Database Engine:** Нативный PostgreSQL 18.4 (`.data/pg18`, TCP `127.0.0.1:5432`), 216 таблиц Drizzle ORM в 28 доменных модулях (78 файлов схем), 49 enums, 3011 колонок, 276 физических DDL-миграций без дрифта, Row-Level Security (RLS) изоляция.
- **Shared Domain Core (`@dental/shared`):** Строгая математика денег в копейках (`BIGINT`, `amountKopecks`), 3-уровневые планы лечения (Эконом, ★ Оптимум, Премиум), правила эндодонтии Wheeler & Hess, классификатор НДФЛ 13% (КНД 1151156), чек-суммы SHA-256.

## 3. Subsystem Status & Shipped Milestones
| Домен | Описание функционала | Статус | Документация |
|---|---|---|---|
| **Анатомическая Одонтограмма** | 2.5D векторная формула Wheeler (взрослый прикус 11–48 и детский сменный 51–85), 5 поверхностей MODBL, 40+ клинических состояний, реактивный SVG 120 FPS | **SHIPPED & APPROVED** | [.agents/ODONTOGRAM_CLINICAL_ARTISTRY_BIBLE.md](file:///C:/Clinic_MVP/dental-crm/.agents/ODONTOGRAM_CLINICAL_ARTISTRY_BIBLE.md) |
| **Клинический контур ЭМК** | Дневник SOAP, нозологии МКБ-10 (K02–K08), пресеты СтАР, 1-клик соматическая норма «✓ Здоров», debounced autosave, печать 043/у | **SHIPPED & APPROVED** | [.agents/CLINICAL_RULES.md](file:///C:/Clinic_MVP/dental-crm/.agents/CLINICAL_RULES.md) |
| **Касса 54-ФЗ и Биллинг** | Сплит-оплаты (нал + карта + семейный депозит + СБП QR), копейки BIGINT, 0 ИНН физлиц в чеке, скидки врача до 100%, смены и Z-отчеты | **SHIPPED & APPROVED** | [.agents/BILLING_AND_FINANCE.md](file:///C:/Clinic_MVP/dental-crm/.agents/BILLING_AND_FINANCE.md) |
| **3D DICOM / КЛКТ MPR** | Браузерный просмотр томограмм КЛКТ, Zero-Copy WebWorker, ортогональные срезы, панорама ОПТГ, окна плотности Хаунсфилда (HU) | **SHIPPED & APPROVED** | [docs/architecture/DICOM_3D_MPR_SPEC.md](file:///C:/Clinic_MVP/dental-crm/docs/architecture/DICOM_3D_MPR_SPEC.md) |
| **Склад и СанПиН** | Soft Negative Stock (тихий овердрафт при задержке накладных), списание по техкартам BOM, 5 журналов СанПиН, автоклавы Class B, Честный Знак | **SHIPPED & APPROVED** | [.agents/WAREHOUSE_AND_SUPPLY.md](file:///C:/Clinic_MVP/dental-crm/.agents/WAREHOUSE_AND_SUPPLY.md) |
| **Документы и Право** | PDF рендеринг, бланки информированных согласий (ИДС), договоры, справки в ФНС КНД 1151156, штампы УКЭП, пакетный экспорт | **SHIPPED & APPROVED** | [.agents/DOCUMENTS_LIFECYCLE.md](file:///C:/Clinic_MVP/dental-crm/.agents/DOCUMENTS_LIFECYCLE.md) |
| **Расписание и Пациенты** | Плотная сетка Studio HIG (строки 36px), запись за 5 сек без ассистента, карточка пациента, семейный баланс, лист ожидания | **SHIPPED & APPROVED** | [.agents/FRONTEND_VIEWS_MAP.md](file:///C:/Clinic_MVP/dental-crm/.agents/FRONTEND_VIEWS_MAP.md) |
| **ИИ-Копайлот DENTE** | Мудрый соло-ассистент врача, голосовая диктовка Whisper, стенографист FDI, генерация SOAP, ReAct-харнесс, 29 инструментов | **SHIPPED & APPROVED** | [.agents/AI_ASSISTANT_RULES.md](file:///C:/Clinic_MVP/dental-crm/.agents/AI_ASSISTANT_RULES.md) |

## 4. Machine Gates & Quality Ratchet (Definition of Done)
1. **Санитарный храповик (`npm run check:ratchet`):** 0 any, 0 suppressions, 0 float money divisions, 0 uppercase buttons в UI-ядре.
2. **Миграции (`npm run check:migration-drift`):** 100% синхронизация между Drizzle-схемой и DDL-миграциями Postgres 18.
3. **Безопасность диффа (`npm run check:diff`):** 0 костылей, 0 сырых токенов, 0 утечек секретов.
4. **Кодировка (`npm run check:encoding`):** 100% файлов в строгом UTF-8 без BOM.
