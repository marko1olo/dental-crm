import type { FastifyInstance } from "fastify";
import {
  dentalPricelistAnalysisRequestSchema,
  dentalPricelistAnalysisResponseSchema
} from "@dental/shared";
import { requireClinicalReadAccess } from "../accessGuard.js";
import { analyzePricelist } from "../pricelist/analyzer.js";
import { getDefaultOrganizationId, getServiceCatalogForOrganization } from "../db/pricelistQuery.js";

type PricelistPayloadSchema<T> = {
  safeParse: (value: unknown) => { success: true; data: T } | { success: false };
};

const pricelistValidationMessage =
  "Ошибка валидации: прайс-лист или запрос не соответствуют формату.";

function parsePricelistPayload<T>(schema: PricelistPayloadSchema<T>, value: unknown) {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    return null;
  }
  return parsed.data;
}

export async function registerPricelistRoutes(app: FastifyInstance) {
  app.post(
    "/api/pricelist/analyze",
    {
      bodyLimit: 5 * 1024 * 1024
    },
    async (request, reply) => {
      if (!(await requireClinicalReadAccess(request, reply, "pricelist analysis"))) return;
      const input = parsePricelistPayload(dentalPricelistAnalysisRequestSchema, request.body);
      if (!input) {
        return reply.code(400).send({
          error: "PricelistValidationError",
          message: pricelistValidationMessage
        });
      }
      const orgId = await getDefaultOrganizationId();
      if (!orgId) {
        return reply.code(500).send({ error: "NoOrganizationFound", message: "Организация не найдена" });
      }
      const catalog = await getServiceCatalogForOrganization(orgId);
      return dentalPricelistAnalysisResponseSchema.parse(await analyzePricelist(input, catalog));
    }
  );
}
