/**
 * unifiedAuthPerimeter.ts — Единый контур верификации личности, отзыва сессии,
 * RBAC-проверки прав и идемпотентного выполнения мутаций в транзакции.
 */

import { computePayloadHash } from "@dental/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { TenantDb } from "../db/client.js";
import { withTenantWriteCtx } from "../db/rls.js";
import {
	configuredClinicalAccessSecret,
	isDemoShowcaseMode,
	unguardedBypassAllowed,
} from "../accessGuard.js";
import {
	buildIdempotencyMemKey,
	cleanupOnUncaughtError,
	deleteInMemoryIdempotencyRecord,
	getInMemoryIdempotencyRecord,
	isLockStale,
	persistResponseOrEvictOnFailure,
	queryDatabaseIdempotencyRecord,
	reclaimStaleLock,
	recordInFlightToDatabase,
	setInMemoryIdempotencyRecord,
} from "../plugins/idempotencyModules/idempotencyStorageEngine.js";
import {
	extractIdempotencyKey,
	isValidUuid,
} from "../plugins/idempotencyModules/idempotencyHeaderParser.js";
import {
	handleCachedRecord,
	sendConflict,
} from "../plugins/idempotencyModules/idempotencyReplayResponder.js";
import { DEMO_SHOWCASE_ORG_ID } from "../services/demo/deepDemoSeeder.js";
import { timingSafeSecretEqual } from "../utils/timingSafeSecretEqual.js";
import {
	getRequestIdentity,
	getStaffSessionCacheStatsForTest,
	identityRejectionOf,
	invalidateStaffSessionCache,
	ORGANIZATION_HEADER,
	UNVERIFIED_MUTATION_REJECTION,
	verifyActiveStaffSession,
} from "./identity.js";
import {
	fetchRoleMatrixOverrides,
	type Permission,
	permissionRefusalMessage,
	roleHasPermissionWithOverrides,
} from "./permissionsModules/index.js";

export { getStaffSessionCacheStatsForTest, invalidateStaffSessionCache };

export interface VerifiedPrincipal {
	organizationId: string;
	userId: string | null;
	role: string;
	clinicalRole: string | null;
	canSignMedicalRecords: boolean;
	fullName: string | null;
	sessionId: string | null;
	authMode: "staff_token" | "clinic_token" | "demo_showcase" | "admin_secret";
}

export type PermissionRequirement =
	| Permission
	| "public"
	| { readonly anyOf: readonly Permission[] }
	| {
			readonly customCheck: (
				principal: VerifiedPrincipal,
				request: FastifyRequest,
				reply: FastifyReply,
			) => Promise<boolean> | boolean;
	  };

export interface PrincipalAuthOptions {
	requireStaffToken?: boolean | undefined;
	allowClinicTokenWithoutStaff?: boolean | undefined;
	allowAdminSecretBypass?: boolean | undefined;
	allowUnverifiedHeaderRead?: boolean | undefined;
	missingOrgPayload?: Record<string, unknown> | undefined;
	permissionDeniedCode?: string | undefined;
	permissionDeniedMessage?: string | undefined;
}

function readSingleHeader(
	request: FastifyRequest,
	headerName: string,
): string | null {
	const raw = request.headers[headerName.toLowerCase()];
	const val = Array.isArray(raw) ? raw[0] : raw;
	return typeof val === "string" && val.trim().length > 0 ? val.trim() : null;
}

function hasDemoShowcaseHeaders(request: FastifyRequest): boolean {
	if (!isDemoShowcaseMode()) return false;
	const clinic = readSingleHeader(request, "x-dente-clinic-token");
	if (
		clinic &&
		(clinic.startsWith("demo-showcase-token") ||
			clinic.startsWith("demo-showcase-clinic-token"))
	) {
		return true;
	}
	const staff = readSingleHeader(request, "x-dente-staff-token");
	return Boolean(
		staff &&
			(staff.startsWith("demo-showcase-staff-token") ||
				staff.startsWith("demo-token-")),
	);
}

