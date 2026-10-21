# Scope: POST /api/ai/visit-flow Implementation

## Architecture
- API Server: `apps/api/src/server.ts`
- Routes: `apps/api/src/routes/ai.ts`
- AI Orchestrator Module: `apps/api/src/ai/visitFlowOrchestrator.ts`
- Tests: `apps/api/src/tests/contract-breach-proofs.test.ts`

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | POST /api/ai/visit-flow route | Route implementation in `apps/api/src/routes/ai.ts` with access check & org ID check | M1 | R1 |
| 2 | Orchestrator Invocation | Call function from `apps/api/src/ai/visitFlowOrchestrator.ts` using request body | M1 | R2 |
| 3 | Route Registration | Register AI routes in `apps/api/src/server.ts` | M1 | R3 |
| 4 | Test Update | Remove todo marker from `(A) POST /api/ai/visit-flow` in contract-breach-proofs.test.ts | M1 | R4 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Implement & Verify POST /api/ai/visit-flow | R1, R2, R3, R4 | none | IN_PROGRESS |

## Interface Contracts
### `POST /api/ai/visit-flow`
- Endpoint: `POST /api/ai/visit-flow`
- Auth/Permissions: `requireClinicalMutationAccess(request, reply, "ai visit flow")`, `requireOrganizationId(request, reply)`
- Payload: body read from `request.body` matching frontend structure used in `apps/web/src`
- Action: calls `startVisitFlowOrchestrator(payload)` (or corresponding exported function) in `apps/api/src/ai/visitFlowOrchestrator.ts`
