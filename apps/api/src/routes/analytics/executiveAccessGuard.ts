import type { FastifyReply, FastifyRequest } from "fastify";
import { eq } from "drizzle-orm";
import {
	configuredClinicalAccessSecret,
	requireResolvedOrganizationId,
	unguardedBypassAllowed,
} from "../../accessGuard.js";
import { withTenantReadCtx } from "../../db/rls.js";
import { organizations } from "../../db/schema/auth.js";
import {
	getRequestIdentity,
	verifyActiveStaffSession,
} from "../../security/identity.js";
import {
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
	"accountant",
]);

export async function requireExecutiveAccess(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<string | null> {
	const orgId = await requireResolvedOrganizationId(request, reply, "executive analytics");
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

	if (identity.userId) {
		const role = (identity.role ?? "").toLowerCase();
		if (EXECUTIVE_ROLES.has(role)) {
			return orgId;
		}

		const { overrides, clinicMode } = await withTenantReadCtx(orgId, async (tx) => {
			const loadedOverrides = await fetchRoleMatrixOverrides(orgId, tx);
			let mode: string | null | undefined = null;
			if (role === "doctor") {
				try {
					const [orgRecord] = await tx
						.select({ clinicMode: organizations.clinicMode })
						.from(organizations)
						.where(eq(organizations.id, orgId))
						.limit(1);
					mode = orgRecord?.clinicMode;
				} catch (dbErr) {
					request.log?.warn?.({ err: dbErr, orgId }, "Failed to query clinicMode in requireExecutiveAccess");
				}
			}
			return { overrides: loadedOverrides, clinicMode: mode };
		});

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
			if (clinicMode === "solo_doctor" || clinicMode === "one_chair") {
				return orgId;
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
