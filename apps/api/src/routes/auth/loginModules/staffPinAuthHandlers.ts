import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { withTenantCtx } from "../../../db/rls.js";
import { auditEvents, users } from "../../../db/schema.js";
import { resetRateLimit } from "../../../security/rateLimit.js";
import {
	DEMO_ADMIN_ID,
	DEMO_DOCTOR_1_ID,
	DEMO_DOCTOR_2_ID,
	DEMO_DOCTOR_ORTHOPEDIST_ID,
	DEMO_DOCTOR_SURGEON_ID,
	DEMO_OWNER_ID,
	DEMO_SHOWCASE_ORG_ID,
} from "../../../services/demo/deepDemoSeeder.js";
import {
	signToken,
	verifyCredential,
	verifyToken,
} from "../../../utils/cryptoHelper.js";
import {
	authFailureDelay,
	demoLoginAllowed,
	parseAuthPayload,
	TOKEN_SECRET,
} from "../tokenHelpers.js";
import {
	checkStaffPinRateLimit,
	getStaffPinRateLimitKey,
	recordStaffPinFailure,
	resetStaffPinRateLimit,
} from "./loginRateLimiter.js";
import {
	staffSwitchRoleSchema,
	staffUnlockBodySchema,
	staffUnlockValidationMessage,
} from "./loginValidationSchemas.js";

/**
 * Разрешение payload токена клиники из заголовка x-dente-clinic-token
 */
export function extractClinicPayload(request: FastifyRequest): {
	organizationId: string;
} | null {
	const clinicHeader = request.headers["x-dente-clinic-token"];
	const clinicToken = Array.isArray(clinicHeader)
		? clinicHeader[0]
		: clinicHeader;

	if (!clinicToken) return null;

	if (
		clinicToken.startsWith("demo-showcase-token") ||
		clinicToken.startsWith("demo-showcase-clinic-token")
	) {
		return { organizationId: DEMO_SHOWCASE_ORG_ID };
	}

	const verified = verifyToken(clinicToken, TOKEN_SECRET());
	if (verified && typeof verified.organizationId === "string") {
		return { organizationId: verified.organizationId };
	}

	return null;
}

/**
 * POST /api/auth/staff/unlock
 * Разблокировка сессии сотрудника по персональному 4-значному PIN-коду (МАНДАТ 8e: Doctor Autonomy).
 * Включает защиту от брутфорса (5 попыток -> 5 минут блокировки).
 */
