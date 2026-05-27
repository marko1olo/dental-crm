import type { FastifyInstance } from "fastify";
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

type SpeechScopeValidation =
  | { ok: true; patientId: string | null; visitId: string | null }
  | { ok: false; statusCode: 400 | 404 | 409; error: string };

function normalizeScopeId(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function validateSpeechClinicalScope(
  input: SpeechScopeInput,
  options: { requirePatientOrVisit?: boolean } = {}
): SpeechScopeValidation {
  const requestedPatientId = normalizeScopeId(input.patientId);
  const requestedVisitId = normalizeScopeId(input.visitId);

  if (options.requirePatientOrVisit && !requestedPatientId && !requestedVisitId) {
    return { ok: false, statusCode: 400, error: "Нужно передать visitId или patientId" };
  }
  if (input.source === "visit" && !requestedVisitId) {
    return { ok: false, statusCode: 400, error: "Для диктовки приема нужен visitId" };
  }

  const patient = requestedPatientId ? patients.find((candidate) => candidate.id === requestedPatientId) : null;
  if (requestedPatientId && !patient) {
    return { ok: false, statusCode: 404, error: "Пациент не найден" };
  }

  const visit = requestedVisitId ? findVisitById(requestedVisitId) : null;
  if (requestedVisitId && !visit) {
    return { ok: false, statusCode: 404, error: "Прием не найден" };
  }

  if (visit && patient && visit.patientId !== patient.id) {
    return { ok: false, statusCode: 409, error: "Речевая запись приема не принадлежит выбранному пациенту" };
  }
  if (visit && patient && visit.organizationId !== patient.organizationId) {
    return { ok: false, statusCode: 409, error: "Речевая запись приема не принадлежит выбранной клинике" };
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
    const input = speechRecordingStrategyRequestSchema.parse(request.body);
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
    if (!scopeValidation.ok) return reply.code(scopeValidation.statusCode).send({ error: scopeValidation.error });

    const scope: Parameters<typeof listSpeechTranscriptionChunks>[1] = {};
    if (scopeValidation.visitId) scope.visitId = scopeValidation.visitId;
    if (scopeValidation.patientId) scope.patientId = scopeValidation.patientId;
    return listSpeechTranscriptionChunks(recordingId, scope).map((chunk) => speechTranscriptionChunkSchema.parse(chunk));
  });

  app.get("/api/speech/recordings/recovery", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "speech recording recovery"))) return;
    const query = request.query as { visitId?: string; patientId?: string; limit?: string };
    const scopeValidation = validateSpeechClinicalScope(
      { patientId: query.patientId, visitId: query.visitId },
      { requirePatientOrVisit: true }
    );
    if (!scopeValidation.ok) return reply.code(scopeValidation.statusCode).send({ error: scopeValidation.error });

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
    if (!scopeValidation.ok) return reply.code(scopeValidation.statusCode).send({ error: scopeValidation.error });

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
      const input = speechChunkUploadSchema.parse(request.body);
      const scopeValidation = validateSpeechClinicalScope(input);
      if (!scopeValidation.ok) return reply.code(scopeValidation.statusCode).send({ error: scopeValidation.error });
      const scopedInput: SpeechChunkUploadInput = {
        ...input,
        patientId: scopeValidation.patientId,
        visitId: scopeValidation.visitId
      };

      try {
        const result = await transcribeSpeechChunk(scopedInput);
        return reply.code(result.chunk.status === "failed" ? 503 : 201).send(speechTranscriptionResponseSchema.parse(result));
      } catch (error) {
        if (error instanceof SpeechChunkIdentityConflictError) {
          return reply.code(409).send({ message: error.message });
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
        message: parsedInput.error.issues.map((issue) => issue.message).join(" ")
      });
    }
    const input = parsedInput.data;
    return speechTranscriptPolishResponseSchema.parse(await polishSpeechTranscript(input));
  });
}
