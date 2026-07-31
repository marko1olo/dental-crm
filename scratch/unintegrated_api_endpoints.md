# Comprehensive Audit Report: Unintegrated & Zero-Reference API Endpoints in DENTE CRM

**Target Location**: `C:\Clinic_MVP\dental-crm`
**Audit Target**: `apps/api/src/routes/` and `apps/api/src/db/` compared against `apps/web/src/`

We have scanned all **52 route files** in `apps/api/src/routes/` (covering 200+ total route declarations) and cross-referenced all HTTP route paths against the entire web frontend client codebase (`apps/web/src/`).

---

## Key Audit Findings Summary

1. **Unregistered Backend Route (Dead Code)**:
   - `POST /api/documents/:id/sign` in `apps/api/src/routes/documents/sign.ts` (Line 30) is **unregistered**. It is omitted from `registerDocumentRoutes` in `documents.ts` (lines 1045-1049) and has zero references in the frontend. It is impossible to call via HTTP.

2. **Unimplemented Backend Transports / Stubs**:
   - `POST /api/max/send` (`apps/api/src/routes/max.ts`: Line 320) returns 501 `MaxSendNotImplemented` because the VK Max messenger outbound transport layer is not implemented.
   - `POST /api/diaries/sync-progress` & `PUT /api/treatment-plans/:planId/signature` (`apps/api/src/routes/diary.ts`: Lines 1024, 1028) are hardcoded stubs returning `{ success: true }`.

3. **Subsystems Implemented in Backend but 0 Calls in Web Frontend (`apps/web/src/`)**:
   - **Schedule Waitlist Intelligence & Freed Slot Matching**: `GET /api/schedule/freed-slots` and `GET /api/appointments/:appointmentId/waitlist-matches` compute waitlist recommendations for cancelled/no-show slots, but the web client UI does not consume them.
   - **3D CBCT / CT Implant Planning & DICOMweb WADO-RS**: `POST /api/imaging/planning/save`, `GET /api/imaging/planning/load`, and DICOMweb frame streaming (`GET /api/dicomweb/studies/.../frames/...`).
   - **EGISZ State Healthcare Integration**: `GET /api/egisz/frmo-frmr/status`, `POST /api/egisz/doctor/snils/validate`, `POST /api/egisz/diagnoses/multiple`, `POST /api/egisz/cda-r2/generate`.
   - **Family Wallet Top-Up & Payment**: `POST /api/finance/family-wallet/topup`, `POST /api/finance/family-wallet/pay`.
   - **Local Migration Autopilot & Disk Discovery**: `POST /api/imports/smart/local-source-discovery`, `workup`, `probe`, `migration-autopilot`, `report.safe.csv`, DICOM inspection, and migration rollback.
   - **Local Bridge & System Health Diagnostics**: `GET /api/system/local-bridges/readiness`, `use-plans`, `persistence/verify`, `persistence/export`.
   - **Tax & Audit Document Formats**: `GET /api/documents/:id/tax-xml` (FNS tax deduction format) and `GET /api/documents/:id/audit-facts`.

4. **External Portals & Webhooks (Not part of main SPA bundle)**:
   - Patient Portal (`/api/portal/*`), Public Booking Widget (`/api/public/booking/*`), Technician Lab Portal (`/api/portal/lab-order/*`), SMS 1-Click Action Links (`/api/p/:code`), and Inbound PBX/SMS/VK/WhatsApp Webhooks (`/api/telephony/*`, `/api/vk/*`, `/api/whatsapp/*`).

---

## Detailed List of Unintegrated Endpoints by Category

### Category 1: Unregistered & Unmounted Endpoints (Dead Code)
| Method | Endpoint | File Path | Line # | Status / Cause |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/documents/:id/sign` | `apps/api/src/routes/documents/sign.ts` | Line 30 | **Unregistered in Fastify router** (omitted from `documents.ts`). |

---

### Category 2: Unimplemented Transports & Hardcoded Stubs
| Method | Endpoint | File Path | Line # | Status / Cause |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/max/send` | `apps/api/src/routes/max.ts` | Line 320 | Returns 501 `MaxSendNotImplemented`. |
| `POST` | `/api/diaries/sync-progress` | `apps/api/src/routes/diary.ts` | Line 1024 | Stub returning `{ success: true }`. |
| `PUT` | `/api/treatment-plans/:planId/signature` | `apps/api/src/routes/diary.ts` | Line 1028 | Stub returning `{ success: true }`. |

---

