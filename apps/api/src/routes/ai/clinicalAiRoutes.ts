/**
 * @file apps/api/src/routes/ai/clinicalAiRoutes.ts
 * @description Fastify routes for clinical AI dictation parsing, visit SOAP drafting, visit flow orchestration,
 * and treatment plan / post-visit personalization.
 */

import {
	treatmentPlanPayloadSchema,
	treatmentPlanValidateAndCommentRequestSchema,
	visitFlowRequestSchema,
	visitNoteDraftRequestSchema,
	visitNoteDraftSchema,
} from "@dental/shared";
import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import {
	agentRouterClient,
} from "../../ai/agentRouterClient.js";
import {
	buildDictationSystemPrompt,
	type DictationParseResult,
	type ParserContext,
} from "../../ai/dictationParser.js";
import { parseDictationLocally } from "../../ai/dictationParser/parserEngine.js";
import type { SmartAction } from "../../ai/dictationParser/types.js";
import { personalizePostVisitRecommendations } from "../../ai/postVisitPersonalize.js";
import { personalizeTreatmentPlan } from "../../ai/treatmentPlanPersonalize.js";
import { validateAndCommentTreatmentPlan } from "../../ai/treatmentPlanValidatorAndCommenter.js";
import { buildVisitDraftFromTranscript } from "../../ai/visitDraft.js";
import { runVisitFlow } from "../../ai/visitFlowOrchestrator.js";
import { defineStreamRoute } from "../../core/routeFactories.js";
import type { TenantDb } from "../../db/client.js";
import { getPatientByIdFromDb } from "../../db/patientsQuery.js";
import { clinics, imagingAnnotations } from "../../db/schema.js";

const parseDictationSchema = z
	.object({
		text: z.string(),
		type: z.enum(["schedule", "patient", "visit"]),
		volumeContext: z
			.object({
				studyId: z.string(),
				seriesId: z.string().optional(),
				organizationId: z.string(),
				patientId: z.string(),
				coordinates: z.record(z.number()).optional(),
			})
			.strict()
			.optional(),
	})
	.strict();

const postVisitPersonalizeSchema = z
	.object({
		careTopic: z.string(),
		procedureName: z.string(),
		toothOrArea: z.string(),
		doctorFullName: z.string(),
	})
	.strict();

const visitNoteDraftValidationMessage =
	"Черновик приема не собран: передайте текст диктовки и специальность врача.";
const aiRecognitionPatientMissingMessage =
	"Пациент не найден. Выберите пациента из актуальной карты.";

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

async function resolveClinicTimeZone(
	runReadTx: <T>(fn: (tx: TenantDb) => Promise<T>) => Promise<T>,
	organizationId: string,
	logError: (obj: Record<string, unknown>, msg: string) => void,
): Promise<string | null> {
	try {
		return await runReadTx(async (tx) => {
			const [clinic] = await tx
				.select({ timezone: clinics.timezone })
				.from(clinics)
				.where(eq(clinics.organizationId, organizationId))
				.limit(1);
			return clinic?.timezone ?? null;
		});
	} catch (err: unknown) {
		logError({ err }, "[Dente] resolveClinicTimeZone failed");
		return null;
	}
}

async function parseDictationWithLlmFallback(
	transcript: string,
	context: ParserContext,
	timeZone: string | null,
): Promise<DictationParseResult> {
	const modelName =
		process.env.DENTAL_DICTATION_MODEL?.trim() || "qwen/qwen3.6-27b";
	const systemPrompt = buildDictationSystemPrompt(context, timeZone);
	const response = await agentRouterClient.createChatCompletion({
		model: modelName,
		temperature: 0.1,
		messages: [
			{ role: "system", content: systemPrompt },
			{ role: "user", content: `Текст диктовки: "${transcript}"` },
		],
	});
	const content = response.choices?.[0]?.message?.content;
	if (!content) {
		throw new Error("Пустой ответ сервиса распознавания диктовки");
	}
	try {
		return JSON.parse(content.trim()) as DictationParseResult;
	} catch {
		const match = content.match(/\{[\s\S]*\}/);
		if (match?.[0]) {
			return JSON.parse(match[0]) as DictationParseResult;
		}
		throw new Error("Некорректный формат JSON в ответе распознавания");
	}
}

