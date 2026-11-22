import type { FastifyReply, FastifyRequest } from "fastify";
import { eq } from "drizzle-orm";
import {
	configuredClinicalAccessSecret,
	requireResolvedOrganizationId,
	unguardedBypassAllowed,
} from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { organizations } from "../../db/schema/auth.js";
import { getRequestIdentity } from "../../security/identity.js";
import {
	roleHasPermission,
	roleHasPermissionWithOverrides,
} from "../../security/permissions.js";
import { fetchRoleMatrixOverrides } from "../../security/permissionsModules/permissionGuards.js";
import { timingSafeSecretEqual } from "../../utils/timingSafeSecretEqual.js";

const EXECUTIVE_ROLES = new Set([
	"owner",
	"admin",
	"manager",
	"director",
	"chief_doctor",
	"head_doctor",
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
		if (EXECUTIVE_ROLES.has(role)) {
			return orgId;
		}

		const overrides = await fetchRoleMatrixOverrides(orgId);
		const doctorOverrides = overrides?.[role] ?? (role === "doctor" ? overrides?.doctor : undefined);
		const hasExplicitPnlOrAnalytics =
			doctorOverrides?.["finance.reports_pnl"] === true ||
			doctorOverrides?.["finance.reports_pnl"] === "full" ||
			doctorOverrides?.["finance.reports_pnl"] === "read" ||
			doctorOverrides?.["analytics.read"] === true ||
			doctorOverrides?.["analytics.read"] === "full" ||
			doctorOverrides?.["analytics.read"] === "read" ||
			roleHasPermissionWithOverrides(role, "analytics.read", overrides);

		if (role === "doctor") {
			if (hasExplicitPnlOrAnalytics) {
				return orgId;
			}

			// Разрешаем соло-врачам (Мандаты 8e, 8n) только в соло-режимах
			try {
				const [orgRecord] = await db
					.select({ clinicMode: organizations.clinicMode })
					.from(organizations)
					.where(eq(organizations.id, orgId))
					.limit(1);

				const mode = orgRecord?.clinicMode;
				if (mode === "solo_doctor" || mode === "one_chair") {
					return orgId;
				}
			} catch (dbErr) {
				request.log?.warn?.({ err: dbErr, orgId }, "Failed to query clinicMode in requireExecutiveAccess");
			}

			reply.code(403).send({
				error: "PermissionDenied",
				message: "Недостаточно прав для просмотра аналитики руководителя клиники.",
			});
			return null;
		}

		if (hasExplicitPnlOrAnalytics) {
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
