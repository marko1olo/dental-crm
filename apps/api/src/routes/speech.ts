import { z } from "zod";
import type { FastifyInstance, FastifyReply } from "fastify";
import {
  speechChunkUploadSchema,
  speechGatewayHealthReportSchema,
  speechGatewayStatusSchema,
  speechProviderRuntimeStatusSchema,
  speechRecordingAssemblySchema,
  speechRecordingRecoveryListSchema,
  speechRecordingStrategyRequestSchema,
  speechRecordingStrategySchema,
  speechTranscriptPolishRequestSchema,
  speechTranscriptPolishResponseSchema,
  speechTranscriptionChunkSchema,
  speechTranscriptionResponseSchema,
  type SpeechChunkUploadInput
} from "@dental/shared";
import {
  SpeechChunkIdentityConflictError,
  assembleSpeechRecording,
  findVisitById,
  listSpeechRecordingRecoveries,
  listSpeechTranscriptionChunks,
  patients
} from "../sampleData.js";
import {
  SpeechChunkPayloadError,
  buildSpeechRecordingStrategy,
  getSpeechGatewayHealthReport,
  getSpeechGatewayStatus,
  getSpeechProviderRuntimeStatuses,
  speechJsonBodyLimitBytes,
  transcribeSpeechChunk
} from "../speech/gateway.js";
import { polishSpeechTranscript } from "../speech/polish.js";
import { requireClinicalMutationAccess, requireClinicalReadAccess } from "../accessGuard.js";

type SpeechScopeInput = {
  patientId?: string | null | undefined;
  visitId?: string | null | undefined;
  source?: SpeechChunkUploadInput["source"] | null | undefined;
};

type SpeechPayloadSchema<T> = {
  safeParse: (value: unknown) => { success: true; data: T } | { success: false };
};

type SpeechScopeValidation =
  | { ok: true; patientId: string | null; visitId: string | null }
  | { ok: false; statusCode: 400 | 404 | 409; error: "SpeechClinicalScopeError"; message: string };
type SpeechChunkRejectionReason = "audio_rejected" | "chunk_conflict";

const speechStrategyValidationMessage =
  "Стратегия записи не рассчитана: проверьте длительность, режим сети, приватность, специальность и источник диктовки.";
const speechChunkValidationMessage =
  "Фрагмент диктовки не принят: передайте запись, номер фрагмента, аудио или локальную расшифровку и клинический контекст.";
const speechChunkAudioRejectedMessage =
  "Аудиофрагмент не принят: запись повреждена. Повторите запись или сохраните текстовый черновик.";
const speechChunkConflictMessage =
  "Фрагмент диктовки не принят: очередь уже содержит фрагмент другой записи. Обновите очередь диктовки и повторите отправку.";

function parseSpeechPayload<T>(
  schema: SpeechPayloadSchema<T>,
  value: unknown,
  error: string,
  message: string,
  reply: FastifyReply
): T | null {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    reply.code(400).send({ error, message });
    return null;
  }
  return parsed.data;
}

