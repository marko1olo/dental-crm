# Архитектурная спецификация: Перенос и импорт данных (Data Migration & Ingestion Engine)

> 🏛️ **DENTE Dental CRM Core Specification**  
> Статус: **Утверждено (Approved)**  
> Стандарты: **Мандаты 8b, 8e, 8n, 8ap, 8am, 8ze & Apple Human Interface Guidelines**  
> Контур: **Fastify REST API + Drizzle PostgreSQL + React 19 Frontend**

---

## 1. Назначение и Архитектурная Миссия

Миграционная подсистема DENTE Dental CRM предназначена для бесшовного, безопасного и верифицируемого переноса клинических и управленческих данных из устаревших МИС и табличных форматов:
- **Базы данных и выгрузки**: FoxPro / dBASE (`.dbf`), SQLite (`.sqlite`, `.db`), Excel (`.xlsx`, `.xls`), разделители (`.csv`, `.tsv`), структурированные форматы (`.json`, `.xml`).
- **Поддерживаемые источники**: IDENT, DentalPRO, Инфодент, StomX, 1C:Медицина. Стоматологическая клиника, произвольные таблицы клиник.
- **Инварианты целостности**:
  - **Нулевая потеря данных (Zero-Loss Guarantee)**: Каждая строка файла проходит аудит валидации, дедупликацию и карантин дефектов.
  - **Автономия клиники (Мандат 8e)**: Перенос не блокирует приём пациентов; предпросмотр доступен до финальной фиксации в транзакции.
  - **Суверенитет масштаба (Мандат 8n)**: Соло-врач (1–2 кресла) может импортировать базу в 2 клика без необходимости нанимать интеграторов.

---

## 2. Fastify Бэкенд и Стриминговый Пайплайн

Все эндпоинты миграции реализованы в Fastify модулях (`apps/api/src/routes/migration.ts` и `migrationRuns.ts`):

```mermaid
flowchart TD
    A["Файл выгрузки (DBF / XLSX / CSV)"] --> B["Fastify Streaming Upload (до 32MB)"]
    B --> C["Детекция схемы и кодировок (UTF-8, Windows-1251, CP866)"]
    C --> D["Канонический нормализатор (E.164 телефоны, даты, ФИО)"]
    D --> E["Сухой прогон (Dry Run) & Карантин аномалий"]
    E --> F{"Подтверждение клиники"}
    F -->|"Утверждено"| G["Drizzle ORM ACID транзакция (Пакетная запись)"]
    G --> H["Акт сверки (CSV / Reconciliation Audit Trail)"]
```

### 2.1. Контракты эндпоинтов

1. **`POST /api/migration/upload`**:
   - Потоковая загрузка с лимитом тела до 32MB (`limits: { fileSize: 33_554_432 }`).
   - Изоляция во временном хранилище сессии с привязкой к JWT арендатора (`tenant_id`).
   - Автоматическая детекция кодировки (определение однобайтных кодировок DOS CP866 / ANSI Windows-1251 для legacy DBF).

2. **`POST /api/migration/discover`**:
   - Автоматическое сканирование локальной рабочей станции или сервера клиники на наличие каталогов с базами данных (без необходимости ручного поиска файлов врачом).

3. **`POST /api/migration/analyze`**:
   - Парсинг структуры заголовков, выборка первых 100 строк образца.
   - Эвристическое сопоставление с каноническими сущностями DENTE (`patients`, `medical_records`, `treatment_plans`, `invoices`, `appointments`).

4. **`POST /api/migration/dry-run`**:
   - Валидация типов данных без мутации рабочих таблиц.
   - Выявление дубликатов телефонов (+7XXXXXXXXXX), некорректных дат и пропусков ФИО.
   - Помещение сомнительных записей в карантинную витрину (`quarantine_records`).

5. **`POST /api/migration/execute`**:
   - Атомарная транзакция Drizzle PostgreSQL.
   - Потоковая пакетная запись чанками по 250 строк.
   - Отсутствие искусственных задержек (ноль имитационных таймеров `setTimeout`).
   - Формирование криптографического хэша и отчёта выполнения.

6. **`GET /api/migration/reconciliation-act/:runId`**:
   - Выгрузка детализированного акта сверки в CSV/PDF для главного врача и бухгалтерии.

---

