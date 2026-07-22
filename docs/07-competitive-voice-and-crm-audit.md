# Competitive Voice and CRM Audit & Feature Parity Master Index

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
   - Canonical index of **63 unique competitor features** extracted from source dumps. Includes `feature_key`, status in our CRM (`[ЛУЧШЕ У НАС]`, `[ЧАСТИЧНО]`, `[НЕТ]`), value score (1–5), implementation options, and source evidence line ranges.

3. **[BACKLOG.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/BACKLOG.md)**
   - Architected implementation options with concrete file paths (`apps/web`, `apps/api`), database schema considerations, and risks for all `[НЕТ]` and `[ЧАСТИЧНО]` features.

4. **[PROGRESS.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/PROGRESS.md)**
   - Audit cursor log confirming 100% completion (2961 / 2961 lines processed).

5. **[FEATURE_SPECS/](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/FEATURE_SPECS)**
   - Self-contained specification markdown cards adhering strictly to the 13 mandatory specification fields.

6. **[DATABASE_DEEP_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/DATABASE_DEEP_MAP.md)**
   - Deep PostgreSQL schema breakdown, 31 document kinds (`documentKind`), Drizzle ORM enums, and database table relations.

7. **[API_ROUTES_DEEP_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/API_ROUTES_DEEP_MAP.md)**
   - Complete Fastify 4+ API route directory mapping all 48 backend endpoint files across Patients, Schedule, EHR, DICOM 3D, Documents, Finance, Communications, and Smart Imports.

8. **[FRONTEND_COMPONENTS_DEEP_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/FRONTEND_COMPONENTS_DEEP_MAP.md)**
   - Detailed React 18 frontend component map across views, 3D CT planning toolbar, clinical rule panels, and dictation bars.

9. **[ALGORITHMS_AND_SHARED_DEEP_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/ALGORITHMS_AND_SHARED_DEEP_MAP.md)**
   - Detailed technical breakdown of `@dental/shared` package Zod schemas, 3D DICOM MPR WebWorker algorithms, speech normalization logic, and NDFL calculation rules.

10. **[SCRIPTS_AND_CLI_DEEP_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/SCRIPTS_AND_CLI_DEEP_MAP.md)**
    - Comprehensive directory of over 170 automation, Playwright/Puppeteer visual audit scripts, and quality gate smoke suites (`scripts/`).

---

## What We Must Beat

Existing dental systems already cover basic scheduling, billing, and document printing. The key vectors where Dental CRM wins:

1. **Integrated 3D DICOM MPR Viewer**: Built directly into the browser workspace without requiring desktop installs or third-party launchers (`apps/web/src/ImagingView.tsx`, `mprWorker.ts`).
2. **Voice Dictation & Speech Polish**: Integrated STT dictation with medical term normalization and local autosave continuity (`apps/api/src/routes/speech.ts`).
3. **Smart Imports Engine**: Native automated database migration from IDENT, DentalPRO, and InfoClinica (`apps/api/src/routes/smartImports.ts`).
