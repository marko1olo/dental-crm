import type { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import { requireClinicalMutationContext } from "../../accessGuard.js";
import { db as database } from "../../db/client.js";
import { appointments } from "../../db/schema.js";
import { openVisitForAppointmentInDb } from "../../db/visitsQuery.js";
import { wsBroker } from "../../services/websocketBroker.js";
import { sendVisitOpenError } from "./visitErrors.js";

export function registerVisitOpenRoutes(app: FastifyInstance) {
	app.register(async (scope) => {
		scope.addContentTypeParser(
			"application/json",
			{ parseAs: "string" },
			(_req, body, done) => {
				if (!body || (typeof body === "string" && body.trim() === "")) {
					done(null, {});
					return;
				}
				try {
					done(null, JSON.parse(body as string));
				} catch (err) {
					done(err as Error, undefined);
				}
			},
		);

		scope.post("/api/appointments/:appointmentId/visit", async (request, reply) => {
			const context = await requireClinicalMutationContext(
				request,
				reply,
				"visit open",
			);
			if (!context) return;
			const orgId = context.organizationId;

			const { appointmentId } = request.params as { appointmentId?: string };
			if (!appointmentId) {
				reply.code(400);
				return {
					error: "VisitOpenValidationError",
					message:
						"Прием не открыт: не передана запись расписания. Откройте строку расписания и повторите.",
				};
			}

			try {
				const result = await openVisitForAppointmentInDb(orgId, appointmentId);
				// Атомарно переводим статус записи в расписании в "in_treatment" в PostgreSQL
				await database
					.update(appointments)
					.set({
						status: "in_treatment",
					})
					.where(
						and(
							eq(appointments.id, appointmentId),
							eq(appointments.organizationId, orgId),
						),
					);

				wsBroker.broadcastToOrganization(orgId, {
					type: "APPOINTMENT_UPDATED",
					payload: {
						appointmentId,
						visitId: result.visit.id,
						status: "in_treatment",
					},
				});
				reply.code(result.created ? 201 : 200);
				return {
					success: true,
					created: result.created,
					visit: result.visit,
				};
			} catch (error) {
				return sendVisitOpenError(error, reply);
			}
		});
	});
}
