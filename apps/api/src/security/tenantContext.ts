import type { FastifyReply, FastifyRequest } from "fastify";
import {
	getRequestIdentity,
	requireOrganizationId as requireVerifiedOrganizationId,
} from "./identity.js";
import { evaluateClinicalAccess } from "./medicalSecrecyWarden.js";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
} from "../accessGuard.js";

/**
 * tenantContext.ts — SSOT Контекста тенанта (организации)
 *
 * Безопасность и изоляция тенантов:
 * organizationId берется СТРОГО из проверенного JWT-токена (requestIdentity.verified === true).
 * Запрещено принимать organizationId из незащищенных заголовков или body.
 */

export async function requireClinicalReadContext(
	request: FastifyRequest,
	reply: FastifyReply,
	protectedArea = "clinical read",
): Promise<{ organizationId: string; userId: string | null; role: string | null } | null> {
	if (!(await requireClinicalReadAccess(request, reply, protectedArea))) {
		return null;
	}
	const organizationId = await requireVerifiedOrganizationId(
		request,
		reply,
	);
	if (!organizationId) return null;

	const identity = getRequestIdentity(request);
	if (!identity.verified) {
		reply.code(401).send({
			error: "UnverifiedOrganizationNotAllowed",
			message:
				"Для доступа к защищенным клиническим данным требуется проверенный токен авторизации.",
			protectedArea,
		});
		return null;
	}

	return { organizationId, userId: identity.userId ?? null, role: identity.role ?? null };
}

export async function requireClinicalMutationContext(
	request: FastifyRequest,
	reply: FastifyReply,
	protectedArea = "clinical mutation",
): Promise<{ organizationId: string } | null> {
	if (!(await requireClinicalMutationAccess(request, reply, protectedArea))) {
		return null;
	}
	const organizationId = await requireVerifiedOrganizationId(
		request,
		reply,
	);
	if (!organizationId) return null;

	const identity = getRequestIdentity(request);
	if (!identity.verified) {
		reply.code(401).send({
			error: "UnverifiedOrganizationCannotMutate",
			message:
				"Для изменения защищенных данных требуется проверенный токен авторизации рабочего кабинета.",
			protectedArea,
		});
		return null;
	}

	return { organizationId };
}

/**
 * Enforces 152-FZ / 323-FZ clinical secrecy when a staff identity is attached
 * to the request. Bare clinic tokens (without staff userId/role) remain gated
 * by `requireClinicalReadContext` / `requireClinicalMutationContext` admin-secret rules.
 */
export function ensureClinicalStaffAccess(
	request: FastifyRequest,
	reply: FastifyReply,
	areaLabel = "клинической записи приёма",
): boolean {
	const identity = getRequestIdentity(request);
	const staffRole = identity.role ?? request.user?.role ?? null;
	if (staffRole === null && identity.userId === null) {
		return true;
	}
	const clinicalAccess = evaluateClinicalAccess(staffRole, {
		clinicalRole: identity.clinicalRole,
		canSignMedicalRecords: identity.canSignMedicalRecords,
		specialties: identity.specialties,
	});
	if (!clinicalAccess.hasClinicalAccess) {
		reply.code(403).send({
			error: "ClinicalAccessDenied",
			reason: "medical_secrecy_role_denied",
			role: staffRole,
			message: `Доступ к ${areaLabel} запрещён: ${clinicalAccess.reason}`,
		});
		return false;
	}
	return true;
}
