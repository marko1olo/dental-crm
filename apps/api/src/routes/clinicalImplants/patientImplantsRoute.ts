import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { patientImplantInstallations } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { auditMedicalAccessFromRequest } from "../../security/medicalAuditTrail.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";

export function registerPatientImplantsRoute(app: FastifyInstance) {
	app.get("/api/clinical/implants/patient/:patientId", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		const identity = getRequestIdentity(request);
		const staffRole = identity.role ?? (request as unknown as { user?: { role?: string | null } }).user?.role ?? null;
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.implants.read",
				role: staffRole,
				message: `Отказ в доступе к имплантологическому паспорту (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
			});
		}

		const { patientId } = request.params as { patientId: string };
		const rawInstallations = await db
			.select()
			.from(patientImplantInstallations)
			.where(and(eq(patientImplantInstallations.patientId, patientId), eq(patientImplantInstallations.organizationId, orgId)))
			.orderBy(desc(patientImplantInstallations.installedAt));

		const installations = rawInstallations.map((inst) => {
			let parsedNotes: Record<string, unknown> = {};
			try {
				if (inst.notes && inst.notes.startsWith("{")) {
					parsedNotes = JSON.parse(inst.notes);
				}
			} catch {
				// fallback
			}

			return {
				...inst,
				financials: parsedNotes.financials ?? null,
				deductedMaterials: parsedNotes.deductedMaterials ?? [],
				isImmediateLoadingFeasible:
					Boolean(parsedNotes.isImmediateLoadingFeasible) ||
					(Number(inst.baselineIsq || 0) >= 70 && Number(inst.finalInsertionTorqueNcm || 0) >= 35),
			};
		});

		if (installations.length > 0) {
			await auditMedicalAccessFromRequest(request, {
				organizationId: orgId,
				patientId,
				action: "VIEW_IMPLANT_PASSPORT",
				diagnosis: "Имплантологический паспорт",
			});
		}

		return reply.send({ success: true, installations });
	});

	const handleSurgeryImplantsQuery = async (request: any, reply: any) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		const identity = getRequestIdentity(request);
		const staffRole = identity.role ?? (request as unknown as { user?: { role?: string | null } }).user?.role ?? null;
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.implants.read",
				role: staffRole,
				message: `Отказ в доступе к реестру имплантатов (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
			});
		}

		const query = (request.query || {}) as { patientId?: string; toothNumberFdi?: string | number; limit?: string };
		const conditions = [eq(patientImplantInstallations.organizationId, orgId)];

		if (query.patientId) {
			conditions.push(eq(patientImplantInstallations.patientId, query.patientId));
		}
		if (query.toothNumberFdi) {
			conditions.push(eq(patientImplantInstallations.toothNumberFdi, Number(query.toothNumberFdi)));
		}

		const limit = query.limit ? Math.min(Number(query.limit) || 50, 100) : 50;

		const rawInstallations = await db
			.select()
			.from(patientImplantInstallations)
			.where(and(...conditions))
			.orderBy(desc(patientImplantInstallations.installedAt))
			.limit(limit);

		const installations = rawInstallations.map((inst) => {
			let parsedNotes: Record<string, unknown> = {};
			try {
				if (inst.notes && inst.notes.startsWith("{")) {
					parsedNotes = JSON.parse(inst.notes);
				}
			} catch {
				// fallback
			}

			return {
				...inst,
				financials: parsedNotes.financials ?? null,
				deductedMaterials: parsedNotes.deductedMaterials ?? [],
				isImmediateLoadingFeasible:
					Boolean(parsedNotes.isImmediateLoadingFeasible) ||
					(Number(inst.baselineIsq || 0) >= 70 && Number(inst.finalInsertionTorqueNcm || 0) >= 35),
			};
		});

		return reply.send({
			success: true,
			count: installations.length,
			implants: installations,
			installations,
		});
	};

	app.get("/api/v1/surgery/implants", handleSurgeryImplantsQuery);
	app.get("/api/surgery/implants", handleSurgeryImplantsQuery);
	app.get("/api/v1/surgery/implants/patient/:patientId", async (request, reply) => {
		const { patientId } = request.params as { patientId: string };
		(request as any).query = { ...(request.query as any), patientId };
		return handleSurgeryImplantsQuery(request, reply);
	});
}
