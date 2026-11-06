import type { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import {
	requireClinicalMutationContext,
	requireClinicalReadContext,
} from "../../accessGuard.js";
import { db as database } from "../../db/client.js";
import { appointments, visits } from "../../db/schema.js";
import { openVisitForAppointmentInDb } from "../../db/visitsQuery.js";
import { wsBroker } from "../../services/websocketBroker.js";
import { sendVisitOpenError } from "./visitOpenErrors.js";

const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function registerVisitOpenRoutes(app: FastifyInstance) {
	app.register(async (scope) => {
		scope.addContentTypeParser("application/json", { parseAs: "string" }, (_req, body, done) => {
			if (!body || (typeof body === "string" && body.trim() === "")) return done(null, {});
			try {
				done(null, JSON.parse(body as string));
			} catch (err) {
				done(err as Error, undefined);
			}
		});

		scope.get("/api/appointments/:appointmentId/visit", async (request, reply) => {
			const context = await requireClinicalReadContext(
				request,
				reply,
				"visit check",
			);
			if (!context) return;
			const orgId = context.organizationId;
			const { appointmentId } = request.params as { appointmentId?: string };

			if (!appointmentId || !UUID_PATTERN.test(appointmentId.trim())) {
				reply.code(400);
				return {
					error: "VisitValidationError",
					message: "Не передан или некорректен идентификатор записи на приём.",
				};
			}

			const [existing] = await database
				.select()
				.from(visits)
				.where(
					and(
						eq(visits.appointmentId, appointmentId.trim()),
						eq(visits.organizationId, orgId),
					),
				)
				.orderBy(visits.createdAt)
				.limit(1);

			const visit = existing
				? {
						id: existing.id,
						organizationId: existing.organizationId,
						patientId: existing.patientId,
						appointmentId: existing.appointmentId,
						status: existing.status,
						createdAt: existing.createdAt.toISOString(),
						updatedAt: existing.updatedAt.toISOString(),
					}
				: null;
			return { success: true, visit };
		});

		scope.post("/api/appointments/:appointmentId/visit", async (request, reply) => {
			const context = await requireClinicalMutationContext(
				request,
				reply,
				"visit open",
			);
			if (!context) return;
			const orgId = context.organizationId;
			const { appointmentId } = request.params as { appointmentId?: string };

			if (!appointmentId || !UUID_PATTERN.test(appointmentId.trim())) {
				reply.code(400);
				return {
					error: "VisitValidationError",
					message:
						"Прием не открыт: не передана запись расписания. Откройте строку расписания и повторите.",
				};
			}

			try {
				const result = await database.transaction(async (tx) => {
					const res = await openVisitForAppointmentInDb(orgId, appointmentId.trim(), tx);
					await tx
						.update(appointments)
						.set({ status: "in_treatment" })
						.where(
							and(
								eq(appointments.id, appointmentId.trim()),
								eq(appointments.organizationId, orgId),
							),
						);
					return res;
				});

				wsBroker.broadcastToOrganization(orgId, {
					type: "APPOINTMENT_UPDATED",
					payload: {
						appointmentId: appointmentId.trim(),
						visitId: result.visit.id,
						status: "in_treatment",
					},
				});
				reply.code(result.created ? 201 : 200);
				return { success: true, created: result.created, visit: result.visit };
			} catch (error) {
				return sendVisitOpenError(error, reply);
			}
		});
	});
}