### Category 3: Schedule Waitlist Intelligence & Freed Slot Matching
| Method | Endpoint | File Path | Line # | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/schedule/freed-slots` | `apps/api/src/routes/waitlistMatches.ts` | Line 40 | Scans 30-day horizon for cancelled/no-show slots & matches candidates. |
| `GET` | `/api/appointments/:appointmentId/waitlist-matches` | `apps/api/src/routes/waitlistMatches.ts` | Line 125 | Returns top matched waitlist patients for a specific freed slot. |

---

### Category 4: 3D CBCT / CT Implant Planning & DICOMweb WADO-RS
| Method | Endpoint | File Path | Line # | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/dicomweb/studies/.../frames/:frameNumber` | `apps/api/src/routes/dicomweb.ts` | Line 30 | WADO-RS single frame pixel data stream. |
| `POST` | `/api/imaging/planning/save` | `apps/api/src/routes/imaging_planning.ts` | Line 145 | Saves 3D CBCT implant planning session state & nerve paths. |
| `GET` | `/api/imaging/planning/load` | `apps/api/src/routes/imaging_planning.ts` | Line 224 | Loads 3D CBCT implant planning session state. |

---

### Category 5: EGISZ State Healthcare Portal Integration
| Method | Endpoint | File Path | Line # | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/egisz/frmo-frmr/status` | `apps/api/src/routes/egisz.ts` | Line 90 | Checks FRMO/FRMR clinic & staff registration. |
| `POST` | `/api/egisz/doctor/snils/validate` | `apps/api/src/routes/egisz.ts` | Line 134 | Validates doctor's SNILS against state registry. |
| `POST` | `/api/egisz/diagnoses/multiple` | `apps/api/src/routes/egisz.ts` | Line 184 | Encodes multiple ICD-10 diagnoses for state reporting. |
| `POST` | `/api/egisz/cda-r2/generate` | `apps/api/src/routes/egisz.ts` | Line 213 | Generates CDA R2 XML document for EGISZ upload. |

---

### Category 6: Family Wallet Subsystem
| Method | Endpoint | File Path | Line # | Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/finance/family-wallet/topup` | `apps/api/src/routes/finance_family.ts` | Line 180 | Deposits funds to shared family wallet. |
| `POST` | `/api/finance/family-wallet/pay` | `apps/api/src/routes/finance_family.ts` | Line 210 | Debits family wallet to pay visit invoices. |

---

### Category 7: Migration Engine, Autopilot & Local Disk Discovery
| Method | Endpoint | File Path | Line # | Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/imports/smart/local-source-discovery` | `apps/api/src/routes/smartImports.ts` | Line 5609 | Scans local disk for legacy MIS DBs (FoxPro, Access, SQLite). |
| `POST` | `/api/imports/smart/local-source-workup` | `apps/api/src/routes/smartImports.ts` | Line 5621 | Builds field mapping plan for discovered DBs. |
| `POST` | `/api/imports/smart/local-source-probe` | `apps/api/src/routes/smartImports.ts` | Line 5633 | Probes sample records in legacy database. |
| `POST` | `/api/imports/smart/migration-autopilot` | `apps/api/src/routes/smartImports.ts` | Line 5645 | Generates end-to-end automated migration plan. |
| `POST` | `/api/imports/smart/migration-autopilot/report.csv` | `apps/api/src/routes/smartImports.ts` | Line 5659 | Exports CSV audit report of autopilot plan. |
| `POST` | `/api/imports/smart/clinic-public-lookup` | `apps/api/src/routes/smartImports.ts` | Line 5678 | Looks up organization requisites via public API. |
| `POST` | `/api/imports/smart/report.safe.csv` | `apps/api/src/routes/smartImports.ts` | Line 5709 | Exports privacy-safe CSV handoff report. |
| `POST` | `/api/migration/runs/dicom/inspect` | `apps/api/src/routes/migrationRuns.ts` | Line 451 | Inspects DICOM tag headers in staging folder. |
| `POST` | `/api/migration/runs/reconciliation/export` | `apps/api/src/routes/migrationRuns.ts` | Line 477 | Generates reconciliation CSV export. |
| `GET` | `/api/migration/runs/worker/status` | `apps/api/src/routes/migrationRuns.ts` | Line 499 | Status of background migration worker. |
| `POST` | `/api/migration/runs/worker/discover` | `apps/api/src/routes/migrationRuns.ts` | Line 519 | Triggers background worker discovery. |
| `POST` | `/api/migration/quarantine/dismiss` | `apps/api/src/routes/migration.ts` | Line 634 | Dismisses corrupt quarantined records. |
| `GET` | `/api/migration/reconciliation.csv` | `apps/api/src/routes/migration.ts` | Line 665 | Reconciliation report CSV download. |
| `POST` | `/api/migration/rollback` | `apps/api/src/routes/migration.ts` | Line 703 | Rolls back executed migration run. |

