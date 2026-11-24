import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { calculateFedorovVolodkinaScore, calculatePediatricIndices } from "@dental/shared";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { withTenantCtx } from "../../db/rls.js";
import { toothStates } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { parseClinicalDataFromNotes } from "../odontogram/types.js";

const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface PediatricIndicesParams {
	patientId: string;
}

export function registerPediatricIndicesRoutes(app: FastifyInstance): void {
	app.get<{ Params: PediatricIndicesParams }>("/api/patients/:patientId/pediatric/indices", async (request, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(request, reply, "pediatric indices calculation");
		if (!organizationId) return;

		const identity = getRequestIdentity(request);
		const staffRole = identity.role ?? request.user?.role ?? null;
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.pediatric.read",
				role: staffRole,
				message: `Доступ к медицинской информации ограничен клинической ролью сотрудника: ${evalAccess.reason}`,
			});
		}

		const { patientId } = request.params;
		if (!UUID_SHAPE.test(patientId)) return reply.code(400).send({ error: "InvalidPatientId" });

		let teeth: { toothNumber: number; state: string; surfaces: unknown; notes: string | null }[] = [];
		try {
			teeth = await withTenantCtx(organizationId, async (tx) =>
				tx.select({
					toothNumber: toothStates.toothNumber,
					state: toothStates.state,
					surfaces: toothStates.surfaces,
					notes: toothStates.notes,
				})
					.from(toothStates).where(and(eq(toothStates.organizationId, organizationId), eq(toothStates.patientId, patientId))),
			);
		} catch (error: unknown) {
			request.log.error({ error, patientId }, "Failed to fetch tooth states for pediatric indices from PostgreSQL 18");
			return reply.code(500).send({ error: "DatabaseError", message: "Не удалось загрузить состояния зубов для расчета детских индексов КПУ/кп" });
		}

		const indicesResult = calculatePediatricIndices(teeth);

		const fedorovAssessments: Array<{ toothNumber: number; fedorovScore?: number; debrisScore?: number }> = [];
		const fedorovTeethSet = new Set([83, 82, 81, 71, 72, 73, 43, 42, 41, 31, 32, 33]);
		for (const t of teeth) {
			if (fedorovTeethSet.has(t.toothNumber)) {
				const clin = parseClinicalDataFromNotes(t.notes);
				const clinRecord = clin as Record<string, unknown> | null;
				const fedorovScore = typeof clinRecord?.fedorovScore === "number" ? clinRecord.fedorovScore : undefined;
				const debrisScore = typeof clinRecord?.debrisScore === "number" ? clinRecord.debrisScore : undefined;
				fedorovAssessments.push({
					toothNumber: t.toothNumber,
					...(fedorovScore !== undefined ? { fedorovScore } : {}),
					...(debrisScore !== undefined ? { debrisScore } : {}),
				});
			}
		}
		const fedorovVolodkina = calculateFedorovVolodkinaScore(fedorovAssessments);

		return reply.send({
			success: true,
			dentitionType: indicesResult.dentitionType,
			indices: {
				permanent: indicesResult.indices.permanent,
				primary: indicesResult.indices.primary,
				totalMixedIndex: indicesResult.indices.totalMixedIndex,
				cariesActivity: indicesResult.indices.cariesActivity,
				fedorovVolodkina,
			},
			counts: indicesResult.counts,
		});
	});
}
