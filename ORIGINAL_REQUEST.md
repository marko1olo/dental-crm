# Original User Request

## Initial Request — 2026-08-29T11:35:11Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Eradicate interface clutter ("интерфейсная свалка"), eliminate all defects identified by the Adversarial Inquisitor, and enforce strict 1-row toolbars, flat hierarchy, and Russian clinical UX standards.
> Requested team: Full swarm of specialized frontend engineers and hyper-critical adversarial auditors.

Total purge of visual landfill, syntax glitches, and layout defects across all DENTE Dental CRM modules, strictly resolving every item from the Adversarial Inquisition Defect List.

Working directory: C:/Clinic_MVP/dental-crm
Integrity mode: development

## Requirements

### R1. Schedule View & Appointment Ergonomics
- Compress the 4-tier schedule header into exactly 1 clean row (height 32–36px): Date navigation `< 29.08.2026 📅 >` + 1-row horizontal doctor filter scroll + strictly 1 Primary `+ Запись` button (`bg-teal-600 font-bold`).
- Move all secondary actions into a compact `[⋮ Опции]` dropdown.
- Eliminate appointment card bloat: maximum 1 direct status selector dropdown (`Пришел`, `В кресле`, `Завершен`) + appointment time, patient name, and room number. Move all 15 secondary actions (WhatsApp, SMS, +15/+30 delay buttons, reschedule, buffer) into a single `...` context menu.
- Eradicate the `🔥 CITO!` emoji; replace with a clean vector icon.
- Ensure the floating softphone and dev bar never occlude appointment cards on 390px mobile viewport (`pb-32` bottom clearance).

### R2. SanPiN & Sterilization Registers Toolbar & Tabs Polish
- Fix the syntax concatenation defect in the primary button: eliminate `+ + Новый цикл` -> render as clean `+ Новый цикл` with a single SVG icon.
- Replace the hidden `≡ 3` overflow menu with a smooth horizontal touch-scroll displaying all 12 mandatory SanPiN registers (`0. Готовность`, `1. ПСО 366/у`, `2. Автоклавы 257/у`, `3. Рециркуляторы`, `4. Генеральные уборки`, `5. Медотходы`, `6. Аварии`, `7. Температура/влажность`, `Дезсредства`, `Баклаборатория`, `Утилизация игл`).
- Seed realistic sterilization and autoclave cycles in test scenarios to eliminate empty 0-row tables.

### R3. Patient Retention & Recall Analytics Polish
- Replace all placeholder names (`Пациент`, `Test Testov`) with realistic Russian clinical patient names (`Барабаш С. В.`, `Ковалев Д. П.`).
- Fix search input padding (`pl-10`) to eliminate visual overlap of the `🔍` search icon over the placeholder text (`🔍оиск...`).
- Eliminate double-border and clipping artifacts between the `Утилизация кресел` and `Когорты Recall` tabs.
- Ensure bottom management report blocks are fully clear of the floating softphone.

### R4. Mobile RBAC Access Matrix Ergonomics (390px Viewport)
- Remove `truncate` from the modal header and subtitle in `AccessMatrixModal.tsx`; allow clean multiline wrapping (`break-words`) so titles are never cut off with `...`.
- Dismantle the 4-tier card-in-card "matryoshka" nesting: flatten into a single cohesive panel (max depth = 1).
- Fix horizontal role navigation bar: ensure all 8 roles (`Владелец`, `Главный врач`, `Врач`, `Ассистент`, `Старшая медсестра`, `Администратор`, `Регистратор`, `Бухгалтер`) scroll smoothly with `snap-x` and eliminate edge clipping (e.g. `Вр[`).
- Replace foreign Anglicisms (`strictly`) with proper Russian medical terminology (`строго`).

### R5. CMO Compliance & REMD EGISZ Hub Refinement
- Completely eradicate cartoon emoji traffic lights (`🔴`, `🟡`, `🔵`, `🟢`, `⚠️`) from filter tabs; replace with subtle 6px SVG status indicators.
- Fix text fusion defect: eliminate `🔵В очереди` -> render as clean, spaced `В очереди`.
- Remove `truncate` from filter tab pills: widen pills or provide smooth horizontal scroll so full legal descriptions (`Без диагноза МКБ-10`, `Не подписано врачом`, `Просрочено >24ч`) are 100% legible without ellipsis.
- Expand search placeholder width to prevent truncation of `Поиск: Пациент, СНИЛС, Карта...`.
- Populate real 043/u outpatient examination records in test view to avoid empty 0-row states.

### R6. Odontogram & Billing Medical Hygiene
- Maintain dental dominance: anatomical arch occupies $\ge 75\%$ of screen space.
- Eliminate cartoon emojis (🦷, 💉, 🛡️) in billing acts; use Lucide vector icons (`Stethoscope`, `Syringe`, `FileText`).
- Ensure billing modal footer buttons (`Печать бланка А4 (ГОСТ)`) never bleed past modal borders.

## Follow-up — 2026-08-29T11:42:11Z

[REVIVAL PROTOCOL: TEAMWORK SWARM ORCHESTRATOR]
Квота восполнена. Продолжаем работу.
АДРЕС МАСТЕР-ПРОМПТА: file:///C:/Clinic_MVP/dental-crm/.agents/MASTER_PROMPT.md
АРТЕФАКТ ТЗ: file:///C:/Users/Admin/.gemini/antigravity/brain/be190df0-d63b-46ee-9291-79fe56b0cd34/prompt_draft.md

Продолжай координацию выполнения полного рефакторинга по всем 6 доменам. Жду результаты.
