/**
 * packages/shared/src/clinical/clinicalDiagnosesSsot.ts
 *
 * DENTE Dental CRM — Canonical Outpatient Dental Diagnoses & Protocols SSOT.
 *
 * Single Source of Truth for:
 * - ICD-10 (МКБ-10) Outpatient Dental Classification (Стоматологическая ассоциация России — СтАР).
 * - Statutory Nomenclature of Medical Services (Приказ Минздрава РФ № 804н).
 * - Standard Outpatient Clinical Treatment Protocols (SOAP templates).
 * - Tooth State bindings for Odontogram & Chairside Decision Support.
 *
 * Excludes academic in-patient bloat (oncology C00-C14, hospital traumas S02, tuberculosis A18).
 * Compliant with:
 * - Mandate 8b: strict integer kopecks & line limit <= 500 lines.
 * - Mandate 8e: Doctor Autonomy (1-click workflows, 0 false blockers).
 * - Mandate 8i: Specialized Outpatient Bounded Context (СтАР & 804н).
 * - Mandate 8k: Friction-Killer Law (1-click norms & standardized presets).
 */

import {
	CARIES_AND_PULPITIS_DIAGNOSES,
	CARIES_INITIAL_K020,
	CARIES_DENTIN_K021,
	CARIES_CEMENTUM_K022,
	CARIES_ARRESTED_K023,
	CARIES_OTHER_K028,
	CARIES_UNSPECIFIED_K029,
	PULPITIS_ACUTE_K040,
	PULPITIS_CHRONIC_K0403,
} from "./clinicalDiagnosesCariesData.js";
import {
	PERIODONTAL_AND_OTHER_DIAGNOSES,
	PERIODONTITIS_ACUTE_K044,
	PERIODONTITIS_CHRONIC_K045,
	GINGIVITIS_ACUTE_K050,
	GINGIVITIS_CHRONIC_K051,
	PERIODONTITIS_CHRONIC_K053,
	STOMATITIS_APHTHOUS_K120,
	STOMATITIS_CATARRHAL_K121,
	WEDGE_DEFECT_K031,
	HYPERESTHESIA_K038,
	EDENTULISM_PARTIAL_K081,
} from "./clinicalDiagnosesPeriodontalData.js";
import type {
	CanonicalClinicalDiagnosis,
	ClinicalDiagnosisCategory,
	DiagnosisOptionItem,
	ClinicalToothStateKind,
} from "./clinicalDiagnosesSsotTypes.js";

// Re-export types
export type {
	CanonicalClinicalDiagnosis,
	ClinicalDiagnosisCategory,
	ClinicalDiagnosisSsotEntry,
	ClinicalRecommendedService804n,
	ClinicalDiagnosisSoapTemplate,
	ClinicalToothStateKind,
	DiagnosisOptionItem,
} from "./clinicalDiagnosesSsotTypes.js";

// Re-export individual diagnoses for direct imports
export {
	CARIES_INITIAL_K020,
	CARIES_DENTIN_K021,
	CARIES_CEMENTUM_K022,
	CARIES_ARRESTED_K023,
	CARIES_OTHER_K028,
	CARIES_UNSPECIFIED_K029,
	PULPITIS_ACUTE_K040,
	PULPITIS_CHRONIC_K0403,
	PERIODONTITIS_ACUTE_K044,
	PERIODONTITIS_CHRONIC_K045,
	GINGIVITIS_ACUTE_K050,
	GINGIVITIS_CHRONIC_K051,
	PERIODONTITIS_CHRONIC_K053,
	STOMATITIS_APHTHOUS_K120,
	STOMATITIS_CATARRHAL_K121,
	WEDGE_DEFECT_K031,
	HYPERESTHESIA_K038,
	EDENTULISM_PARTIAL_K081,
};

/**
 * Реестр всех 18 амбулаторных стоматологических диагнозов СтАР (SSOT).
 */
