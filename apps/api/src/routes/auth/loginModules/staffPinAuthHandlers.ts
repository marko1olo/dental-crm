/**
 * apps/api/src/routes/auth/loginModules/staffPinAuthHandlers.ts
 *
 * DENTE Dental CRM — Staff PIN Authentication & Chairside Switch Facade.
 * Mandates: 8b & 8zi (Sweet Spot <70 lines facade), 8e (Doctor Autonomy).
 */

import type { FastifyReply, FastifyRequest } from "fastify";
import { resetRateLimit } from "../../../security/rateLimit.js";
import { verifyToken } from "../../../utils/cryptoHelper.js";
import { authFailureDelay, demoLoginAllowed, parseAuthPayload, TOKEN_SECRET } from "../tokenHelpers.js";
import {
	getStaffPinRateLimitKey,
	recordStaffPinFailure,
	resetStaffPinRateLimit,
} from "./loginRateLimiter.js";
import {
	staffSwitchRoleSchema,
	staffUnlockBodySchema,
	staffUnlockValidationMessage,
} from "./loginValidationSchemas.js";
import {
	extractClinicPayload,
	findStaffUserById,
	validateRoleSwitchPin,
	verifyAndMatchStaffUser,
	verifyBruteForceLimit,
} from "./pin/staffPinVerification.js";
import {
	handleDemoRoleSwitch,
	issueStaffSessionToken,
} from "./pin/staffPinSessionTokens.js";

// Экспорт для обратной совместимости
export { extractClinicPayload };

/**
 * POST /api/auth/staff/unlock
 * Разблокировка сессии сотрудника по персональному 4-значному PIN-коду (МАНДАТ 8e).
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

	const clinicPayload = extractClinicPayload(request);
	if (!clinicPayload?.organizationId) {
		return reply.code(401).send({
			error: "ClinicAuthRequired",
			message: "Сначала выполните вход в кабинет клиники.",
		});
	}

	const orgId = clinicPayload.organizationId;
	const rateLimitCheck = verifyBruteForceLimit(orgId, input.userId, request.ip);
	if (!rateLimitCheck.allowed) {
		reply.header("Retry-After", String(rateLimitCheck.retryAfterSeconds ?? 300));
		return reply.code(429).send({
			error: "RateLimitExceeded",
			message: "Слишком много неудачных попыток ввода PIN. Доступ заблокирован на 5 минут.",
			retryAfter: rateLimitCheck.retryAfterSeconds ?? 300,
		});
	}

	const { user, isMatch } = await verifyAndMatchStaffUser({
		orgId,
		userId: input.userId,
		pinCode: input.pinCode,
		log: request.log,
	});

	if (!user || !isMatch) {
		recordStaffPinFailure(rateLimitCheck.rateLimitKey);
		await authFailureDelay();
		return reply.code(401).send({ error: "AuthError", message: "Неверный PIN-код." });
	}

	resetStaffPinRateLimit(rateLimitCheck.rateLimitKey);
	if (user.id !== input.userId) {
		resetStaffPinRateLimit(getStaffPinRateLimitKey(orgId, user.id, request.ip));
	}
	resetRateLimit(request);

	const result = await issueStaffSessionToken({
		orgId,
		user,
		request,
		actionType: "unlock",
	});

	return reply.send(result);
}

/**
 * POST /api/auth/staff/switch-role
 * Мгновенная смена клинической роли сотрудника у кресла (МАНДАТ 8e / МАНДАТ 8n).
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
	const staffToken = Array.isArray(staffHeader) ? staffHeader[0] : staffHeader;
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

	const { targetRole, targetUserId, pinCode } = parsed.data;
	const orgId = clinicPayload.organizationId;

	// Демо-контур
	if (
		demoLoginAllowed() &&
		(staffToken.startsWith("demo-showcase-staff-token") || staffToken.startsWith("demo-token-"))
	) {
		const demoResult = handleDemoRoleSwitch({ orgId, targetRole, targetUserId });
		if (demoResult) return reply.send(demoResult);
	}

	const staffPayload = verifyToken(staffToken, TOKEN_SECRET());
	if (!staffPayload || staffPayload.organizationId !== orgId) {
		return reply.code(401).send({
			error: "InvalidSession",
			message: "Сессия сотрудника недействительна.",
		});
	}

	const activeUserId = targetUserId || (staffPayload.userId as string);
	const dbUser = await findStaffUserById(orgId, activeUserId, request.log);
	if (!dbUser) {
		return reply.code(404).send({
			error: "UserNotFound",
			message: "Целевой сотрудник не найден в текущей организации.",
		});
	}

	const callerUserId = typeof staffPayload.userId === "string" ? staffPayload.userId : null;
	const validation = await validateRoleSwitchPin({
		orgId,
		dbUser,
		targetRole,
		callerUserId,
		pinCode,
		ip: request.ip,
	});

	if (!validation.valid) {
		return reply.code(validation.statusCode).send({
			error: validation.error,
			message: validation.message,
		});
	}

	const result = await issueStaffSessionToken({
		orgId,
		user: dbUser,
		request,
		actionType: "role_switch",
		isSwitchingToAnotherUser: callerUserId !== dbUser.id,
		callerUserId,
	});

	return reply.send(result);
}
