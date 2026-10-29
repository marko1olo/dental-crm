/**
 * @file apps/api/src/routes/ai/visitFlowRoutes.ts
 * @description Fastify routes for visit note drafts, SOAP diaries, and clinical visit flow orchestration.
 */

import {
	visitFlowRequestSchema,
	visitNoteDraftRequestSchema,
	visitNoteDraftSchema,
} from "@dental/shared";
import type { FastifyInstance, FastifyReply } from "fastify";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../../accessGuard.js";
import { buildVisitDraftFromTranscript } from "../../ai/visitDraft.js";
import { runVisitFlow } from "../../ai/visitFlowOrchestrator.js";
import { getPatientByIdFromDb } from "../../db/patientsQuery.js";

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

export async function registerVisitFlowRoutes(app: FastifyInstance): Promise<void> {
	app.post("/api/ai/visit-note-draft", async (request, reply) => {
		try {
			if (
				!(await requireClinicalReadAccess(
					request,
					reply,
					"ai visit note draft",
				))
			)
				return;
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
			)
				return;
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
}
