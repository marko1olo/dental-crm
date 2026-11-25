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
	parseRublesToKopecks,
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

import { canonicalizeCdaXml, generateCdaXml, generateSemd105Xml } from "@dental/shared/cda";
import type { EgiszDentalCdaPayload } from "./cdaR2/cdaTypes";

/**
 * Каноническая генерация CDA R2 XML через SSOT @dental/shared/cda.
 * Устранена самодельная конкатенация строк в браузере.
 */
export function generateEgiszDentalCdaXml(payload: EgiszDentalCdaPayload): string {
	const [patFamily = "Пациент", patGiven = "", patPatronymic = ""] = (payload.patient.patientFullName || "Пациент").trim().split(/\s+/);
	const [docFamily = "Врач", docGiven = "", docPatronymic = ""] = (payload.doctor.doctorFullName || "Врач").trim().split(/\s+/);
	const gender: "male" | "female" | "other" =
		payload.patient.patientGender === "male" || payload.patient.patientGender === "female"
			? payload.patient.patientGender
			: "other";
	const docCode = String(payload.docTypeCode || "108");
	const visitDate = payload.encounterDate ? new Date(payload.encounterDate) : new Date();
	const documentId = payload.documentUuid || `DOC-${Date.now()}`;
	const documentVersion = payload.documentVersion || 1;
	const dentalStatus = Object.entries(payload.toothStates || {}).map(([tooth, condition]) => ({
		tooth,
		condition,
		...(payload.toothSurfaces?.[Number(tooth)] ? { surfaces: payload.toothSurfaces[Number(tooth)] } : {}),
	}));
	const diagnoses = payload.diagnoses.map((d) => ({
		icd10Code: d.icd10Code,
		diagnosisText: d.icd10Name || d.diagnosisName || d.icd10Code,
		...(d.tooth !== undefined ? { tooth: d.tooth } : {}),
		isPrimary: Boolean(d.isPrimary),
	}));
	const services = (payload.procedures || []).map((p) => ({
		code: p.code,
		name: p.name,
		...(p.tooth !== undefined ? { tooth: p.tooth } : {}),
		...(p.quantity !== undefined ? { quantity: p.quantity } : {}),
	}));
	const recommendations = payload.recommendations || "Наблюдение";

	const patient = {
		patientId: payload.patient.patientId || "pat",
		name: { first: patGiven || "Пациент", last: patFamily || "Пациент", middle: patPatronymic || undefined },
		snils: payload.patient.patientSnils,
		birthDate: payload.patient.patientBirthDate || "1980-01-01",
		gender,
		polisOms: payload.patient.patientPolisOms,
	};
	const doctor = {
		name: { first: docGiven || "Врач", last: docFamily || "Врач", middle: docPatronymic || undefined },
		snils: payload.doctor.doctorSnils,
		position: payload.doctor.doctorPosition,
		positionCode: payload.doctor.doctorPositionCode,
	};
	const clinic = {
		name: payload.clinic.clinicName,
		oid: payload.clinic.clinicOid,
		ogrn: payload.clinic.clinicOgrn,
		inn: payload.clinic.clinicInn,
	};

	if (docCode === "105") {
		const raw105 = generateSemd105Xml({
			docKind: "105",
			documentId,
			documentVersion,
			visitDate,
			patient,
			doctor,
			clinic,
			complaints: payload.complaints,
			anamnesis: payload.anamnesisMorbi,
			anamnesisVitae: payload.anamnesisVitae,
			dentalStatus: dentalStatus.length > 0 ? dentalStatus : undefined,
			diagnoses,
			services,
			treatmentDescription: payload.treatmentProtocolDescription,
			recommendations,
		});
		return canonicalizeCdaXml(raw105);
	}

	const mappedCode = docCode === "303" ? "103" : docCode;
	const validDocKinds = ["101", "103", "108", "104", "109", "043u", "043-1u"] as const;
	type DocKindType = (typeof validDocKinds)[number];
	const docKind: DocKindType = validDocKinds.includes(mappedCode as DocKindType) ? (mappedCode as DocKindType) : "108";

	const res = generateCdaXml({
		docKind,
		documentId,
		documentVersion,
		visitDate,
		patient,
		doctor,
		clinic,
		complaints: payload.complaints,
		anamnesis: payload.anamnesisMorbi,
		anamnesisVitae: payload.anamnesisVitae,
		dentalStatus: dentalStatus.length > 0 ? dentalStatus : undefined,
		diagnoses,
		services,
		treatmentDescription: payload.treatmentProtocolDescription,
		recommendations,
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

export {
	runEgiszPreflight,
	runEgisz043uPreflight,
} from "./engine/clinicalPreflightEngine";

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
