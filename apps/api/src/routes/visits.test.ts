import { test, describe, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert";
import Fastify from "fastify";
import * as visits from "./visits.js";
import { TOKEN_SECRET } from "./auth.js";
import { signToken } from "../utils/cryptoHelper.js";

describe("visits routes - accept visit draft errors", () => {
  let app: ReturnType<typeof Fastify>;
  let clinicHeaders: Record<string, string>;

  beforeEach(async () => {
    process.env.NODE_ENV = "test";
    delete process.env.DENTE_CLINICAL_ADMIN_SECRET;
    process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";

    // Маршрут сам проверяет x-dente-clinic-token и отдаёт 401 ещё до
    // requireClinicalMutationAccess, поэтому послаблений guard'а недостаточно.
    clinicHeaders = {
      "x-dente-clinic-token": signToken(
        { organizationId: "123e4567-e89b-12d3-a456-4266141740ff" },
        TOKEN_SECRET(),
      ),
    };

    app = Fastify();
    await app.register(visits.registerVisitRoutes);
  });

  afterEach(async () => {
    await app.close();
    mock.restoreAll();
  });

  test("accept visit draft visit not found error path", async () => {
    // requireClinicalMutationAccess пропускает запрос сам, без подмены:
    // DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS=1 и NODE_ENV != production.
    // Но перед ним стоит проверка токена кабинета, поэтому нужен заголовок.

    const fakeUuid = "00000000-0000-0000-0000-000000000000";
    const response = await app.inject({
      method: "POST",
      url: `/api/visits/${fakeUuid}/draft/accept`,
      headers: clinicHeaders,
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
