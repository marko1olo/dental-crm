/**
 * apps/api/src/routes/schedule/slotLeaseRoutes.ts
 *
 * Fastify routes for Schedule Slot Lease Protocol (CORE-7).
 * Prevents TOCTOU concurrency race conditions during Drag-and-Drop
 * and card editing in DENTE CRM schedule.
 *
 * Mandates:
 * - 8e: Doctor autonomy & zero blocking of valid appointments
 * - 8n: Solo practice scale sovereignty
 * - CORE-7: Slot Lease Protocol & Concurrency Isolation
 */

import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { and, eq, gt, gte, lt, lte, notInArray, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client.js";
import { appointments, idempotencyKeys, scheduleSlotLeases } from "../../db/schema.js";
import { ADMIN_ROLES, getRequestIdentity } from "../../security/identity.js";
import {
	requireClinicOrganizationId,
	requireScheduleMutationContext,
	scheduleUnguardedMutationsAllowed,
} from "../scheduleAuthGuard.js";

export const acquireSlotLeaseSchema = z
	.object({
		organizationId: z.string().uuid().optional(),
		chairId: z.string().uuid().optional().nullable(),
		doctorUserId: z.string().uuid().optional().nullable(),
		patientId: z.string().uuid().optional().nullable(),
		startsAt: z.string().min(1, "Укажите время начала слота"),
		endsAt: z.string().min(1, "Укажите время окончания слота"),
		holderSessionId: z.string().min(1, "Укажите идентификатор сессии клиента"),
		source: z.string().optional().default("dnd"),
		durationSeconds: z.number().int().min(10).max(600).optional().default(90),
	})
	.strict();

export type AcquireSlotLeaseInput = z.infer<typeof acquireSlotLeaseSchema>;

export const releaseSlotLeaseSchema = z
	.object({
		organizationId: z.string().uuid().optional(),
		leaseToken: z.string().min(1, "Укажите токен бронирования"),
		holderSessionId: z.string().optional(),
	})
	.strict();

export type ReleaseSlotLeaseInput = z.infer<typeof releaseSlotLeaseSchema>;

export const heartbeatSlotLeaseSchema = z
	.object({
		organizationId: z.string().uuid().optional(),
		leaseToken: z.string().min(1, "Укажите токен бронирования"),
		extensionSeconds: z.number().int().min(10).max(600).optional().default(60),
	})
	.strict();

export type HeartbeatSlotLeaseInput = z.infer<typeof heartbeatSlotLeaseSchema>;

async function resolveOrganizationId(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<string | null> {
	const context = await requireScheduleMutationContext(
		request,
		reply,
		"schedule slot lease",
	);
	if (context?.organizationId) {
		return context.organizationId;
	}

	if (scheduleUnguardedMutationsAllowed()) {
		const bodyOrg =
			request.body && typeof request.body === "object"
				? ((request.body as Record<string, unknown>).organizationId as string | undefined)
				: undefined;
		if (bodyOrg) return bodyOrg;
		const headerOrg = request.headers["x-organization-id"];
		if (typeof headerOrg === "string" && headerOrg.trim()) return headerOrg.trim();
	}

	return null;
}

export async function handleAcquireSlotLease(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const parsed = acquireSlotLeaseSchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные параметры удержания слота",
			issues: parsed.error.issues,
		});
	}

	const orgId = await resolveOrganizationId(request, reply);
	if (!orgId) return reply;

	const {
		chairId,
		doctorUserId,
		patientId,
		startsAt,
		endsAt,
		holderSessionId,
		source = "dnd",
		durationSeconds = 90,
	} = parsed.data;

	const startsAtDate = new Date(startsAt);
	const endsAtDate = new Date(endsAt);
	if (
		!Number.isFinite(startsAtDate.getTime()) ||
		!Number.isFinite(endsAtDate.getTime()) ||
		endsAtDate <= startsAtDate
	) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Время окончания слота должно быть позже времени начала",
		});
	}

	const identity = getRequestIdentity(request);

	return await db.transaction(async (tx) => {
		// 1. Атомарно удаляем протухшие лизы организации
		await tx
			.delete(scheduleSlotLeases)
			.where(
				and(
					eq(scheduleSlotLeases.organizationId, orgId),
					lte(scheduleSlotLeases.expiresAt, new Date()),
				),
			);

		// 2. Advisory-lock по ресурсу (кресло, врач или общий слот)
		const lockKey = chairId ?? doctorUserId ?? "slot-lease";
		if (process.env.DENTAL_STATE_PERSISTENCE !== "off") {
			await tx.execute(
				sql`SELECT pg_advisory_xact_lock(hashtext(${orgId}), hashtext(${lockKey}))`,
			);
		}

		// 3. Проверка существующих подтвержденных приемов
		const resourceConditions: SQL[] = [];
		if (doctorUserId) {
			resourceConditions.push(eq(appointments.doctorUserId, doctorUserId));
		}
		if (chairId) {
			resourceConditions.push(eq(appointments.chairId, chairId));
		}

		if (resourceConditions.length > 0) {
			const [existingAppt] = await tx
				.select({ id: appointments.id })
				.from(appointments)
				.where(
					and(
						eq(appointments.organizationId, orgId),
						lt(appointments.startsAt, endsAtDate),
						gt(appointments.endsAt, startsAtDate),
						notInArray(appointments.status, ["cancelled", "no_show"]),
						or(...resourceConditions),
					),
				)
				.limit(1);

			if (existingAppt) {
				return reply.code(409).send({
					error: "SLOT_OCCUPIED",
					message: "Слот уже занят другой активной записью в расписании",
				});
			}
		}

		// 4. Проверка активных лизов других сессий
		const leaseResourceConditions: SQL[] = [];
		if (doctorUserId) {
			leaseResourceConditions.push(
				eq(scheduleSlotLeases.doctorUserId, doctorUserId),
			);
		}
		if (chairId) {
			leaseResourceConditions.push(
				eq(scheduleSlotLeases.chairId, chairId),
			);
		}

		const leaseWhereConditions: SQL[] = [
			eq(scheduleSlotLeases.organizationId, orgId),
			gt(scheduleSlotLeases.expiresAt, new Date()),
			lt(scheduleSlotLeases.startsAt, endsAtDate),
			gt(scheduleSlotLeases.endsAt, startsAtDate),
		];
		const leaseResourceFilter = or(...leaseResourceConditions);
		if (leaseResourceFilter) {
			leaseWhereConditions.push(leaseResourceFilter);
		}

		const [activeLease] = await tx
			.select()
			.from(scheduleSlotLeases)
			.where(and(...leaseWhereConditions))
			.limit(1);

		if (activeLease) {
			if (activeLease.holderSessionId === holderSessionId) {
				// Тот же пользователь/сессия продлевает удержание
				const newExpiresAt = new Date(Date.now() + durationSeconds * 1000);
				await tx
					.update(scheduleSlotLeases)
					.set({
						expiresAt: newExpiresAt,
						startsAt: startsAtDate,
						endsAt: endsAtDate,
						chairId: chairId ?? activeLease.chairId,
						doctorUserId: doctorUserId ?? activeLease.doctorUserId,
						patientId: patientId ?? activeLease.patientId,
					})
					.where(eq(scheduleSlotLeases.id, activeLease.id));

				return reply.code(200).send({
					success: true,
					leaseToken: activeLease.leaseToken,
					expiresAt: newExpiresAt.toISOString(),
					remainingSeconds: durationSeconds,
					renewed: true,
				});
			}

			// Чужой активный лиз -> 409 Conflict
			const nowMs = Date.now();
			const remainingSeconds = Math.max(
				1,
				Math.ceil((activeLease.expiresAt.getTime() - nowMs) / 1000),
			);
			return reply.code(409).send({
				error: "SLOT_LEASED",
				message: "Слот временно удерживается другим пользователем",
				expiresAt: activeLease.expiresAt.toISOString(),
				remainingSeconds,
			});
		}

		// 5. Слот свободен: выдаем новый leaseToken
		const leaseToken = randomUUID();
		const expiresAt = new Date(Date.now() + durationSeconds * 1000);

		await tx.insert(scheduleSlotLeases).values({
			organizationId: orgId,
			chairId: chairId ?? null,
			doctorUserId: doctorUserId ?? null,
			patientId: patientId ?? null,
			startsAt: startsAtDate,
			endsAt: endsAtDate,
			leaseToken,
			holderUserId: identity.userId ?? null,
			holderSessionId,
			source,
			expiresAt,
		});

		return reply.code(201).send({
			success: true,
			leaseToken,
			expiresAt: expiresAt.toISOString(),
			remainingSeconds: durationSeconds,
		});
	});
}

