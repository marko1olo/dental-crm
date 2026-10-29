/**
 * @file apps/api/src/routes/ai/treatmentPlanAiRoutes.ts
 * @description Fastify routes for AI treatment plan personalization, validation, and post-visit recommendations.
 */

import {
	treatmentPlanPayloadSchema,
	treatmentPlanValidateAndCommentRequestSchema,
} from "@dental/shared";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireClinicalReadAccess } from "../../accessGuard.js";
import { personalizePostVisitRecommendations } from "../../ai/postVisitPersonalize.js";
import { personalizeTreatmentPlan } from "../../ai/treatmentPlanPersonalize.js";
import { validateAndCommentTreatmentPlan } from "../../ai/treatmentPlanValidatorAndCommenter.js";

const postVisitPersonalizeSchema = z.object({
	careTopic: z.string(),
	procedureName: z.string(),
	toothOrArea: z.string(),
	doctorFullName: z.string(),
});

export async function registerTreatmentPlanAiRoutes(app: FastifyInstance): Promise<void> {
	app.post("/api/ai/treatment-plan-personalize", async (request, reply) => {
		try {
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
				)
					return;
				const parsedInput =
					treatmentPlanValidateAndCommentRequestSchema.safeParse(
						request.body,
					);
				if (!parsedInput.success) {
					return reply.code(400).send({
						error: "TreatmentPlanValidationError",
						message:
							"Некорректный формат плана лечения для клинической валидации и ИИ-комментария.",
						details: parsedInput.error.format(),
					});
				}
				const result = await validateAndCommentTreatmentPlan(
					parsedInput.data,
				);
				return reply.send(result);
			} catch (error: unknown) {
				request.log.error(error);
				return reply.status(500).send({
					error: "InternalServerError",
					message:
						"Ошибка при валидации и ИИ-комментировании плана лечения.",
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
			)
				return;
			const parsedInput = postVisitPersonalizeSchema.safeParse(request.body);
			if (!parsedInput.success) {
				return reply.code(400).send({
					error: "PostVisitPersonalizeValidationError",
					message: "Некорректные параметры для ИИ-рекомендаций после приема.",
				});
			}
			const result = await personalizePostVisitRecommendations(
				parsedInput.data,
			);
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