export async function registerClinicalAiRoutes(
	app: FastifyInstance,
): Promise<void> {
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/ai/parse-dictation",
		permission: "clinical.write",
		authOptions: { allowAdminSecretBypass: true },
		bodySchema: parseDictationSchema,
		validationErrorCode: "ParseDictationValidationError",
		validationErrorMessage: "Неверный формат для AI-разбора.",
		handler: async ({ organizationId, body, runReadTx, runWriteTx, request, reply }) => {
			if (!organizationId) {
				return reply.code(401).send({ error: "Unauthorized", message: "Контекст клиники не определён." });
			}
			const orgId = organizationId;
			try {
				const { text, type, volumeContext } = body;

				let result: DictationParseResult | SmartAction | null = parseDictationLocally(text, type);
				if (!result) {
					const timeZone = await resolveClinicTimeZone(
						runReadTx,
						orgId,
						(obj, msg) => request.log.warn(obj, msg),
					);
					result = await parseDictationWithLlmFallback(text, type, timeZone);
				}

				const candidateResult = result as {
					toothUpdates?: Array<{ code: string; state: string }>;
					emkUpdates?: { complaint?: string };
				} | null;

				if (
					volumeContext &&
					candidateResult?.toothUpdates &&
					candidateResult.toothUpdates.length > 0 &&
					orgId === volumeContext.organizationId
				) {
					const valuesToInsert = candidateResult.toothUpdates.map((update) => ({
						organizationId: orgId,
						patientId: volumeContext.patientId,
						studyId: volumeContext.studyId,
						annotationType: "tooth" as const,
						toothCode: update.code,
						coordinates: volumeContext.coordinates || null,
						notes: candidateResult.emkUpdates?.complaint || update.state,
					}));
					await runWriteTx((tx) =>
						tx.insert(imagingAnnotations).values(valuesToInsert),
					);
				}

				return reply.send(result);
			} catch (err: unknown) {
				request.log.error(err);
				const errMessage =
					err instanceof Error ? err.message : "Неизвестная ошибка";
				return reply.code(500).send({
					error: "ParseDictationError",
					message: errMessage || "Ошибка разбора диктовки",
				});
			}
		},
	});

	defineStreamRoute(app, {
		method: "POST",
		path: "/api/ai/visit-note-draft",
		permission: "clinical.read",
		authOptions: { allowAdminSecretBypass: true },
		bodySchema: visitNoteDraftRequestSchema,
		validationErrorCode: "VisitNoteDraftValidationError",
		validationErrorMessage: visitNoteDraftValidationMessage,
		handler: async ({ organizationId, body, runReadTx, request, reply }) => {
			if (!organizationId) {
				return reply.code(401).send({ error: "Unauthorized", message: "Контекст клиники не определён." });
			}
			const orgId = organizationId;
			try {
				const patient = await runReadTx((tx) =>
					getPatientByIdFromDb(orgId, body.patientId, tx),
				);
				if (!patient) {
					return sendVisitNoteDraftScopeError(
						reply,
						404,
						aiRecognitionPatientMissingMessage,
					);
				}

				return visitNoteDraftSchema.parse(
					await buildVisitDraftFromTranscript(body.transcript, body.specialty),
				);
			} catch (error: unknown) {
				request.log.error(error);
				return reply.status(500).send({
					error: "InternalServerError",
					message: "Ошибка при генерации черновика дневника приёма.",
				});
			}
		},
	});

	defineStreamRoute(app, {
		method: "POST",
		path: "/api/ai/visit-flow",
		permission: "clinical.write",
		authOptions: { allowAdminSecretBypass: true },
		bodySchema: visitFlowRequestSchema,
		validationErrorCode: "VisitFlowValidationError",
		validationErrorMessage: "Некорректные параметры для AI-оркестрации визита.",
		handler: async ({ body, request, reply }) => {
			try {
				const result = await runVisitFlow(body);
				return reply.send(result);
			} catch (error: unknown) {
				request.log.error(error);
				return reply.status(500).send({
					error: "InternalServerError",
					message: "Ошибка при выполнении клинического AI-сценария.",
				});
			}
		},
	});

	defineStreamRoute(app, {
		method: "POST",
		path: "/api/ai/treatment-plan-personalize",
		permission: "clinical.read",
		authOptions: { allowAdminSecretBypass: true },
		bodySchema: treatmentPlanPayloadSchema,
		validationErrorCode: "TreatmentPlanValidationError",
		validationErrorMessage: "Некорректный план лечения для ИИ-персонализации.",
		handler: async ({ body, request, reply }) => {
			try {
				const result = await personalizeTreatmentPlan(body);
				return reply.send(result);
			} catch (error: unknown) {
				request.log.error(error);
				return reply.status(500).send({
					error: "InternalServerError",
					message: "Ошибка при персонализации плана лечения.",
				});
			}
		},
	});

	defineStreamRoute(app, {
		method: "POST",
		path: "/api/ai/treatment-plan-validate-and-comment",
		permission: "clinical.read",
		authOptions: { allowAdminSecretBypass: true },
		bodySchema: treatmentPlanValidateAndCommentRequestSchema,
		validationErrorCode: "TreatmentPlanValidationError",
		validationErrorMessage:
			"Некорректный формат плана лечения для клинической валидации и ИИ-комментария.",
		handler: async ({ body, request, reply }) => {
			try {
				const result = await validateAndCommentTreatmentPlan(body);
				return reply.send(result);
			} catch (error: unknown) {
				request.log.error(error);
				return reply.status(500).send({
					error: "InternalServerError",
					message: "Ошибка при валидации и ИИ-комментировании плана лечения.",
				});
			}
		},
	});

	defineStreamRoute(app, {
		method: "POST",
		path: "/api/ai/post-visit-personalize",
		permission: "clinical.read",
		authOptions: { allowAdminSecretBypass: true },
		bodySchema: postVisitPersonalizeSchema,
		validationErrorCode: "PostVisitPersonalizeValidationError",
		validationErrorMessage: "Некорректные параметры для ИИ-рекомендаций после приема.",
		handler: async ({ body, request, reply }) => {
			try {
				const result = await personalizePostVisitRecommendations(body);
				return reply.send(result);
			} catch (error: unknown) {
				request.log.error(error);
				return reply.status(500).send({
					error: "InternalServerError",
					message: "Ошибка при персонализации рекомендаций после приёма.",
				});
			}
		},
	});
}