function hasValidAdminSecret(request: FastifyRequest): boolean {
	const adminSecret = configuredClinicalAccessSecret();
	if (!adminSecret) {
		return unguardedBypassAllowed("DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS");
	}
	const provided =
		readSingleHeader(request, "x-dente-admin-secret") ??
		readSingleHeader(request, "x-admin-secret");
	return timingSafeSecretEqual(provided, adminSecret);
}

function isJsonRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function checkPermissionRequirement(
	principal: VerifiedPrincipal,
	requirement: PermissionRequirement,
	request: FastifyRequest,
	reply: FastifyReply,
	options?: PrincipalAuthOptions,
): Promise<boolean> {
	if (requirement === "public") return true;

	if (typeof requirement === "object" && "customCheck" in requirement) {
		let customSent = false;
		const origSend = reply.send.bind(reply);
		reply.send = ((...args: Parameters<FastifyReply["send"]>) => {
			customSent = true;
			return origSend(...args);
		}) as FastifyReply["send"];
		let allowed = false;
		try {
			allowed = await requirement.customCheck(principal, request, reply);
		} finally {
			reply.send = origSend;
		}
		if (!allowed && !customSent && !reply.sent) {
			reply.code(403).send({
				error: options?.permissionDeniedCode ?? "PermissionDenied",
				role: principal.role,
				message:
					options?.permissionDeniedMessage ??
					"Недостаточно прав для выполнения этого действия.",
			});
		}
		return allowed;
	}

	if (
		principal.authMode === "admin_secret" ||
		(options?.allowClinicTokenWithoutStaff === true &&
			principal.authMode === "clinic_token")
	) {
		return true;
	}

	const overrides = await fetchRoleMatrixOverrides(principal.organizationId);

	if (typeof requirement === "string") {
		if (roleHasPermissionWithOverrides(principal.role, requirement, overrides)) {
			return true;
		}
		reply.code(403).send({
			error: options?.permissionDeniedCode ?? "PermissionDenied",
			permission: requirement,
			role: principal.role,
			message:
				options?.permissionDeniedMessage ??
				permissionRefusalMessage(principal.role, requirement),
		});
		return false;
	}

	const allowedAny = requirement.anyOf.some((perm) =>
		roleHasPermissionWithOverrides(principal.role, perm, overrides),
	);
	if (allowedAny) return true;

	const primaryPerm = requirement.anyOf[0];
	reply.code(403).send({
		error: options?.permissionDeniedCode ?? "PermissionDenied",
		...(primaryPerm ? { permission: primaryPerm } : {}),
		role: principal.role,
		message:
			options?.permissionDeniedMessage ??
			(primaryPerm
				? permissionRefusalMessage(principal.role, primaryPerm)
				: "Недостаточно прав для выполнения этого действия."),
	});
	return false;
}

/**
 * Единая точка проверки аутентификации, отзыва сессии и RBAC-прав.
 * Возвращает VerifiedPrincipal или null (при возврате null ответ 401/403 уже отправлен).
 */
