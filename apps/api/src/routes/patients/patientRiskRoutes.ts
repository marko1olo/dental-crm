/**
 * patientRiskRoutes.ts — Маршруты аналитики дисциплины визитов и риска неявки пациента.
 * Подключает расчет computePatientNoShowRisk в Fastify API по Мандату 8b/8e.
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { computePatientNoShowRisk } from "../../db/patientNoShowRiskQuery.js";
import {
	PATIENT_ID_UUID_PATTERN,
	requireClinicOrganizationId,
	sendPatientNotFound,
	sendPatientRouteValidationError,
} from "./helpers.js";

const predictNoShowSchema = z
	.object({
		patientId: z.string().regex(PATIENT_ID_UUID_PATTERN),
	})
	.strict();

export function registerPatientRiskRoutes(app: FastifyInstance) {
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/ai/predict-no-show",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = requireClinicOrganizationId(request, reply);
			if (!orgId) return reply;

			const body = request.body as unknown;
			const parsed = predictNoShowSchema.safeParse(body);
			if (!parsed.success) {
				return sendPatientRouteValidationError(reply);
			}

			const outcome = await computePatientNoShowRisk(orgId, parsed.data.patientId);

			if (outcome.kind === "patient_not_found") {
				return sendPatientNotFound(reply);
			}

			if (outcome.kind === "not_enough_history") {
				return reply.code(422).send({
					error: "NOT_ENOUGH_HISTORY",
					consideredAppointments: outcome.consideredAppointments,
					message: "Недостаточно завершенных визитов в истории для расчета риска неявки.",
				});
			}

			return reply.code(200).send(outcome.risk);
		},
	});
}
