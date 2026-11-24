import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { withTenantCtx } from "../../db/rls.js";
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
	const staffRole = identity.role ?? request.user?.role ?? null;
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
	const now = new Date();
	const { validityDaysNum, expiresAt, prefix, prescriptionNumber } =
		calculatePrescriptionValidityAndNumber(input.formType, input.validityPeriod, now);

	const proposedDrugNames = input.items.flatMap((item) =>
		[item.tradeName, item.innLatin].filter((n): n is string => typeof n === "string" && n.trim().length > 0),
	);

	const outcome = await withTenantCtx(orgId, async (tx) => {
		const [patient] = await tx
			.select()
			.from(patients)
			.where(and(eq(patients.id, input.patientId), eq(patients.organizationId, orgId)))
			.limit(1);

		if (!patient) {
			return { kind: "patient_not_found" as const };
		}

		if (!patient.birthDate) {
			return { kind: "birth_date_required" as const };
		}

		if (isAnonymousOmsPatient(patient, input.patientOmsPolicy, input.preferentialBenefitCode)) {
			return { kind: "oms_anonymous_denied" as const };
		}

		const doctor = await findPrescribingDoctor(orgId, input.prescribingDoctorId, identity.userId, tx);
		if (!doctor) {
			return { kind: "doctor_not_found" as const };
		}

		const { ddiAudit, safetyAuditSnapshotJson } = await auditPrescriptionDdiAndAllergies(
			orgId,
			input.patientId,
			proposedDrugNames,
			now,
			tx,
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
			tx,
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

		return { kind: "created" as const, created };
	});

	if (outcome.kind === "patient_not_found") {
		return reply.code(404).send({ error: "PatientNotFound", message: "Пациент не найден." });
	}
	if (outcome.kind === "birth_date_required") {
		return reply.code(422).send({
			error: "PatientBirthDateRequired",
			message: "Для выписки электронного рецепта необходимо указать дату рождения пациента в его медицинской карте.",
		});
	}
	if (outcome.kind === "oms_anonymous_denied") {
		return reply.code(422).send({
			error: "OmsIdentificationRequiredError",
			message: "Отказ: выписка льготных рецептов и привязка полиса ОМС для анонимных пациентов запрещена.",
		});
	}
	if (outcome.kind === "doctor_not_found") {
		return reply.code(404).send({ error: "DoctorNotFound", message: "Врач не найден." });
	}

	return reply.code(201).send({
		success: true,
		prescription: outcome.created,
		expiresAt: expiresAt.toISOString(),
		validityDays: validityDaysNum,
	});
}