export async function requireVerifiedPrincipal(
	request: FastifyRequest,
	reply: FastifyReply,
	permission: PermissionRequirement,
	options?: PrincipalAuthOptions,
): Promise<VerifiedPrincipal | null> {
	const identity = getRequestIdentity(request);

	if (hasDemoShowcaseHeaders(request)) {
		const demoPrincipal: VerifiedPrincipal = {
			organizationId: identity.organizationId ?? DEMO_SHOWCASE_ORG_ID,
			userId: identity.userId,
			role: identity.role ?? "doctor",
			clinicalRole: identity.clinicalRole ?? null,
			canSignMedicalRecords: identity.canSignMedicalRecords ?? true,
			fullName: identity.fullName ?? null,
			sessionId: identity.sessionId ?? null,
			authMode: "demo_showcase",
		};
		const permitted = await checkPermissionRequirement(
			demoPrincipal,
			permission,
			request,
			reply,
			options,
		);
		return permitted ? demoPrincipal : null;
	}

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
		if (identity.userId || identity.verified || (options?.allowAdminSecretBypass === true && hasValidAdminSecret(request))) {
			reply.code(403).send(
				options?.missingOrgPayload ?? {
					error: "OrgRequired",
					message:
						"Не выбрана клиника. Войдите в рабочий кабинет клиники и повторите попытку.",
				},
			);
			return null;
		}
		reply.code(401).send({
			error: "AuthRequired",
			message: "Требуется авторизация рабочего кабинета клиники.",
		});
		return null;
	}

	if (!identity.verified && options?.allowUnverifiedHeaderRead !== true) {
		reply.code(401).send({
			error: "UnverifiedOrganizationCannotMutate",
			message:
				"Заголовок x-organization-id не подтверждён подписанным токеном клиники.",
		});
		return null;
	}

	if (identity.userId) {
		const sessionValid = await verifyActiveStaffSession(
			request,
			reply,
			identity.organizationId,
			identity.userId,
			identity.sessionId ?? null,
		);
		if (!sessionValid) return null;

		const staffPrincipal: VerifiedPrincipal = {
			organizationId: identity.organizationId,
			userId: identity.userId,
			role: identity.role ?? "unknown",
			clinicalRole: identity.clinicalRole ?? null,
			canSignMedicalRecords: Boolean(identity.canSignMedicalRecords),
			fullName: identity.fullName ?? null,
			sessionId: identity.sessionId ?? null,
			authMode: "staff_token",
		};
		const permitted = await checkPermissionRequirement(
			staffPrincipal,
			permission,
			request,
			reply,
			options,
		);
		return permitted ? staffPrincipal : null;
	}

	// Нет личного staffToken: проверяем admin secret или clinicToken
	if (options?.allowAdminSecretBypass === true && hasValidAdminSecret(request)) {
		const adminPrincipal: VerifiedPrincipal = {
			organizationId: identity.organizationId,
			userId: null,
			role: identity.role ?? "owner",
			clinicalRole: identity.clinicalRole ?? null,
			canSignMedicalRecords: Boolean(identity.canSignMedicalRecords),
			fullName: identity.fullName ?? null,
			sessionId: null,
			authMode: "admin_secret",
		};
		const permitted = await checkPermissionRequirement(
			adminPrincipal,
			permission,
			request,
			reply,
			options,
		);
		return permitted ? adminPrincipal : null;
	}

	if (options?.requireStaffToken === true) {
		reply.code(401).send({
			error: "StaffAuthRequired",
			message:
				"Требуется личная авторизация сотрудника (x-dente-staff-token).",
		});
		return null;
	}

	if (!identity.role && options?.allowClinicTokenWithoutStaff !== true) {
		reply.code(401).send({
			error: "StaffAuthRequired",
			message: "Требуется авторизация сотрудника клиники.",
		});
		return null;
	}

	const clinicPrincipal: VerifiedPrincipal = {
		organizationId: identity.organizationId,
		userId: null,
		role: identity.role ?? "clinic",
		clinicalRole: identity.clinicalRole ?? null,
		canSignMedicalRecords: Boolean(identity.canSignMedicalRecords),
		fullName: identity.fullName ?? null,
		sessionId: null,
		authMode: "clinic_token",
	};
	const permitted = await checkPermissionRequirement(
		clinicPrincipal,
		permission,
		request,
		reply,
		options,
	);
	return permitted ? clinicPrincipal : null;
}

export interface IdempotentMutationTxParams<TResult> {
	request: FastifyRequest;
	reply: FastifyReply;
	organizationId: string;
	requireHeader: boolean;
	execute: (tx: TenantDb, idempotencyKey: string | null) => Promise<TResult>;
}

/**
 * Выполняет мутацию внутри `withTenantWriteCtx` с поддержкой идемпотентности
 * (интеграция с глобальным `idempotencyPlugin` либо автономный цикл через
 * `idempotencyStorageEngine` при прямом тестировании маршрутов).
 */
