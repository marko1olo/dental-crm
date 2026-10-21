# Scope: Clinic Workflows API & Contract Breach Resolution

## Architecture
- Fastify Backend API (`apps/api/src/routes/clinicWorkflows.ts`, `apps/api/src/db/schema.ts`, `apps/api/src/server.ts`)
- PostgreSQL Drizzle Schema (`clinic_workflows` table)
- Automated Contract Breach Tests (`apps/api/src/tests/contract-breach-proofs.test.ts`)

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | `definition` jsonb column | Add `definition: jsonb("definition").notNull()` to `clinic_workflows` schema and generate SQL migration | M1 | ORIGINAL_REQUEST R1 |
| 2 | `GET /api/clinic/workflows` | List clinic workflows for tenant organization | M2 | ORIGINAL_REQUEST R2 |
| 3 | `POST /api/clinic/workflows` | Create workflow with name & definition (default trigger "manual") | M2 | ORIGINAL_REQUEST R2 |
| 4 | `POST /api/clinic/workflows/:id/toggle` | Toggle `active` field of workflow | M2 | ORIGINAL_REQUEST R2 |
| 5 | `DELETE /api/clinic/workflows/:id` | Delete workflow | M2 | ORIGINAL_REQUEST R2 |
| 6 | Contract Breach Proofs | Activate & pass 4 skipped/todo tests in `contract-breach-proofs.test.ts` | M3 | ORIGINAL_REQUEST R4 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Schema Alignment | Add `definition` column to `clinic_workflows` & generate Drizzle migration | none | DONE |
| 2 | M2: Route Implementation | Create `clinicWorkflows.ts`, register in server router, enforce permissions & multi-tenancy | M1 | DONE |
| 3 | M3: Integration & Audit | Remove `todo:` markers from contract breach tests, verify via tests & static checks, run forensic audit | M2 | DONE |

## Interface Contracts
### `SettingsBpmnTab` / API Client ↔ Fastify Router
- `GET /api/clinic/workflows`: Returns array of workflows (`{ id, name, trigger, active, definition, createdAt, updatedAt }`)
- `POST /api/clinic/workflows`: Accepts `{ name: string, definition: string | object, trigger?: string }`
- `POST /api/clinic/workflows/:id/toggle`: Toggles `active` boolean
- `DELETE /api/clinic/workflows/:id`: Removes workflow record
