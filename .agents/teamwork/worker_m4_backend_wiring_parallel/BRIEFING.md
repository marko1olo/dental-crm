# BRIEFING — 2026-10-20T06:18:00Z

## Mission
Milestone M4: Wire up backend endpoints for 3D lab scans upload and local disk storage fallback, add model/ply and application/octet-stream Fastify parsers, and wire dead handlers in MobileChairsideEHR.tsx and AddServiceToothSelector.tsx.

## 🔒 My Identity
- Archetype: teamwork_preview_worker (Backend Integration & Endpoint Wiring)
- Roles: implementer, qa
- Working directory: C:\Clinic_MVP\dental-crm\.agents\teamwork\worker_m4_backend_wiring_parallel
- Original parent: 47f9f488-23df-448d-9d14-106c107b506b
- Milestone: M4 (Features 19–21)

## 🔒 Key Constraints
- Minimal change principle.
- No synthetic mocks in production code. Authentic local disk persistence in `.data/lab_scans` when S3/MinIO keys missing.
- Zero dead handlers: wire dummy onClick handlers to real visit state transitions.
- Verify exit codes, TypeScript compilation, and runtime tests.

## Current Parent
- Conversation ID: 47f9f488-23df-448d-9d14-106c107b506b
- Updated: not yet

## Task Summary
- **What to build**:
  1. `useLabAttachScanState.ts`: eliminate dead 404 URL `/api/portal/mock-storage/direct-upload`. Wire real binary upload fallback to Fastify local disk storage (`.data/lab_scans`).
  2. Fastify API / `portalMockStorageRoutes.ts`: support Content-Type `"model/ply"`, `"model/stl"`, `"model/obj"`, and `"application/octet-stream"` for 3D scans, preventing 415.
  3. `MobileChairsideEHR.tsx` and `AddServiceToothSelector.tsx`: revive all dead handlers (`onClick={() => {}}`), connecting tooth selection and anesthesia/materials write-off with real visit handlers.
- **Success criteria**:
  - Upload endpoints accept binary 3D scans and save to disk / return 200/201.
  - No 415 Unsupported Media Type for model/ply / octet-stream.
  - Tooth selectors and anesthesia/material buttons in MobileChairsideEHR.tsx and AddServiceToothSelector.tsx update state and trigger real callbacks.
  - TypeScript compiles without errors.
- **Interface contracts**: PROJECT.md Storage Fallback Contract
- **Code layout**: apps/web/src/components/lab, apps/api/src/routes, apps/web/src/components/chairside, apps/web/src/components/services

## Key Decisions Made
- [Initial planning]

## Artifact Index
- DISPATCH.md — Assignment
- BRIEFING.md — Memory
- progress.md — Heartbeat