export async function handleReleaseSlotLease(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const parsed = releaseSlotLeaseSchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректный токен удержания слота",
			issues: parsed.error.issues,
		});
	}

	const orgId = await resolveOrganizationId(request, reply);
	if (!orgId) return reply;

	const rawIdemKey =
		(request.headers["idempotency-key"] as string | undefined) ??
		(request.headers["x-idempotency-key"] as string | undefined);
	const idempotencyKey = rawIdemKey?.trim() ? rawIdemKey.trim() : null;

	const identity = getRequestIdentity(request);
	const clientSessionId =
		parsed.data.holderSessionId ??
		(request.headers["x-session-id"] as string | undefined) ??
		identity.sessionId ??
		null;

	const isPrivileged = identity.role
		? (ADMIN_ROLES as readonly string[]).includes(identity.role) ||
		  identity.role === "manager"
		: false;

	return await db.transaction(async (tx) => {
		if (idempotencyKey) {
			if (process.env.DENTAL_STATE_PERSISTENCE !== "off") {
				await tx.execute(
					sql`SELECT pg_advisory_xact_lock(hashtext(${orgId}), hashtext(${idempotencyKey}))`,
				);
			}

			const [existingRecord] = await tx
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
						message: "Запрос на освобождение слота уже обрабатывается",
					});
				}
			}

			await tx
				.insert(idempotencyKeys)
				.values({
					clinicId: orgId,
					key: idempotencyKey,
					status: "in_flight",
					lockedAt: new Date(),
				})
				.onConflictDoNothing();
		}

		const [activeLease] = await tx
			.select()
			.from(scheduleSlotLeases)
			.where(
				and(
					eq(scheduleSlotLeases.organizationId, orgId),
					eq(scheduleSlotLeases.leaseToken, parsed.data.leaseToken),
				),
			)
			.for("update")
			.limit(1);

		if (!activeLease) {
			const resBody = { success: true, released: true };
			if (idempotencyKey) {
				await tx
					.insert(idempotencyKeys)
					.values({
						clinicId: orgId,
						key: idempotencyKey,
						status: "completed",
						responseBody: resBody,
						responseCode: 200,
					})
					.onConflictDoUpdate({
						target: [idempotencyKeys.clinicId, idempotencyKeys.key],
						set: {
							status: "completed",
							responseBody: resBody,
							responseCode: 200,
						},
					});
			}
			return reply.code(200).send(resBody);
		}

		// Проверка прав на освобождение слота:
		// Допустимо, если:
		// 1) Пользователь привилегированный (admin, owner, administrator, manager)
		// 2) Сессия совпадает с владельцем лиза (activeLease.holderSessionId === clientSessionId)
		// 3) Пользователь совпадает с владельцем лиза (activeLease.holderUserId === identity.userId)
		const matchesSession = Boolean(
			activeLease.holderSessionId &&
				clientSessionId &&
				activeLease.holderSessionId === clientSessionId,
		);
		const matchesUser = Boolean(
			activeLease.holderUserId &&
				identity.userId &&
				activeLease.holderUserId === identity.userId,
		);

		if (!isPrivileged && !matchesSession && !matchesUser) {
			return reply.code(403).send({
				error: "PermissionDenied",
				message: "Нельзя освободить чужое бронирование слота",
			});
		}

		await tx
			.delete(scheduleSlotLeases)
			.where(eq(scheduleSlotLeases.id, activeLease.id));

		const resBody = { success: true, released: true };
		if (idempotencyKey) {
			await tx
				.insert(idempotencyKeys)
				.values({
					clinicId: orgId,
					key: idempotencyKey,
					status: "completed",
					responseBody: resBody,
					responseCode: 200,
				})
				.onConflictDoUpdate({
					target: [idempotencyKeys.clinicId, idempotencyKeys.key],
					set: {
						status: "completed",
						responseBody: resBody,
						responseCode: 200,
					},
				});
		}

		return reply.code(200).send(resBody);
	});
}