export async function executeIdempotentMutationTx<TResult>(
	params: IdempotentMutationTxParams<TResult>,
): Promise<TResult | undefined> {
	const { request, reply, organizationId, requireHeader, execute } = params;

	// Если глобальный idempotencyPlugin уже захватил in_flight-запись и
	// повесил onSend/onError хуки, выполняем только ACID-транзакцию.
	if (request._idempotencyContext) {
		const activeKey = request._idempotencyContext.idempotencyKey;
		const result = await withTenantWriteCtx(organizationId, (tx) =>
			execute(tx, activeKey),
		);
		if (result !== undefined && !reply.sent) {
			reply.send(result);
		}
		return undefined;
	}

	const rawKey = extractIdempotencyKey(request);
	if (requireHeader && (!rawKey || !isValidUuid(rawKey))) {
		reply.code(400).send({
			error: "IdempotencyKeyRequired",
			message:
				"Idempotency-Key header (UUIDv7) is required for mutating requests",
		});
		return undefined;
	}

	if (!rawKey || !isValidUuid(rawKey)) {
		const result = await withTenantWriteCtx(organizationId, (tx) =>
			execute(tx, null),
		);
		if (result !== undefined && !reply.sent) {
			reply.send(result);
		}
		return undefined;
	}

	const payloadHash = computePayloadHash(request.body ?? {});
	const useDatabase =
		process.env.DENTAL_STATE_PERSISTENCE !== "off" &&
		isValidUuid(organizationId);
	const memScope = organizationId;
	const memKey = buildIdempotencyMemKey(memScope, rawKey);

	const existingMem = getInMemoryIdempotencyRecord(memKey);
	if (existingMem) {
		if (
			existingMem.action === "in_flight" &&
			Date.now() - existingMem.createdAt > 60_000
		) {
			deleteInMemoryIdempotencyRecord(memKey);
		} else {
			handleCachedRecord(reply, rawKey, payloadHash, existingMem, 1, () =>
				deleteInMemoryIdempotencyRecord(memKey),
			);
			return undefined;
		}
	}

	setInMemoryIdempotencyRecord(memKey, {
		idempotencyKey: rawKey,
		payloadHash,
		responseStatus: 0,
		responseJson: null,
		action: "in_flight",
		createdAt: Date.now(),
	});

	if (useDatabase) {
		const dbRes = await queryDatabaseIdempotencyRecord(organizationId, rawKey);
		if (dbRes.existingIdemKey) {
			const record = dbRes.existingIdemKey;
			if (record.status === "in_flight" && isLockStale(record.lockedAt)) {
				await reclaimStaleLock(organizationId, rawKey, payloadHash);
			} else {
				deleteInMemoryIdempotencyRecord(memKey);
				handleCachedRecord(reply, rawKey, payloadHash, record, 1);
				return undefined;
			}
		} else if (dbRes.existingSyncRecord) {
			deleteInMemoryIdempotencyRecord(memKey);
			handleCachedRecord(reply, rawKey, payloadHash, dbRes.existingSyncRecord, 1);
			return undefined;
		}

		const lockRes = await recordInFlightToDatabase(
			organizationId,
			rawKey,
			payloadHash,
		);
		if (!lockRes.success && lockRes.isConflict) {
			deleteInMemoryIdempotencyRecord(memKey);
			sendConflict(reply, rawKey, "in_flight", 1);
			return undefined;
		}
	}

	const idemCtx = {
		idempotencyKey: rawKey,
		organizationId,
		memScope,
		payloadHash,
		useDatabase,
	};

	let result: TResult;
	try {
		result = await withTenantWriteCtx(organizationId, (tx) =>
			execute(tx, rawKey),
		);
	} catch (err) {
		await cleanupOnUncaughtError(idemCtx);
		throw err;
	}

	const statusCode = reply.statusCode || 200;
	const parsedJson = isJsonRecord(result) ? result : null;

	await persistResponseOrEvictOnFailure(idemCtx, statusCode, parsedJson, (d, m) =>
		request.log.error(d, m),
	);

	if (result !== undefined && !reply.sent) {
		reply.header("X-Idempotency-Key", rawKey);
		reply.header("Idempotency-Key", rawKey);
		reply.send(result);
	}

	return result;
}
