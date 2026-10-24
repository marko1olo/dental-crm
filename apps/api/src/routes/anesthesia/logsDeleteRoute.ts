/**
 * @dental/api/routes/anesthesia/logsDeleteRoute.ts
 * Anesthesia Protocol Deletion & Annulment Route (Mandate 8b, <= 120 lines)
 */

import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import { anesthesiaLogs } from "../../db/schema.js";
import { getRequestIdentity, requireOrganizationId } from "../../security/identity.js";
import { auditMedicalAccessFromRequest } from "../../security/medicalAuditTrail.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";

export function registerLogsDeleteRoute(app: FastifyInstance): void {
	app.delete("/api/anesthesia/logs/:logId", async (request, reply) => {
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		const identity = getRequestIdentity(request);
		const staffRole = identity.role ?? (request as unknown as { user?: { role?: string | null } }).user?.role ?? null;
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.anesthesia.delete",
				role: staffRole,
				message: `Отказ в удалении протокола анестезии: ${evalAccess.reason}`,
			});
		}

		const { logId } = request.params as { logId: string };

		return withTenantCtx(orgId, async () => {
			const deleted = await db
				.delete(anesthesiaLogs)
				.where(and(eq(anesthesiaLogs.organizationId, orgId), eq(anesthesiaLogs.id, logId)))
				.returning({ id: anesthesiaLogs.id });

			if (deleted.length === 0) {
				return reply.status(404).send({ message: "Запись анестезии не найдена" });
			}

			await auditMedicalAccessFromRequest(request, {
				organizationId: orgId,
				action: "DELETE_ANESTHESIA_LOG",
				diagnosis: "Аннулирование записи анестезиологического протокола",
				metadata: { logId },
			});

			return reply.send({ success: true, deletedId: logId });
		});
	});
}
