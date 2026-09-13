# Original User Request

> 🧭 **Навигация:** [🗺️ Главный Индекс (.agents/INDEX.md)](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md) | [📚 Портал Документации (docs/README.md)](file:///C:/Clinic_MVP/dental-crm/docs/README.md)
>
> ⚠️ **СТАТУС (2026-09-04): ВСЕ ТРЕБОВАНИЯ R1–R6 ПОЛНОСТЬЮ РЕАЛИЗОВАНЫ В КОДЕ И ДОКАЗАНЫ.**  
> Все задачи этого запроса (1-строчные тулбары 32–36px, очистка карточек визитов, журналы СанПиН без сдвоенных плюсов, русские имена в ретеншн, плоский RBAC без матрёшек, устранение эмодзи-светофоров в КМО ЕГИСЗ) **полностью выполнены**, покрыты проверками `check:encoding`, `check:css-tokens`, компиляцией и визуальным аудитом 4-State Proof.  
> Документ сохранён как исторический архив исходной постановки задачи. Повторная реализация запрещена (Мандаты 8g, 8h).

## Initial Request — 2026-08-29T11:35:11Z

# Teamwork Project Prompt — Draft

> Status: COMPLETED & CLOSED [100% VERIFIED]
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

## Follow-up — 2026-09-13T14:56:08Z

Total bloat and dead code eradication (inpatient hospital procedures, procedure simulators, artificial duplicate facades, fake test-shirms) and desktop/mobile clinical ergonomics enhancement (Apple Studio Clinical HIG, Hick's Law 1-row toolbar 32-36px, Mandate 8e doctor autonomy) in Dental CRM.

Working directory: C:\Clinic_MVP\dental-crm
Integrity mode: development

## Requirements

### R1. Bloat & Dead Code Eradication (Mandates 8i, 8k, 8s)
- Identify and eliminate obsolete duplicate facade files and folders across `apps/web/src/components/` and `apps/api/src/`.
- Purge procedure simulators, general hospital inpatient artifacts (bed-days, transfusion, general medical forms like 025/u), keeping only outpatient dental workflow (Form 043/u, Nomenclature 804n, SanPiN, 54-FZ).
- Remove fake test-shirms in `panelsAreMounted.test.ts` and sync all real imports.

### R2. Desktop & Mobile UI Ergonomics & Doctor Autonomy (Mandates 8d, 8e, 8p, 8n)
- Enforce Hick's Law: primary toolbars strictly 1 row (32–36px), secondary actions in popover menu `...`.
- Total header budget $\le 160\text{--}180\text{px}$ on desktop (1440x900).
- Zero disabled buttons without explanation; 1-click physiological norm default ("Соматически здоров / норма"); 54-FZ checkout without mandatory citizen INN.
- Mobile touch targets $\ge 44\times 44\text{px}$ on iPhone 390x844 with sticky footer `flex-col-reverse`.

### R3. Rigorous Verification & Red-Team Audit
- Multi-state visual inspection: capture and review real PNG screenshots (Desktop 1440x900 and Mobile 390x844, Light and Dark themes).
- 7 Deadly Sins UI Checklist: no clipped text, no overflow, no emojis in official forms, WCAG AAA contrast.
- Centralized Single-Compiler Gate: Exit code 0 on `npm run check:encoding` and `npm run typecheck`.

### R4. Dynamic Documentation & Backlog Sync (Mandate 8h)
- Synchronize all changes into `docs/competitive-audit/BACKLOG.md`, `OUR_CRM_MAP.md`, and `FEATURES_REGISTRY.md` with exact commit hashes and file references.

## Acceptance Criteria

### Bloat Eradication & Code Integrity
- [ ] No unreferenced facade wrappers or dead component files remain in active routes.
- [ ] Zero hospital/inpatient general medicine bloat polluting dental workflows.
- [ ] `npm run check:encoding` passes with 0 errors across all repository files.
- [ ] `npm run typecheck -w @dental/web` and `npm run typecheck -w @dental/api` pass with Exit Code 0.

### Ergonomics & Doctor Autonomy
- [ ] Schedule, Visit, Patients, and Finance desktop views maintain $\le 180\text{px}$ total header height.
- [ ] Primary toolbars feature strictly 1 row with at most 1–2 primary action buttons; secondary items grouped in `...`.
- [ ] 0 disabled buttons on clinical hot paths; 1-click somatic norm available on visits.
- [ ] Cash register accepts payment without requiring physical citizen INN.

### Visual Proof & Documentation
- [ ] Real PNG screenshots verified via visual inspection (`view_file`), sizes $\ge 40\text{ KB}$, unique MD5 hashes.
- [ ] `BACKLOG.md` and `OUR_CRM_MAP.md` updated with exact commit references and clean git log.
