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
import { and, eq, gt, lt, lte, notInArray, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import {
	acquireCanonicalScheduleAdvisoryLocks,
	findConflictingTimeReservation,
} from "../../db/appointmentsQueryModules/scheduleReservationLockHelpers.js";
import { lockAppointmentResources } from "../../db/appointmentsQueryModules/appointmentValidationHelpers.js";
import { defineTenantMutation } from "../../core/routeFactories.js";
import type { TenantDb } from "../../db/rls.js";
import { appointments, scheduleSlotLeases } from "../../db/schema.js";
import { ADMIN_ROLES, getRequestIdentity } from "../../security/identity.js";
import type { VerifiedPrincipal } from "../../security/unifiedAuthPerimeter.js";

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
		holderSessionId: z.string().optional(),
		extensionSeconds: z.number().int().min(10).max(600).optional().default(60),
	})
	.strict();

export type HeartbeatSlotLeaseInput = z.infer<typeof heartbeatSlotLeaseSchema>;

function verifySlotLeaseOwnership(params: {
	lease: { holderSessionId: string | null; holderUserId: string | null };
	request: FastifyRequest;
	clientSessionId: string | null;
	principalUserId: string | null;
	role: string | null | undefined;
}): boolean {
	const isPrivileged = params.role
		? (ADMIN_ROLES as readonly string[]).includes(params.role) ||
		  params.role === "manager"
		: false;
	const matchesSession = Boolean(
		params.lease.holderSessionId &&
			params.clientSessionId &&
			params.lease.holderSessionId === params.clientSessionId,
	);
	const matchesUser = Boolean(
		params.lease.holderUserId &&
			params.principalUserId &&
			params.lease.holderUserId === params.principalUserId,
	);
	return isPrivileged || matchesSession || matchesUser;
}

async function executeAcquireSlotLease(ctx: {
	tx: TenantDb;
	principal: VerifiedPrincipal;
	organizationId: string;
	body: AcquireSlotLeaseInput;
	reply: FastifyReply;
}) {
	const { tx, principal, organizationId: orgId, body, reply } = ctx;
	const {
		chairId,
		doctorUserId,
		patientId,
		startsAt,
		endsAt,
		holderSessionId,
		source = "dnd",
		durationSeconds = 90,
	} = body;

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

	// 1. Атомарно удаляем протухшие лизы организации
	await tx
		.delete(scheduleSlotLeases)
		.where(
			and(
				eq(scheduleSlotLeases.organizationId, orgId),
				lte(scheduleSlotLeases.expiresAt, new Date()),
			),
		);

	// 2. Каноническая блокировка ресурсов (Chair -> Doctor), синхронная с create/update приёмов
	await acquireCanonicalScheduleAdvisoryLocks(tx, orgId, {
		chairId,
		doctorUserId,
	});
	await lockAppointmentResources(tx, orgId, {
		chairId,
		doctorUserId,
	});

	const reservationConflict = await findConflictingTimeReservation(tx, orgId, {
		startsAt: startsAtDate,
		endsAt: endsAtDate,
		chairId,
	});
	if (reservationConflict) {
		return reply.code(409).send({
			error: "SLOT_RESERVED",
			message: `Время заблокировано технологическим резервом (${reservationConflict.note || reservationConflict.chairName})`,
		});
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
				.where(
					and(
						eq(scheduleSlotLeases.id, activeLease.id),
						eq(scheduleSlotLeases.organizationId, orgId),
					),
				);

			return reply.code(200).send({
				success: true,
				leaseToken: activeLease.leaseToken,
				expiresAt: newExpiresAt.toISOString(),
				remainingSeconds: durationSeconds,
				renewed: true,
			});
		}

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
		holderUserId: principal.userId ?? null,
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
}

