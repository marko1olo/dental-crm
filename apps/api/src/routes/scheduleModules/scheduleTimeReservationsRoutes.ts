import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { requireClinicalMutationContext, requireClinicalReadContext } from "../../accessGuard.js";
import { withTenantCtx } from "../../db/rls.js";
import { scheduleTimeReservations } from "../../db/schema.js";
import { wsBroker } from "../../services/websocketBroker.js";
import { extractIdempotencyKey, isValidUuid } from "../../utils/httpIdempotency.js";
import {
	DEFAULT_CLINIC_TIME_ZONE,
	clinicTimeZone,
} from "../../services/reports/managerReports/timezone.js";
import { resolveScheduleDateBounds } from "../appointments/appointmentsQueryRoutes.js";

const reservationQuerySchema = z
	.object({
		date: z
			.string()
			.regex(/^\d{4}-\d{2}-\d{2}$/, "Некорректный формат даты (ожидается YYYY-MM-DD)")
			.optional(),
		chairName: z.string().trim().min(1).max(160).optional(),
	})
	.strict();

const createReservationBodySchema = z
	.object({
		chairName: z.string().trim().min(1, "Укажите кресло или «Все кресла»").max(160).default("Все кресла"),
		reservationType: z
			.enum(["lunch", "maintenance", "meeting", "sanitation", "other"])
			.default("maintenance"),
		startTime: z.string().trim().min(1, "Укажите время начала резерва"),
		endTime: z.string().trim().min(1, "Укажите время окончания резерва"),
		bookingLocked: z.boolean().default(true),
		hatchingStyle: z
			.enum(["diagonal_red", "diagonal_amber", "diagonal_slate"])
			.default("diagonal_red"),
		note: z.string().trim().min(1, "Укажите причину резерва").max(300),
	})
	.strict();

const reservationParamsSchema = z
	.object({
		id: z.string().uuid("Некорректный идентификатор резерва времени"),
	})
	.strict();

