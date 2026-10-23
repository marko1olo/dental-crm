import type { FastifyReply, FastifyRequest } from "fastify";
import { and, desc, eq } from "drizzle-orm";
import { verifyPrescriptionStatutoryValidity } from "@dental/shared";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { electronicPrescriptionItems, electronicPrescriptions } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { auditMedicalAccessFromRequest } from "../../security/medicalAuditTrail.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";

function checkClinicalReadAccess(request: FastifyRequest, reply: FastifyReply): boolean {
	const identity = getRequestIdentity(request);
	const staffRole =
		identity.role ??
		(request as unknown as { user?: { role?: string | null } }).user?.role ??
		null;
	const evalAccess = evaluateClinicalAccess(staffRole);
	if (!evalAccess.hasClinicalAccess) {
		reply.code(403).send({
			error: "PermissionDenied",
			permission: "clinical.prescription.read",
			role: staffRole,
			message: "Доступ к электронным рецептам ограничен: требуются права клинического персонала.",
		});
		return false;
	}
	return true;
}

/** 4. GET /api/prescriptions — List prescriptions for organization with filters */
export async function handleListPrescriptions(request: FastifyRequest, reply: FastifyReply) {
	const orgId = await requireResolvedOrganizationId(request, reply);
	if (!orgId) return;
	if (!checkClinicalReadAccess(request, reply)) return;

	await auditMedicalAccessFromRequest(request, {
		organizationId: orgId,
		action: "VIEW_PRESCRIPTIONS",
		diagnosis: "Реестр электронных рецептов",
	});

	const query = request.query as {
		patientId?: string;
		visitId?: string;
		formType?: string;
		status?: string;
	};

	const conditions = [eq(electronicPrescriptions.organizationId, orgId)];
	if (query.patientId) conditions.push(eq(electronicPrescriptions.patientId, query.patientId));
	if (query.visitId) conditions.push(eq(electronicPrescriptions.visitId, query.visitId));
	if (query.formType) conditions.push(eq(electronicPrescriptions.formType, query.formType));
	if (query.status) conditions.push(eq(electronicPrescriptions.status, query.status));

	const prescriptions = await db
		.select()
		.from(electronicPrescriptions)
		.where(and(...conditions))
		.orderBy(desc(electronicPrescriptions.createdAt))
		.limit(100);

	return reply.send({ success: true, prescriptions });
}

/** 5. GET /api/prescriptions/:id — Get single prescription with drug items */
export async function handleGetPrescriptionById(request: FastifyRequest, reply: FastifyReply) {
	const orgId = await requireResolvedOrganizationId(request, reply);
	if (!orgId) return;
	if (!checkClinicalReadAccess(request, reply)) return;

	const { id } = request.params as { id: string };
	const [prescription] = await db
		.select()
		.from(electronicPrescriptions)
		.where(and(eq(electronicPrescriptions.id, id), eq(electronicPrescriptions.organizationId, orgId)))
		.limit(1);

	if (!prescription) {
		return reply.code(404).send({ error: "PrescriptionNotFound", message: "Рецепт не найден." });
	}

	await auditMedicalAccessFromRequest(request, {
		organizationId: orgId,
		patientId: prescription.patientId,
		action: "VIEW_PRESCRIPTION_DETAILS",
		diagnosis: prescription.clinicalDiagnosisMkb10 ?? "Электронный рецепт",
		metadata: { prescriptionId: prescription.id },
	});

	const items = await db
		.select()
		.from(electronicPrescriptionItems)
		.where(and(eq(electronicPrescriptionItems.prescriptionId, prescription.id), eq(electronicPrescriptionItems.organizationId, orgId)))
		.orderBy(electronicPrescriptionItems.itemIndex);

	const validityDaysNum =
		prescription.validityPeriod === "days_15"
			? 15
			: prescription.validityPeriod === "days_30"
				? 30
				: prescription.validityPeriod === "year_1"
					? 365
					: 60;

	const validityCheck = verifyPrescriptionStatutoryValidity({
		formType: prescription.formType,
		prescriptionDate: prescription.issuedAt?.toISOString().slice(0, 10) || prescription.createdAt.toISOString().slice(0, 10),
		validityDays: validityDaysNum,
		isChronicSpecialCare: prescription.isSpecialChronicIndication,
		chronicPeriodicity: prescription.chronicDispenseFrequencyNotes,
		items: items.map((i) => ({ latinName: i.innLatin })),
	});

	return reply.send({ success: true, prescription, items, validityCheck });
}
