/**
 * identity.ts — единая точка определения "кто прислал запрос".
 *
 * Организация и личность сотрудника определяются ТОЛЬКО из подписанного токена.
 * Непроверенная организация из dev-заголовка действует только на чтение в dev-режиме.
 */

import type { FastifyReply, FastifyRequest } from "fastify";
import { verifyToken } from "../utils/cryptoHelper.js";
import { authTokenSecret } from "./authSecret.js";
import {
	ADMIN_ROLES,
	CLINIC_TOKEN_HEADER,
	EMPTY_IDENTITY,
	ORGANIZATION_HEADER,
	STAFF_TOKEN_HEADER,
	UNVERIFIED_MUTATION_REJECTION,
	type ClinicSession,
	type IdentityRejection,
	type RequestIdentity,
	type StaffMemberContext,
	type StaffRole,
} from "./identityModules/identityTypes.js";
import {
	applyAdminSecretBypass,
	devHeaderOrgAllowed,
	headerValue,
	identityRejectionOf,
	resolveDemoTokenIdentity,
	setIdentityRejection,
	unverifiedOrganizationUsable,
} from "./identityModules/tokenSignerAndVerifier.js";

export {
	ADMIN_ROLES,
	CLINIC_TOKEN_HEADER,
	EMPTY_IDENTITY,
	ORGANIZATION_HEADER,
	STAFF_TOKEN_HEADER,
	UNVERIFIED_MUTATION_REJECTION,
	type ClinicSession,
	type IdentityRejection,
	type RequestIdentity,
	type StaffMemberContext,
	type StaffRole,
};

/**
 * Разбирает токены запроса. Результат кэшируется на объекте request,
 * чтобы не пересчитывать HMAC на каждой проверке внутри одного запроса.
 */
export function getRequestIdentity(request: FastifyRequest): RequestIdentity {
	const cached = (request as unknown as { __denteIdentity?: RequestIdentity })
		.__denteIdentity;
	if (cached) return cached;

	let identity: RequestIdentity = { ...EMPTY_IDENTITY };

	let secret: string;
	try {
		secret = authTokenSecret();
	} catch {
		// Секрет не настроен в production — токены не принимаем вовсе.
		(
			request as unknown as { __denteIdentity?: RequestIdentity }
		).__denteIdentity = identity;
		return identity;
	}

	let clinicToken = headerValue(request, CLINIC_TOKEN_HEADER);
	let staffToken = headerValue(request, STAFF_TOKEN_HEADER);

	if (!clinicToken && !staffToken) {
		const authHeader = headerValue(request, "authorization");
		if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
			const bearer = authHeader.slice(7).trim();
			clinicToken = bearer;
			staffToken = bearer;
		}
	}

	const demoIdentity = resolveDemoTokenIdentity(clinicToken, staffToken);
	if (demoIdentity) {
		identity = { ...identity, ...demoIdentity };
	} else {
		const clinicPayload = clinicToken ? verifyToken(clinicToken, secret) : null;
		const staffPayload = staffToken ? verifyToken(staffToken, secret) : null;

		if (clinicPayload && typeof clinicPayload.organizationId === "string") {
			identity.organizationId = clinicPayload.organizationId;
			identity.verified = true;
		}

		if (staffPayload && typeof staffPayload.userId === "string") {
			const staffOrg =
				typeof staffPayload.organizationId === "string"
					? staffPayload.organizationId
					: null;
			if (!identity.organizationId && staffOrg) {
				identity.organizationId = staffOrg;
				identity.verified = true;
			}
			if (!staffOrg || staffOrg === identity.organizationId) {
				identity.userId = staffPayload.userId;
				identity.role =
					typeof staffPayload.role === "string" ? staffPayload.role : null;
				identity.fullName =
					typeof staffPayload.fullName === "string"
						? staffPayload.fullName
						: null;
				identity.sessionId =
					typeof staffPayload.sessionId === "string"
						? staffPayload.sessionId
						: null;
			}
		}
	}

	applyAdminSecretBypass(request, identity);

	if (!identity.organizationId && devHeaderOrgAllowed()) {
		const headerOrg = headerValue(request, ORGANIZATION_HEADER);
		if (headerOrg) {
			identity.organizationId = headerOrg;
			identity.verified = false;
		}
	}

	// Пост-условие: метка verified проверяется здесь для всех потребителей.
	if (
		identity.organizationId &&
		!identity.verified &&
		!unverifiedOrganizationUsable(request)
	) {
		identity = { ...identity, organizationId: null };
		setIdentityRejection(request, UNVERIFIED_MUTATION_REJECTION);
		const log = (
			request as unknown as { log?: { warn?: (message: string) => void } }
		).log;
		log?.warn?.(
			`[security] Заголовок ${ORGANIZATION_HEADER} отклонён для ${request.method} ${request.url}: ` +
				"непроверенная организация не может изменять данные на работающем сервере.",
		);
	}

	(
		request as unknown as { __denteIdentity?: RequestIdentity }
	).__denteIdentity = identity;

	// Совместимость: код, читающий request.user, продолжает работать.
	if (identity.organizationId) {
		(request as unknown as { user?: unknown }).user = {
			organizationId: identity.organizationId,
			id: identity.userId,
			role: identity.role,
			fullName: identity.fullName,
			canSignMedicalRecords: true,
			canManageMoney:
				identity.role === "owner" || identity.role === "administrator",
		};
	}
	return identity;
}

