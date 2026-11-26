/**
 * identity.ts — единая точка определения "кто прислал запрос".
 *
 * Организация и личность сотрудника определяются ТОЛЬКО из подписанного токена.
 * Непроверенная организация из dev-заголовка действует только на чтение в dev-режиме.
 */

import type { FastifyReply, FastifyRequest } from "fastify";
import { BoundedTtlMap } from "../lib/boundedTtlMap.js";
import { verifyToken } from "../utils/cryptoHelper.js";
import { timingSafeSecretEqual } from "../utils/timingSafeSecretEqual.js";
import { authTokenSecret, clinicalAdminSecret } from "./authSecret.js";
import { namedDevelopmentModeActive } from "./bypass.js";
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
	identityRejectionOf,
	ORGANIZATION_HEADER,
	STAFF_TOKEN_HEADER,
	UNVERIFIED_MUTATION_REJECTION,
	type ClinicSession,
	type IdentityRejection,
	type RequestIdentity,
	type StaffMemberContext,
	type StaffRole,
};

declare module "fastify" {
	interface FastifyRequest {
		__denteIdentity?: RequestIdentity;
		user?: { id: string; role?: string; organizationId?: string; [key: string]: unknown };
	}
}

/**
 * Разбирает токены клиники и сотрудника без привязки к объекту HTTP-запроса.
 * Используется в HTTP-хэндлерах и полнодуплексных WebSocket-соединениях.
 */
export function resolveIdentityFromTokens(
	clinicToken?: string | null,
	staffToken?: string | null,
): RequestIdentity {
	let identity: RequestIdentity = { ...EMPTY_IDENTITY };

	let secret: string;
	try {
		secret = authTokenSecret();
	} catch {
		// Секрет не настроен в production — токены не принимаем вовсе.
		return identity;
	}

	const demoIdentity = resolveDemoTokenIdentity(
		clinicToken ?? null,
		staffToken ?? null,
	);
	if (demoIdentity) {
		identity = { ...identity, ...demoIdentity };
	} else {
		const clinicPayload = clinicToken ? verifyToken(clinicToken, secret) : null;
		const staffPayload = staffToken ? verifyToken(staffToken, secret) : null;

		if (clinicPayload && typeof clinicPayload.organizationId === "string") {
			identity.organizationId = clinicPayload.organizationId;
			identity.verified = true;
			if (!identity.role && typeof clinicPayload.role === "string") {
				identity.role = clinicPayload.role;
			}
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
				if (typeof staffPayload.clinicalRole === "string") {
					identity.clinicalRole = staffPayload.clinicalRole;
				}
				if (typeof staffPayload.canSignMedicalRecords === "boolean") {
					identity.canSignMedicalRecords = staffPayload.canSignMedicalRecords;
				}
				if (Array.isArray(staffPayload.specialties)) {
					identity.specialties = staffPayload.specialties.filter(
						(item): item is string => typeof item === "string",
					);
				}
			}
		}
	}

	return identity;
}

/**
 * Разбирает токены запроса. Результат кэшируется на объекте request,
 * чтобы не пересчитывать HMAC на каждой проверке внутри одного запроса.
 */