const reservationMutationOptions = {
	schema: {
		description:
			"Schedule time reservation mutation with RFC 9562 Idempotency-Key and organizationId tenant isolation",
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

function serializeReservation(row: typeof scheduleTimeReservations.$inferSelect) {
	return {
		id: row.id,
		organizationId: row.organizationId,
		chairName: row.chairName,
		reservationType: row.reservationType,
		startTime: row.startTime,
		endTime: row.endTime,
		bookingLocked: row.bookingLocked,
		hatchingStyle: row.hatchingStyle,
		note: row.note,
		createdAt:
			row.createdAt instanceof Date
				? row.createdAt.toISOString()
				: String(row.createdAt),
	};
}

function validateAndAttachIdempotencyKey(
	request: FastifyRequest,
	reply: FastifyReply,
): boolean {
	const rawKey = extractIdempotencyKey(request);
	const key = typeof rawKey === "string" ? rawKey.trim() : "";
	if (!key) return true;
	if (!isValidUuid(key)) {
		reply.code(400).send({
			error: "InvalidIdempotencyKey",
			message: "Заголовок Idempotency-Key должен быть валидным UUID.",
		});
		return false;
	}
	reply.header("Idempotency-Key", key);
	return true;
}

/**
 * CRUD маршруты технологических резервов времени сетки расписания
 * (Обед, Ремонт кресла, Планёрка — таблица schedule_time_reservations).
 */
export async function registerScheduleTimeReservationsRoutes(app: FastifyInstance) {
	app.get("/api/schedule/time-reservations", async (request, reply) => {
		const context = await requireClinicalReadContext(
			request,
			reply,
			"schedule time reservations read",
		);
		if (!context) return reply;
		const orgId = context.organizationId;

		const parsedQuery = reservationQuerySchema.safeParse(request.query ?? {});
		if (!parsedQuery.success) {
			return reply.code(400).send({
				error: "TimeReservationValidationError",
				message:
					parsedQuery.error.issues[0]?.message ??
					"Некорректные параметры фильтрации резервов времени.",
			});
		}

		const { date, chairName } = parsedQuery.data;

		const rows = await withTenantCtx(orgId, async (tx) => {
			const conditions = [eq(scheduleTimeReservations.organizationId, orgId)];
			if (chairName) {
				conditions.push(eq(scheduleTimeReservations.chairName, chairName));
			}

			const allRows = await tx
				.select()
				.from(scheduleTimeReservations)
				.where(and(...conditions))
				.orderBy(asc(scheduleTimeReservations.startTime));

			if (!date) {
				return allRows;
			}

			const zone = (await clinicTimeZone(orgId, tx)) ?? DEFAULT_CLINIC_TIME_ZONE;
			const { dayStart, dayEnd } = resolveScheduleDateBounds(date, zone);
			const dayStartMs = dayStart.getTime();
			const dayEndMs = dayEnd.getTime();

			return allRows.filter((row) => {
				const rStart = Date.parse(row.startTime);
				const rEnd = Date.parse(row.endTime);
				if (Number.isFinite(rStart) && Number.isFinite(rEnd)) {
					return rStart <= dayEndMs && rEnd >= dayStartMs;
				}
				return row.startTime.startsWith(date);
			});
		});

		const reservations = rows.map(serializeReservation);
		return reply.code(200).send({
			success: true,
			data: reservations,
			reservations,
		});
	});

	app.post(
		"/api/schedule/time-reservations",
		reservationMutationOptions,
		async (request, reply) => {
			const context = await requireClinicalMutationContext(
				request,
				reply,
				"schedule time reservations create",
			);
			if (!context) return reply;
			const orgId = context.organizationId;

			if (!validateAndAttachIdempotencyKey(request, reply)) {
				return reply;
			}

			const parsedBody = createReservationBodySchema.safeParse(request.body ?? {});
			if (!parsedBody.success) {
				return reply.code(400).send({
					error: "TimeReservationValidationError",
					message:
						parsedBody.error.issues[0]?.message ??
						"Некорректные данные технологического резерва времени.",
					issues: parsedBody.error.issues,
				});
			}

			const payload = parsedBody.data;
			const startMs = Date.parse(payload.startTime);
			const endMs = Date.parse(payload.endTime);
			if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
				return reply.code(400).send({
					error: "TimeReservationValidationError",
					message: "Время окончания резерва должно быть позже времени начала.",
				});
			}

			const normalizedStartIso = new Date(startMs).toISOString();
			const normalizedEndIso = new Date(endMs).toISOString();

			const created = await withTenantCtx(orgId, async (tx) => {
				const [inserted] = await tx
					.insert(scheduleTimeReservations)
					.values({
						organizationId: orgId,
						chairName: payload.chairName,
						reservationType: payload.reservationType,
						startTime: normalizedStartIso,
						endTime: normalizedEndIso,
						bookingLocked: payload.bookingLocked,
						hatchingStyle: payload.hatchingStyle,
						note: payload.note,
					})
					.returning();
				return inserted ?? null;
			});

			if (!created) {
				request.log.error(
					{ orgId },
					"[Schedule/TimeReservations] Не удалось сохранить технологический резерв времени",
				);
				return reply.code(500).send({
					error: "InternalServerError",
					message: "Не удалось сохранить резерв времени.",
				});
			}

			const serialized = serializeReservation(created);
			request.log.info(
				{ reservationId: serialized.id, orgId, chairName: serialized.chairName },
				"[Schedule/TimeReservations] Создан технологический резерв времени",
			);
			wsBroker.broadcastToOrganization(orgId, {
				type: "SCHEDULE_RESERVATION_CREATED",
				payload: { reservationId: serialized.id },
			});

			return reply.code(201).send({
				success: true,
				data: serialized,
				reservation: serialized,
			});
		},
	);

	app.delete(
		"/api/schedule/time-reservations/:id",
		reservationMutationOptions,
		async (request, reply) => {
			const context = await requireClinicalMutationContext(
				request,
				reply,
				"schedule time reservations delete",
			);
			if (!context) return reply;
			const orgId = context.organizationId;

			if (!validateAndAttachIdempotencyKey(request, reply)) {
				return reply;
			}

			const parsedParams = reservationParamsSchema.safeParse(request.params);
			if (!parsedParams.success) {
				return reply.code(400).send({
					error: "TimeReservationValidationError",
					message:
						parsedParams.error.issues[0]?.message ??
						"Некорректный идентификатор резерва времени.",
				});
			}

			const reservationId = parsedParams.data.id;
			const deleted = await withTenantCtx(orgId, async (tx) => {
				const [removed] = await tx
					.delete(scheduleTimeReservations)
					.where(
						and(
							eq(scheduleTimeReservations.id, reservationId),
							eq(scheduleTimeReservations.organizationId, orgId),
						),
					)
					.returning({ id: scheduleTimeReservations.id });
				return removed ?? null;
			});

			if (!deleted) {
				return reply.code(404).send({
					error: "TimeReservationNotFound",
					message: "Резерв времени не найден.",
				});
			}

			request.log.info(
				{ reservationId: deleted.id, orgId },
				"[Schedule/TimeReservations] Удалён технологический резерв времени",
			);
			wsBroker.broadcastToOrganization(orgId, {
				type: "SCHEDULE_RESERVATION_DELETED",
				payload: { reservationId: deleted.id },
			});

			return reply.code(200).send({
				success: true,
				id: deleted.id,
			});
		},
	);
}
