/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EGISZ SEMD CDA VALIDATOR & CLIENT EXPORT BUILDER FACADE
 * Canonical SSOT delegated to @dental/shared/cda & cdaValidator engine
 * Mandate 8s: Single source of truth, elimination of duplicated logic.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { generateCdaXml } from "@dental/shared/cda";
import type { CdaExportData } from "./cdaValidator/validatorTypes";

export {
	EGISZ_SEMD_DOC_TYPES,
	type EgiszSemdDocTypeCode,
	EGISZ_STANDARD_OIDS,
	type CdaExportData,
	type SemanticValidationRuleResult,
	type SemanticValidationReport,
	canonicalizeXml,
} from "./cdaValidator/validatorTypes";

/**
 * Каноническая сборка HL7 CDA R2 XML через SSOT @dental/shared/cda.
 * Устранена самодельная конкатенация строк в браузере.
 */
export function buildCdaXml(data: CdaExportData): string {
	const [patFamily = "Пациент", patGiven = "", patPatronymic = ""] = (data.patientFullName || "Пациент").trim().split(/\s+/);
	const [docFamily = "Врач", docGiven = "", docPatronymic = ""] = (data.doctorFullName || "Врач").trim().split(/\s+/);
	const res = generateCdaXml({
		docKind: "101",
		documentId: data.documentId || data.visitId || `DOC-${Date.now()}`,
		documentVersion: data.documentVersion || 1,
		visitDate: data.encounterDate ? new Date(data.encounterDate) : new Date(),
		patient: {
			patientId: data.patientId || "pat",
			name: { first: patGiven || "Пациент", last: patFamily || "Пациент", middle: patPatronymic || undefined },
			snils: data.patientSnils,
			birthDate: data.patientBirthDate || "1980-01-01",
			gender: data.patientGender || "other",
			polisOms: data.patientPolisOms,
			address: data.patientAddress,
		},
		doctor: {
			name: { first: docGiven || "Врач", last: docFamily || "Врач", middle: docPatronymic || undefined },
			snils: data.doctorSnils,
			position: data.doctorPosition,
			positionCode: data.doctorPositionCode,
		},
		clinic: {
			name: data.clinicName,
			oid: data.clinicOid,
			ogrn: data.clinicOgrn,
			inn: data.clinicInn,
			address: data.clinicAddress,
		},
		complaints: data.anamnesis,
		anamnesis: data.anamnesis,
		objectiveStatus: data.objectiveStatus,
		diagnoses: [
			{
				icd10Code: data.icd10Code || "K02.1",
				diagnosisText: data.diagnosisText || "Кариес дентина",
				tooth: data.diagnosisTooth,
				isPrimary: true,
			},
		],
		instrumentTrayBarcode: data.instrumentTrayBarcode,
		recommendations: "Контрольный осмотр через 6 месяцев",
	});
	return res.success ? res.xml : `<!-- Ошибка генерации CDA: ${res.errors.join("; ")} -->`;
}

export { validateCdaSemanticRules } from "./cdaValidator/semanticRulesEngine";
