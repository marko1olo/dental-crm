import type { FastifyInstance } from "fastify";
import {
  dentalPricelistAnalysisRequestSchema,
  dentalPricelistAnalysisResponseSchema
} from "@dental/shared";
import { requireClinicalReadAccess } from "../accessGuard.js";
import { analyzePricelist } from "../pricelist/analyzer.js";

export async function registerPricelistRoutes(app: FastifyInstance) {
  app.post(
    "/api/pricelist/analyze",
    {
      bodyLimit: 5 * 1024 * 1024
    },
    async (request, reply) => {
      if (!(await requireClinicalReadAccess(request, reply, "pricelist analysis"))) return;
      const input = dentalPricelistAnalysisRequestSchema.parse(request.body);
      return dentalPricelistAnalysisResponseSchema.parse(await analyzePricelist(input));
    }
  );
}
