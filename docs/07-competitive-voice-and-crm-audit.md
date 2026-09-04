# Competitive Voice and CRM Audit & Feature Parity Master Index


> 🧭 **Navigation:** [🗺️ Master Documentation Index (.agents/INDEX.md)](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md) | [📚 Documentation Knowledge Hub (docs/README.md)](file:///C:/Clinic_MVP/dental-crm/docs/README.md)
Date: 2026-07-22

## Overview

This document serves as the master index for competitive audits between **Dental CRM (DENTE)** and major competitors (**IDENT**, **DentalPRO**, **iStom**).

All competitive feature extractions, parity registries, architecture maps, and specification cards are systematically maintained in the dedicated directory:
📂 `docs/competitive-audit/`

---

## Direct Links to Competitive Documentation Suite

1. **[OUR_CRM_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/OUR_CRM_MAP.md)**
   - Complete technical breakdown of Dental CRM monorepo capabilities across Patients, Schedule, EHR/Visits, 3D DICOM MPR, Documents/NDFL, Communications, Billing/Payroll, Inventory, and Smart Imports.

2. **[FEATURES_REGISTRY.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/FEATURES_REGISTRY.md)**
   - Canonical index of **63 unique competitor features** (all 63 features have status `[ДА]` [100% ВНЕДРЕНО В КОД], value scores, and verified code evidence).

3. **[BACKLOG.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/BACKLOG.md)**
   - Architectural implementation reference and production files for all 63 shipped features.

4. **[GAP_REPORT_2026-07-27.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/GAP_REPORT_2026-07-27.md)**
   - Historical competitive gap audit snapshot (all 63 gaps resolved in production PostgreSQL 18.4).

5. **[FEATURE_SPECS/](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/FEATURE_SPECS)**
   - 63 self-contained specification markdown cards adhering strictly to the 13 mandatory specification fields (all marked `[ДА] [100% ВНЕДРЕНО В КОД]`).

6. **[DATABASE_DEEP_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/DATABASE_DEEP_MAP.md)**
   - Deep PostgreSQL 18.4 schema breakdown, 203 tables, 31 document kinds (`documentKind`), Drizzle ORM enums, and database table relations.

7. **[API_ROUTES_DEEP_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/API_ROUTES_DEEP_MAP.md)**
   - Complete Fastify 5.3+ API route directory mapping all 48 backend endpoint files across Patients, Schedule, EHR, DICOM 3D, Documents, Finance, Communications, and Smart Imports.

8. **[FRONTEND_COMPONENTS_DEEP_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/FRONTEND_COMPONENTS_DEEP_MAP.md)**
   - Detailed React 19 frontend component map across views, 3D CT planning toolbar, clinical rule panels, and dictation bars. *(Corrected 2026-08-06: previously "React 18"; `apps/web/package.json` declares 19.2.7.)*

9. **[ALGORITHMS_AND_SHARED_DEEP_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/ALGORITHMS_AND_SHARED_DEEP_MAP.md)**
   - Detailed technical breakdown of `@dental/shared` package Zod schemas, 3D DICOM MPR WebWorker algorithms, speech normalization logic, and NDFL calculation rules.

10. **[SCRIPTS_AND_CLI_DEEP_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/SCRIPTS_AND_CLI_DEEP_MAP.md)**
    - Comprehensive directory of over 170 automation, Playwright/Puppeteer visual audit scripts, and quality gate smoke suites (`scripts/`).

---

---

## What We Must Beat & Key Competitive Vectors

Existing dental systems (IDENT, DentalPRO, iStom, InfoClinica) already cover basic scheduling, billing, and document printing, but suffer from bureaucratic friction, clunky desktop legacy, and rigid doctor barriers. The key vectors where Dental CRM (DENTE) decisively wins:

1. **Zero-Friction Doctor Autonomy (Мандат 8e & Apple/Mac HIG)**:
   - *Проблема конкурентов*: IDENT и DentalPRO блокируют карту через 24 часа «замком начмеда», требуют согласований заведующих для любой опечатки, и делают кнопки «Сохранить» или «Завершить приём» неактивными (`disabled`), если не заполнены 50 полей пульса, давления или влажности.
   - *Решение DENTE*: Врач свободно правит свои дневники с версионным юридическим аудитом («ИСПРАВЛЕННОМУ ВЕРИТЬ (РЕДАКЦИЯ N)»). Кнопки никогда не блокируются без объяснения. Печать доступна всегда (со штампом «ЧЕРНОВИК» или «ПОДПИСАНО ВРАЧОМ»).
2. **Физиологическая норма в 1 клик («Соматически здоров / норма»)**:
   - В 1 клик заполняются все осмотры, анамнез, пародонт, СОПР и прикус. Врач правит исключительно патологию. Конкуренты тратят 7–10 минут врача на рутинный опрос.
3. **Молниеносный рентген и визиограф (<50 мс)**:
   - Отображение снимка датчика на Canvas/WebGL за <50 мс в нативном разрешении без 45-секундного ожидания нейросетей. ИИ-сегментация зубов запускается строго по отдельной кнопке врача и никогда не перезаписывает зубную формулу без ручного подтверждения.
4. **Integrated 3D DICOM MPR Viewer**:
   - Полноценный мультипланарный 3D-просмотрщик КЛКТ (MPR: аксиальный, сагиттальный, корональный срезы, панорамная кривая, имплантационная линейка) прямо в браузере без установки тяжелого софта (Romexis, Ez3D-i, OnDemand3D) на каждый компьютер (`apps/web/src/ImagingView.tsx`, `mprWorker.ts`).
5. **Voice Dictation & Speech Polish**:
   - Встроенная медицинская речевая транскрипция с нормализацией стоматологических терминов, формул зубов и детерминированным парсингом в структуру SOAP с непрерывным локальным автосохранением в IndexedDB (`apps/api/src/routes/speech.ts`).
6. **Регистратура, касса 54-ФЗ и склад без бюрократии**:
   - Печать нулевых договоров с пропусками `_______` регистратором без блокировок и 403-ошибок.
   - Касса не требует ИНН у физлиц, поддерживает комбинированную оплату (нал + безнал + аванс) в 1 клик.
   - Списание пустых карпул анестетиков медсестрой в 1 клик без комиссии из 3 человек; мягкий овердрафт склада с предупреждением вместо срыва приёма.
7. **Smart Imports Engine**:
   - Нативный автоматический импорт баз данных из IDENT, DentalPRO и Инфоклиники (`apps/api/src/routes/smartImports.ts`).

---

## Internal Clinical & Architecture References

- **[CLINICAL_USER_MANUAL.md](file:///C:/Clinic_MVP/dental-crm/docs/CLINICAL_USER_MANUAL.md)** — Практическое клиническое руководство врача: 1-клик норма, 30+ экспресс-шаблонов 043/у, регламент визиографа <50мс, автоклав класса B и утилизация карпул.
- **[12-document-generation-forms.md](file:///C:/Clinic_MVP/dental-crm/docs/12-document-generation-forms.md)** — Юридическая спецификация бланков: ИДС 1051н, договор Пост. № 736, справка 13% НДФЛ КНД 1151156 (коды 01 и 02), акты 804н, штампы версий «ИСПРАВЛЕННОМУ ВЕРИТЬ» и водяные знаки «ЧЕРНОВИК».
- **[CLINICAL_PROTOCOLS_REGISTRY.md](file:///C:/Clinic_MVP/dental-crm/.agents/CLINICAL_PROTOCOLS_REGISTRY.md)** — Реестр клинических протоколов, МКБ-10, номенклатура услуг 804н и клинические онтологии.
- **[CLINICAL_RULES.md](file:///C:/Clinic_MVP/dental-crm/.agents/CLINICAL_RULES.md)** — Движок клинических правил и предупреждений в реальном времени.
- **[DOCUMENTS_LIFECYCLE.md](file:///C:/Clinic_MVP/dental-crm/.agents/DOCUMENTS_LIFECYCLE.md)** — Архитектура PDF-генерации (Chromium/Edge headless), ЭЦП/УКЭП и юридический жизненный цикл документов.
- **[INDEX.md](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md)** — Матрица системной документации кодовой базы.

