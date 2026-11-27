import type { FastifyReply, FastifyRequest } from "fastify";
import { authTokenSecret, clinicalAdminSecret } from "./security/authSecret.js";
import {
	getRequestIdentity,
	identityRejectionOf,
	ORGANIZATION_HEADER,
	requireOrganizationId as requireVerifiedOrganizationId,
	UNVERIFIED_MUTATION_REJECTION,
	verifyActiveStaffSession,
} from "./security/identity.js";
import { timingSafeSecretEqual } from "./utils/timingSafeSecretEqual.js";

export const denteAdminSecretHeader = "x-dente-admin-secret";

export function configuredClinicalAccessSecret(): string | null {
	return clinicalAdminSecret();
}

export function configuredClinicalMutationSecret(): string | null {
	return configuredClinicalAccessSecret();
}

import {
	namedDevelopmentModeActive,
	unguardedBypassAllowed,
} from "./security/bypass.js";

export { namedDevelopmentModeActive, unguardedBypassAllowed };

export function isDemoShowcaseMode(): boolean {
	if (!namedDevelopmentModeActive()) {
		return false;
	}
	return (
		unguardedBypassAllowed("DENTE_ALLOW_DEMO_LOGIN") ||
		process.env.DENTE_DEMO_MODE === "1" ||
		process.env.DENTE_DEMO_SHOWCASE === "true"
	);
}

function clinicalMutationsUnguardedAllowed(): boolean {
	return unguardedBypassAllowed("DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS");
}

function clinicalReadsUnguardedAllowed(): boolean {
	return unguardedBypassAllowed("DENTE_CLINICAL_ALLOW_UNGUARDED_READS");
}

function isDemoShowcaseTokenRequest(request: FastifyRequest): boolean {
	if (!isDemoShowcaseMode()) {
		return false;
	}
	const clinicHeader = request.headers["x-dente-clinic-token"];
	const clinicToken = Array.isArray(clinicHeader)
		? clinicHeader[0]
		: clinicHeader;
	if (
		typeof clinicToken === "string" &&
		(clinicToken.startsWith("demo-showcase-token") ||
			clinicToken.startsWith("demo-showcase-clinic-token"))
	) {
		return true;
	}

	const staffHeader = request.headers["x-dente-staff-token"];
	const staffToken = Array.isArray(staffHeader)
		? staffHeader[0]
		: staffHeader;
	if (
		typeof staffToken === "string" &&
		(staffToken.startsWith("demo-showcase-staff-token") ||
			staffToken.startsWith("demo-token-"))
	) {
		return true;
	}

	return false;
}

export async function requireClinicalMutationAccess(
	request: FastifyRequest,
	reply: FastifyReply,
	protectedArea = "clinical mutation",
): Promise<boolean> {
	if (isDemoShowcaseTokenRequest(request)) {
		return true;
	}

	const identity = getRequestIdentity(request);
	if (
		identity.verified &&
		identity.organizationId &&
		(identity.userId || identity.role)
	) {
		if (identity.userId) {
			return await verifyActiveStaffSession(
				request,
				reply,
				identity.organizationId,
				identity.userId,
				identity.sessionId,
			);
		}
		return true;
	}

	const adminSecret = configuredClinicalMutationSecret();
	if (!adminSecret) {
		if (clinicalMutationsUnguardedAllowed()) return true;
		reply.code(503).send({
			error: "ClinicalAdminSecretMissing",
			message:
				"На сервере не задан секрет администратора клиники для изменения защищенных данных.",
			protectedArea,
		});
		return false;
	}

	const providedSecret = request.headers[denteAdminSecretHeader];
	const normalizedProvidedSecret = Array.isArray(providedSecret)
		? providedSecret[0]
		: providedSecret;
	if (
		timingSafeSecretEqual(
			typeof normalizedProvidedSecret === "string"
				? normalizedProvidedSecret
				: null,
			adminSecret,
		)
	) {
		return true;
	}

	reply.code(403).send({
		error: "ClinicalAdminSecretRequired",
		message:
			"Нужен действующий секрет администратора клиники для изменения защищенных данных.",
		protectedArea,
	});
	return false;
}

export function configuredSuperadminSecret(): string | null {
	const explicit = process.env.DENTE_SUPERADMIN_SECRET?.trim();
	return explicit || configuredClinicalMutationSecret();
}

