import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { withTenantCtx } from "../../db/rls.js";
import { patientImplantInstallations } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { auditMedicalAccessFromRequest } from "../../security/medicalAuditTrail.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";

const patientParamsSchema = z
	.object({
		patientId: z.string().uuid(),
	})
	.strict();

const surgeryImplantsQuerySchema = z
	.object({
		patientId: z.string().uuid().optional(),
		toothNumberFdi: z.coerce.number().int().optional(),
		limit: z.coerce.number().int().min(1).max(100).optional(),
	})
	.strict();

type SurgeryImplantsQuery = z.infer<typeof surgeryImplantsQuerySchema>;

function mapInstallationRow(
	inst: typeof patientImplantInstallations.$inferSelect,
	logError?: (err: unknown) => void,
) {
	let parsedNotes: Record<string, unknown> = {};
	try {
		if (inst.notes && inst.notes.startsWith("{")) {
			parsedNotes = JSON.parse(inst.notes);
		}
	} catch (err) {
		logError?.(err);
	}

	const rawFinancials = (inst.financialsJsonb as Record<string, unknown> | null) ?? null;
	const financials =
		rawFinancials && "financials" in rawFinancials
			? rawFinancials.financials
			: (rawFinancials ?? parsedNotes.financials ?? null);
	const deductedMaterials =
		rawFinancials && "deductedMaterials" in rawFinancials && Array.isArray(rawFinancials.deductedMaterials)
			? rawFinancials.deductedMaterials
			: (Array.isArray(parsedNotes.deductedMaterials) ? parsedNotes.deductedMaterials : []);

	return {
		...inst,
		catalogArticle: inst.catalogArticle ?? parsedNotes.sku ?? null,
		sku: inst.catalogArticle ?? parsedNotes.sku ?? null,
		expirationDate: inst.expirationDate ?? parsedNotes.expirationDate ?? null,
		connectionType: inst.connectionType ?? parsedNotes.connectionType ?? "internal_hex",
		financials,
		deductedMaterials,
		isImmediateLoadingFeasible:
			Boolean(parsedNotes.isImmediateLoadingFeasible) ||
			(rawFinancials && Boolean(rawFinancials.isImmediateLoadingFeasible)) ||
			(Number(inst.baselineIsq || 0) >= 70 && Number(inst.finalInsertionTorqueNcm || 0) >= 35),
	};
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
				message: `Отказ в доступе к имплантологическому паспорту: ${evalAccess.reason}`,
			});
		}

		const parsedParams = patientParamsSchema.safeParse(request.params);
		if (!parsedParams.success) {
			return reply.code(400).send({
				error: "InvalidPatientId",
				message: "Некорректный идентификатор пациента (ожидается UUID).",
			});
		}
		const { patientId } = parsedParams.data;

		const rawInstallations = await withTenantCtx(orgId, async (tx) =>
			tx
				.select()
				.from(patientImplantInstallations)
				.where(and(eq(patientImplantInstallations.patientId, patientId), eq(patientImplantInstallations.organizationId, orgId)))
				.orderBy(desc(patientImplantInstallations.installedAt)),
		);

		const installations = rawInstallations.map((inst) =>
			mapInstallationRow(inst, (err) => request.log.warn({ err, installationId: inst.id }, "[patientImplantsRoute] Failed to parse legacy JSON notes")),
		);

		await auditMedicalAccessFromRequest(request, {
			organizationId: orgId,
			patientId,
			action: "VIEW_IMPLANT_PASSPORT",
			diagnosis: "Имплантологический паспорт",
		});

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
				message: `Отказ в доступе к реестру имплантатов: ${evalAccess.reason}`,
			});
		}

		const parsedQuery = surgeryImplantsQuerySchema.safeParse(request.query ?? {});
		if (!parsedQuery.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры фильтрации реестра имплантатов.",
				details: parsedQuery.error.format(),
			});
		}
		const query = parsedQuery.data;
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
		if (query.toothNumberFdi !== undefined) {
			const fdi = query.toothNumberFdi;
			const isPermanent =
				(fdi >= 11 && fdi <= 18) ||
				(fdi >= 21 && fdi <= 28) ||
				(fdi >= 31 && fdi <= 38) ||
				(fdi >= 41 && fdi <= 48);
			if (!Number.isInteger(fdi) || !isPermanent) {
				return reply.code(400).send({
					error: "InvalidFdiTooth",
					message: "Некорректный номер зуба FDI для имплантации (ожидается постоянный зуб: 11..18, 21..28, 31..38, 41..48). Установка дентальных имплантатов в молочный прикус (51..85) запрещена.",
				});
			}
			conditions.push(eq(patientImplantInstallations.toothNumberFdi, fdi));
		}

		const limit = query.limit ?? 50;

		const rawInstallations = await withTenantCtx(orgId, async (tx) =>
			tx
				.select()
				.from(patientImplantInstallations)
				.where(and(...conditions))
				.orderBy(desc(patientImplantInstallations.installedAt))
				.limit(limit),
		);

		const installations = rawInstallations.map((inst) =>
			mapInstallationRow(inst, (err) => request.log.warn({ err, installationId: inst.id }, "[patientImplantsRoute] Failed to parse legacy JSON notes")),
		);

		if (effectivePatientId) {
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

	app.get<{ Querystring: SurgeryImplantsQuery }>("/api/clinical/implants", (req, rep) => handleSurgeryImplantsQuery(req, rep));
}
