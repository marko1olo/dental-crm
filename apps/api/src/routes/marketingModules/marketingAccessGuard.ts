import { eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../../accessGuard.js";
import { withTenantCtx } from "../../db/rls.js";
import { organizations } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { roleHasPermissionWithOverrides } from "../../security/permissions.js";
import { fetchRoleMatrixOverrides } from "../../security/permissionsModules/permissionGuards.js";

const MARKETING_ALLOWED_ROLES = new Set([
	"owner",
	"admin",
	"manager",
	"director",
	"chief_doctor",
	"head_doctor",
	"marketer",
	"analyst",
	"curator",
	"administrator",
]);

/**
 * [W13-BIZ-20] Ограничивает чтение маркетинговых бюджетов, ROMI и атрибуции
 * авторизованным управленческим/маркетинговым ролям (или клиник-токену без userId),
 * закрывая утечку ассистентам, медсёстрам и врачам многокресельных клиник.
 */
export async function requireMarketingReadAccess(
	request: FastifyRequest,
	reply: FastifyReply,
	area: string,
): Promise<string | null> {
	const readAllowed = await requireClinicalReadAccess(request, reply, area);
	if (!readAllowed) return null;

	const orgId = await requireResolvedOrganizationId(request, reply, area);
	if (!orgId) return null;

	const identity = getRequestIdentity(request);
	if (!identity.userId) {
		return orgId;
	}

	const role = (identity.role ?? "").toLowerCase();
	if (MARKETING_ALLOWED_ROLES.has(role)) {
		return orgId;
	}

	const { overrides, clinicMode } = await withTenantCtx(orgId, async (tx) => {
		const loadedOverrides = await fetchRoleMatrixOverrides(orgId, tx);
		let mode: string | null | undefined = null;
		if (role === "doctor") {
			const [orgRow] = await tx
				.select({ clinicMode: organizations.clinicMode })
				.from(organizations)
				.where(eq(organizations.id, orgId))
				.limit(1);
			mode = orgRow?.clinicMode;
		}
		return { overrides: loadedOverrides, clinicMode: mode };
	});

	if (roleHasPermissionWithOverrides(role, "analytics.read", overrides)) {
		return orgId;
	}
	if (role === "doctor" && (clinicMode === "solo_doctor" || clinicMode === "one_chair")) {
		return orgId;
	}

	reply.code(403).send({
		error: "PermissionDenied",
		message: "Недостаточно прав для просмотра маркетинговой аналитики и бюджетов.",
	});
	return null;
}
