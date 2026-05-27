import type { FastifyInstance, FastifyReply } from "fastify";
import {
  acceptVisitDraftResponseSchema,
  acceptVisitDraftSchema,
  visitDraftAutosaveRequestSchema,
  visitDraftAutosaveResponseSchema
} from "@dental/shared";
import { acceptVisitDraft, getVisitDraftAutosave, upsertVisitDraftAutosave } from "../sampleData.js";
import { requireClinicalMutationAccess, requireClinicalReadAccess } from "../accessGuard.js";

function sendVisitDraftMutationError(error: unknown, reply: FastifyReply) {
  const message = error instanceof Error ? error.message : "Прием не обновлен";
  if (message === "Визит не найден") {
    return reply.code(404).send({ error: "VisitNotFound", message: "Прием не найден" });
  }
  if (message === "Прием уже закрыт или аннулирован") {
    return reply.code(409).send({ error: "VisitDraftMutationRejected", message });
  }
  throw error;
}

export async function registerVisitRoutes(app: FastifyInstance) {
  app.get("/api/visits/:visitId/draft/autosave", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "visit draft autosave read"))) return;
    const { visitId } = request.params as { visitId: string };
    return visitDraftAutosaveResponseSchema.parse({ serverDraft: getVisitDraftAutosave(visitId) });
  });

  app.put("/api/visits/:visitId/draft/autosave", async (request, reply) => {
    if (!(await requireClinicalMutationAccess(request, reply, "visit draft autosave"))) return;
    const { visitId } = request.params as { visitId: string };
    const input = visitDraftAutosaveRequestSchema.parse({ ...(request.body as object), visitId });

    try {
      return visitDraftAutosaveResponseSchema.parse({ serverDraft: upsertVisitDraftAutosave(input) });
    } catch (error) {
      return sendVisitDraftMutationError(error, reply);
    }
  });

  app.post("/api/visits/:visitId/draft/accept", async (request, reply) => {
    if (!(await requireClinicalMutationAccess(request, reply, "visit draft accept"))) return;
    const { visitId } = request.params as { visitId: string };
    const input = acceptVisitDraftSchema.parse({ ...(request.body as object), visitId });

    try {
      const result = acceptVisitDraft(input);
      return acceptVisitDraftResponseSchema.parse(result);
    } catch (error) {
      return sendVisitDraftMutationError(error, reply);
    }
  });
}