export async function handleStaffUnlock(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const input = parseAuthPayload(staffUnlockBodySchema, request.body);
	if (!input) {
		return reply.code(400).send({
			error: "ValidationError",
			message: staffUnlockValidationMessage,
		});
	}
	const { userId, pinCode } = input;

	const clinicPayload = extractClinicPayload(request);
	if (!clinicPayload?.organizationId) {
		return reply.code(401).send({
			error: "ClinicAuthRequired",
			message: "Сначала выполните вход в кабинет клиники.",
		});
	}

	const orgId = clinicPayload.organizationId;
	const rateLimitKey = getStaffPinRateLimitKey(orgId, userId || "chairside", request.ip);

	// Проверка защиты от брутфорса
	const limitStatus = checkStaffPinRateLimit(rateLimitKey);
	if (!limitStatus.allowed) {
		reply.header("Retry-After", String(limitStatus.retryAfterSeconds ?? 300));
		return reply.code(429).send({
			error: "RateLimitExceeded",
			message:
				"Слишком много неудачных попыток ввода PIN. Доступ заблокирован на 5 минут.",
			retryAfter: limitStatus.retryAfterSeconds ?? 300,
		});
	}

	// Поиск сотрудника в базе под RLS арендодателя
	let user: typeof users.$inferSelect | undefined;
	if (userId) {
		try {
			const results = await withTenantCtx(orgId, async (tx) => {
				return tx
					.select()
					.from(users)
					.where(
						and(
							eq(users.id, userId),
							eq(users.organizationId, orgId),
							eq(users.isActive, true),
						),
					)
					.limit(1);
			});
			user = results[0];
		} catch (dbErr) {
			request.log.error({ dbErr }, "[STAFF_UNLOCK_DB_ERR] Ошибка поиска сотрудника");
		}
	}

	// Поддержка демо-контура: если сотрудника ещё нет в базе, но активен демо-режим
	if (!user && demoLoginAllowed() && orgId === DEMO_SHOWCASE_ORG_ID) {
		if (!userId || userId === DEMO_DOCTOR_1_ID) {
			user = {
				id: DEMO_DOCTOR_1_ID,
				organizationId: DEMO_SHOWCASE_ORG_ID,
				fullName: "Д-р Соколов А. В.",
				role: "doctor",
				email: "doctor@clinic.com",
				phone: "+7 (999) 111-22-33",
				pinCodeHash: null,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date(),
			} as unknown as typeof users.$inferSelect;
		}
	}

	let isMatch = false;
	if (user) {
		const storedPinHash = user.pinCodeHash;
		isMatch = storedPinHash
			? await verifyCredential(pinCode, storedPinHash)
			: demoLoginAllowed() && orgId === DEMO_SHOWCASE_ORG_ID && pinCode === "1234";
	}

	// МАНДАТ 8e: Быстрая смена врача у кресла по PIN-коду (Chairside Quick Switch).
	// Если PIN не подошел целевому врачу или экран был заблокирован другим сотрудником,
	// проверяем, принадлежит ли введенный PIN любому другому активному сотруднику клиники.
	if (!isMatch) {
		try {
			const allClinicStaff = await withTenantCtx(orgId, async (tx) => {
				return tx
					.select()
					.from(users)
					.where(
						and(
							eq(users.organizationId, orgId),
							eq(users.isActive, true),
						),
					);
			});

			for (const candidate of allClinicStaff) {
				if (user && candidate.id === user.id) continue;
				if (!candidate.pinCodeHash) continue;
				const candidateMatched = await verifyCredential(pinCode, candidate.pinCodeHash);
				if (candidateMatched) {
					user = candidate;
					isMatch = true;
					break;
				}
			}
		} catch (scanErr) {
			request.log.error({ scanErr }, "[STAFF_UNLOCK_CHAIRSIDE_SCAN_ERR]");
		}

		if (!isMatch && demoLoginAllowed() && orgId === DEMO_SHOWCASE_ORG_ID && pinCode === "1234") {
			const matchedDemoId = userId === DEMO_DOCTOR_2_ID ? DEMO_DOCTOR_1_ID : (userId || DEMO_DOCTOR_1_ID);
			user = {
				id: matchedDemoId,
				organizationId: DEMO_SHOWCASE_ORG_ID,
				fullName: matchedDemoId === DEMO_DOCTOR_2_ID ? "Д-р Морозова Е. И." : "Д-р Соколов А. В.",
				role: "doctor",
				email: "doctor@clinic.com",
				phone: "+7 (999) 111-22-33",
				pinCodeHash: null,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date(),
			} as unknown as typeof users.$inferSelect;
			isMatch = true;
		}
	}

	if (!user || !isMatch) {
		recordStaffPinFailure(rateLimitKey);
		await authFailureDelay();
		return reply
			.code(401)
			.send({ error: "AuthError", message: "Неверный PIN-код." });
	}

	// Успешный ввод: сброс счётчиков блокировок
	resetStaffPinRateLimit(rateLimitKey);
	if (user.id !== userId) {
		resetStaffPinRateLimit(getStaffPinRateLimitKey(orgId, user.id, request.ip));
	}
	resetRateLimit(request);

	const sessionId = crypto.randomUUID();

	// Обновление ID сессии в БД
	try {
		await withTenantCtx(orgId, async (tx) => {
			await tx
				.update(users)
				.set({ currentSessionId: sessionId })
				.where(and(eq(users.id, user.id), eq(users.organizationId, orgId)));
		});
	} catch (sessErr) {
		request.log.warn({ sessErr }, "[STAFF_SESSION_UPDATE_WARN]");
	}

	const staffToken = signToken(
		{
			userId: user.id,
			fullName: user.fullName,
			role: user.role,
			organizationId: orgId,
			sessionId,
		},
		TOKEN_SECRET(),
		60 * 60 * 8, // 8 часов рабочей смены
	);

	// Аудит входа под контекстом арендатора
	try {
		await withTenantCtx(orgId, async (tx) => {
			await tx.insert(auditEvents).values({
				organizationId: orgId,
				actorUserId: user.id,
				entityType: "user",
				entityId: user.id,
				action: "staff_unlock_success",
				reason: `Сотрудник ${user.fullName} начал сессию.`,
			});
		});
	} catch (auditErr) {
		request.log.warn({ auditErr }, "[STAFF_AUDIT_LOG_WARN]");
	}

	return reply.send({
		ok: true,
		staffToken,
		user: {
			id: user.id,
			fullName: user.fullName,
			role: user.role,
			phone: user.phone,
			email: user.email,
		},
	});
}

/**
 * POST /api/auth/staff/switch-role
 * Мгновенная смена клинической роли сотрудника у кресла (МАНДАТ 8e / МАНДАТ 8n).
 * Позволяет врачу переключиться на права управляющего или ассистента без разлогина.
 */
