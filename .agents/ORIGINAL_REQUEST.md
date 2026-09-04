# Original User Request

## Initial Request — 2026-08-31T19:26:34Z

DENTE Autonomous Clinical Copilot Engine: An industrial multi-agent clinical assistant with real-time ReAct streaming thought-traces for doctors, 7-key Groq + 10-key Gemini pool failover, and automated clinical/SanPiN safety verification.

Working directory: `C:\Clinic_MVP\dental-crm`
Integrity mode: development

## Requirements

### R1. Real-Time Streaming Agentic Execution UI (Doctor Chat Drawer)
- Client-side visual timeline showing live ReAct thought traces, tool call badges (`lookup_patient`, `get_tooth_imaging`, `check_inventory`, `check_ddi`, `search_804n`, `verify_sanpin`, `submit_act`), and status pills.
- Human-in-the-loop action confirmation cards with 1-click approvals for destructive clinical actions and prescription signing.
- Zero-CLS layout with 44x44px touch targets and full theme compliance (`var(--paper)`, `var(--ink)`, `var(--teal)`).

### R2. Resilient Omni-LLM Gateway & Multi-Key Pool Failover
- Automatic round-robin rotation and circuit breaker across 7 Groq keys (`qwen/qwen3.8-27b`, `openai/gpt-oss-120b`) and 10 Google Gemini keys (`gemini-3.5-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`).
- SOCKS5 and HTTPS proxy tunneling via `proxyDispatcher.ts` to guarantee zero geo-blocking on foreign API endpoints.
- Auto-failover on HTTP 429/500/timeout with zero state loss during multi-turn ReAct chains.

### R3. Clinical Rules, DDI & SanPiN 3.3686-21 Safety Engine
- Pharmacological cross-check against patient allergies (e.g. Lidocaine, Penicillins) and pregnancy trimesters (blocking high-dose vasoconstrictors).
- Automatic warehouse stock check with autonomous self-correction (Reflexion) to available alternatives.
- Kraft package sterilization barcode verification and 043/u outpatient diary protocol generation according to Minzdrav 804n nomenclature.

## Acceptance Criteria

### Execution & Visual Integrity
- [ ] Live UI rendering verified via Playwright screenshot captures in 4 states: PC Light, PC Dark, Mobile Light (390px), Mobile Dark.
- [ ] No layout overflow, no raw JSON strings in UI, touch targets >= 44x44px.

### Multi-Step Agentic Reliability
- [ ] Multi-turn ReAct test suite passes 100% across all 7 clinical tools without stalling or dropping context.
- [ ] Key rotation proves zero HTTP 429 errors under continuous load.

### Machine Verification Gates
- [ ] `npm run check:encoding` passes with 0 errors across all files.
- [ ] `npm run check:css-tokens` passes with 0 unresolved tokens.
- [ ] `npm run typecheck -w @dental/api` exits with Code 0.
- [ ] `npm run typecheck -w @dental/web` exits with Code 0.


## Follow-up — 2026-08-31T21:26:08Z

# OPERATION NIGHT WATCH: DENTE ENTERPRISE STABILIZATION & POLISH

Working directory: `C:\Clinic_MVP\dental-crm`
Integrity mode: development

## Requirements

### R1. Frontend & Apple HIG Clinical Density (Zero-Clutter & Touch Targets)
- Eliminate all Z-index collisions between floating elements (softphone, toasts, floating badges, modals) and primary workspace grids.
- Guarantee touch target hitboxes >= 44x44px on mobile/tablet devices while keeping desktop density compact (32–36px toolbars).
- Flatten UI depth (Anti-Matryoshka law: depth <= 1 level), replacing nested borders with semantic tonal elevation (var(--paper) -> var(--paper-strong)).
- Ensure true darkroom compliance for CBCT/imaging views with zero blinding white cards and WCAG AAA text contrast (>= 4.5:1).
- Eliminate all horizontal overflows, awkward word breaks, and layout shifts (CLS = 0) across 390px mobile viewports.

### R2. Exact Financial Math, 54-FZ & Clinical DDI Safety
- Verify 100% integer kopeck calculations across billing, installment tiers, tax deductions (13% NDFL FNS 1151156), and Order 804n nomenclatures with zero floating-point arithmetic.
- Strict DDI interaction verification: NSAID + anticoagulant gastrointestinal hemorrhage blocks, penicillin allergy cross-checks, asthma sulfite blocks, and pregnancy trimester contraindications.
- Enforce fail-closed multi-tenant RLS isolation in Drizzle PostgreSQL 18 schemas.

### R3. Voice, Web Audio DSP & Multi-Session Resilience
- Ensure AudioContext auto-suspension after 5 seconds of silence to prevent client memory leaks and battery drain.
- Guarantee zero data loss during network dropouts via IndexedDB VoiceOfflineQueue and PostgreSQL 18 context-compacting session store.
- Robust WebSocket reconnect logic for Gemini 3.5 Bidi Live STT and Whisper cascade with automatic key rotation across verified pool keys.

