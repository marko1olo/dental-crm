import { test, describe, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert";
import Fastify from "fastify";
import * as visits from "./visits.js";
describe("visits routes - accept visit draft errors", () => {
    let app;
    beforeEach(async () => {
        process.env.NODE_ENV = "test";
        delete process.env.DENTE_CLINICAL_ADMIN_SECRET;
        process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
        app = Fastify();
        await app.register(visits.registerVisitRoutes);
    });
    afterEach(async () => {
        await app.close();
        mock.restoreAll();
    });
    test("accept visit draft visit not found error path", async () => {
        // `mock.method` cannot redefine the property imported by the ESM loader sometimes because it's non-configurable.
        // However, since `process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS` is strictly set to "1"
        // and `process.env.NODE_ENV` is "test", the function `requireClinicalMutationAccess` returns `true` natively without a mock.
        // So we don't need to mock it at all!
        const fakeUuid = "00000000-0000-0000-0000-000000000000";
        const response = await app.inject({
            method: "POST",
            url: `/api/visits/${fakeUuid}/draft/accept`,
            payload: {
                visitId: fakeUuid,
                draft: {
                    complaint: null,
                    anamnesis: null,
                    objectiveStatus: null,
                    diagnosis: null,
                    treatmentPlan: null,
                    warnings: []
                }
            }
        });
        assert.strictEqual(response.statusCode, 404);
        assert.deepStrictEqual(response.json(), {
            error: "VisitNotFound",
            reason: "visit_not_found",
            message: "Прием не найден. Обновите рабочий экран и выберите актуальный прием."
        });
    });
});
