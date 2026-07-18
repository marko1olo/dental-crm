import {
  aiRecognitionJobResponseSchema,
  aiRecognitionJobSchema,
  createAiRecognitionJobSchema,
  treatmentPlanPayloadSchema,
  visitNoteDraftRequestSchema,
  visitNoteDraftSchema,
  visitFlowRequestSchema,
  visitFlowResultSchema,
} from "@dental/shared";
import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import {
  requireClinicalMutationAccess,
  requireClinicalReadAccess,
  resolveOrganizationId,
} from "../accessGuard.js";
import { parseDictationWithLLM } from "../ai/dictationParser.js";
import { parseDictationLocally } from "../ai/localDictationParser.js";
import { generateMarketingReviewReply } from "../ai/marketingReviewReply.js";
import { personalizePostVisitRecommendations } from "../ai/postVisitPersonalize.js";
import { personalizeTreatmentPlan } from "../ai/treatmentPlanPersonalize.js";
import { buildVisitDraftFromTranscript } from "../ai/visitDraft.js";
import { runVisitFlow } from "../ai/visitFlowOrchestrator.js";
import {
  createAiRecognitionJobInDb,
  listAiRecognitionJobsFromDb,
} from "../db/aiQuery.js";
import { db } from "../db/client.js";
import { getImagingStudyById } from "../db/imagingQuery.js";
import { getPatientByIdFromDb } from "../db/patientsQuery.js";
import { imagingAnnotations } from "../db/schema.js";

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
    const orgId = await resolveOrganizationId(request);
    if (!orgId) return reply.code(403).send({ error: "OrganizationRequired" });
    if (
      !(await requireClinicalReadAccess(request, reply, "ai recognition jobs"))
    )
      return;
    return z
      .array(aiRecognitionJobSchema)
      .parse(await listAiRecognitionJobsFromDb(orgId));
  });

  app.post("/api/ai/recognition-jobs", async (request, reply) => {
    const orgId = await resolveOrganizationId(request);
    if (!orgId) return reply.code(403).send({ error: "OrganizationRequired" });
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
      console.error(
        "SMOKE TEST DEBUG: createAiRecognitionJobSchema failed validation:",
        parsedInput.error.format(),
      );
      return reply.code(400).send({
        error: "AiRecognitionValidationError",
        message: aiRecognitionValidationMessage,
      });
    }
    const input = parsedInput.data;
    const patient = input.patientId
      ? await getPatientByIdFromDb(orgId, input.patientId)
      : null;
    if (input.patientId && !patient) {
      return sendAiRecognitionScopeError(
        reply,
        404,
        aiRecognitionPatientMissingMessage,
      );
    }
    const imagingStudy = input.imagingStudyId
      ? await getImagingStudyById(orgId, input.imagingStudyId)
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
    const job = await createAiRecognitionJobInDb(orgId, {
      ...input,
      patientId:
        patient?.id ?? imagingStudy?.patientId ?? input.patientId ?? null,
    });
    return reply.code(201).send(aiRecognitionJobResponseSchema.parse({ job }));
  });

  app.post("/api/ai/visit-note-draft", async (request, reply) => {
    const orgId = await resolveOrganizationId(request);
    if (!orgId) return reply.code(403).send({ error: "OrganizationRequired" });
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
    const patient = await getPatientByIdFromDb(orgId, input.patientId);
    if (!patient) {
      return sendVisitNoteDraftScopeError(
        reply,
        404,
        aiRecognitionPatientMissingMessage,
      );
    }

    return visitNoteDraftSchema.parse(
      await buildVisitDraftFromTranscript(input.transcript, input.specialty),
    );
  });

  app.post("/api/ai/visit-flow", async (request, reply) => {
    const orgId = await resolveOrganizationId(request);
    if (!orgId) return reply.code(403).send({ error: "OrganizationRequired" });
    if (!(await requireClinicalReadAccess(request, reply, "ai visit flow")))
      return;

    const parsedInput = visitFlowRequestSchema.safeParse(request.body);
    if (!parsedInput.success) {
      return reply.code(400).send({
        error: "VisitFlowValidationError",
        message: visitNoteDraftValidationMessage,
      });
    }

    const input = parsedInput.data;
    const patient = await getPatientByIdFromDb(orgId, input.patientId);
    if (!patient) {
      return sendVisitNoteDraftScopeError(
        reply,
        404,
        aiRecognitionPatientMissingMessage,
      );
    }

    return visitFlowResultSchema.parse(await runVisitFlow(input));
  });

  app.post("/api/ai/treatment-plan-personalize", async (request, reply) => {
    if (
      !(await requireClinicalReadAccess(
        request,
        reply,
        "personalize treatment plan",
      ))
    )
      return;
    const parsedInput = treatmentPlanPayloadSchema.safeParse(request.body);
    if (!parsedInput.success) {
      return reply.code(400).send({
        error: "TreatmentPlanValidationError",
        message: "Оекорректный план лечения для ИИ-персонализации.",
      });
    }
    const result = await personalizeTreatmentPlan(parsedInput.data);
    return reply.send(result);
  });

  app.post("/api/ai/post-visit-personalize", async (request, reply) => {
    if (
      !(await requireClinicalReadAccess(
        request,
        reply,
        "personalize post visit recommendations",
      ))
    )
      return;
    const schema = z.object({
      careTopic: z.string(),
      procedureName: z.string(),
      toothOrArea: z.string(),
      doctorFullName: z.string(),
    });
    const parsedInput = schema.safeParse(request.body);
    if (!parsedInput.success) {
      return reply.code(400).send({
        error: "PostVisitPersonalizeValidationError",
        message: "Оекорректные параметры для ИИ-рекомендаций после приема.",
      });
    }
    const result = await personalizePostVisitRecommendations(parsedInput.data);
    return reply.send(result);
  });

  app.post("/api/ai/parse-dictation", async (request, reply) => {
    if (
      !(await requireClinicalReadAccess(
        request,
        reply,
        "parse dictation with AI",
      ))
    )
      return;
    const schema = z.object({
      text: z.string(),
      type: z.enum(["schedule", "patient", "visit"]),
      volumeContext: z
        .object({
          studyId: z.string(),
          seriesId: z.string().optional(),
          organizationId: z.string(),
          patientId: z.string(),
          coordinates: z.record(z.any()).optional(),
        })
        .optional(),
    });

    const parsedInput = schema.safeParse(request.body);
    if (!parsedInput.success) {
      return reply.code(400).send({
        error: "ParseDictationValidationError",
        message: "Оеверный формат для AI-разбора.",
      });
    }

    try {
      const { text, type, volumeContext } = parsedInput.data;

      // 1. Try Local Algorithmic NLP first (to save LLM keys)
      let result = parseDictationLocally(text, type as any);

      // 2. Fallback to LLM if local NLP couldn't handle complex natural language
      if (!result) {
        result = await parseDictationWithLLM(text, type as any);
      }

      // 3. Database Linkage (If 3D viewer context is provided and teeth were found)
      if (
        volumeContext &&
        (result as any)?.toothUpdates &&
        (result as any).toothUpdates.length > 0
      ) {
        // We link coordinates to the first mentioned tooth, or multiple if needed
        const annotationsToInsert = (result as any).toothUpdates.map(
          (update: any) => ({
            organizationId: volumeContext.organizationId,
            patientId: volumeContext.patientId,
            studyId: volumeContext.studyId,
            annotationType: "tooth",
            toothCode: update.code,
            coordinates: volumeContext.coordinates || null,
            notes: (result as any).emkUpdates?.complaint || update.state,
          }),
        );
        await db.insert(imagingAnnotations).values(annotationsToInsert);
      }

      return reply.send(result);
    } catch (err: any) {
      return reply.code(500).send({
        error: "ParseDictationError",
        message: err.message || "Ншибка парсинга диктовки",
      });
    }
  });

  app.post("/api/ai/marketing-reply", async (request, reply) => {
    if (
      !(await requireClinicalReadAccess(request, reply, "marketing review ai"))
    )
      return;
    const schema = z.object({
      reviewText: z.string(),
      tone: z.string(),
      clinicName: z.string(),
      seoKeys: z.array(z.string()),
    });
    const parsedInput = schema.safeParse(request.body);
    if (!parsedInput.success) {
      return reply.code(400).send({
        error: "MarketingReviewValidationError",
        message: "Некорректные параметры для ИИ-ответа на отзыв.",
      });
    }
    const result = await generateMarketingReviewReply(parsedInput.data);
    return reply.send(result);
  });

  app.post("/api/ai/predict-no-show", async (request, reply) => {
    const orgId = await resolveOrganizationId(request);
    if (!orgId) return reply.code(403).send({ error: "OrganizationRequired" });
    if (
      !(await requireClinicalReadAccess(request, reply, "ai predict no show"))
    )
      return;

    const schema = z.object({
      patientId: z.string().uuid(),
    });

    const parsedInput = schema.safeParse(request.body);
    if (!parsedInput.success) {
      return reply.code(400).send({
        error: "PredictNoShowValidationError",
        message: "Некорректные параметры. Необходимо patientId.",
      });
    }

    const patientId = parsedInput.data.patientId;

    try {
      const { sql, and, eq, lt } = await import("drizzle-orm");
      const { appointments, patientInvoices, visits, treatmentItems } =
        await import("../db/schema.js");

      // Run all queries in parallel for speed
      const [
        unpaidResult,
        cancelResult,
        noShowResult,
        visitResult,
        completedResult,
        openResult,
      ] = await Promise.all([
        // 1. Debt factor
        db
          .select({
            amount: sql<number>`COALESCE(SUM(total_amount_rub::numeric), 0)::int`,
          })
          .from(patientInvoices)
          .where(
            sql`organization_id = ${orgId} AND patient_id = ${patientId} AND status = 'unpaid'`,
          ),

        // 2. Cancellation history
        db
          .select({ count: sql<number>`COUNT(*)::int` })
          .from(appointments)
          .where(
            sql`organization_id = ${orgId} AND patient_id = ${patientId} AND status = 'cancelled'`,
          ),

        // 3. No-show history
        db
          .select({ count: sql<number>`COUNT(*)::int` })
          .from(appointments)
          .where(
            sql`organization_id = ${orgId} AND patient_id = ${patientId} AND status = 'no_show'`,
          ),

        // 4. Total visits (loyalty signal — more visits = more reliable)
        db
          .select({ count: sql<number>`COUNT(*)::int` })
          .from(visits)
          .where(sql`organization_id = ${orgId} AND patient_id = ${patientId}`),

        // 5. Completed treatment items (plan adherence)
        db
          .select({ count: sql<number>`COUNT(*)::int` })
          .from(treatmentItems)
          .where(
            sql`organization_id = ${orgId} AND patient_id = ${patientId} AND status = 'completed'`,
          ),

        // 6. Open (pending) treatment items
        db
          .select({ count: sql<number>`COUNT(*)::int` })
          .from(treatmentItems)
          .where(
            sql`organization_id = ${orgId} AND patient_id = ${patientId} AND status != 'completed' AND status != 'cancelled'`,
          ),
      ]);

      const totalDebt = unpaidResult[0]?.amount || 0;
      const cancels = cancelResult[0]?.count || 0;
      const noShows = noShowResult[0]?.count || 0;
      const totalVisits = visitResult[0]?.count || 0;
      const completedItems = completedResult[0]?.count || 0;
      const openItems = openResult[0]?.count || 0;

      // Score calculation (0-100)
      const debtScore =
        totalDebt > 10000
          ? 35
          : totalDebt > 5000
            ? 20
            : totalDebt > 1000
              ? 10
              : 0;
      const cancelScore = Math.min(cancels * 12, 30);
      const noShowScore = Math.min(noShows * 20, 40);
      // Loyalty discount: long-term patients are lower risk
      const loyaltyDiscount =
        totalVisits > 10 ? 15 : totalVisits > 5 ? 8 : totalVisits > 2 ? 4 : 0;
      // Treatment gap risk: many open items that haven't been completed
      const gapRisk = openItems > 3 && completedItems === 0 ? 10 : 0;

      let riskScore =
        debtScore + cancelScore + noShowScore + gapRisk - loyaltyDiscount;
      riskScore = Math.max(0, Math.min(99, riskScore));

      let riskLevel = "low";
      if (riskScore > 40) riskLevel = "medium";
      if (riskScore > 70) riskLevel = "high";

      return reply.send({
        patientId,
        riskScore,
        riskLevel,
        factors: {
          hasDebt: totalDebt > 0,
          totalDebtRub: totalDebt,
          pastCancellations: cancels,
          pastNoShows: noShows,
          totalVisits,
          completedTreatmentItems: completedItems,
          openTreatmentItems: openItems,
        },
      });
    } catch (err: any) {
      console.error("PredictNoShowError", err);
      return reply.code(500).send({ error: "PredictNoShowError" });
    }
  });
}