export async function handleHeartbeatSlotLease(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const parsed = heartbeatSlotLeaseSchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные параметры продления удержания слота",
			issues: parsed.error.issues,
		});
	}

	const orgId = await resolveOrganizationId(request, reply);
	if (!orgId) return reply;

	const extensionSeconds = parsed.data.extensionSeconds ?? 60;

	return await db.transaction(async (tx) => {
		const [lease] = await tx
			.select()
			.from(scheduleSlotLeases)
			.where(
				and(
					eq(scheduleSlotLeases.organizationId, orgId),
					eq(scheduleSlotLeases.leaseToken, parsed.data.leaseToken),
					gt(scheduleSlotLeases.expiresAt, new Date()),
				),
			)
			.for("update")
			.limit(1);

		if (!lease) {
			return reply.code(409).send({
				error: "LEASE_EXPIRED",
				message: "Срок действия резервирования слота истек или токен не найден",
			});
		}

		const newExpiresAt = new Date(Date.now() + extensionSeconds * 1000);
		await tx
			.update(scheduleSlotLeases)
			.set({ expiresAt: newExpiresAt })
			.where(eq(scheduleSlotLeases.id, lease.id));

		return reply.code(200).send({
			success: true,
			expiresAt: newExpiresAt.toISOString(),
			remainingSeconds: extensionSeconds,
		});
	});
}

/**
 * Регистрация Fastify-маршрутов Slot Lease Protocol.
 */
export async function registerSlotLeaseRoutes(app: FastifyInstance) {
	// Канонические маршруты
	app.post("/api/schedule/leases/acquire", handleAcquireSlotLease);
	app.post("/api/schedule/leases/release", handleReleaseSlotLease);
	app.post("/api/schedule/leases/heartbeat", handleHeartbeatSlotLease);

	// Alias v1
	app.post("/api/v1/schedule/leases/acquire", handleAcquireSlotLease);
	app.post("/api/v1/schedule/leases/release", handleReleaseSlotLease);
	app.post("/api/v1/schedule/leases/heartbeat", handleHeartbeatSlotLease);

}
