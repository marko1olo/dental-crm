import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { patientImplantInstallations } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { auditMedicalAccessFromRequest } from "../../security/medicalAuditTrail.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";

interface SurgeryImplantsQuery {
	patientId?: string;
	toothNumberFdi?: string | number;
	limit?: string;
}

export function registerPatientImplantsRoute(app: FastifyInstance) {
	app.get<{ Params: { patientId: string } }>("/api/clinical/implants/patient/:patientId", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		const identity = getRequestIdentity(request);
		const staffRole = identity.role ?? request.user?.role ?? null;
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.implants.read",
				role: staffRole,
				message: `Отказ в доступе к имплантологическому паспорту (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
			});
		}

		const { patientId } = request.params;
		if (!z.string().uuid().safeParse(patientId).success) {
			return reply.code(400).send({
				error: "InvalidPatientId",
				message: "Некорректный идентификатор пациента (ожидается UUID).",
			});
		}

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

	const handleSurgeryImplantsQuery = async (
		request: FastifyRequest<{ Querystring: SurgeryImplantsQuery; Params?: { patientId?: string } }>,
		reply: FastifyReply,
		explicitPatientId?: string,
	) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		const identity = getRequestIdentity(request);
		const staffRole = identity.role ?? request.user?.role ?? null;
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.implants.read",
				role: staffRole,
				message: `Отказ в доступе к реестру имплантатов (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
			});
		}

		const query = request.query || {};
		const conditions = [eq(patientImplantInstallations.organizationId, orgId)];
		const effectivePatientId = explicitPatientId || request.params?.patientId || query.patientId;

		if (effectivePatientId) {
			if (!z.string().uuid().safeParse(effectivePatientId).success) {
				return reply.code(400).send({
					error: "InvalidPatientId",
					message: "Некорректный идентификатор пациента (ожидается UUID).",
				});
			}
			conditions.push(eq(patientImplantInstallations.patientId, effectivePatientId));
		}
		if (query.toothNumberFdi !== undefined && query.toothNumberFdi !== null && query.toothNumberFdi !== "") {
			const fdi = Number(query.toothNumberFdi);
			if (!Number.isInteger(fdi) || fdi < 11 || (fdi > 48 && fdi < 51) || fdi > 85) {
				return reply.code(400).send({
					error: "InvalidFdiTooth",
					message: "Некорректный номер зуба FDI (ожидается целое число 11..48 или 51..85).",
				});
			}
			conditions.push(eq(patientImplantInstallations.toothNumberFdi, fdi));
		}

		const limit = Math.max(1, Math.min(Number(query.limit) || 50, 100));

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

		if (effectivePatientId && installations.length > 0) {
			await auditMedicalAccessFromRequest(request, {
				organizationId: orgId,
				patientId: effectivePatientId,
				action: "VIEW_IMPLANT_PASSPORT",
				diagnosis: "Имплантологический паспорт",
			});
		}

		return reply.send({
			success: true,
			count: installations.length,
			implants: installations,
			installations,
		});
	};

	app.get<{ Querystring: SurgeryImplantsQuery }>("/api/v1/surgery/implants", (req, rep) => handleSurgeryImplantsQuery(req, rep));
	app.get<{ Querystring: SurgeryImplantsQuery }>("/api/surgery/implants", (req, rep) => handleSurgeryImplantsQuery(req, rep));
	app.get<{ Params: { patientId: string }; Querystring: SurgeryImplantsQuery }>(
		"/api/v1/surgery/implants/patient/:patientId",
		(request, reply) => handleSurgeryImplantsQuery(request, reply, request.params.patientId),
	);
}
