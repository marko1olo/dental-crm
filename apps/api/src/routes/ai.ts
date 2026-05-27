import type { FastifyInstance } from "fastify";
import {
  aiRecognitionJobResponseSchema,
  aiRecognitionJobSchema,
  createAiRecognitionJobSchema,
  visitNoteDraftRequestSchema,
  visitNoteDraftSchema
} from "@dental/shared";
import { buildVisitDraftFromTranscript } from "../ai/visitDraft.js";
import { createAiRecognitionJob, imagingStudies, listAiRecognitionJobs, patients } from "../sampleData.js";
import { requireClinicalMutationAccess, requireClinicalReadAccess } from "../accessGuard.js";

export async function registerAiRoutes(app: FastifyInstance) {
  app.get("/api/ai/recognition-jobs", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "ai recognition jobs"))) return;
    return listAiRecognitionJobs().map((job) => aiRecognitionJobSchema.parse(job));
  });

  app.post("/api/ai/recognition-jobs", async (request, reply) => {
    if (!(await requireClinicalMutationAccess(request, reply, "ai recognition job create"))) return;
    const parsedInput = createAiRecognitionJobSchema.safeParse(request.body);
    if (!parsedInput.success) {
      return reply.code(400).send({
        error: "ValidationError",
        message: parsedInput.error.issues.map((issue) => issue.message).join(" ")
      });
    }
    const input = parsedInput.data;
    const patient = input.patientId ? patients.find((candidate) => candidate.id === input.patientId) : null;
    if (input.patientId && !patient) {
      return reply.code(404).send({ error: "Пациент не найден" });
    }
    const imagingStudy = input.imagingStudyId ? imagingStudies.find((candidate) => candidate.id === input.imagingStudyId) : null;
    if (input.imagingStudyId && !imagingStudy) {
      return reply.code(404).send({ error: "Снимок не найден" });
    }
    if (patient && imagingStudy && imagingStudy.patientId !== patient.id) {
      return reply.code(409).send({ error: "AI-черновик снимка нельзя привязать к другому пациенту" });
    }
    const job = createAiRecognitionJob({
      ...input,
      patientId: patient?.id ?? imagingStudy?.patientId ?? input.patientId ?? null
    });
    return reply.code(201).send(aiRecognitionJobResponseSchema.parse({ job }));
  });

  app.post("/api/ai/visit-note-draft", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "ai visit note draft"))) return;
    const parsedInput = visitNoteDraftRequestSchema.safeParse(request.body);
    if (!parsedInput.success) {
      return reply.code(400).send({
        error: "ValidationError",
        message: parsedInput.error.issues.map((issue) => issue.message).join(" ")
      });
    }
    const input = parsedInput.data;
    const patient = patients.find((candidate) => candidate.id === input.patientId);
    if (!patient) {
      return reply.code(404).send({ error: "Пациент не найден" });
    }

    return visitNoteDraftSchema.parse(buildVisitDraftFromTranscript(input.transcript, input.specialty));
  });
}
