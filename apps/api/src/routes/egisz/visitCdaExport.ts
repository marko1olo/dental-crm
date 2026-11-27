/**
 * visitCdaExport.ts — Fastify route for exporting CDA R2 XML per visit.
 * Mandate 8b compliant (<= 120 lines). Decomposed into ./visitCda/
 */

import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireClinicalReadAccess } from "../../accessGuard.js";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { withTenantReadCtx } from "../../db/rls.js";
import * as schema from "../../db/schema.js";
import { getRequestIdentity, requireOrganizationId } from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { generateDentalCdaXml } from "../../services/egiszCdaGenerator.js";
import { extractIcd10, readGatewayConfig, readGenderFromProfile, readSnilsFromProfile, splitFullName } from "./helpers.js";
import { fetchDiaryRow, fetchVisitRow, resolveDoctorFromAppointmentOrDiary } from "./visitCda/fetchVisitCdaData.js";
import { validateVisitCdaPrerequisites } from "./visitCda/validateVisitCdaData.js";
import { assembleVisitCdaParams } from "./visitCda/buildVisitCdaParams.js";

const visitCdaParamsSchema = z.object({ visitId: z.string().uuid() }).strict();

export function registerVisitCdaExportRoute(app: FastifyInstance): void {
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/egisz/visits/:visitId/cda",
		permission: "public",
		handler: async ({ request, reply }) => {
			if (!(await requireClinicalReadAccess(request, reply, "egisz cda export"))) return;
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const identity = getRequestIdentity(request);
			const staffRole = identity.role ?? request.user?.role ?? null;
			const evalAccess = evaluateClinicalAccess(staffRole);
			if (!evalAccess.hasClinicalAccess) {
				return reply.code(403).send({ ok: false, error: "PermissionDenied", message: `Отказ в выгрузке СЭМД CDA: ${evalAccess.reason}` });
			}

			const parsedParams = visitCdaParamsSchema.safeParse(request.params);
			if (!parsedParams.success) {
				return reply.status(400).send({ ok: false, error: "ValidationError", message: "Идентификатор приёма должен быть UUID." });
			}
			const { visitId } = parsedParams.data;

			const dbData = await withTenantReadCtx(orgId, async (tx) => {
				const row = await fetchVisitRow(visitId, orgId, tx);
				if (!row) return null;
				const diaryRow = await fetchDiaryRow(visitId, orgId, tx);
				const doctorRes = await resolveDoctorFromAppointmentOrDiary(row.visit.appointmentId, diaryRow, orgId, tx);
				const [clinicRow] = await tx
					.select({ address: schema.clinics.address, phone: schema.clinics.phone })
					.from(schema.clinics)
					.where(eq(schema.clinics.organizationId, orgId))
					.limit(1);
				return { row, diaryRow, doctorRes, clinicRow };
			});
			if (!dbData) return reply.status(404).send({ error: "VisitNotFound", message: "Приём не найден." });

			const { row, diaryRow, doctorRes, clinicRow } = dbData;
			const diaryIcd = typeof diaryRow?.diagnosisIcd10 === "string" ? diaryRow.diagnosisIcd10.trim() : "";
			const diaryTooth = typeof diaryRow?.diagnosisTooth === "string" ? diaryRow.diagnosisTooth.trim() : "";
			const diaryDiagnosisParts = [diaryIcd, diaryTooth ? `Зуб ${diaryTooth}` : ""].filter(Boolean);
			const diaryDiagnosisText = diaryDiagnosisParts.join(" | ");
			const visitDiagnosis = typeof row.visit.diagnosis === "string" && row.visit.diagnosis.trim() ? row.visit.diagnosis.trim() : "";
			const effectiveDiagnosis = diaryIcd ? diaryDiagnosisText : (visitDiagnosis || diaryDiagnosisText);

			const encounterDate = doctorRes.encounterDate || row.visit.createdAt;
			const clinicOid = readGatewayConfig().clinicOid;

			const patientSnilsDigits = readSnilsFromProfile(row.patient.administrativeProfile);
			const resolvedIcd10 = diaryIcd || extractIcd10(effectiveDiagnosis);
			const rawBirth = row.patient.birthDate;
			const birthStr = typeof rawBirth === "string" ? rawBirth.trim() : "";
			const birthParsed = birthStr ? new Date(birthStr) : null;
			const patientGender = readGenderFromProfile(row.patient.administrativeProfile);
			const patientFullNameRaw = typeof row.patient.fullName === "string" ? row.patient.fullName : "";
			const patientNameParts = splitFullName(patientFullNameRaw);
			const clinicName = typeof row.organization.name === "string" ? row.organization.name.trim() : "";

			const validationErr = validateVisitCdaPrerequisites({
				diaryRow, effectiveDiagnosis, clinicOid, doctorName: doctorRes.doctorName,
				patientSnilsDigits, resolvedIcd10, birthStr, birthParsed, patientGender,
				patientFullNameRaw, patientNameParts, clinicName,
			});
			if (validationErr) return reply.status(422).send(validationErr);

			const params = assembleVisitCdaParams({
				row, clinicRow, diaryRow, doctorName: doctorRes.doctorName, doctorContact: doctorRes.doctorContact,
				doctorPosition: doctorRes.doctorPosition, doctorPositionCode: doctorRes.doctorPositionCode,
				resolvedIcd10, effectiveDiagnosis, encounterDate, clinicOid: clinicOid ?? "", clinicName,
				patientNameParts, patientSnilsDigits, birthStr, patientGender: patientGender as "male" | "female",
				anamnesis: (typeof diaryRow?.anamnesis === "string" ? diaryRow.anamnesis.trim() : "") || (typeof row.visit.anamnesis === "string" ? row.visit.anamnesis.trim() : ""),
				objectiveStatus: (typeof diaryRow?.statusLocalis === "string" ? diaryRow.statusLocalis.trim() : "") || (typeof row.visit.objectiveStatus === "string" ? row.visit.objectiveStatus.trim() : ""),
				complications: typeof diaryRow?.complications === "string" ? diaryRow.complications.trim() : undefined,
				comorbidities: typeof diaryRow?.comorbidities === "string" ? diaryRow.comorbidities.trim() : undefined,
				instrumentTrayBarcode: typeof diaryRow?.instrumentTrayBarcode === "string" ? diaryRow.instrumentTrayBarcode.trim() : undefined,
				diagnosisTooth: typeof diaryRow?.diagnosisTooth === "string" ? diaryRow.diagnosisTooth.trim() : undefined,
				treatmentPlan: (typeof diaryRow?.treatmentDescription === "string" ? diaryRow.treatmentDescription.trim() : "") || (typeof row.visit.treatmentPlan === "string" ? row.visit.treatmentPlan.trim() : ""),
			});

			const cdaResult = generateDentalCdaXml(params);
			if (!cdaResult.success) {
				return reply.status(422).send({ error: "CdaGenerationFailed", message: "Ошибка схемы CDA.", details: cdaResult.error.issues });
			}

			return reply.header("content-type", "application/xml; charset=utf-8").header("content-disposition", `attachment; filename="cda-${row.visit.id}.xml"`).status(200).send(cdaResult.xml);
		},
	});
}