async function executeReleaseSlotLease(ctx: {
	tx: TenantDb;
	principal: VerifiedPrincipal;
	organizationId: string;
	body: ReleaseSlotLeaseInput;
	request: FastifyRequest;
	reply: FastifyReply;
}) {
	const { tx, principal, organizationId: orgId, body, request, reply } = ctx;
	const identity = getRequestIdentity(request);
	const clientSessionId =
		body.holderSessionId ??
		(request.headers["x-session-id"] as string | undefined) ??
		identity.sessionId ??
		null;

	const [activeLease] = await tx
		.select()
		.from(scheduleSlotLeases)
		.where(
			and(
				eq(scheduleSlotLeases.organizationId, orgId),
				eq(scheduleSlotLeases.leaseToken, body.leaseToken),
			),
		)
		.for("update")
		.limit(1);

	if (!activeLease) {
		return reply.code(200).send({ success: true, released: true });
	}

	if (
		!verifySlotLeaseOwnership({
			lease: activeLease,
			request,
			clientSessionId,
			principalUserId: principal.userId ?? identity.userId ?? null,
			role: principal.role || identity.role,
		})
	) {
		return reply.code(403).send({
			error: "PermissionDenied",
			message: "Нельзя освободить чужое бронирование слота",
		});
	}

	await tx
		.delete(scheduleSlotLeases)
		.where(
			and(
				eq(scheduleSlotLeases.id, activeLease.id),
				eq(scheduleSlotLeases.organizationId, orgId),
			),
		);

	return reply.code(200).send({ success: true, released: true });
}

async function executeHeartbeatSlotLease(ctx: {
	tx: TenantDb;
	principal: VerifiedPrincipal;
	organizationId: string;
	body: HeartbeatSlotLeaseInput;
	request: FastifyRequest;
	reply: FastifyReply;
}) {
	const { tx, principal, organizationId: orgId, body, request, reply } = ctx;
	const identity = getRequestIdentity(request);
	const clientSessionId =
		body.holderSessionId ??
		(request.headers["x-session-id"] as string | undefined) ??
		identity.sessionId ??
		null;
	const extensionSeconds = body.extensionSeconds ?? 60;

	const [lease] = await tx
		.select()
		.from(scheduleSlotLeases)
		.where(
			and(
				eq(scheduleSlotLeases.organizationId, orgId),
				eq(scheduleSlotLeases.leaseToken, body.leaseToken),
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

	if (
		!verifySlotLeaseOwnership({
			lease,
			request,
			clientSessionId,
			principalUserId: principal.userId ?? identity.userId ?? null,
			role: principal.role || identity.role,
		})
	) {
		return reply.code(403).send({
			error: "PermissionDenied",
			message: "Нельзя продлить чужое бронирование слота",
		});
	}

	const newExpiresAt = new Date(Date.now() + extensionSeconds * 1000);
	await tx
		.update(scheduleSlotLeases)
		.set({ expiresAt: newExpiresAt })
		.where(
			and(
				eq(scheduleSlotLeases.id, lease.id),
				eq(scheduleSlotLeases.organizationId, orgId),
			),
		);

	return reply.code(200).send({
		success: true,
		expiresAt: newExpiresAt.toISOString(),
		remainingSeconds: extensionSeconds,
	});
}

/**
 * Регистрация Fastify-маршрутов Slot Lease Protocol через единую фабрику defineTenantMutation.
 */
export async function registerSlotLeaseRoutes(app: FastifyInstance) {
	const authOptions = {
		allowClinicTokenWithoutStaff: true,
		allowAdminSecretBypass: true,
	} as const;

	for (const prefix of ["/api/schedule/leases", "/api/v1/schedule/leases"] as const) {
		defineTenantMutation(app, {
			method: "POST",
			path: `${prefix}/acquire`,
			permission: "schedule.write",
			authOptions,
			idempotency: "optional_header",
			bodySchema: acquireSlotLeaseSchema,
			validationErrorMessage: "Некорректные параметры удержания слота",
			handler: async (ctx) => executeAcquireSlotLease(ctx),
		});

		defineTenantMutation(app, {
			method: "POST",
			path: `${prefix}/release`,
			permission: "schedule.write",
			authOptions,
			idempotency: "optional_header",
			bodySchema: releaseSlotLeaseSchema,
			validationErrorMessage: "Некорректный токен удержания слота",
			handler: async (ctx) => executeReleaseSlotLease(ctx),
		});

		defineTenantMutation(app, {
			method: "POST",
			path: `${prefix}/heartbeat`,
			permission: "schedule.write",
			authOptions,
			idempotency: "optional_header",
			bodySchema: heartbeatSlotLeaseSchema,
			validationErrorMessage: "Некорректные параметры продления удержания слота",
			handler: async (ctx) => executeHeartbeatSlotLease(ctx),
		});
	}
}
