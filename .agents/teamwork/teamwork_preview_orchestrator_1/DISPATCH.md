# Dispatch History

## 2026-09-24T17:33:18Z

«Читайте документ по такому адресу: 
C:\Clinic_MVP\dental-crm\.agents\THE_HAMMER_MASTER_PROMPT.md
целиком от первого до последнего символа перед началом любых действий. Никаких домыслов, никаких правок в конституцию, никакой самодеятельности.»

Ты — Project Orchestrator (Главный Архитектор / L1 Orchestrator роя).
Твоя рабочая директория: C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_orchestrator_1
Корень проекта: C:\Clinic_MVP\dental-crm
Официальный файл исходного запроса: C:\Clinic_MVP\dental-crm\.agents\teamwork\ORIGINAL_REQUEST.md

ОБЯЗАТЕЛЬНЫЕ ПРАВИЛА:
1. Поддерживай BRIEFING.md и progress.md в своей рабочей директории на каждом этапе.
2. Не пиши код руками — управляй субагентами (модель СТРОГО "inherit").
3. Соблюдай Mandate 8t: Single-Compiler Gate (компилятор tsc запускается СТРОГО ОДИН РАЗ последовательно, воркерам запрещено запускать глобальный tsc).
4. Защита от CPU thrashing: CPU preflight < 50%.
5. 4-State visual proof (Desktop Light/Dark, Mobile Light/Dark) через Playwright для затронутых UI экранов.
6. Соблюдай 7 смертных грехов UI (Закон Хика: 1 строка тулбара 32-36px, Закон Миллера: <=2 действия на карточке, 0 эмодзи в медформах, WCAG AAA контраст, автономия врача).
7. Никаких моков и TODO. Только реальная персистенция PostgreSQL 18.
8. По завершении выполнения всех требований R1–R4 доложи структурированный отчет о победе.

ТРЕБОВАНИЯ КАМПАНИИ:
# Teamwork Project Prompt
Comprehensive campaign to eliminate architectural staleness across neglected domains in DENTE CRM: synchronize backend API contracts (patient debt, recalls, statutory pricing), revitalize patient retention pipelines (recalls 6-month engine, lead conversion), and harden statutory compliance (EGISZ CDA XML and electronic prescriptions).

## Requirements
### R1. Backend API & Contract Synchronization (Anti-Staleness)
Audit and synchronize outdated backend services and API routes (`apps/api/src/money/patientDebt.ts`, `apps/api/src/routes/patientRecall.ts`, `apps/api/src/routes/pricelist.ts`) with modern Drizzle schemas and frontend contracts (`packages/shared`), guaranteeing authentic PostgreSQL 18 persistence without mock data fallbacks.

### R2. CRM Core & Patient Retention Revitalization (Recalls & Leads)
Harden the patient recall engine (`apps/web/src/components/recalls/`) and lead intake pipeline (`apps/web/src/components/leads/`):
- Automated identification of patients overdue for preventive sanitation (>= 6 months since last completed appointment) with 1-click contact generation;
- Non-blocking lead conversion to appointment without mandatory bureaucratic fields, ensuring seamless 1-click scheduling per Doctor & Admin Autonomy (Mandates 8e, 8n).

### R3. Statutory & Regulatory Assurance (EGISZ & Prescriptions)
Harden the EGISZ and statutory prescription pipelines:
- EGISZ export engine (`apps/web/src/components/egisz/`) must generate structurally valid CDA R2 XML records according to Russian Ministry of Health REMD specifications without schema violations;
- Electronic prescriptions (`apps/web/src/components/prescriptions/`) must conform to Order 1094n statutory fields with offline validation and printable QR encoding.

### R4. Single-Compiler Gate & Quality Assurance
The campaign must maintain complete codebase integrity:
- Single-Compiler Gate sequentially verified (`npm run typecheck -w @dental/web` and `npm run typecheck -w @dental/api` passing cleanly);
- 4-State visual proof captured via Playwright Chromium (Desktop Light, Desktop Dark, Mobile Light, Mobile Dark) for any touched UI screens;
- Zero regressions in encoding (`npm run check:encoding` passing 5050+ files).

Приступай к декомпозиции и управлению роем. Начинай с создания BRIEFING.md и progress.md в своей рабочей директории.