/**
 * Возвращает organizationId запроса или отправляет 401 и возвращает null.
 */
export function requireOrganizationId(
	request: FastifyRequest,
	reply: FastifyReply,
): string | null {
	const identity = getRequestIdentity(request);
	if (!identity.organizationId) {
		if (identityRejectionOf(request) === UNVERIFIED_MUTATION_REJECTION) {
			reply.code(401).send({
				error: "UnverifiedOrganizationCannotMutate",
				message:
					`Заголовок ${ORGANIZATION_HEADER} определяет клинику только для чтения и только в локальной разработке. ` +
					"Для изменения данных нужен подписанный токен рабочего кабинета.",
			});
			return null;
		}
		reply.code(401).send({
			error: "AuthRequired",
			message: "Требуется авторизация рабочего кабинета клиники.",
		});
		return null;
	}
	return identity.organizationId;
}

/**
 * Требует авторизованного сотрудника (не только токен кабинета).
 * Возвращает null и отправляет 401/403 при неудаче.
 */
export async function requireStaffIdentity(
	request: FastifyRequest,
	reply: FastifyReply,
	allowedRoles?: readonly StaffRole[],
): Promise<RequestIdentity | null> {
	const identity = getRequestIdentity(request);
	if (!identity.organizationId || !identity.userId) {
		reply.code(401).send({
			error: "AuthRequired",
			message: "Требуется вход сотрудника.",
		});
		return null;
	}
	if (allowedRoles && allowedRoles.length > 0) {
		const role = (identity.role ?? "").toLowerCase();
		if (!allowedRoles.some((allowed) => allowed.toLowerCase() === role)) {
			reply.code(403).send({
				error: "Forbidden",
				message: "Недостаточно прав для этой операции.",
			});
			return null;
		}
	}
	if (identity.sessionId) {
		const { db } = await import("../db/client.js");
		const { users } = await import("../db/schema.js");
		const { eq, and } = await import("drizzle-orm");
		const [user] = await db
			.select({ currentSessionId: users.currentSessionId })
			.from(users)
			.where(
				and(
					// biome-ignore lint/style/noNonNullAssertion: automated suppression
					eq(users.id, identity.userId!),
					// biome-ignore lint/style/noNonNullAssertion: automated suppression
					eq(users.organizationId, identity.organizationId!),
				),
			)
			.limit(1);

		if (
			user?.currentSessionId &&
			user.currentSessionId !== identity.sessionId
		) {
			reply.code(401).send({
				error: "invalid_session",
				message:
					"Выполнен вход с другого устройства. Текущая сессия завершена.",
			});
			return null;
		}
	}
	return identity;
}
