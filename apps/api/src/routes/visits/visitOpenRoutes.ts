import type { FastifyInstance, FastifyRequest } from "fastify";
import { and, eq } from "drizzle-orm";
import { computePayloadHash, isValidUuid } from "@dental/shared";
import {
	requireClinicalMutationContext,
	requireClinicalReadContext,
} from "../../accessGuard.js";
import { db as database } from "../../db/client.js";
import { appointments, visits } from "../../db/schema.js";
import { idempotencyKeys } from "../../db/schema/idempotency.js";
import { openVisitForAppointmentInDb } from "../../db/visitsQuery.js";
import { wsBroker } from "../../services/websocketBroker.js";
import { sendVisitOpenError } from "./visitOpenErrors.js";

const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function extractVisitOpenIdempotencyKey(request: FastifyRequest): string | undefined {
	const headerPrimary = request.headers?.["idempotency-key"];
	const headerAlt = request.headers?.["x-idempotency-key"];
	const headerShort = request.headers?.["x-idempotence-key"];
	const bodyKey =
		request.body && typeof request.body === "object"
			? ((request.body as Record<string, unknown>).idempotencyKey as string | undefined) ??
				((request.body as Record<string, unknown>).clientMutationId as string | undefined)
			: undefined;
	const raw =
		(typeof headerPrimary === "string" ? headerPrimary : undefined) ??
		(typeof headerAlt === "string" ? headerAlt : undefined) ??
		(typeof headerShort === "string" ? headerShort : undefined) ??
		bodyKey;
	if (typeof raw !== "string") return undefined;
	const trimmed = raw.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

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

			const idempotencyKey = extractVisitOpenIdempotencyKey(request);
			if (idempotencyKey && !isValidUuid(idempotencyKey)) {
				reply.code(400);
				return {
					error: "InvalidIdempotencyKey",
					message:
						"Заголовок Idempotency-Key / X-Idempotency-Key должен содержать валидный UUID (рекомендуется UUIDv7)",
				};
			}

			if (idempotencyKey) {
				reply.header("Idempotency-Key", idempotencyKey);
				const [existingRecord] = await database
					.select()
					.from(idempotencyKeys)
					.where(
						and(
							eq(idempotencyKeys.clinicId, orgId),
							eq(idempotencyKeys.key, idempotencyKey),
						),
					)
					.limit(1);

				if (existingRecord) {
					if (existingRecord.status === "completed" && existingRecord.responseBody) {
						reply.header("idempotency-replayed", "true");
						reply.header("x-idempotency-replayed", "true");
						return reply
							.code(existingRecord.responseCode || 200)
							.send(existingRecord.responseBody);
					}
					if (existingRecord.status === "in_flight") {
						return reply.code(409).header("Retry-After", "1").send({
							error: "Conflict",
							code: "IdempotencyConflict",
							message: "Операция открытия визита с данным Idempotency-Key уже выполняется.",
						});
					}
				}
			}

			try {
				const responsePayload = await database.transaction(async (tx) => {
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

					const responseBody = {
						success: true,
						created: res.created,
						visit: res.visit,
					};
					const responseCode = res.created ? 201 : 200;

					if (idempotencyKey) {
						await tx
							.insert(idempotencyKeys)
							.values({
								clinicId: orgId,
								key: idempotencyKey,
								status: "completed",
								payloadHash: computePayloadHash({
									appointmentId: appointmentId.trim(),
									...(request.body && typeof request.body === "object" ? request.body : {}),
								}),
								responseBody,
								responseCode,
							})
							.onConflictDoUpdate({
								target: [idempotencyKeys.clinicId, idempotencyKeys.key],
								set: {
									status: "completed",
									responseBody,
									responseCode,
								},
							});
					}

					return { res, responseBody, responseCode };
				});

				wsBroker.broadcastToOrganization(orgId, {
					type: "APPOINTMENT_UPDATED",
					payload: {
						appointmentId: appointmentId.trim(),
						visitId: responsePayload.res.visit.id,
						status: "in_treatment",
					},
				});
				reply.code(responsePayload.responseCode);
				return responsePayload.responseBody;
			} catch (error) {
				return sendVisitOpenError(error, reply);
			}
		});
	});
}
