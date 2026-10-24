/**
 * @dental/api/routes/anesthesia/logsListRoute.ts
 * Patient Anesthesia History Query Route (Mandate 8b, <= 120 lines)
 */

import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import { anesthesiaLogs } from "../../db/schema.js";
import { getRequestIdentity, requireOrganizationId } from "../../security/identity.js";
import { auditMedicalAccessFromRequest } from "../../security/medicalAuditTrail.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";

export function registerLogsListRoute(app: FastifyInstance): void {
	app.get("/api/anesthesia/patients/:patientId/logs", async (request, reply) => {
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		const identity = getRequestIdentity(request);
		const staffRole = identity.role ?? (request as unknown as { user?: { role?: string | null } }).user?.role ?? null;
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.anesthesia.read",
				role: staffRole,
				message: `Отказ в доступе к журналу анестезии (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
			});
		}

		const { patientId } = request.params as { patientId: string };

		return withTenantCtx(orgId, async () => {
			const rows = await db
				.select()
				.from(anesthesiaLogs)
				.where(and(eq(anesthesiaLogs.organizationId, orgId), eq(anesthesiaLogs.patientId, patientId)))
				.orderBy(desc(anesthesiaLogs.createdAt))
				.limit(50);

			if (rows.length > 0) {
				await auditMedicalAccessFromRequest(request, {
					organizationId: orgId,
					patientId,
					action: "VIEW_ANESTHESIA_LOGS",
					diagnosis: "Журнал анестезиологического пособия",
				});
			}

			return reply.send({
				patientId,
				logs: rows.map((r) => ({
					id: r.id,
					visitId: r.visitId,
					doctorId: r.doctorId,
					technique: r.technique,
					drug: r.drug,
					drugBrandName: r.drugBrandName,
					concentrationPct: Number(r.concentrationPct),
					vasoconstrictor: r.vasoconstrictor,
					carpuleVolumeMl: Number(r.carpuleVolumeMl),
					carpulesAdministered: Number(r.carpulesAdministered),
					totalDoseMg: Number(r.totalDoseMg),
					maxAllowedDoseMg: Number(r.maxAllowedDoseMg),
					epinephrineMg: Number(r.epinephrineMg),
					maxEpinephrineMg: Number(r.maxEpinephrineMg),
					aspirationTestPositive: r.aspirationTestPositive,
					toothNumbers: r.toothNumbers,
					injectionSite: r.injectionSite,
					lotNumber: r.lotNumber,
					expirationDate: r.expirationDate,
					vitalsPre: r.vitalsPre,
					vitalsIntra: r.vitalsIntra,
					vitalsPost: r.vitalsPost,
					notes: r.notes,
					complications: r.complications,
					createdAt: r.createdAt.toISOString(),
				})),
			});
		});
	});
}
