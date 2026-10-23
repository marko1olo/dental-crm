import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalReadAccess, resolveOrganizationId } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import { users, visitDiaries, visits } from "../../../db/schema.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { auditMedicalAccessFromRequest } from "../../../security/medicalAuditTrail.js";
import { evaluateClinicalAccess } from "../../../security/medicalSecrecyWarden.js";
import {
	formatDoctorSpecialtyLabel,
	redactLegacyPinSignature,
} from "../../../services/clinical/DiarySigningCeremonyService.js";
import { DIARY_CLINIC_UNKNOWN_READ_MESSAGE, diaryVisitParamsSchema } from "../types.js";

export async function handleDiaryVisitGet(req: FastifyRequest, reply: FastifyReply): Promise<void> {
	if (!(await requireClinicalReadAccess(req, reply, "read diary"))) return;
	const parsedVisitParams = diaryVisitParamsSchema.safeParse(req.params);
	if (!parsedVisitParams.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Идентификатор приёма в адресе должен быть UUID (visitId).",
		});
	}
	const { visitId } = parsedVisitParams.data;
	const orgId = await resolveOrganizationId(req);
	if (!orgId) return reply.code(403).send({ error: "OrgRequired", message: DIARY_CLINIC_UNKNOWN_READ_MESSAGE });

	const identity = getRequestIdentity(req);
	const staffRole = identity.role ?? req.user?.role ?? null;
	const evalAccess = evaluateClinicalAccess(staffRole);
	if (!evalAccess.hasClinicalAccess) {
		await auditMedicalAccessFromRequest(req, {
			organizationId: orgId,
			patientId: "unknown",
			action: "ACCESS_DENIED_DIARY",
			diagnosis: "Попытка несанкционированного доступа к дневнику приёма",
		});
		return reply.code(403).send({
			error: "PermissionDenied",
			permission: "clinical.diary.read",
			role: staffRole,
			message: `Отказ в доступе к дневнику приёма: ${evalAccess.reason}`,
		});
	}

	const [visitRow] = await db
		.select()
		.from(visits)
		.where(and(eq(visits.id, visitId), eq(visits.organizationId, orgId)))
		.limit(1);
	if (!visitRow) {
		return reply.code(404).send({
			error: "VisitNotFound",
			message: "Приём не найден в этой клинике, дневник приёма открыть нельзя.",
		});
	}

	const [diary] = await db
		.select()
		.from(visitDiaries)
		.where(and(eq(visitDiaries.visitId, visitId), eq(visitDiaries.organizationId, orgId)));

	const autosaveDraft = (((visitRow.draftAutosave as Record<string, unknown> | null)?.draft as Record<string, string | null | undefined> | undefined) ?? {});
	const fallbackComplaint = visitRow.complaint || autosaveDraft.complaint || "";
	const fallbackAnamnesis = visitRow.anamnesis || autosaveDraft.anamnesis || "";
	const fallbackObjectiveStatus = visitRow.objectiveStatus || autosaveDraft.objectiveStatus || "";
	const fallbackDiagnosis = visitRow.diagnosis || autosaveDraft.diagnosis || "";
	const fallbackTreatmentPlan = visitRow.treatmentPlan || autosaveDraft.treatmentPlan || "";

	if (!diary) {
		if (fallbackAnamnesis || fallbackObjectiveStatus || fallbackDiagnosis || fallbackTreatmentPlan || fallbackComplaint) {
			return reply.send({
				diary: {
					id: null, organizationId: orgId, visitId: visitRow.id, patientId: visitRow.patientId,
					anamnesis: [fallbackComplaint, fallbackAnamnesis].filter(Boolean).join("\n\n") || "",
					statusLocalis: fallbackObjectiveStatus, diagnosisIcd10: fallbackDiagnosis, diagnosisTooth: "",
					treatmentDescription: fallbackTreatmentPlan, complications: "", comorbidities: "", content: "",
					isLocked: false, lockedAt: null, diaryHash: null, instrumentTrayBarcode: null, version: 1,
					cryptoSignaturePkcs7: null, isSynced: false, createdAt: visitRow.createdAt, updatedAt: visitRow.updatedAt,
				},
			});
		}
		return reply.send({ diary: null });
	}

	await auditMedicalAccessFromRequest(req, {
		organizationId: orgId,
		patientId: visitRow.patientId ?? diary.patientId,
		action: "VIEW_DIARY_043U",
		diagnosis: diary.diagnosisIcd10 ? `${diary.diagnosisIcd10} (${diary.diagnosisTooth ? `зуб ${diary.diagnosisTooth}` : "без зуба"})` : "Дневник приёма",
	});

	const signingUserId = diary.doctorId ?? diary.lockedByUserId ?? diary.authorId ?? diary.draftAuthorId ?? null;
	let doctorFullName: string | null = null;
	let doctorSpecialty: string | null = null;
	if (typeof signingUserId === "string" && signingUserId.length > 0) {
		const [docUser] = await db
			.select({ fullName: users.fullName, specialties: users.specialties })
			.from(users)
			.where(and(eq(users.id, signingUserId), eq(users.organizationId, orgId)))
			.limit(1);
		if (docUser) {
			doctorFullName = typeof docUser.fullName === "string" && docUser.fullName.trim() ? docUser.fullName.trim() : null;
			doctorSpecialty = formatDoctorSpecialtyLabel(docUser.specialties);
		}
	}

	return reply.send({
		diary: {
			...diary,
			cryptoSignaturePkcs7: redactLegacyPinSignature(diary.cryptoSignaturePkcs7),
			doctorFullName,
			doctorSpecialty,
		},
	});
}