export const CLINICAL_DIAGNOSES_SSOT: readonly CanonicalClinicalDiagnosis[] = [
	...CARIES_AND_PULPITIS_DIAGNOSES,
	...PERIODONTAL_AND_OTHER_DIAGNOSES,
];

/**
 * Получить все канонические амбулаторные стоматологические диагнозы.
 */
export function getAllOutpatientDentalDiagnoses(): readonly CanonicalClinicalDiagnosis[] {
	return CLINICAL_DIAGNOSES_SSOT;
}

/**
 * Поиск диагноза по коду МКБ-10 (например, "K02.1" или "k04.0").
 */
export function getClinicalDiagnosisByIcd10(icd10: string): CanonicalClinicalDiagnosis | undefined {
	if (!icd10) return undefined;
	const clean = icd10.trim().toUpperCase();
	return CLINICAL_DIAGNOSES_SSOT.find((d) => d.icd10.toUpperCase() === clean);
}

/**
 * Поиск диагноза по уникальному идентификатору.
 */
export function getClinicalDiagnosisById(id: string): CanonicalClinicalDiagnosis | undefined {
	if (!id) return undefined;
	return CLINICAL_DIAGNOSES_SSOT.find((d) => d.id === id);
}

/**
 * Получить список диагнозов заданной клинической категории.
 */
export function getClinicalDiagnosesByCategory(
	category: ClinicalDiagnosisCategory,
): readonly CanonicalClinicalDiagnosis[] {
	return CLINICAL_DIAGNOSES_SSOT.filter((d) => d.category === category);
}

/**
 * Получить список диагнозов для заданного клинического состояния зуба в одонтограмме.
 */
export function getClinicalDiagnosesByToothState(
	toothState: ClinicalToothStateKind | string,
): readonly CanonicalClinicalDiagnosis[] {
	const normalized = toothState.toLowerCase();
	return CLINICAL_DIAGNOSES_SSOT.filter((d) => d.toothState.toLowerCase() === normalized);
}

/**
 * Полнотекстовый поиск по диагнозам (код МКБ, название, краткое название, симптомы).
 */
export function searchClinicalDiagnoses(query: string): readonly CanonicalClinicalDiagnosis[] {
	if (!query || !query.trim()) return CLINICAL_DIAGNOSES_SSOT;
	const q = query.toLowerCase().trim();
	return CLINICAL_DIAGNOSES_SSOT.filter(
		(d) =>
			d.icd10.toLowerCase().includes(q) ||
			d.title.toLowerCase().includes(q) ||
			d.shortTitle.toLowerCase().includes(q) ||
			d.clinicalNotes.toLowerCase().includes(q),
	);
}

/**
 * Проверка: является ли код МКБ-10 валидным амбулаторным стоматологическим диагнозом.
 * Отсекает академический стационарный блоат (C00-C14, S02, A18).
 */
export function isOutpatientDentalDiagnosis(code: string): boolean {
	if (!code) return false;
	const clean = code.trim().toUpperCase();
	return CLINICAL_DIAGNOSES_SSOT.some((d) => d.icd10.toUpperCase() === clean);
}

/**
 * Получить стандартный клинический SOAP протокол для диагноза МКБ-10.
 */
export function getStandardSoapProtocolForDiagnosis(icd10: string) {
	const diagnosis = getClinicalDiagnosisByIcd10(icd10);
	return diagnosis?.soapTemplate ?? null;
}

/**
 * Преобразует диагноз в компактную структуру для UI селекторов и чипов.
 */
export function toDiagnosisOption(diagnosis: CanonicalClinicalDiagnosis): DiagnosisOptionItem {
	return {
		value: diagnosis.icd10,
		label: `${diagnosis.icd10} ${diagnosis.shortTitle}`,
		code: diagnosis.icd10,
		title: diagnosis.title,
		category: diagnosis.category,
	};
}
