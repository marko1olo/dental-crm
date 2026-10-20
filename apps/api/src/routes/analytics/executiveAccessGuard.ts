import type { FastifyReply, FastifyRequest } from "fastify";
import {
	configuredClinicalAccessSecret,
	requireResolvedOrganizationId,
	unguardedBypassAllowed,
} from "../../accessGuard.js";
import { getRequestIdentity } from "../../security/identity.js";
import { roleHasPermission } from "../../security/permissions.js";
import { timingSafeSecretEqual } from "../../utils/timingSafeSecretEqual.js";

const EXECUTIVE_ROLES = new Set([
	"owner",
	"admin",
	"manager",
	"director",
	"chief_doctor",
	"head_doctor",
	"administrator",
	"curator",
	"doctor", // Соло-врач (Мандаты 8e, 8n)
]);

export async function requireExecutiveAccess(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<string | null> {
	const orgId = await requireResolvedOrganizationId(request, reply, "executive analytics");
	if (!orgId) return null;

	const providedSecret = request.headers["x-dente-admin-secret"];
	const normalizedProvidedSecret = Array.isArray(providedSecret) ? providedSecret[0] : providedSecret;
	const adminSecret = configuredClinicalAccessSecret();
	if (
		adminSecret &&
		timingSafeSecretEqual(
			typeof normalizedProvidedSecret === "string" ? normalizedProvidedSecret : null,
			adminSecret,
		)
	) {
		return orgId;
	}

	const identity = getRequestIdentity(request);
	if (identity.userId) {
		const role = (identity.role ?? "").toLowerCase();
		if (EXECUTIVE_ROLES.has(role) || roleHasPermission(role, "analytics.read")) {
			return orgId;
		}

		reply.code(403).send({
			error: "PermissionDenied",
			message: "Недостаточно прав для просмотра аналитики руководителя клиники.",
		});
		return null;
	}

	if (unguardedBypassAllowed("DENTE_CLINICAL_ALLOW_UNGUARDED_READS")) {
		return orgId;
	}

	reply.code(401).send({
		error: "StaffAuthRequired",
		message: "Требуется вход управляющего, старшего врача или владельца клиники.",
	});
	return null;
}