export async function requireSuperadmin(
	request: FastifyRequest,
	reply: FastifyReply,
	protectedArea = "superadmin action",
): Promise<boolean> {
	const superadminSecret = configuredSuperadminSecret();
	const explicitSuperadminSecret =
		process.env.DENTE_SUPERADMIN_SECRET?.trim() || null;
	const providedSuperadmin = request.headers["x-dente-superadmin-secret"];
	const providedAdmin = request.headers[denteAdminSecretHeader];
	const candidateSecret =
		(Array.isArray(providedSuperadmin)
			? providedSuperadmin[0]
			: providedSuperadmin) ??
		(Array.isArray(providedAdmin) ? providedAdmin[0] : providedAdmin);

	if (
		superadminSecret &&
		timingSafeSecretEqual(
			typeof candidateSecret === "string" ? candidateSecret : null,
			superadminSecret,
		)
	) {
		return true;
	}

	const identity = getRequestIdentity(request);
	if (
		identity.verified &&
		(identity.role === "superadmin" ||
			(!explicitSuperadminSecret && identity.role === "owner"))
	) {
		return true;
	}

	if (!superadminSecret) {
		if (clinicalMutationsUnguardedAllowed()) return true;
		reply.code(503).send({
			error: "ClinicalAdminSecretMissing",
			message:
				"На сервере не задан секрет суперадминистратора для выполнения системной операции.",
			protectedArea,
		});
		return false;
	}

	reply.code(403).send({
		error: "ClinicalAdminSecretRequired",
		message:
			"Требуются права суперадминистратора или действующий секрет администратора.",
		protectedArea,
	});
	return false;
}

export async function requireClinicalReadAccess(
	request: FastifyRequest,
	reply: FastifyReply,
	protectedArea = "clinical read",
): Promise<boolean> {
	if (isDemoShowcaseTokenRequest(request)) {
		return true;
	}

	const identity = getRequestIdentity(request);
	if (
		identity.verified &&
		identity.organizationId &&
		(identity.userId || identity.role)
	) {
		if (identity.userId) {
			return await verifyActiveStaffSession(
				request,
				reply,
				identity.organizationId,
				identity.userId,
				identity.sessionId,
			);
		}
		return true;
	}

	const adminSecret = configuredClinicalAccessSecret();
	if (!adminSecret) {
		if (clinicalReadsUnguardedAllowed()) return true;
		reply.code(503).send({
			error: "ClinicalReadSecretMissing",
			message:
				"На сервере не задан секрет администратора клиники для просмотра защищенных данных.",
			protectedArea,
		});
		return false;
	}

	const providedSecret = request.headers[denteAdminSecretHeader];
	const normalizedProvidedSecret = Array.isArray(providedSecret)
		? providedSecret[0]
		: providedSecret;
	if (
		timingSafeSecretEqual(
			typeof normalizedProvidedSecret === "string"
				? normalizedProvidedSecret
				: null,
			adminSecret,
		)
	) {
		return true;
	}

	reply.code(403).send({
		error: "ClinicalReadSecretRequired",
		message:
			"Нужен действующий секрет администратора клиники для просмотра защищенных данных.",
		protectedArea,
	});
	return false;
}

/**
 * Определяет организацию запроса.
 *
 * БЕЗОПАСНОСТЬ: организация берётся ТОЛЬКО из подписанного токена
 * (x-dente-clinic-token / x-dente-staff-token). Заголовок x-organization-id
 * больше не является источником истины — раньше любой клиент мог подставить
 * чужой UUID и прочитать карты пациентов другой клиники (IDOR / нарушение
 * изоляции арендаторов). Заголовок работает только в dev при явном
 * DENTE_DEV_ALLOW_HEADER_ORG=1 (см. security/identity.ts).
 */
export async function resolveOrganizationId(
	request: FastifyRequest,
): Promise<string | null> {
	return getRequestIdentity(request).organizationId;
}

/**
 * Возвращает organizationId из проверенного токена либо отправляет 401.
 */
export async function requireResolvedOrganizationId(
	request: FastifyRequest,
	reply: FastifyReply,
	_protectedArea?: string,
): Promise<string | null> {
	const orgId = requireVerifiedOrganizationId(request, reply);
	if (!orgId) return null;

	const identity = getRequestIdentity(request);
	if (identity.verified && identity.userId) {
		const sessionOk = await verifyActiveStaffSession(
			request,
			reply,
			orgId,
			identity.userId,
			identity.sessionId,
		);
		if (!sessionOk) return null;
	}
	return orgId;
}

