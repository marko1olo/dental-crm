/**
 * Маршруты разбора дублей пациентов.
 *
 * ЗАЧЕМ: карточка одного человека заводится дважды — «Иванов И.» по телефону и
 * «Иванов Иван Иванович» на приёме. Дальше снимки в одной карточке, оплаты в
 * другой, долг не виден ни там, ни там, напоминание уходит дважды.
 *
 * Виджет PatientDuplicateMergeQueuesWidget существует и читает
 * /api/crm/patient-duplicate-merge-queues — этого маршрута не существует,
 * проверено живым запросом (404). Здесь появляется работающий разбор.
 *
 * ДОСТУП: чтение — patients.read, слияние — patients.write. Слияние медицинских
 * карт необратимо по смыслу, поэтому оно требует права на запись картотеки, а
 * не просто открытого раздела.
 */

import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { defineStreamRoute } from "../core/routeFactories.js";
import {
	requireClinicalMutationContext,
	requireClinicalReadContext,
} from "../accessGuard.js";
import { getRequestIdentity } from "../security/identity.js";
import { enforcePermissionWhenStaffKnown } from "../security/permissions.js";
import {
	duplicatesForPatient,
	findDuplicateCandidates,
	patientBelongsToOrganization,
} from "../services/patients/duplicateDetection.js";
import {
	dismissDuplicatePair,
	formatMergeSummary,
	mergePatients,
} from "../services/patients/patientMerge.js";

const PATIENT_DUPLICATES_UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const listQuerySchema = z
	.object({
		minConfidence: z.coerce.number().min(0).max(1).optional(),
		limit: z.coerce.number().int().min(1).max(500).optional(),
	})
	.strict();

const mergeSchema = z
	.object({
		/** Карточка, которая останется. */
		primaryPatientId: z.string().uuid(),
		/** Карточка, которая станет архивной ссылкой на основную. */
		duplicatePatientId: z.string().uuid(),
		reason: z.string().trim().max(500).optional(),
	})
	.strict()
	// Одна и та же карточка — это испорченный запрос, а не конфликт состояний:
	// отвечать на него 409 неверно, потому что конфликтовать тут не с чем.
	.refine((value) => value.primaryPatientId !== value.duplicatePatientId, {
		message: "Указана одна и та же карточка",
	});

const dismissSchema = z
	.object({
		leftPatientId: z.string().uuid(),
		rightPatientId: z.string().uuid(),
		reason: z.string().trim().max(500).optional(),
	})
	.strict()
	.refine((value) => value.leftPatientId !== value.rightPatientId, {
		message: "Указана одна и та же карточка",
	});

function validationError(reply: FastifyReply, message: string) {
	return reply
		.code(400)
		.send({ error: "PatientDuplicateValidationError", message });
}

export async function registerPatientDuplicateRoutes(app: FastifyInstance) {
	/** Список вероятных дублей по всей картотеке. */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/patients/duplicates",
		permission: "public",
		handler: async ({ request, reply }) => {
			const context = await requireClinicalReadContext(
				request,
				reply,
				"patient duplicates",
			);
			if (!context) return;
			if (!enforcePermissionWhenStaffKnown(request, reply, "patients.read"))
				return;

			const parsed = listQuerySchema.safeParse(request.query);
			if (!parsed.success)
				return validationError(
					reply,
					"Проверьте параметры: порог уверенности и предел списка.",
				);

			const options: { minConfidence?: number; limit?: number } = {};
			if (parsed.data.minConfidence !== undefined)
				options.minConfidence = parsed.data.minConfidence;
			if (parsed.data.limit !== undefined) options.limit = parsed.data.limit;

			return findDuplicateCandidates(context.organizationId, options);
		},
	});

	/** Дубли конкретной карточки — для показа в самой карточке пациента. */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/patients/:patientId/duplicates",
		permission: "public",
		handler: async ({ request, reply }) => {
			const context = await requireClinicalReadContext(
				request,
				reply,
				"patient duplicates by patient",
			);
			if (!context) return;
			if (!enforcePermissionWhenStaffKnown(request, reply, "patients.read"))
				return;

			const patientId = (request.params as { patientId?: string }).patientId;
			if (!patientId || !PATIENT_DUPLICATES_UUID_PATTERN.test(patientId)) {
				return validationError(reply, "Некорректный идентификатор пациента (ожидается формат UUID).");
			}
			if (
				!(await patientBelongsToOrganization(context.organizationId, patientId))
			) {
				return reply.code(404).send({
					error: "PatientNotFound",
					message: "Пациент не найден в этой клинике.",
				});
			}

			const candidates = await duplicatesForPatient(
				context.organizationId,
				patientId,
			);
			return { patientId, candidates };
		},
	});

	/**
	 * Слияние. Ответ перечисляет, что именно перенесено — по таблицам и числу
	 * строк. Администратор должен видеть результат, а не «готово».
	 */
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/patients/duplicates/merge",
		permission: "public",
		handler: async ({ request, reply }) => {
			const context = await requireClinicalMutationContext(
				request,
				reply,
				"patient duplicate merge",
			);
			if (!context) return;
			if (!enforcePermissionWhenStaffKnown(request, reply, "patients.write"))
				return;

			const parsed = mergeSchema.safeParse(request.body);
			if (!parsed.success) {
				return validationError(
					reply,
					"Укажите две разные карточки: какая останется и какая объединяется в неё.",
				);
			}

			const identity = getRequestIdentity(request);
			const result = await mergePatients({
				organizationId: context.organizationId,
				primaryPatientId: parsed.data.primaryPatientId,
				duplicatePatientId: parsed.data.duplicatePatientId,
				performedByUserId: identity.userId ?? null,
				reason: parsed.data.reason ?? null,
			});

			if (!result.ok)
				return reply
					.code(409)
					.send({ error: "PatientMergeRejected", message: result.reason });

			return {
				success: true,
				...result,
				summary: formatMergeSummary(result),
			};
		},
	});

	const duplicateMutationOptions = {
		config: {
			tenantTxSelfManaged: true,
		},
		schema: {
			description: "Patient duplicate dismiss with mandatory RFC 9562 Idempotency-Key",
			headers: {
				type: "object",
				properties: {
					"idempotency-key": { type: "string" },
					"x-idempotency-key": { type: "string" },
					organizationid: { type: "string" },
					"x-organization-id": { type: "string" },
				},
			},
		},
	} as const;

	/** «Это разные люди» — пара больше не предлагается. */
	app.post("/api/patients/duplicates/dismiss", duplicateMutationOptions, async (request, reply) => {
		const context = await requireClinicalMutationContext(
			request,
			reply,
			"patient duplicate dismiss",
		);
		if (!context) return;
		if (!enforcePermissionWhenStaffKnown(request, reply, "patients.write"))
			return;

		const parsed = dismissSchema.safeParse(request.body);
		if (!parsed.success)
			return validationError(reply, "Укажите две разные карточки.");

		const identity = getRequestIdentity(request);
		const result = await dismissDuplicatePair({
			organizationId: context.organizationId,
			leftPatientId: parsed.data.leftPatientId,
			rightPatientId: parsed.data.rightPatientId,
			performedByUserId: identity.userId ?? null,
			reason: parsed.data.reason ?? null,
		});

		if (!result.ok)
			return validationError(reply, result.reason ?? "Пара не сохранена.");
		return {
			ok: true,
			message: "Пара помечена как разные люди и больше не предлагается.",
		};
	});
}