## 3. Декомпозиция Frontend и Модульная Архитектура CSS

В соответствии с **Мандатом 8b (Anti-Monolith File Limits)** монолитный файл `MigrationWizard.css` (944 строки) декомпозирован на микромодули, каждый из которых строго укладывается в **$\le 120$ строк**.

### 3.1. Структура CSS-модулей (`apps/web/src/components/settings/migrationStyles/`)

| Файл | Строк | Назначение |
| :--- | :---: | :--- |
| `MigrationWizard.css` | 16 | Корневой навигационный шлюз `@import` директив |
| `migrationWizardLayout.css` | 111 | Базовый flex/grid каркас, шапка мастера и степпер этапов |
| `migrationStepSource.css` | 117 | Панель выбора источника, плитки систем, подсказки |
| `migrationDropzone.css` | 43 | Зона перетаскивания файлов (Dropzone), бейджи форматов |
| `migrationDiscovery.css` | 80 | Модальное окно и список автоматического поиска баз на сервере |
| `migrationStepMapping.css` | 98 | Таблица сопоставления колонок, селекторы целевых полей |
| `migrationStepProgress.css` | 77 | Стриминговая шкала прогресса, счетчики скорости и строк |
| `migrationStepReport.css` | 110 | Итоговый отчет миграции, метрики переноса, карточки сверки |
| `migrationQuarantine.css` | 47 | Таблица карантинных записей, ручная коррекция аномалий |
| `migrationActionButtons.css` | 76 | Сенсорные кнопки навигации (Primary CTA, Отмена, Назад) |
| `migrationMobile.css` | 91 | Apple HIG сенсорная эргономика, thumb zone, touch targets $\ge 44\text{px}$ |

### 3.2. Компонентная структура UI

- `apps/web/src/components/settings/MigrationWizard.tsx` — Тонкий мастер-координатор шагов (1 Источник -> 2 Соответствие -> 3 Перенос -> 4 Акт сверки).
- `apps/web/src/components/settings/migration/MigrationSourcePanel.tsx` — Панель выбора файлов и пресетов.
- `apps/web/src/components/settings/migration/MigrationMappingStep.tsx` — Маппер атрибутов.
- `apps/web/src/components/settings/migration/MigrationProgressStep.tsx` — Визуализатор потока переноса.
- `apps/web/src/components/settings/migration/MigrationReportStep.tsx` — Анализ итогов и экспорт акта сверки.
- `apps/web/src/components/settings/migration/MigrationDiscoveryModal.tsx` — Автоматический детектор баз на рабочей станции.

---

## 4. Сенсорная Эргономика Apple HIG (Mobile 390×844)

1. **Touch Targets $\ge 44\times 44\text{px}$**:
   - Все интерактивные кнопки (`mw-btn`, `mw-btn-discovery`, выбор источников) имеют минимальную высоту $\ge 44\text{px}$.
2. **0px паразитного горизонтального скролла**:
   - Контейнеры снабжены `box-sizing: border-box`, `max-width: 100%`, `overflow-x: clip`.
   - На мобильных вьюпортах шаги степпера трансформируются в горизонтальную скроллируемую полосу с `overflow-x: auto` и скрытым скроллбаром.
   - Таблица маппинга трансформируется в Grouped Cards (карточки iOS Settings style) вместо многоколоночной таблицы.
3. **Единый дизайн-код (Мандат 8am)**:
   - Ровно одна Primary CTA кнопка на видимом экране («Выбрать файл на компьютере» -> «Начать перенос» -> «Скачать акт сверки»).

---

## 5. Доказательства Red Team Visual Proof

Визуальная верификация зафиксирована в каталоге `docs/proofs/migration/`:
- `01_migration_pc_light.png` — PC Light 1440×900, светлая тема, контрастность 4.5:1.
- `02_migration_pc_dark.png` — PC Dark 1440×900, темная тема, глубокие черные тона, читаемые акценты.
- `03_migration_mobile_light.png` — Mobile Light 390×844 (эмулятор iPhone 15 Pro), нативная верстка.
- `04_migration_mobile_dark.png` — Mobile Dark 390×844, адаптивные сенсорные элементы.

Каждый скриншот проверен через `read_file` и удовлетворяет критериям чистоты (отсутствие горизонтального клиппинга, обрезанных слов и слепящих артефактов).
