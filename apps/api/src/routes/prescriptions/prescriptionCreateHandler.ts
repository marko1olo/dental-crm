import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { patients } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { auditMedicalAccessFromRequest } from "../../security/medicalAuditTrail.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import {
	auditPrescriptionDdiAndAllergies,
	insertPrescriptionWithItems,
} from "./prescriptionCreateService.js";
import {
	calculatePrescriptionValidityAndNumber,
	findPrescribingDoctor,
	isAnonymousOmsPatient,
} from "./prescriptionNumberHelper.js";
import { createPrescriptionBodySchema } from "./prescriptionSchemas.js";

/** 6. POST /api/prescriptions — Create official statutory prescription */
export async function handleCreatePrescription(request: FastifyRequest, reply: FastifyReply) {
	const orgId = await requireResolvedStaffOrAdminOrganizationId(request, reply, "create prescription");
	if (!orgId) return;

	const identity = getRequestIdentity(request);
	const staffRole =
		identity.role ??
		(request as unknown as { user?: { role?: string | null } }).user?.role ??
		null;
	const evalAccess = evaluateClinicalAccess(staffRole);
	if (!evalAccess.hasClinicalAccess) {
		return reply.code(403).send({
			error: "PermissionDenied",
			permission: "clinical.prescription.write",
			role: staffRole,
			message: "Оформление электронных рецептов ограничено: требуются права врача.",
		});
	}

	const parsed = createPrescriptionBodySchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные параметры рецепта.",
			details: parsed.error.format(),
		});
	}
	const input = parsed.data;

	const [patient] = await db
		.select()
		.from(patients)
		.where(and(eq(patients.id, input.patientId), eq(patients.organizationId, orgId)))
		.limit(1);

	if (!patient) {
		return reply.code(404).send({ error: "PatientNotFound", message: "Пациент не найден." });
	}

	if (isAnonymousOmsPatient(patient, input.patientOmsPolicy, input.preferentialBenefitCode)) {
		return reply.code(422).send({
			error: "Decree659OmsForbiddenError",
			message: "Отказ: выписка льготных рецептов и привязка полиса ОМС для анонимных пациентов запрещена.",
		});
	}

	const doctor = await findPrescribingDoctor(orgId, input.prescribingDoctorId, identity.userId);
	if (!doctor) {
		return reply.code(404).send({ error: "DoctorNotFound", message: "Врач не найден." });
	}

	const now = new Date();
	const { validityDaysNum, expiresAt, prefix, prescriptionNumber } =
		calculatePrescriptionValidityAndNumber(input.formType, input.validityPeriod, now);

	const proposedDrugNames = input.items.flatMap((item) =>
		[item.tradeName, item.innLatin].filter((n): n is string => typeof n === "string" && n.trim().length > 0),
	);

	const { ddiAudit, safetyAuditSnapshotJson } = await auditPrescriptionDdiAndAllergies(
		orgId,
		input.patientId,
		proposedDrugNames,
		now,
	);

	const created = await insertPrescriptionWithItems(
		orgId,
		patient,
		doctor.id,
		doctor.fullName,
		input,
		prefix,
		prescriptionNumber,
		expiresAt,
		safetyAuditSnapshotJson,
		ddiAudit.drugInteractions.length === 0,
		now,
	);

	await auditMedicalAccessFromRequest(request, {
		organizationId: orgId,
		patientId: created.patientId,
		action: "CREATE_PRESCRIPTION",
		diagnosis: created.clinicalDiagnosisMkb10 ?? "Назначение лекарственных препаратов",
		metadata: {
			prescriptionId: created.id,
			prescriptionNumber: created.prescriptionNumber,
			formType: created.formType,
		},
	});

	return reply.code(201).send({
		success: true,
		prescription: created,
		expiresAt: expiresAt.toISOString(),
		validityDays: validityDaysNum,
	});
}
