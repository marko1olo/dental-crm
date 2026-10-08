import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { toothStates } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { ensurePatientInOrganization } from "./planHelpers.js";
import { UUID_SHAPE } from "./types.js";

// Молочные зубы по классификации FDI / ISO 3950
const PRIMARY_TEETH = new Set([
	51, 52, 53, 54, 55,
	61, 62, 63, 64, 65,
	71, 72, 73, 74, 75,
	81, 82, 83, 84, 85,
]);

export function registerPediatricRoutes(app: FastifyInstance) {
	/**
	 * Расчет клинических индексов интенсивности кариеса КПУ(з), КПУ(п) и кп
	 * для детской и сменной зубной формулы (ВОЗ / МКБ-10)
	 */
	app.get(
		"/api/patients/:patientId/odontogram/pediatric-indices",
		async (request, reply) => {
			const organizationId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"pediatric indices calculation",
			);
			if (!organizationId) return;

			const identity = getRequestIdentity(request);
			const staffRole =
				identity.role ??
				(request as unknown as { user?: { role?: string | null } }).user?.role ??
				null;
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
			if (!UUID_SHAPE.test(patientId)) {
				return reply.code(400).send({ error: "InvalidPatientId" });
			}
			if (!(await ensurePatientInOrganization(patientId, organizationId))) {
				return reply.code(404).send({ error: "PatientNotFound" });
			}

			const teeth = await db
				.select({
					toothNumber: toothStates.toothNumber,
					state: toothStates.state,
					surfaces: toothStates.surfaces,
				})
				.from(toothStates)
				.where(
					and(
						eq(toothStates.organizationId, organizationId),
						eq(toothStates.patientId, patientId),
					),
				);

			let permanentC = 0; // Кариозные постоянные (К)
			let permanentP = 0; // Пломбированные постоянные (П)
			let permanentU = 0; // Удаленные постоянные (У)

			let primaryC = 0; // Кариозные молочные (к)
			let primaryP = 0; // Пломбированные молочные (п)
			let primaryExtracted = 0; // Преждевременно удаленные молочные

			let permanentSurfacesC = 0;
			let permanentSurfacesP = 0;

			let primaryCount = 0;
			let permanentCount = 0;

			for (const t of teeth) {
				const isPrimary = PRIMARY_TEETH.has(t.toothNumber);
				if (isPrimary) {
					primaryCount++;
				} else {
					permanentCount++;
				}

				const state = t.state;
				const surfacesCount = Array.isArray(t.surfaces) ? t.surfaces.length : 1;

				if (isPrimary) {
					if (state === "Caries" || state === "Pulpitis" || state === "Periodontitis") {
						primaryC++;
					} else if (state === "Filled" || state === "Crown") {
						primaryP++;
					} else if (state === "Extracted" || state === "Missing" || state === "Root") {
						primaryExtracted++;
					}
				} else {
					if (state === "Caries" || state === "Pulpitis" || state === "Periodontitis") {
						permanentC++;
						permanentSurfacesC += surfacesCount;
					} else if (state === "Filled" || state === "Crown" || state === "Bridge") {
						permanentP++;
						permanentSurfacesP += surfacesCount;
					} else if (state === "Missing" || state === "Extracted" || state === "Root") {
						permanentU++;
					}
				}
			}

			// Индексы
			const kpuZ = permanentC + permanentP + permanentU;
			const kpuP = permanentSurfacesC + permanentSurfacesP + permanentU;
			const kp = primaryC + primaryP;
			const mixedIndex = kpuZ + kp;

			let dentitionType: "primary" | "mixed" | "permanent" = "permanent";
			if (primaryCount > 0 && permanentCount > 0) {
				dentitionType = "mixed";
			} else if (primaryCount > 0 && permanentCount === 0) {
				dentitionType = "primary";
			}

			let cariesActivity: "low" | "medium" | "high" = "low";
			if (kpuZ >= 7 || kp >= 5) {
				cariesActivity = "high";
			} else if (kpuZ >= 3 || kp >= 2) {
				cariesActivity = "medium";
			}

			return reply.send({
				success: true,
				dentitionType,
				indices: {
					permanent: {
						kpuZ,
						kpuP,
						c: permanentC,
						p: permanentP,
						u: permanentU,
					},
					primary: {
						kp,
						c: primaryC,
						p: primaryP,
						prematurelyExtracted: primaryExtracted,
					},
					totalMixedIndex: mixedIndex,
					cariesActivity,
				},
				counts: {
					primaryTeethCataloged: primaryCount,
					permanentTeethCataloged: permanentCount,
				},
			});
		},
	);
}
