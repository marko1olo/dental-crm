import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { toothStates } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { PRIMARY_TEETH } from "./pediatricPresets.js";

const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function registerPediatricIndicesRoutes(app: FastifyInstance): void {
	app.get("/api/patients/:patientId/pediatric/indices", async (request: FastifyRequest, reply: FastifyReply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(request, reply, "pediatric indices calculation");
		if (!organizationId) return;

		const identity = getRequestIdentity(request);
		const staffRole = identity.role ?? (request as unknown as { user?: { role?: string | null } }).user?.role ?? null;
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.pediatric.read",
				role: staffRole,
				message: `Отказ в расчете клинических индексов (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
			});
		}

		const { patientId } = request.params as { patientId: string };
		if (!UUID_SHAPE.test(patientId)) return reply.code(400).send({ error: "InvalidPatientId" });

		let teeth: { toothNumber: number; state: string; surfaces: unknown }[] = [];
		try {
			teeth = await db.select({ toothNumber: toothStates.toothNumber, state: toothStates.state, surfaces: toothStates.surfaces })
				.from(toothStates).where(and(eq(toothStates.organizationId, organizationId), eq(toothStates.patientId, patientId)));
		} catch {
			teeth = [];
		}

		let permanentC = 0; let permanentP = 0; let permanentU = 0;
		let primaryC = 0; let primaryP = 0; let primaryExtracted = 0;
		let permanentSurfacesC = 0; let permanentSurfacesP = 0;
		let primaryCount = 0; let permanentCount = 0;

		for (const t of teeth) {
			const isPrimary = PRIMARY_TEETH.has(t.toothNumber);
			if (isPrimary) primaryCount++; else permanentCount++;
			const state = t.state;
			const surfacesCount = Array.isArray(t.surfaces) ? t.surfaces.length : 1;

			if (isPrimary) {
				if (state === "Caries" || state === "Pulpitis" || state === "Periodontitis") primaryC++;
				else if (state === "Filled" || state === "Crown") primaryP++;
				else if (state === "Extracted" || state === "Missing" || state === "Root") primaryExtracted++;
			} else {
				if (state === "Caries" || state === "Pulpitis" || state === "Periodontitis") { permanentC++; permanentSurfacesC += surfacesCount; }
				else if (state === "Filled" || state === "Crown" || state === "Bridge") { permanentP++; permanentSurfacesP += surfacesCount; }
				else if (state === "Missing" || state === "Extracted" || state === "Root") permanentU++;
			}
		}

		const kpuZ = permanentC + permanentP + permanentU;
		const kpuP = permanentSurfacesC + permanentSurfacesP + permanentU;
		const kp = primaryC + primaryP;
		const mixedIndex = kpuZ + kp;
		const dentitionType = primaryCount > 0 && permanentCount > 0 ? "mixed" : primaryCount > 0 && permanentCount === 0 ? "primary" : "permanent";
		const cariesActivity = kpuZ >= 7 || kp >= 5 ? "high" : kpuZ >= 3 || kp >= 2 ? "medium" : "low";

		return reply.send({
			success: true,
			dentitionType,
			indices: {
				permanent: { kpuZ, kpuP, c: permanentC, p: permanentP, u: permanentU },
				primary: { kp, c: primaryC, p: primaryP, prematurelyExtracted: primaryExtracted },
				totalMixedIndex: mixedIndex,
				cariesActivity,
			},
			counts: { primaryTeethCataloged: primaryCount, permanentTeethCataloged: permanentCount },
		});
	});
}
