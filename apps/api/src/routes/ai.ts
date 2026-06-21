import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import {
  aiRecognitionJobResponseSchema,
  aiRecognitionJobSchema,
  createAiRecognitionJobSchema,
  visitNoteDraftRequestSchema,
  visitNoteDraftSchema,
} from "@dental/shared";
import { buildVisitDraftFromTranscript } from "../ai/visitDraft.js";
import {
  createAiRecognitionJob,
  imagingStudies,
  listAiRecognitionJobs,
  patients,
} from "../sampleData.js";
import {
  requireClinicalMutationAccess,
  requireClinicalReadAccess,
} from "../accessGuard.js";

const aiRecognitionValidationMessage =
  "AI-задача не создана: выберите пациента или снимок и тип черновика.";
const visitNoteDraftValidationMessage =
  "Черновик приема не собран: передайте текст диктовки и специальность врача.";
const aiRecognitionPatientMissingMessage =
  "Пациент не найден. Выберите пациента из актуальной карты.";
const aiRecognitionStudyMissingMessage =
  "Снимок не найден. Выберите снимок из карты пациента.";
const aiRecognitionStudyPatientMismatchMessage =
  "Снимок привязан к другому пациенту. Проверьте карту перед созданием AI-черновика.";

function sendAiRecognitionScopeError(
  reply: FastifyReply,
  statusCode: 404 | 409,
  message: string,
) {
  return reply.code(statusCode).send({
    error: "AiRecognitionScopeError",
    message,
  });
}

function sendVisitNoteDraftScopeError(
  reply: FastifyReply,
  statusCode: 404,
  message: string,
) {
  return reply.code(statusCode).send({
    error: "VisitNoteDraftScopeError",
    message,
  });
}

export async function registerAiRoutes(app: FastifyInstance) {
  app.get("/api/ai/recognition-jobs", async (request, reply) => {
    if (
      !(await requireClinicalReadAccess(request, reply, "ai recognition jobs"))
    )
      return;
    return z.array(aiRecognitionJobSchema).parse(listAiRecognitionJobs());
  });

  app.post("/api/ai/recognition-jobs", async (request, reply) => {
    if (
      !(await requireClinicalMutationAccess(
        request,
        reply,
        "ai recognition job create",
      ))
    )
      return;
    const parsedInput = createAiRecognitionJobSchema.safeParse(request.body);
    if (!parsedInput.success) {
      return reply.code(400).send({
        error: "AiRecognitionValidationError",
        message: aiRecognitionValidationMessage,
      });
    }
    const input = parsedInput.data;
    const patient = input.patientId
      ? patients.find((candidate) => candidate.id === input.patientId)
      : null;
    if (input.patientId && !patient) {
      return sendAiRecognitionScopeError(
        reply,
        404,
        aiRecognitionPatientMissingMessage,
      );
    }
    const imagingStudy = input.imagingStudyId
      ? imagingStudies.find(
          (candidate) => candidate.id === input.imagingStudyId,
        )
      : null;
    if (input.imagingStudyId && !imagingStudy) {
      return sendAiRecognitionScopeError(
        reply,
        404,
        aiRecognitionStudyMissingMessage,
      );
    }
    if (patient && imagingStudy && imagingStudy.patientId !== patient.id) {
      return sendAiRecognitionScopeError(
        reply,
        409,
        aiRecognitionStudyPatientMismatchMessage,
      );
    }
    const job = createAiRecognitionJob({
      ...input,
      patientId:
        patient?.id ?? imagingStudy?.patientId ?? input.patientId ?? null,
    });
    return reply.code(201).send(aiRecognitionJobResponseSchema.parse({ job }));
  });

  app.post("/api/ai/visit-note-draft", async (request, reply) => {
    if (
      !(await requireClinicalReadAccess(request, reply, "ai visit note draft"))
    )
      return;
    const parsedInput = visitNoteDraftRequestSchema.safeParse(request.body);
    if (!parsedInput.success) {
      return reply.code(400).send({
        error: "VisitNoteDraftValidationError",
        message: visitNoteDraftValidationMessage,
      });
    }
    const input = parsedInput.data;
    const patient = patients.find(
      (candidate) => candidate.id === input.patientId,
    );
    if (!patient) {
      return sendVisitNoteDraftScopeError(
        reply,
        404,
        aiRecognitionPatientMissingMessage,
      );
    }

    return visitNoteDraftSchema.parse(await buildVisitDraftFromTranscript(input.transcript, input.specialty));
  });
}
