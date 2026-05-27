import type { FastifyInstance } from "fastify";
import { documentIngestionRequestSchema, documentIngestionResponseSchema } from "@dental/shared";
import { extractDocument } from "../ingestion/documentExtractor.js";
import { requireClinicalMutationAccess } from "../accessGuard.js";

export async function registerIngestionRoutes(app: FastifyInstance) {
  app.post(
    "/api/ingestion/extract",
    {
      bodyLimit: 9 * 1024 * 1024
    },
    async (request, reply) => {
      if (!(await requireClinicalMutationAccess(request, reply, "document ingestion extract"))) return;
      const input = documentIngestionRequestSchema.parse(request.body);
      return documentIngestionResponseSchema.parse(extractDocument(input));
    }
  );
}
