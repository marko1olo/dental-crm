/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EGISZ REMD & FNS TAX DEDUCTION ENGINE FACADE — DENTE DENTAL CRM
 * Re-exports modular statutory preflight engines, dictionaries, and formats
 * Mandate 8s: Modular architecture and Single Source of Truth
 * ═══════════════════════════════════════════════════════════════════════════
 */

export {
	ALL_FDI_TEETH,
	COMMON_804N_DENTAL_SERVICES,
	COMMON_DENTAL_ICD10,
	DEFAULT_EGISZ_CLINIC_PRESET,
	DEFAULT_EGISZ_DOCTOR_PRESET,
	DENTAL_SURFACES,
	DENTAL_TOOTH_STATUS_DICTIONARY,
	EGISZ_DENTAL_SEMD_TYPES,
	EGISZ_REMD_OIDS,
	type EgiszDentalSemdCode,
	FDI_ADULT_TEETH,
	FDI_CHILD_TEETH,
	FRMR_DOCTOR_POSITIONS,
	SAMPLE_043U_PATIENT_PRESET,
	validateOidFormat,
	validateRussianInn,
	validateRussianOgrn,
	validateRussianSnils,
} from "./remdXml/egiszRemdPresets";

export {
	canonicalizeCdaXml,
	escapeXml,
	formatHl7DateTime,
	formatRuDate,
} from "@dental/shared/cda";

export {
	formatKopecksToRubles,
} from "@dental/shared";

export type {
	EgiszClinicInfo,
	EgiszDentalCdaPayload,
	EgiszDiagnosisItem,
	EgiszDoctorInfo,
	EgiszPatientInfo,
	EgiszProcedureItem,
	GostSignatureInfo,
} from "./cdaR2/cdaTypes";

export type {
	FnsTaxCertificatePayload,
	FnsTaxPaymentItem,
} from "./cdaR2/fnsTaxTypes";

export {
	validateXmlStructure,
	type XmlStructureValidationResult,
} from "./cdaR2/xmlStructureValidator";

export {
	generateGostSignatureStampHtml,
	generateGostSignatureStampSvg,
} from "./cdaR2/gostSignatures";

import { generateCdaXml } from "@dental/shared/cda";
import type { EgiszDentalCdaPayload } from "./cdaR2/cdaTypes";

/**
 * Каноническая генерация CDA R2 XML через SSOT @dental/shared/cda.
 * Устранена самодельная конкатенация строк в браузере.
 */
export function generateEgiszDentalCdaXml(payload: EgiszDentalCdaPayload): string {
	const [patFamily = "Пациент", patGiven = "", patPatronymic = ""] = (payload.patient.patientFullName || "Пациент").trim().split(/\s+/);
	const [docFamily = "Врач", docGiven = "", docPatronymic = ""] = (payload.doctor.doctorFullName || "Врач").trim().split(/\s+/);
	const gender = payload.patient.patientGender === "male" || payload.patient.patientGender === "female" ? payload.patient.patientGender : "other";
	const res = generateCdaXml({
		docKind: "101",
		documentId: payload.documentUuid || `DOC-${Date.now()}`,
		documentVersion: payload.documentVersion || 1,
		visitDate: payload.encounterDate ? new Date(payload.encounterDate) : new Date(),
		patient: {
			patientId: payload.patient.patientId || "pat",
			name: { first: patGiven || "Пациент", last: patFamily || "Пациент", middle: patPatronymic || undefined },
			snils: payload.patient.patientSnils,
			birthDate: payload.patient.patientBirthDate || "1980-01-01",
			gender,
			polisOms: payload.patient.patientPolisOms,
		},
		doctor: {
			name: { first: docGiven || "Врач", last: docFamily || "Врач", middle: docPatronymic || undefined },
			snils: payload.doctor.doctorSnils,
			position: payload.doctor.doctorPosition,
		},
		clinic: {
			name: payload.clinic.clinicName,
			oid: payload.clinic.clinicOid,
			ogrn: payload.clinic.clinicOgrn,
			inn: payload.clinic.clinicInn,
		},
		complaints: payload.complaints,
		anamnesis: payload.anamnesisMorbi,
		anamnesisVitae: payload.anamnesisVitae,
		diagnoses: payload.diagnoses.map((d) => ({
			icd10Code: d.icd10Code,
			diagnosisText: d.icd10Name || d.diagnosisName || d.icd10Code,
			tooth: d.tooth,
			isPrimary: Boolean(d.isPrimary),
		})),
		services: (payload.procedures || []).map((p) => ({
			code: p.code,
			name: p.name,
			tooth: p.tooth,
		})),
		recommendations: payload.recommendations || "Наблюдение",
	});
	return res.success ? res.xml : `<!-- Ошибка генерации CDA R2: ${res.errors.join("; ")} -->`;
}

export type {
	EgiszPreflightCheckResult,
	EgiszPreflightReport,
	FnsTaxPreflightReport,
} from "./engine/engineTypes";

export {
	generateEgiszXmlFilename,
	generateFnsTaxXmlFilename,
} from "./engine/egiszFilenames";

export { runEgisz043uPreflight } from "./engine/clinicalPreflightEngine";

export {
	generateForm043uPrintHtml,
	generateFnsTaxCertificatePrintHtml,
} from "./egiszRemdPrintTemplates";

export {
	SAMPLE_DENTAL_SEMD_105_PRESET,
	SAMPLE_FNS_TAX_1151156_PRESET,
} from "./egiszRemdSamplePresets";

// Backwards compatibility alias
export type Egisz043uPayload = EgiszDentalCdaPayload;
export const generateEgisz043uCdaXml = generateEgiszDentalCdaXml;
