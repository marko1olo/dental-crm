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
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
	resolveOrganizationId,
} from "../../accessGuard.js";
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
import { getPatientByIdFromDb } from "../../db/patientsQuery.js";
import { withTenantCtx } from "../../db/rls.js";
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
	request: FastifyRequest,
): Promise<string | null> {
	const organizationId = await resolveOrganizationId(request);
	if (!organizationId) return null;
	try {
		return await withTenantCtx(organizationId, async (tx) => {
			const [clinic] = await tx
				.select({ timezone: clinics.timezone })
				.from(clinics)
				.where(eq(clinics.organizationId, organizationId))
				.limit(1);
			return clinic?.timezone ?? null;
		});
	} catch (err: unknown) {
		request.log.warn({ err }, "[Dente] resolveClinicTimeZone failed");
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
	app.post("/api/ai/parse-dictation", async (request, reply) => {
		if (
			!(await requireClinicalReadAccess(
				request,
				reply,
				"parse dictation with AI",
			))
		) {
			return;
		}

		const parsedInput = parseDictationSchema.safeParse(request.body);
		if (!parsedInput.success) {
			return reply.code(400).send({
				error: "ParseDictationValidationError",
				message: "Неверный формат для AI-разбора.",
			});
		}

		try {
			const { text, type, volumeContext } = parsedInput.data;

			let result: DictationParseResult | SmartAction | null = parseDictationLocally(text, type);
			if (!result) {
				result = await parseDictationWithLlmFallback(
					text,
					type,
					await resolveClinicTimeZone(request),
				);
			}

			const candidateResult = result as {
				toothUpdates?: Array<{ code: string; state: string }>;
				emkUpdates?: { complaint?: string };
			} | null;

			if (
				volumeContext &&
				candidateResult?.toothUpdates &&
				candidateResult.toothUpdates.length > 0
			) {
				const callerOrgId = await resolveOrganizationId(request);
				if (callerOrgId && callerOrgId === volumeContext.organizationId) {
					const valuesToInsert = candidateResult.toothUpdates.map((update) => ({
						organizationId: callerOrgId,
						patientId: volumeContext.patientId,
						studyId: volumeContext.studyId,
						annotationType: "tooth" as const,
						toothCode: update.code,
						coordinates: volumeContext.coordinates || null,
						notes: candidateResult.emkUpdates?.complaint || update.state,
					}));
					await withTenantCtx(callerOrgId, (tx) =>
						tx.insert(imagingAnnotations).values(valuesToInsert),
					);
				}
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
	});

	app.post("/api/ai/visit-note-draft", async (request, reply) => {
		try {
			if (
				!(await requireClinicalReadAccess(
					request,
					reply,
					"ai visit note draft",
				))
			) {
				return;
			}
			const orgId = await requireResolvedOrganizationId(
				request,
				reply,
				"ai visit note draft",
			);
			if (!orgId) return;
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
		} catch (error: unknown) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Ошибка при генерации черновика дневника приёма.",
			});
		}
	});

	app.post("/api/ai/visit-flow", async (request, reply) => {
		try {
			if (
				!(await requireClinicalMutationAccess(
					request,
					reply,
					"ai visit flow",
				))
			) {
				return;
			}
			const orgId = await requireResolvedOrganizationId(
				request,
				reply,
				"ai visit flow",
			);
			if (!orgId) return;
			const parsedInput = visitFlowRequestSchema.safeParse(request.body);
			if (!parsedInput.success) {
				return reply.code(400).send({
					error: "VisitFlowValidationError",
					message: "Некорректные параметры для AI-оркестрации визита.",
				});
			}

			const result = await runVisitFlow(parsedInput.data);
			return reply.send(result);
		} catch (error: unknown) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Ошибка при выполнении клинического AI-сценария.",
			});
		}
	});

	app.post("/api/ai/treatment-plan-personalize", async (request, reply) => {
		try {
			if (
				!(await requireClinicalReadAccess(
					request,
					reply,
					"personalize treatment plan",
				))
			) {
				return;
			}
			const parsedInput = treatmentPlanPayloadSchema.safeParse(request.body);
			if (!parsedInput.success) {
				return reply.code(400).send({
					error: "TreatmentPlanValidationError",
					message: "Некорректный план лечения для ИИ-персонализации.",
				});
			}
			const result = await personalizeTreatmentPlan(parsedInput.data);
			return reply.send(result);
		} catch (error: unknown) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Ошибка при персонализации плана лечения.",
			});
		}
	});

	app.post(
		"/api/ai/treatment-plan-validate-and-comment",
		async (request, reply) => {
			try {
				if (
					!(await requireClinicalReadAccess(
						request,
						reply,
						"validate and comment treatment plan",
					))
				) {
					return;
				}
				const parsedInput =
					treatmentPlanValidateAndCommentRequestSchema.safeParse(request.body);
				if (!parsedInput.success) {
					return reply.code(400).send({
						error: "TreatmentPlanValidationError",
						message:
							"Некорректный формат плана лечения для клинической валидации и ИИ-комментария.",
						details: parsedInput.error.format(),
					});
				}
				const result = await validateAndCommentTreatmentPlan(parsedInput.data);
				return reply.send(result);
			} catch (error: unknown) {
				request.log.error(error);
				return reply.status(500).send({
					error: "InternalServerError",
					message: "Ошибка при валидации и ИИ-комментировании плана лечения.",
				});
			}
		},
	);

	app.post("/api/ai/post-visit-personalize", async (request, reply) => {
		try {
			if (
				!(await requireClinicalReadAccess(
					request,
					reply,
					"personalize post visit recommendations",
				))
			) {
				return;
			}
			const parsedInput = postVisitPersonalizeSchema.safeParse(request.body);
			if (!parsedInput.success) {
				return reply.code(400).send({
					error: "PostVisitPersonalizeValidationError",
					message: "Некорректные параметры для ИИ-рекомендаций после приема.",
				});
			}
			const result = await personalizePostVisitRecommendations(parsedInput.data);
			return reply.send(result);
		} catch (error: unknown) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Ошибка при персонализации рекомендаций после приёма.",
			});
		}
	});
}