/**
 * requireResolvedStaffOrAdminOrganizationId — как requireResolvedOrganizationId,
 * но дополнительно требует авторизованного сотрудника (не только токен кабинета).
 */
export async function requireResolvedStaffOrAdminOrganizationId(
	request: FastifyRequest,
	reply: FastifyReply,
	_protectedArea?: string,
): Promise<string | null> {
	const { organizationId, userId, sessionId, verified } =
		getRequestIdentity(request);
	if (!organizationId) {
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
	if (!verified) {
		reply.code(401).send({
			error: "UnverifiedOrganizationCannotMutate",
			message:
				`Заголовок ${ORGANIZATION_HEADER} не подтверждён подписанным токеном клиники.`,
		});
		return null;
	}
	if (!userId) {
		reply.code(401).send({
			error: "StaffAuthRequired",
			message: "Требуется вход сотрудника.",
		});
		return null;
	}

	const sessionOk = await verifyActiveStaffSession(
		request,
		reply,
		organizationId,
		userId,
		sessionId,
	);
	if (!sessionOk) {
		return null;
	}

	return organizationId;
}

/**
 * Требует авторизованного сотрудника и возвращает его userId.
 */
async function _requireResolvedStaffUserId(
	request: FastifyRequest,
	reply: FastifyReply,
	_protectedArea?: string,
): Promise<string | null> {
	const { userId, organizationId, sessionId, verified } =
		getRequestIdentity(request);
	if (!userId) {
		reply.code(401).send({
			error: "StaffAuthRequired",
			message: "Требуется вход сотрудника.",
		});
		return null;
	}
	if (!verified) {
		reply.code(401).send({
			error: "UnverifiedOrganizationCannotMutate",
			message:
				`Заголовок ${ORGANIZATION_HEADER} не подтверждён подписанным токеном клиники.`,
		});
		return null;
	}

	const sessionOk = await verifyActiveStaffSession(
		request,
		reply,
		organizationId,
		userId,
		sessionId,
	);
	if (!sessionOk) {
		return null;
	}

	return userId;
}

export {
	requireClinicalReadContext,
	requireClinicalMutationContext,
} from "./security/tenantContext.js";

/**
 * requireNonDoctorAccess — allows any authenticated non-doctor (admin, staff)
 * through. Doctors are restricted from certain write routes.
 *
 * ТЕКСТ ОТКАЗА. Раньше здесь стояло
 * `Доктора не могут выполнять это действие: ${protectedArea}`, а protectedArea —
 * это машинная метка участка (`non-doctor mutation`). Врач получал латинский
 * хвост вместо следующего шага, и вдобавок латинское слово из шести и более букв
 * целиком гасит фразу фильтром клиента (`apps/web/src/AppHelpers.tsx`,
 * `technicalWorkflowFailurePattern` под флагом `/i`) — на экране не оставалось
 * ничего, кроме подсказки по коду 403 «войдите в смену заново», которая врачу не
 * поможет никогда: повторный вход роль не меняет.
 *
 * Метка участка не выброшена, а вынесена в отдельное машинное поле — она нужна в
 * журнале и разработчику, но не человеку. Причина в тексте названа ровно та,
 * которую сервер знает: действие закрыто для роли «врач». Обещать, что у
 * администратора оно точно пройдёт, нельзя — за этой проверкой стоит ещё секрет
 * администратора клиники, поэтому текст просит обратиться, а не гарантирует
 * успех.
 */
export async function requireNonDoctorAccess(
	request: FastifyRequest,
	reply: FastifyReply,
	protectedArea = "non-doctor mutation",
): Promise<boolean> {
	const identity = getRequestIdentity(request);
	if (identity.role === "doctor") {
		reply.code(403).send({
			error: "DoctorsNotAllowed",
			protectedArea,
			message:
				"Врачам это действие в программе клиники закрыто. " +
				"Попросите администратора ресепшена, управляющего или владельца клиники выполнить его.",
		});
		return false;
	}
	return requireClinicalMutationAccess(request, reply, protectedArea);
}

/**
 * Секрет подписи токенов. Делегирует в единственный источник истины
 * (security/authSecret.ts), который падает в production, если секрет не задан.
 * Раньше здесь был публичный литерал "dente-fallback-secret-2026", позволявший
 * подделать токен любой клиники.
 */
export function requireAuthTokenSecret(): string {
	return authTokenSecret();
}
