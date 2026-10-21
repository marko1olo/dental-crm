# Handoff Report — POST /api/ai/visit-flow Route & Server Investigation

## 1. Observation
- **Route File Existence & Pattern**:
  - `apps/api/src/routes/ai.ts` exists.
  - Line 104 exports the registration function:
    `export async function registerAiRoutes(app: FastifyInstance)`
  - Lines 261–295 in `apps/api/src/routes/ai.ts` already contain the `POST /api/ai/visit-flow` endpoint handler:
    ```ts
    app.post("/api/ai/visit-flow", async (request, reply) => {
        try {
            if (
                !(await requireClinicalMutationAccess(
                    request,
                    reply,
                    "ai visit flow",
                ))
            )
                return;
            const orgId = await requireResolvedOrganizationId(
                request,
                reply,
                "ai visit flow",
            );
            if (!orgId) return;
            const parsedInput = visitFlowRequestSchema.safeParse(request.body);
            if (!parsedInput.success) {
                return reply.code(400).send({
                    error: "VisitFlowValidationError",
                    message: "Некорректные параметры для AI-оркестрации визита.",
                });
            }

            const result = await runVisitFlow(parsedInput.data);
            return reply.send(result);
        } catch (error: any) {
            request.log.error(error);
            return reply.status(500).send({
                error: "InternalServerError",
                message: "Internal server error",
            });
        }
    });
    ```
- **Access Guard & Organization ID Imports**:
  - `requireClinicalMutationAccess` is defined in `apps/api/src/accessGuard.ts`:35-74 with signature:
    `export async function requireClinicalMutationAccess(request: FastifyRequest, reply: FastifyReply, protectedArea = "clinical mutation"): Promise<boolean>`
  - `requireOrganizationId` is defined in `apps/api/src/security/identity.ts`:304-328 with signature:
    `export function requireOrganizationId(request: FastifyRequest, reply: FastifyReply): string | null`
  - `requireResolvedOrganizationId` is defined in `apps/api/src/accessGuard.ts`:136-142 with signature:
    `export async function requireResolvedOrganizationId(request: FastifyRequest, reply: FastifyReply, _protectedArea?: string): Promise<string | null>`
  - `requireClinicalMutationContext` is defined in `apps/api/src/accessGuard.ts`:278-288 with signature:
    `export async function requireClinicalMutationContext(request: FastifyRequest, reply: FastifyReply, protectedArea = "clinical mutation"): Promise<{ organizationId: string } | null>`
  - Imports in `apps/api/src/routes/ai.ts`:13-18:
    ```ts
    import {
        requireClinicalMutationAccess,
        requireClinicalReadAccess,
        requireResolvedOrganizationId,
        resolveOrganizationId,
    } from "../accessGuard.js";
    ```
- **Server Registration**:
  - `apps/api/src/server.ts`:24 imports `registerAiRoutes`:
    `import { registerAiRoutes } from "./routes/ai.js";`
  - `apps/api/src/server.ts`:590 registers the module inside `createDenteApiApp`:
    `await registerAiRoutes(app);`
- **Contract Breach Test State**:
  - `apps/api/src/tests/contract-breach-proofs.test.ts`:158-162 currently has a `todo` flag:
    ```ts
    test("(A) POST /api/ai/visit-flow — зовёт useVisitLogic.ts:1059, оркестратор ai/visitFlowOrchestrator.ts есть", {
        todo: "маршрут не реализован при существующем оркестраторе",
    }, async () => {
        await assertRouteIsServed("POST", "/api/ai/visit-flow", {});
    });
    ```

## 2. Logic Chain
1. Step 1: Checked `apps/api/src/routes/` for `ai.ts`. Identified `apps/api/src/routes/ai.ts` and confirmed it exports `registerAiRoutes(app: FastifyInstance)`.
2. Step 2: Inspected `apps/api/src/routes/ai.ts` lines 261-295 and observed that `app.post("/api/ai/visit-flow", ...)` is already implemented with input validation (`visitFlowRequestSchema`), access guard checks (`requireClinicalMutationAccess`), organization resolution (`requireResolvedOrganizationId`), and delegating to `runVisitFlow` from `apps/api/src/ai/visitFlowOrchestrator.ts`.
3. Step 3: Examined `apps/api/src/accessGuard.ts` and `apps/api/src/security/identity.ts` for guard functions. `requireClinicalMutationAccess` returns a boolean indicating whether the client provided valid admin credentials (or bypass is allowed), and `requireResolvedOrganizationId` / `requireOrganizationId` resolves the tenant organization ID from signed tokens.
4. Step 4: Inspected `apps/api/src/server.ts` lines 24 and 590 to confirm `registerAiRoutes` is imported and registered asynchronously via `await registerAiRoutes(app);`.
5. Step 5: Inspected `apps/api/src/tests/contract-breach-proofs.test.ts` line 158 and found the test case for `POST /api/ai/visit-flow` is currently marked with `todo`. Removing the `todo` option block will enable the active contract test.

## 3. Caveats
- The underlying `runVisitFlow` function in `apps/api/src/ai/visitFlowOrchestrator.ts` was not modified during this read-only investigation.
- If schema validation expectations in `visitFlowRequestSchema` change, corresponding updates should be made in `@dental/shared` or `apps/api/src/routes/ai.ts`.

## 4. Conclusion
The endpoint `POST /api/ai/visit-flow` and its server registration via `registerAiRoutes` in `apps/api/src/server.ts` are already structurally present and correctly configured with `requireClinicalMutationAccess` and `requireResolvedOrganizationId`. To complete milestone M1, the task primarily requires removing the `todo` marker from `apps/api/src/tests/contract-breach-proofs.test.ts` (line 158) and executing typecheck/test verification.

## 5. Verification Method
1. Inspect `apps/api/src/routes/ai.ts` lines 261–295 to verify endpoint signature and logic.
2. Inspect `apps/api/src/server.ts` line 590 to verify `await registerAiRoutes(app)`.
3. To test contract compliance, remove `todo` from line 158 of `apps/api/src/tests/contract-breach-proofs.test.ts` and run:
   ```bash
   npx tsx --test apps/api/src/tests/contract-breach-proofs.test.ts
   ```
4. Verify overall TypeScript compilation:
   ```bash
   npm run typecheck
   ```