function normalizeScopeId(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function speechScopeFailure(statusCode: 400 | 404 | 409, message: string): SpeechScopeValidation {
  return { ok: false, statusCode, error: "SpeechClinicalScopeError", message };
}

function sendSpeechScopeValidationError(reply: FastifyReply, scopeValidation: Extract<SpeechScopeValidation, { ok: false }>) {
  return reply.code(scopeValidation.statusCode).send({
    error: scopeValidation.error,
    message: scopeValidation.message
  });
}

function sendSpeechChunkRejection(
  reply: FastifyReply,
  statusCode: number,
  reason: SpeechChunkRejectionReason,
  message: string
) {
  return reply.code(statusCode).send({
    error: "SpeechChunkRejected",
    reason,
    message
  });
}

function validateSpeechClinicalScope(
  input: SpeechScopeInput,
  options: { requirePatientOrVisit?: boolean } = {}
): SpeechScopeValidation {
  const requestedPatientId = normalizeScopeId(input.patientId);
  const requestedVisitId = normalizeScopeId(input.visitId);

  if (options.requirePatientOrVisit && !requestedPatientId && !requestedVisitId) {
    return speechScopeFailure(400, "Укажите пациента или прием для диктовки.");
  }
  if (input.source === "visit" && !requestedVisitId) {
    return speechScopeFailure(400, "Для диктовки приема выберите активный прием.");
  }

  const patient = requestedPatientId ? patients.find((candidate) => candidate.id === requestedPatientId) : null;
  if (requestedPatientId && !patient) {
    return speechScopeFailure(404, "Пациент для диктовки не найден.");
  }

  const visit = requestedVisitId ? findVisitById(requestedVisitId) : null;
  if (requestedVisitId && !visit) {
    return speechScopeFailure(404, "Прием для диктовки не найден.");
  }

  if (visit && patient && visit.patientId !== patient.id) {
    return speechScopeFailure(409, "Диктовка приема относится к другому пациенту.");
  }
  if (visit && patient && visit.organizationId !== patient.organizationId) {
    return speechScopeFailure(409, "Диктовка приема относится к другой клинике.");
  }

  return {
    ok: true,
    patientId: patient?.id ?? visit?.patientId ?? null,
    visitId: visit?.id ?? null
  };
}

export async function registerSpeechRoutes(app: FastifyInstance) {
  app.get("/api/speech/status", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "speech gateway status"))) return;
    return speechGatewayStatusSchema.parse(getSpeechGatewayStatus());
  });

  app.get("/api/speech/gateway-health", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "speech gateway health"))) return;
    return speechGatewayHealthReportSchema.parse(getSpeechGatewayHealthReport());
  });

  app.get("/api/speech/providers/runtime", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "speech provider runtime"))) return;
    return getSpeechProviderRuntimeStatuses().map((provider) => speechProviderRuntimeStatusSchema.parse(provider));
  });

  app.post("/api/speech/recording-strategy", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "speech recording strategy"))) return;
    const input = parseSpeechPayload(
      speechRecordingStrategyRequestSchema,
      request.body,
      "SpeechStrategyValidationError",
      speechStrategyValidationMessage,
      reply
    );
    if (!input) return;
    return speechRecordingStrategySchema.parse(buildSpeechRecordingStrategy(input));
  });

  app.get("/api/speech/chunks", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "speech chunks"))) return;
    const query = request.query as { recordingId?: string; visitId?: string; patientId?: string };
    const recordingId = query.recordingId?.trim();
    if (!recordingId) return [];

    const scopeValidation = validateSpeechClinicalScope(
      { patientId: query.patientId, visitId: query.visitId },
      { requirePatientOrVisit: true }
    );
    if (!scopeValidation.ok) return sendSpeechScopeValidationError(reply, scopeValidation);

    const scope: Parameters<typeof listSpeechTranscriptionChunks>[1] = {};
    if (scopeValidation.visitId) scope.visitId = scopeValidation.visitId;
    if (scopeValidation.patientId) scope.patientId = scopeValidation.patientId;
    return z.array(speechTranscriptionChunkSchema).parse(listSpeechTranscriptionChunks(recordingId, scope));
  });

  app.get("/api/speech/recordings/recovery", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "speech recording recovery"))) return;
    const query = request.query as { visitId?: string; patientId?: string; limit?: string };
    const scopeValidation = validateSpeechClinicalScope(
      { patientId: query.patientId, visitId: query.visitId },
      { requirePatientOrVisit: true }
    );
    if (!scopeValidation.ok) return sendSpeechScopeValidationError(reply, scopeValidation);

    const filters: { visitId?: string | null; patientId?: string | null; limit?: number | null } = {};
    if (scopeValidation.visitId) filters.visitId = scopeValidation.visitId;
    if (scopeValidation.patientId) filters.patientId = scopeValidation.patientId;
    if (query.limit) filters.limit = Number(query.limit);
    return speechRecordingRecoveryListSchema.parse(listSpeechRecordingRecoveries(filters));
  });

  app.get("/api/speech/recordings/:recordingId/assemble", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "speech recording assemble"))) return;
    const params = request.params as { recordingId: string };
    const query = request.query as { visitId?: string; patientId?: string };
    const scopeValidation = validateSpeechClinicalScope(
      { patientId: query.patientId, visitId: query.visitId },
      { requirePatientOrVisit: true }
    );
    if (!scopeValidation.ok) return sendSpeechScopeValidationError(reply, scopeValidation);

    const scope: Parameters<typeof assembleSpeechRecording>[1] = {};
    if (scopeValidation.visitId) scope.visitId = scopeValidation.visitId;
    if (scopeValidation.patientId) scope.patientId = scopeValidation.patientId;
    return speechRecordingAssemblySchema.parse(assembleSpeechRecording(params.recordingId, scope));
  });

  app.post(
    "/api/speech/transcribe-chunk",
    {
      bodyLimit: speechJsonBodyLimitBytes()
    },
    async (request, reply) => {
      if (!(await requireClinicalMutationAccess(request, reply, "speech chunk transcribe"))) return;
      const input = parseSpeechPayload(
        speechChunkUploadSchema,
        request.body,
        "SpeechChunkValidationError",
        speechChunkValidationMessage,
        reply
      );
      if (!input) return;
      const scopeValidation = validateSpeechClinicalScope(input);
      if (!scopeValidation.ok) return sendSpeechScopeValidationError(reply, scopeValidation);
      const scopedInput: SpeechChunkUploadInput = {
        ...input,
        patientId: scopeValidation.patientId,
        visitId: scopeValidation.visitId
      };

      try {
        const result = await transcribeSpeechChunk(scopedInput);
        return reply.code(result.chunk.status === "failed" ? 503 : 201).send(speechTranscriptionResponseSchema.parse(result));
      } catch (error) {
        if (error instanceof SpeechChunkPayloadError) {
          return sendSpeechChunkRejection(reply, error.statusCode, "audio_rejected", speechChunkAudioRejectedMessage);
        }
        if (error instanceof SpeechChunkIdentityConflictError) {
          return sendSpeechChunkRejection(reply, error.statusCode, "chunk_conflict", speechChunkConflictMessage);
        }
        throw error;
      }
    }
  );

  app.post("/api/speech/polish-transcript", async (request, reply) => {
    if (!(await requireClinicalMutationAccess(request, reply, "speech transcript polish"))) return;
    const parsedInput = speechTranscriptPolishRequestSchema.safeParse(request.body);
    if (!parsedInput.success) {
      return reply.code(400).send({
        error: "ValidationError",
        message:
          "Некорректный текст для очистки диктовки. Передайте непустую расшифровку до 80 000 символов и специальность приема."
      });
    }
    const input = parsedInput.data;
    return speechTranscriptPolishResponseSchema.parse(await polishSpeechTranscript(input));
  });
}
