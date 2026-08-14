# Project: EGISZ Missing Routes Implementation

## Architecture
Fastify backend (`apps/api/src/routes/egisz.ts`) + Drizzle ORM PostgreSQL (`schema.egiszBlankPermissions`, `schema.egiszLogs`) + React frontend (`apps/web/src/components/egisz/EgiszBlankPermissionsWidget.tsx`).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | GET /api/integrations/egisz-blank-permissions | Fastify route checking read access, fetching permissions by orgId, returning raw array of blank permissions | M1 | survey |
| 2 | POST /api/egisz/send | Fastify route checking mutation access, validating body Zod schema, inserting egiszLog with Pending status, returning `{ success: true, logId }` | M1 | survey |
| 3 | Contract Breach Proofs Un-todo | Remove `todo` markers from `(A) POST /api/egisz/send` and `(A) GET /api/integrations/egisz-blank-permissions` in `apps/api/src/tests/contract-breach-proofs.test.ts` | M1 | survey |
| 4 | Verification Gates | Ensure `tsc --noEmit` and test suites pass with zero mocks | M1 | survey |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | EGISZ Routes & Test Un-todo | Implement `GET /api/integrations/egisz-blank-permissions` & `POST /api/egisz/send` in `apps/api/src/routes/egisz.ts`, un-todo 2 contract breach tests in `apps/api/src/tests/contract-breach-proofs.test.ts` | none | IN_PROGRESS |

## Interface Contracts
### GET /api/integrations/egisz-blank-permissions
- Auth/Access Guard: `requireClinicalReadAccess(request, reply, "egisz permissions check")`
- Org Extraction: `requireOrganizationId(request, reply)`
- DB Query: `db.select().from(schema.egiszBlankPermissions).where(eq(schema.egiszBlankPermissions.organizationId, orgId))`
- Response format: Raw JSON array of mapped objects `[{ id, formCode, fieldName, isExportAllowed, patientOptOutRespect }, ...]` matching frontend `EgiszBlankPermissionsWidget.tsx` (or direct DB row mappings).

### POST /api/egisz/send
- Auth/Access Guard: `requireClinicalMutationAccess(request, reply, "egisz send")`
- Org Extraction: `requireOrganizationId(request, reply)`
- Body Validation: `z.object({ patientId: z.string().uuid(), visitId: z.string().uuid() })`
- DB Insert: `schema.egiszLogs` with `organizationId`, `patientId`, `visitId`, `status: "Pending"`
- Response format: `{ success: true, logId: inserted.id }`

## Code Layout
- `apps/api/src/routes/egisz.ts` - Fastify EGISZ route handlers
- `apps/api/src/db/schema.ts` - Drizzle ORM schema (`egiszBlankPermissions`, `egiszLogs`, `egiszStatus`)
- `apps/api/src/tests/contract-breach-proofs.test.ts` - Fastify contract breach tests