export function getRequestIdentity(request: FastifyRequest): RequestIdentity {
	const cached = request.__denteIdentity;
	if (cached) return cached;

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

	let identity = resolveIdentityFromTokens(clinicToken, staffToken);

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
		request.log?.warn?.(
			`[security] Заголовок ${ORGANIZATION_HEADER} отклонён для ${request.method} ${request.url}: ` +
				"непроверенная организация не может изменять данные на работающем сервере.",
		);
	}

	request.__denteIdentity = identity;

	// Совместимость: код, читающий request.user, продолжает работать.
	if (identity.organizationId) {
		const normalizedRole = identity.role?.trim().toLowerCase();
		const isDefaultClinicalSigner =
			normalizedRole === "owner" || normalizedRole === "doctor";
		request.user = {
			organizationId: identity.organizationId,
			id: identity.userId ?? "",
			...(identity.role ? { role: identity.role } : {}),
			fullName: identity.fullName,
			canSignMedicalRecords:
				identity.canSignMedicalRecords ?? isDefaultClinicalSigner,
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

const UUID_FORMAT_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function hasTrustedBypassForSessionCheck(request: FastifyRequest): boolean {
	if (namedDevelopmentModeActive()) {
		const clinicHeader = headerValue(request, CLINIC_TOKEN_HEADER);
		if (
			clinicHeader &&
			(clinicHeader.startsWith("demo-showcase-token") ||
				clinicHeader.startsWith("demo-showcase-clinic-token"))
		) {
			return true;
		}
	}
	const adminSecretHeader =
		headerValue(request, "x-dente-admin-secret") ??
		headerValue(request, "x-admin-secret");
	if (!adminSecretHeader) return false;
	const configuredSecret = clinicalAdminSecret();
	if (
		configuredSecret &&
		timingSafeSecretEqual(adminSecretHeader, configuredSecret)
	) {
		return true;
	}
	return (
		namedDevelopmentModeActive() &&
		(adminSecretHeader === "dente-local-dev-secret" ||
			adminSecretHeader === "dev-secret" ||
			adminSecretHeader === "synthetic-clinical-secret" ||
			adminSecretHeader === "synthetic-schedule-secret" ||
			adminSecretHeader === "test_secret_or_allow")
	);
}

interface CachedStaffSessionState {
	found: boolean;
	currentSessionId: string | null;
	isActive: boolean;
}

const STAFF_SESSION_CACHE_TTL_MS = 30_000;
const STAFF_SESSION_CACHE_MAX_ENTRIES = 5_000;

const staffSessionCache = new BoundedTtlMap<string, CachedStaffSessionState>({
	maxEntries: STAFF_SESSION_CACHE_MAX_ENTRIES,
	ttlMs: STAFF_SESSION_CACHE_TTL_MS,
});

function staffSessionCacheKey(organizationId: string | null, userId: string): string {
	return `${organizationId ?? "__global__"}:${userId}`;
}

/**
 * Немедленно сбрасывает 30s TTL-кэш активной сессии при логине, логауте,
 * принудительном отзыве, деактивации сотрудника или смене пароля/PIN.
 */
export function invalidateStaffSessionCache(
	userId?: string | null,
	organizationId?: string | null,
): void {
	if (!userId && !organizationId) {
		staffSessionCache.clear();
		return;
	}
	if (userId) {
		const suffix = `:${userId}`;
		for (const key of Array.from(staffSessionCache.keys())) {
			if (key.endsWith(suffix)) {
				staffSessionCache.delete(key);
			}
		}
		return;
	}
	if (organizationId) {
		const prefix = `${organizationId}:`;
		for (const key of Array.from(staffSessionCache.keys())) {
			if (key.startsWith(prefix)) {
				staffSessionCache.delete(key);
			}
		}
	}
}

export function getStaffSessionCacheStatsForTest(): { size: number } {
	return { size: staffSessionCache.size };
}

async function fetchStaffSessionState(
	organizationId: string | null,
	userId: string,
	hasValidUuidOrg: boolean,
): Promise<CachedStaffSessionState> {
	const cacheKey = staffSessionCacheKey(
		organizationId && hasValidUuidOrg ? organizationId : null,
		userId,
	);
	const cached = staffSessionCache.get(cacheKey);
	if (cached) {
		return cached;
	}

	const { withSuperuserBypass, withTenantReadCtx } = await import("../db/rls.js");
	const { users } = await import("../db/schema.js");
	const { eq, and } = await import("drizzle-orm");
	const [user] =
		organizationId && hasValidUuidOrg
			? await withTenantReadCtx(organizationId, async (tx) =>
					tx
						.select({
							currentSessionId: users.currentSessionId,
							isActive: users.isActive,
						})
						.from(users)
						.where(
							and(
								eq(users.id, userId),
								eq(users.organizationId, organizationId),
							),
						)
						.limit(1),
				)
			: await withSuperuserBypass(async (tx) =>
					tx
						.select({
							currentSessionId: users.currentSessionId,
							isActive: users.isActive,
						})
						.from(users)
						.where(eq(users.id, userId))
						.limit(1),
				);

	const state: CachedStaffSessionState = {
		found: Boolean(user),
		currentSessionId: user?.currentSessionId ?? null,
		isActive: user?.isActive ?? true,
	};
	staffSessionCache.set(cacheKey, state);
	return state;
}

function sendInvalidSession(reply: FastifyReply): false {
	reply.code(401).send({
		error: "invalid_session",
		message:
			"Выполнен вход с другого устройства. Текущая сессия завершена.",
	});
	return false;
}

/**
 * Проверяет актуальность сессии сотрудника в БД (с 30s TTL-кэшем BoundedTtlMap
 * и немедленной инвалидацией при logout/отзыве).
 * Отклоняет не только несовпадающий sessionId и неактивных сотрудников, но и старые токены
 * без sessionId, если в БД у пользователя уже зафиксирована активная сессия (currentSessionId !== null).
 */
export async function verifyActiveStaffSession(
	request: FastifyRequest,
	reply: FastifyReply,
	organizationId: string | null,
	userId: string,
	sessionId: string | null,
): Promise<boolean> {
	const hasValidUuidUser = UUID_FORMAT_RE.test(userId);
	const hasValidUuidOrg = organizationId
		? UUID_FORMAT_RE.test(organizationId)
		: false;

	if (sessionId) {
		if (!hasValidUuidUser || (organizationId && !hasValidUuidOrg)) {
			return sendInvalidSession(reply);
		}
		const state = await fetchStaffSessionState(
			organizationId,
			userId,
			hasValidUuidOrg,
		);
		if (!state.found || !state.isActive || !state.currentSessionId || state.currentSessionId !== sessionId) {
			return sendInvalidSession(reply);
		}
		return true;
	}

	if (hasTrustedBypassForSessionCheck(request) || !hasValidUuidUser) {
		return true;
	}

	const state = await fetchStaffSessionState(
		organizationId,
		userId,
		hasValidUuidOrg,
	);
	if (state.found && (!state.isActive || state.currentSessionId)) {
		return sendInvalidSession(reply);
	}
	return true;
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
			message: "Требуется вход сотрудника.",
		});
		return null;
	}
	if (!identity.verified) {
		reply.code(401).send({
			error: "UnverifiedOrganizationCannotMutate",
			message:
				`Заголовок ${ORGANIZATION_HEADER} не подтверждён подписанным токеном клиники.`,
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
	const sessionOk = await verifyActiveStaffSession(
		request,
		reply,
		identity.organizationId,
		identity.userId,
		identity.sessionId,
	);
	if (!sessionOk) {
		return null;
	}
	return identity;
}
