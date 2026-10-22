/**
 * buildVisitCdaParams.ts — Constructs strongly typed EgiszCdaParams for HL7 CDA R2 generation.
 * Mandate 8b compliant (<= 120 lines).
 */

import type { EgiszCdaParams } from "../../../services/egiszCdaGenerator.js";

export function assembleVisitCdaParams({
	row, clinicRow, diaryRow, doctorName, doctorContact, doctorPosition,
	doctorPositionCode, resolvedIcd10, effectiveDiagnosis, encounterDate,
	clinicOid, clinicName, patientNameParts, patientSnilsDigits, birthStr,
	patientGender, anamnesis, objectiveStatus, complications, comorbidities,
	instrumentTrayBarcode, diagnosisTooth, treatmentPlan,
}: {
	row: any; clinicRow: any; diaryRow: any; doctorName: any; doctorContact: any;
	doctorPosition?: string | undefined; doctorPositionCode?: string | undefined; resolvedIcd10: string;
	effectiveDiagnosis: string; encounterDate: Date; clinicOid: string;
	clinicName: string; patientNameParts: any; patientSnilsDigits: string;
	birthStr: string; patientGender: "male" | "female"; anamnesis?: string | undefined;
	objectiveStatus?: string | undefined; complications?: string | undefined; comorbidities?: string | undefined;
	instrumentTrayBarcode?: string | undefined; diagnosisTooth?: string | undefined; treatmentPlan?: string | undefined;
}): EgiszCdaParams {
	const pContact = row.patient.administrativeProfile as { residentialAddress?: string | null; registrationAddress?: string | null } | undefined;
	const pAddress = pContact?.residentialAddress || pContact?.registrationAddress || undefined;

	return {
		patientId: row.patient.id, patientName: patientNameParts, patientSnils: patientSnilsDigits,
		patientBirthDate: birthStr, patientGender,
		...(row.patient.phone ? { patientPhone: String(row.patient.phone) } : {}),
		...(row.patient.email ? { patientEmail: String(row.patient.email) } : {}),
		...(pAddress ? { patientAddress: pAddress } : {}),
		clinicName,
		...(typeof row.organization.ogrn === "string" && row.organization.ogrn.trim() ? { clinicOgrn: row.organization.ogrn.trim() } : {}),
		...(typeof row.organization.inn === "string" && row.organization.inn.trim() ? { clinicInn: row.organization.inn.trim() } : {}),
		...(clinicRow?.address ? { clinicAddress: String(clinicRow.address) } : {}),
		...(clinicRow?.phone ? { clinicPhone: String(clinicRow.phone) } : {}),
		...(row.organization.email ? { clinicEmail: String(row.organization.email) } : {}),
		...(row.organization.legalAddress ? { clinicLegalAddress: String(row.organization.legalAddress) } : {}),
		doctorName,
		...(doctorContact?.phone ? { doctorPhone: String(doctorContact.phone) } : {}),
		...(doctorContact?.email ? { doctorEmail: String(doctorContact.email) } : {}),
		...(doctorPosition ? { doctorPosition } : {}),
		...(doctorPositionCode ? { doctorPositionCode } : {}),
		icd10Code: resolvedIcd10, diagnosisText: effectiveDiagnosis, visitDate: encounterDate,
		documentId: typeof diaryRow?.version === "number" && diaryRow.version >= 1 ? `${row.visit.id}-v${Math.floor(diaryRow.version)}` : row.visit.id,
		encounterId: row.visit.id, documentSetId: row.visit.id,
		...(typeof diaryRow?.version === "number" && diaryRow.version >= 1 ? { documentVersion: Math.floor(diaryRow.version) } : {}),
		...(typeof diaryRow?.version === "number" && diaryRow.version >= 2 ? { replacesDocumentId: `${row.visit.id}-v${Math.floor(diaryRow.version) - 1}` } : {}),
		clinicOid,
		...(anamnesis ? { anamnesis } : {}),
		...(objectiveStatus ? { objectiveStatus } : {}),
		...(complications ? { complications } : {}),
		...(comorbidities ? { comorbidities } : {}),
		...(instrumentTrayBarcode ? { instrumentTrayBarcode } : {}),
		...(diagnosisTooth ? { diagnosisTooth } : {}),
		...(treatmentPlan ? { treatmentDescription: treatmentPlan } : {}),
	};
}
