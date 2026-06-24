import type { FastifyInstance, FastifyReply } from "fastify";
import {
  acceptVisitDraftResponseSchema,
  acceptVisitDraftSchema,
  visitDraftAutosaveRequestSchema,
  visitDraftAutosaveResponseSchema
} from "@dental/shared";
import { acceptVisitDraft, getVisitDraftAutosave, upsertVisitDraftAutosave } from "../sampleData.js";
import { requireClinicalMutationAccess, requireClinicalReadAccess } from "../accessGuard.js";

type VisitPayloadSchema<T> = {
  safeParse: (value: unknown) => { success: true; data: T } | { success: false };
};
type VisitDraftMutationOperation = "autosave" | "accept";

const visitDraftAutosaveValidationMessage =
  "Черновик приема не сохранен: передайте пациента, специальность, текст приема или заполненные поля черновика.";
const visitDraftAcceptValidationMessage =
  "Черновик приема не принят: передайте текст приема, заполненные поля черновика и данные сохранения врача.";
const visitDraftNotFoundMessage = "Прием не найден. Обновите рабочий экран и выберите актуальный прием.";
const visitDraftAutosaveClosedMessage = "Черновик приема не сохранен: этот прием уже недоступен для изменений.";
const visitDraftAcceptClosedMessage = "Черновик приема не принят: этот прием уже недоступен для изменений.";
const visitDraftMutationRejectedMessage = "Черновик приема не изменен: обновите прием и повторите действие.";

function visitRequestBody(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function parseVisitPayload<T>(schema: VisitPayloadSchema<T>, value: unknown, message: string, reply: FastifyReply): T | null {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    reply.code(400).send({ error: "VisitDraftValidationError", message });
    return null;
  }
  return parsed.data;
}

function visitDraftDomainMessage(error: unknown): string {
  if (!(error instanceof Error)) return "";
  return error.message.trim();
}

function sendVisitDraftMutationError(error: unknown, reply: FastifyReply, operation: VisitDraftMutationOperation) {
  const message = visitDraftDomainMessage(error);
  if (message === "Визит не найден") {
    return reply.code(404).send({
      error: "VisitNotFound",
      reason: "visit_not_found",
      message: visitDraftNotFoundMessage
    });
  }
  if (message === "Прием уже закрыт или аннулирован") {
    return reply.code(409).send({
      error: "VisitDraftMutationRejected",
      reason: "visit_closed",
      message: operation === "accept" ? visitDraftAcceptClosedMessage : visitDraftAutosaveClosedMessage
    });
  }
  return reply.code(409).send({
    error: "VisitDraftMutationRejected",
    reason: "visit_draft_rejected",
    message: visitDraftMutationRejectedMessage
  });
}

export { sendVisitDraftMutationError as _sendVisitDraftMutationErrorForTesting };

export async function registerVisitRoutes(app: FastifyInstance) {
  app.get("/api/visits/:visitId/draft/autosave", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "visit draft autosave read"))) return;
    const { visitId } = request.params as { visitId: string };
    return visitDraftAutosaveResponseSchema.parse({ serverDraft: getVisitDraftAutosave(visitId) });
  });

  app.put("/api/visits/:visitId/draft/autosave", async (request, reply) => {
    if (!(await requireClinicalMutationAccess(request, reply, "visit draft autosave"))) return;
    const { visitId } = request.params as { visitId: string };
    const input = parseVisitPayload(
      visitDraftAutosaveRequestSchema,
      { ...visitRequestBody(request.body), visitId },
      visitDraftAutosaveValidationMessage,
      reply
    );
    if (!input) return;

    try {
      return visitDraftAutosaveResponseSchema.parse({ serverDraft: upsertVisitDraftAutosave(input) });
    } catch (error) {
      return sendVisitDraftMutationError(error, reply, "autosave");
    }
  });

  app.post("/api/visits/:visitId/draft/accept", async (request, reply) => {
    if (!(await requireClinicalMutationAccess(request, reply, "visit draft accept"))) return;
    const { visitId } = request.params as { visitId: string };
    const input = parseVisitPayload(
      acceptVisitDraftSchema,
      { ...visitRequestBody(request.body), visitId },
      visitDraftAcceptValidationMessage,
      reply
    );
    if (!input) return;

    try {
      const result = acceptVisitDraft(input);
      return acceptVisitDraftResponseSchema.parse(result);
    } catch (error) {
      return sendVisitDraftMutationError(error, reply, "accept");
    }
  });
}
