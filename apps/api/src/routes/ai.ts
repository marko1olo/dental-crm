import {
	aiRecognitionJobResponseSchema,
	aiRecognitionJobSchema,
	createAiRecognitionJobSchema,
	treatmentPlanPayloadSchema,
	visitNoteDraftRequestSchema,
	visitNoteDraftSchema,
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
import { personalizePostVisitRecommendations } from "../ai/postVisitPersonalize.js";
import { personalizeTreatmentPlan } from "../ai/treatmentPlanPersonalize.js";
import { buildVisitDraftFromTranscript } from "../ai/visitDraft.js";
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
				for (const update of (result as any).toothUpdates) {
					await db.insert(imagingAnnotations).values({
						organizationId: volumeContext.organizationId,
						patientId: volumeContext.patientId,
						studyId: volumeContext.studyId,
						annotationType: "tooth",
						toothCode: update.code,
						coordinates: volumeContext.coordinates || null,
						notes: (result as any).emkUpdates?.complaint || update.state,
					});
				}
			}

			return reply.send(result);
		} catch (err: any) {
			return reply.code(500).send({
				error: "ParseDictationError",
				message: err.message || "Ншибка парсинга диктовки",
			});
		}
	});
}