### R4. Machine Verification Gates & Adversarial Visual Audit
- npm run check:encoding passes with 0 errors across all 4500+ files.
- npm run check:css-tokens passes with 0 unresolved tokens across all 155+ CSS files.
- npm run typecheck passes with Exit Code 0 across @dental/shared, @dental/api, @dental/web.
- Full test suite passes 100% across speech, clinical tools, agent services, audio DSP, and Copilot UI components.

## Acceptance Criteria

### Visual & Touch Ergonomics
- [ ] No button or interactive control with hitbox < 44x44px on mobile viewports.
- [ ] No card-in-card nesting > 1 level; clean tonal separation.
- [ ] Dark Mode displays zero raw #ffffff cards in clinical/radiology modules.
- [ ] Mobile 390px views render with zero horizontal scroll and zero text clipping.

### Math & Safety Guardrails
- [ ] 0 occurrences of floating-point math on monetary values.
- [ ] 100% of contraindicated medication combinations blocked by DDI engine.
- [ ] 100% of tenant queries scoped by organization_id with fail-closed RLS.

### Compilers & Unit Tests
- [ ] check:encoding -> 0 errors.
- [ ] check:css-tokens -> 0 unresolvable tokens.
- [ ] typecheck across shared, api, web -> Exit Code 0.
- [ ] 432+ unit tests pass with Exit Code 0.

## Follow-up — 2026-09-01T06:47:13Z

[ОБЯЗАТЕЛЬНЫЙ ПРИКАЗ: АБСОЛЮТНАЯ КОНСТИТУЦИЯ THE HAMMER]
Директива: C:\Clinic_MVP\dental-crm\.agents\THE_HAMMER_MASTER_PROMPT.md и docs/audits/NIGHT_WATCH_DEFECT_REGISTRY.md.
Режим: T.A.R.S. 100% Honesty. Zero Feature Creep.

Remediate all 8 Touch Target defects ([TT-1]..[TT-8]), 5 UI Clutter defects ([CL-1]..[CL-5]), Z-index scale unification ([ZX-1], [ZX-2]), and PostgreSQL 18 RLS Migration 0187 ([RLS-1]).

Working directory: C:\Clinic_MVP\dental-crm
Integrity mode: development

## Requirements

### R1. Touch Targets & Fitts Law Remediation ([TT-1] .. [TT-8])
Fix all mobile touch hitboxes to be strictly >= 44x44px in DoctorMobileShiftModal.tsx, PatientPortal.tsx, PatientJourneyTimeline.tsx, RadiationDoseSheetModal.tsx, ToothContextDrawer.css, touch-targets.css, CbctLeftToolDock.tsx, CbctMprViewer.tsx, PublicOnlineBookingWidget.tsx, AppointmentCard.tsx.

### R2. UI Clutter Reduction & Hick's Law ([CL-1] .. [CL-5])
Squeeze OdontogramToolbar 22-button toolbar to 1 primary action + 3 stamps + [⋮] menu. Squeeze InventoryView and LabOrdersPanel rows to 1 primary action + [⋮] dropdown. Replace emoji in TreatmentPlanStageCard with Lucide icon. Fix Header shift buttons.

### R3. PostgreSQL 18 RLS Tenant Isolation Migration 0187 ([RLS-1])
Apply ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY, and CREATE POLICY tenant_isolation to 37 secondary tables.

## Acceptance Criteria

### Compilers & Static Gates
- [ ] npm run check:encoding exits with code 0
- [ ] npm run check:css-tokens exits with code 0
- [ ] npm run typecheck -w @dental/shared exits with code 0
- [ ] npm run typecheck -w @dental/api exits with code 0
- [ ] npm run typecheck -w @dental/web exits with code 0

### Unit & Integration Verification
- [ ] All targeted unit test suites pass with Exit Code 0
- [ ] Clean semantic commit with zero AI tool attribution

## Follow-up — 2026-09-01T08:55:59Z

Autonomous end-to-end Adversarial Red Team Inquisition and continuous code remediation across all core modules of DENTE Dental CRM (Odontogram, Schedule 4D, CBCT PACS 3D, EMR 043/u, SanPiN, Finance & 54-FZ, Telephony, and AI STT Cascades).

Working directory: C:\Clinic_MVP\dental-crm
Integrity mode: development

## Requirements

### R1. Adversarial Red Team Defect Inquisition (Presumption of Defect)
- Continuously inspect the codebase and UI modules with ruthless skepticism ("Презумпция брака").
- Hunt for:
  1. Concurrency race conditions and missing row-level locks (FOR UPDATE).
  2. Data loss or corruption risks in offline CRDT and synchronization gateways.
  3. UI clutter, button landfills (>1 toolbar row), nested card matryoshkas, and touch targets < 44x44px.
  4. Timezone drift, clock skew exploits, and sub-kopeck fractional money rounding errors.
  5. Missing A11y focus traps, Escape handlers, and unhandled Promise rejections.

