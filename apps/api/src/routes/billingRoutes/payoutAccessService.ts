import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalReadAccess } from "../../accessGuard.js";
import { getRequestIdentity } from "../../security/identity.js";
import {
	permissionRefusalMessage,
	roleHasPermission,
} from "../../security/permissions.js";
import type { PayoutAccess } from "./types.js";

/**
 * Access control for doctor payout data.
 * Requires verified staff identity and payroll.read / payroll.read.own permissions.
 */
export async function requirePayoutAccess(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<PayoutAccess | null> {
	if (
		!(await requireClinicalReadAccess(request, reply, "billing payouts read"))
	)
		return null;

	const identity = getRequestIdentity(request);
	if (!identity.organizationId) {
		reply.code(401).send({
			error: "AuthRequired",
			message:
				"Требуется авторизация рабочего кабинета клиники: расчёт выплат считается по одной клинике.",
		});
		return null;
	}

	if (!identity.verified) {
		reply.code(401).send({
			error: "VerifiedOrganizationRequired",
			message:
				"Клиника определена не подписанным токеном, а заголовком разработки. " +
				"Зарплатные данные по такому запросу не отдаются: войдите в рабочий кабинет клиники.",
		});
		return null;
	}

	if (!identity.userId || !identity.role) {
		reply.code(401).send({
			error: "StaffAuthRequired",
			message:
				"Нужен вход сотрудника: расчёт выплат показывает зарплату конкретных врачей, " +
				"и сервер обязан знать, кто именно смотрит.",
		});
		return null;
	}

	if (roleHasPermission(identity.role, "payroll.read")) {
		return {
			organizationId: identity.organizationId,
			userId: identity.userId,
			role: identity.role,
			scope: "all",
		};
	}
	if (roleHasPermission(identity.role, "payroll.read.own")) {
		return {
			organizationId: identity.organizationId,
			userId: identity.userId,
			role: identity.role,
			scope: "own",
		};
	}

	reply.code(403).send({
		error: "PermissionDenied",
		permission: "payroll.read",
		role: identity.role,
		message: permissionRefusalMessage(identity.role, "payroll.read"),
	});
	return null;
}