export async function handleStaffSwitchRole(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const clinicPayload = extractClinicPayload(request);
	if (!clinicPayload?.organizationId) {
		return reply.code(401).send({
			error: "ClinicAuthRequired",
			message: "Сначала выполните вход в кабинет клиники.",
		});
	}

	const staffHeader = request.headers["x-dente-staff-token"];
	const staffToken = Array.isArray(staffHeader)
		? staffHeader[0]
		: staffHeader;

	if (!staffToken) {
		return reply.code(401).send({
			error: "AuthRequired",
			message: "Требуется активная сессия сотрудника.",
		});
	}

	const parsed = staffSwitchRoleSchema.safeParse(request.body ?? {});
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Укажите целевую роль сотрудника.",
		});
	}

	const { targetRole, targetUserId } = parsed.data;
	const orgId = clinicPayload.organizationId;

	// Демо-контур: мгновенное переключение демо-профиля
	if (
		demoLoginAllowed() &&
		(orgId === DEMO_SHOWCASE_ORG_ID ||
			staffToken.startsWith("demo-showcase-staff-token") ||
			staffToken.startsWith("demo-token-"))
	) {
		let userId = targetUserId || DEMO_DOCTOR_1_ID;
		let fullName = "Д-р Соколов А. В.";

		if (targetRole === "owner") {
			userId = DEMO_OWNER_ID;
			fullName = "Доктор Романов И. В. (Владелец)";
		} else if (targetRole === "administrator" || targetRole === "receptionist") {
			userId = DEMO_ADMIN_ID;
			fullName = "Смирнова А. К. (Администратор)";
		} else if (targetRole === "doctor") {
			if (userId === DEMO_DOCTOR_ORTHOPEDIST_ID) {
				fullName = "Д-р Орлов А. В. (Ортопед)";
			} else if (userId === DEMO_DOCTOR_SURGEON_ID) {
				fullName = "Д-р Громов К. Д. (Хирург)";
			} else if (userId === DEMO_DOCTOR_2_ID) {
				fullName = "Д-р Морозова Е. И. (Ортодонт)";
			} else {
				userId = DEMO_DOCTOR_1_ID;
				fullName = "Д-р Соколов А. В. (Терапевт)";
			}
		}

		const newStaffToken = signToken(
			{
				userId,
				fullName,
				role: targetRole,
				organizationId: orgId,
				sessionId: crypto.randomUUID(),
			},
			TOKEN_SECRET(),
			60 * 60 * 8,
		);

		return reply.send({
			ok: true,
			staffToken: newStaffToken,
			user: {
				id: userId,
				fullName,
				role: targetRole,
				email: "demo@dente.pro",
			},
		});
	}

	// Прод-контур: верификация токена и пользователя в PostgreSQL 18
	const staffPayload = verifyToken(staffToken, TOKEN_SECRET());
	if (!staffPayload || staffPayload.organizationId !== orgId) {
		return reply.code(401).send({
			error: "InvalidSession",
			message: "Сессия сотрудника недействительна.",
		});
	}

	const activeUserId = targetUserId || (staffPayload.userId as string);

	let dbUser: typeof users.$inferSelect | undefined;
	try {
		const results = await withTenantCtx(orgId, async (tx) => {
			return tx
				.select()
				.from(users)
				.where(
					and(
						eq(users.id, activeUserId),
						eq(users.organizationId, orgId),
						eq(users.isActive, true),
					),
				)
				.limit(1);
		});
		dbUser = results[0];
	} catch (dbErr) {
		request.log.error({ dbErr }, "[SWITCH_ROLE_DB_ERR] Ошибка поиска пользователя");
	}

	if (!dbUser) {
		return reply.code(404).send({
			error: "UserNotFound",
			message: "Целевой сотрудник не найден в текущей организации.",
		});
	}

	const newSessionId = crypto.randomUUID();
	const newStaffToken = signToken(
		{
			userId: dbUser.id,
			fullName: dbUser.fullName,
			role: targetRole,
			organizationId: orgId,
			sessionId: newSessionId,
		},
		TOKEN_SECRET(),
		60 * 60 * 8,
	);

	// Логирование аудита смены роли
	try {
		await withTenantCtx(orgId, async (tx) => {
			await tx.insert(auditEvents).values({
				organizationId: orgId,
				actorUserId: dbUser.id,
				entityType: "user",
				entityId: dbUser.id,
				action: "staff_role_switch",
				reason: `Сотрудник ${dbUser.fullName} переключил роль на: ${targetRole}`,
			});
		});
	} catch (auditErr) {
		request.log.warn({ auditErr }, "[ROLE_SWITCH_AUDIT_WARN]");
	}

	return reply.send({
		ok: true,
		staffToken: newStaffToken,
		user: {
			id: dbUser.id,
			fullName: dbUser.fullName,
			role: targetRole,
			phone: dbUser.phone,
			email: dbUser.email,
		},
	});
}