### R2. Autonomous Fixer Crew Remediation (Zero-Mocks Production Code)
- Remediate every identified defect directly in source code using native surgical patches without mock interfaces or TODOs.
- Adhere strictly to the Universal 3-Tier Interaction Doctrine (Hot Path -> Warm Context -> Cold Backoffice).
- Enforce strict kopeck integer arithmetic and server-side catalog price verification.
- Implement accessible, touch-friendly UI components with proper CSS design tokens.

### R3. Autonomous Verification & Static Gate Defense
- Enforce machine-verifiable gates before every commit:
  - npm run check:encoding (0 mojibake across 4521+ files).
  - npm run check:css-tokens (0 unresolved CSS variables).
  - npm run typecheck (0 errors across @dental/shared, @dental/api, @dental/web, and their test suites).
- Execute comprehensive test suites (pen-tests, chaos engineering, race conditions, and CRDT conflict resolution).
- Record atomic Semantic Git commits per file with zero AI tool attribution trailers.

## Acceptance Criteria

### Static & Compiler Gates
- [ ] npm run check:encoding exits with code 0 (4521+ files verified).
- [ ] npm run check:css-tokens exits with code 0 (155+ CSS files verified).
- [ ] npm run typecheck exits with code 0 across the entire monorepo.

### Dynamic Verification & Test Proofs
- [ ] All security pen-test suites (securityPenTest.test.ts, priceSpoofingAndNegativeBalancePenTest.test.ts) pass with 100% success.
- [ ] All concurrency and CRDT suites (concurrencyRaceCondition.test.ts, offlineConflictResolution.test.ts, scheduleConcurrencyRace.test.ts) pass with 100% success.
- [ ] All WebKit/Safari A11y and Chaos test suites (safariAndKeyboardA11y.test.ts, chaosEngineering.test.ts, memoryAndRenderProfile.test.ts) pass with 100% success.
- [ ] Verbatim subagent reports with exact file:line references in ПРОВЕРЕНО and НЕ ПРОВЕРЕНО sections.

## Follow-up — 2026-09-03T20:59:54Z

«Читайте документ по такому адресу: 
C:\Clinic_MVP\dental-crm\.agents\THE_HAMMER_MASTER_PROMPT.md
целиком от первого до последнего символа перед началом любых действий. Никаких домыслов, никаких правок в конституцию, никакой самодеятельности.»

Requested team: Full multi-agent engineering team with adversarial clinical critics.
Комплексный клинический аудит фронтенда и бэкенда Dental CRM: ликвидация академического блоата, псевдонаучных процедурных симуляторов, снятие искусственных бюрократических блокировок и расширение автономии врачей, ассистентов, регистраторов и медсестер.

Working directory: C:\Clinic_MVP\dental-crm
Integrity mode: development

## Requirements

### R1. Клинический аудит протоколов визита, дневников 043/у и анамнеза
- Устранить блокирующие обязательные поля (пульс, температура, 50 пунктов соматики на обычном терапевтическом приёме).
- Обеспечить 1-клик заполнение физиологической нормы («Соматически здоров / Осмотр в норме»).
- Исключить блокировки печати незакрытого визита (печать со штампом «ЧЕРНОВИК»).
- Обеспечить debounced autosave и защиту от потери черновиков дневников.

### R2. Зубная формула, планы лечения и зуботехническая лаборатория (ЗТЛ)
- Устранить блокировку создания нарядов ЗТЛ, оказания услуг и оплаты по истечении 30 дней с даты создания плана.
- Исключить показ копеечных микро-расходников (валики, салфетки, перчатки) в презентации сметы пациенту.
- Обеспечить быстрый 1-клик выбор поверхностей (MOD, MO, OD) и эндо-протоколов без модального ада.

### R3. Регистратура, расписание и касса 54-ФЗ
- Запретить требование обязательного выбора ассистента при создании записи.
- Разрешить печать бланка договора с нулевой стоимостью до приёма без 403 ошибок.
- Исключить требование ИНН у физических лиц при наличной/безналичной оплате (54-ФЗ).
- Реализовать комбинированную оплату и свободу скидок врача (вплоть до 100% на переделки).

### R4. Склад, СанПиН и стерилизация
- 1-клик списание пустых карпул анестетиков медсестрой без комиссии из 3 человек.
- Мягкий овердрафт склада (предупреждение вместо запрета проведения экстренной операции).

## Acceptance Criteria

### Критерии проверки и качества (DoD)
- [ ] Все статические гейты компилятора проходят чисто (`check:encoding`, `check:css-tokens`, `npm run typecheck` во всех 3 пакетах с Exit Code 0).
- [ ] Таргетированные unit-тесты затронутых компонентов (`node --test` / `tsx --test`) выполняются с Exit Code 0 без ослабления ассертов.
- [ ] Пофайловый `git add` и атомарные семантические коммиты без мусорных файлов.
- [ ] Доказательства разделены строго на `ПРОВЕРЕНО` и `НЕ ПРОВЕРЕНО`.

