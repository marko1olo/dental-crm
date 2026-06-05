import type { FastifyInstance } from "fastify";
import {
  dentalPricelistAnalysisRequestSchema,
  dentalPricelistAnalysisResponseSchema
} from "@dental/shared";
import { requireClinicalReadAccess } from "../accessGuard.js";
import { analyzePricelist } from "../pricelist/analyzer.js";

type PricelistPayloadSchema<T> = {
  safeParse: (value: unknown) => { success: true; data: T } | { success: false };
};

const pricelistValidationMessage =
  "Прайс не проверен: передайте текст прайса или изображение до безопасного лимита.";

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
      return dentalPricelistAnalysisResponseSchema.parse(await analyzePricelist(input));
    }
  );
}
