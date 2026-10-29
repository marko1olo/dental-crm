/**
 * @file apps/api/src/routes/ai/recognitionRoutes.ts
 * @description Fastify routes for AI radiographic & clinical recognition jobs.
 */

import {
	aiRecognitionJobResponseSchema,
	aiRecognitionJobSchema,
	createAiRecognitionJobSchema,
} from "@dental/shared";
import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../../accessGuard.js";
import {
	createAiRecognitionJobInDb,
	listAiRecognitionJobsFromDb,
} from "../../db/aiQuery.js";
import { getImagingStudyById } from "../../db/imagingQuery.js";
import { getPatientByIdFromDb } from "../../db/patientsQuery.js";

const aiRecognitionValidationMessage =
	"AI-задача не создана: выберите пациента или снимок и тип черновика.";
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

export async function registerRecognitionRoutes(app: FastifyInstance): Promise<void> {
	app.get("/api/ai/recognition-jobs", async (request, reply) => {
		try {
			if (
				!(await requireClinicalReadAccess(
					request,
					reply,
					"ai recognition jobs",
				))
			)
				return;
			const orgId = await requireResolvedOrganizationId(
				request,
				reply,
				"ai recognition jobs",
			);
			if (!orgId) return;
			return z
				.array(aiRecognitionJobSchema)
				.parse(await listAiRecognitionJobsFromDb(orgId));
		} catch (error: unknown) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Ошибка при получении списка задач распознавания ИИ.",
			});
		}
	});

	app.post("/api/ai/recognition-jobs", async (request, reply) => {
		try {
			if (
				!(await requireClinicalMutationAccess(
					request,
					reply,
					"ai recognition job create",
				))
			)
				return;
			const orgId = await requireResolvedOrganizationId(
				request,
				reply,
				"ai recognition job create",
			);
			if (!orgId) return;
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
			return reply
				.code(201)
				.send(aiRecognitionJobResponseSchema.parse({ job }));
		} catch (error: unknown) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Ошибка при создании задачи распознавания снимка.",
			});
		}
	});
}
