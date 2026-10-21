# Handoff Report: Investigation of `visitFlowOrchestrator.ts` and `contract-breach-proofs.test.ts` (Task r8_2)

## 1. Observation

### Source File 1: `apps/api/src/ai/visitFlowOrchestrator.ts`
- **Path**: `C:/Clinic_MVP/dental-crm/apps/api/src/ai/visitFlowOrchestrator.ts`
- **Exported Function**: Exactly one function is exported:
  ```typescript
  export async function runVisitFlow(
  	request: VisitFlowRequest,
  ): Promise<VisitFlowResult>
  ```
- **Line Number**: Line 144
- **Parameters & Types**:
  - `request`: `VisitFlowRequest` (imported from `@dental/shared`)
    - Key payload fields: `transcript` (string), `specialty` (optional string), `doctorFullName` (optional string), `completedServices` (optional array), `planPayload` (optional `TreatmentPlanPayload`), `recommendationsPayload` (optional `PostVisitRecommendationsPayload`), `orchestratorConfig` (optional config object `{ enablePlan?: boolean; enableRecommendations?: boolean; enableDocuments?: boolean }`).
- **Return Type**: `Promise<VisitFlowResult>` (imported from `@dental/shared`)
  - Structure:
    ```typescript
    {
      draft: VisitFlowStepResult<VisitNoteDraft>,
      plan: VisitFlowStepResult<TreatmentPlanPayload>,
      recommendations: VisitFlowStepResult<PostVisitRecommendationsPayload>,
      documents: VisitFlowStepResult<{ suggestions: string[] }>,
      overallStatus: "success" | "partial" | "error"
    }
    ```

### Source File 2: `apps/api/src/routes/ai.ts`
- **Path**: `C:/Clinic_MVP/dental-crm/apps/api/src/routes/ai.ts`
- **Line Numbers**: Lines 261–295
- **Route Implementation**:
  ```typescript
  app.post("/api/ai/visit-flow", async (request, reply) => {
      try {
          if (!(await requireClinicalMutationAccess(request, reply, "ai visit flow"))) return;
          const orgId = await requireResolvedOrganizationId(request, reply, "ai visit flow");
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

### Source File 3: `apps/api/src/server.ts`
- **Path**: `C:/Clinic_MVP/dental-crm/apps/api/src/server.ts`
- **Line Number**: Line 590
- **Registration**: `await registerAiRoutes(app);` is executed during application startup in `createDenteApiApp()`.

### Test File: `apps/api/src/tests/contract-breach-proofs.test.ts`
- **Path**: `C:/Clinic_MVP/dental-crm/apps/api/src/tests/contract-breach-proofs.test.ts`
- **Line Numbers**: Lines 158–162
- **Current Code**:
  ```typescript
  test("(A) POST /api/ai/visit-flow — зовёт useVisitLogic.ts:1059, оркестратор ai/visitFlowOrchestrator.ts есть", {
  	todo: "маршрут не реализован при существующем оркестраторе",
  }, async () => {
  	await assertRouteIsServed("POST", "/api/ai/visit-flow", {});
  });
  ```
- **Test Setup & Execution**:
  `assertRouteIsServed("POST", "/api/ai/visit-flow", {})` creates the Fastify application via `realApp()`, executes `app.inject({ method: "POST", url: "/api/ai/visit-flow", headers: { "content-type": "application/json" }, payload: {} })`, and asserts `!routeIsUnserved(response)`.
- **Test Expectation**:
  The test checks whether the server handles `POST /api/ai/visit-flow` without returning a Fastify default 404 RouteNotFound response (`routeIsUnserved`).

---

## 2. Logic Chain

1. **Orchestrator Function Verification**:
   - `apps/api/src/ai/visitFlowOrchestrator.ts` exports `runVisitFlow(request: VisitFlowRequest): Promise<VisitFlowResult>`.
   - The interface contract in `SCOPE.md` mentioned `startVisitFlowOrchestrator` tentatively, but confirmed the target is the corresponding exported function in `visitFlowOrchestrator.ts`. That function is `runVisitFlow`.

2. **Route Existence & Wiring**:
   - `apps/api/src/routes/ai.ts` already contains the `POST /api/ai/visit-flow` handler.
   - It performs permission checks via `requireClinicalMutationAccess` and `requireResolvedOrganizationId`.
   - It validates `request.body` against `visitFlowRequestSchema`.
   - It invokes `runVisitFlow(parsedInput.data)` and returns `result`.
   - `registerAiRoutes(app)` is already imported and called in `apps/api/src/server.ts:590`.

3. **Test Status & Required Changes**:
   - Because `POST /api/ai/visit-flow` is already registered in Fastify, calling `assertRouteIsServed("POST", "/api/ai/visit-flow", {})` in `contract-breach-proofs.test.ts` will succeed (i.e. `!routeIsUnserved(response)` is true).
   - Currently, the test is marked with `{ todo: "маршрут не реализован при существующем оркестраторе" }`, causing `node:test` to treat it as a pending todo item rather than an active test.
   - Removing the options object `{ todo: ... }` will promote the test to a live, active test that passes out-of-the-box.

---

## 3. Caveats

- **Scope Limit**: Read-only investigation. No source files under `apps/api/src` were modified during this step.
- **Verification Gate**: Execution of `node --test apps/api/src/tests/contract-breach-proofs.test.ts` requires running via npm/node test runner in the API workspace.

---

## 4. Conclusion

- **Function Name**: `runVisitFlow`
- **Signature**: `export async function runVisitFlow(request: VisitFlowRequest): Promise<VisitFlowResult>`
- **Route Status**: `POST /api/ai/visit-flow` is ALREADY implemented in `apps/api/src/routes/ai.ts` and registered in `apps/api/src/server.ts`.
- **Test Change Required**:
  In `apps/api/src/tests/contract-breach-proofs.test.ts` (lines 158–162), change:
  ```typescript
  test("(A) POST /api/ai/visit-flow — зовёт useVisitLogic.ts:1059, оркестратор ai/visitFlowOrchestrator.ts есть", {
  	todo: "маршрут не реализован при существующем оркестраторе",
  }, async () => {
  	await assertRouteIsServed("POST", "/api/ai/visit-flow", {});
  });
  ```
  to:
  ```typescript
  test("(A) POST /api/ai/visit-flow — зовёт useVisitLogic.ts:1059, оркестратор ai/visitFlowOrchestrator.ts есть", async () => {
  	await assertRouteIsServed("POST", "/api/ai/visit-flow", {});
  });
  ```

---

## 5. Verification Method

1. Inspect `apps/api/src/tests/contract-breach-proofs.test.ts` line 158 to verify the `{ todo: ... }` block is removed.
2. Run test execution command:
   ```bash
   npx tsx --test apps/api/src/tests/contract-breach-proofs.test.ts
   ```
3. Confirm that `(A) POST /api/ai/visit-flow` passes as an active test without todo markers.
