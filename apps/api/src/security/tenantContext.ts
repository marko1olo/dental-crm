import type { FastifyReply, FastifyRequest } from "fastify";
import {
	getRequestIdentity,
	requireOrganizationId as requireVerifiedOrganizationId,
} from "./identity.js";
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
): Promise<{ organizationId: string } | null> {
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

	return { organizationId };
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