---

### Category 8: System Diagnostics, Local Bridges & Maintenance
| Method | Endpoint | File Path | Line # | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/system/persistence/verify` | `apps/api/src/routes/system.ts` | Line 667 | Verifies integrity of local JSON snapshot. |
| `GET` | `/api/system/local-bridges/readiness` | `apps/api/src/routes/system.ts` | Line 672 | Probes local hardware/bridge services (Whisper, Vosk, OCR). |
| `GET` | `/api/system/local-bridges/use-plans` | `apps/api/src/routes/system.ts` | Line 677 | Generates execution plans for offline/local bridges. |
| `GET` | `/api/system/persistence/export` | `apps/api/src/routes/system.ts` | Line 682 | Downloads persistent state backup snapshot. |
| `POST` | `/api/settings/reset-demo` | `apps/api/src/routes/settings.ts` | Line 1526 | Resets clinic database to default demo data. |
| `POST` | `/api/settings/reset-zero` | `apps/api/src/routes/settings.ts` | Line 1530 | Completely wipes clinic database. |

---

### Category 9: Document Export & Compliance Fact APIs
| Method | Endpoint | File Path | Line # | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/documents/:id/tax-xml` | `apps/api/src/routes/documents/taxXml.ts` | Line 30 (mounted L1047) | FNS tax deduction XML export. |
| `GET` | `/api/documents/:id/audit-facts` | `apps/api/src/routes/documents/auditFacts.ts` | Line 30 (mounted L1048) | Compliance audit fact sheet for disputes. |

---

### Category 10: Ingestion & Intelligent Parsers
| Method | Endpoint | File Path | Line # | Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/ingestion/extract` | `apps/api/src/routes/ingestion.ts` | Line 30 | Generic document text extraction pipeline. |
| `POST` | `/api/pricelist/analyze` | `apps/api/src/routes/pricelist.ts` | Line 26 | Maps raw pricelist text to DENTE taxonomy. |

---

### Category 11: Speech Provider Runtime & Recovery APIs
| Method | Endpoint | File Path | Line # | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/speech/providers/runtime` | `apps/api/src/routes/speech.ts` | Line 315 | Reports speech engine runtime status. |
| `GET` | `/api/speech/recordings/recovery` | `apps/api/src/routes/speech.ts` | Line 318 | Lists un-assembled dictation chunks for recovery. |
| `GET` | `/api/speech/recordings/:recordingId/assemble` | `apps/api/src/routes/speech.ts` | Line 319 | Assembles multi-chunk dictation recording. |

---

### Category 12: External / Public Portals & Inbound Webhooks
*(Standalone external apps/widgets, SMS links, or third-party webhooks — not called from main SPA `apps/web/src/`)*

- `GET /api/p/:code` (`apps/api/src/routes/publicAppointmentActions.ts`: L260) - 1-Click SMS link handler.
- `GET /api/public/booking/:organizationId/doctors` (`apps/api/src/routes/publicBooking.ts`: L315) - Public booking doctors.
- `GET /api/public/booking/:organizationId/slots/:doctorId` (`apps/api/src/routes/publicBooking.ts`: L370) - Public booking slots.
- `POST /api/public/booking/:organizationId/book` (`apps/api/src/routes/publicBooking.ts`: L549) - Public booking submission.
- `POST /api/portal/auth/send-otp` (`apps/api/src/routes/portal.ts`: L256) - Patient portal OTP send.
- `POST /api/portal/auth/verify-otp` (`apps/api/src/routes/portal.ts`: L476) - Patient portal OTP verify.
- `GET /api/portal/me` (`apps/api/src/routes/portal.ts`: L593) - Patient portal profile.
- `GET /api/portal/documents/:documentId/html` (`apps/api/src/routes/portal.ts`: L661) - Patient portal document viewer.
- `GET /api/portal/lab-order/:token` (`apps/api/src/routes/lab.ts`: L318) - Dental Lab Technician portal.
- `POST /api/portal/lab-order/:token/status` (`apps/api/src/routes/lab.ts`: L370) - Dental Lab Technician status update.
- `POST /api/telephony/:organizationId/webhook` (`apps/api/src/routes/telephony.ts`: L38) - PBX call webhook.
- `POST /api/telephony/:organizationId/sms/webhook` (`apps/api/src/routes/telephony.ts`: L137) - Android SMS Forwarder webhook.
- `POST /api/public/:organizationId/vk/webhook` (`apps/api/src/routes/vk.ts`: L22) - VK Callback API webhook.
- `GET/POST /api/whatsapp/webhook` (`apps/api/src/routes/whatsapp.ts`: L284, L334) - Meta WhatsApp Business Cloud API webhook.
