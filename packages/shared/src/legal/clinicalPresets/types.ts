import type {
	ClinicalProcedureConsentPreset,
	ProcedureSpecificConsentProcedure,
} from "../legalContractsAndConsents.js";

export type {
	ClinicalProcedureConsentPreset,
	ProcedureSpecificConsentProcedure,
};

export type ConsentPresetMap = Record<string, ClinicalProcedureConsentPreset>;

/**
 * Метаданные клинико-юридического шаблона информированного добровольного согласия (ИДС).
 * Включает протокол информирования, оценки рисков и послеоперационного ухода по Приказу Минздрава № 1051н.
 */
export interface ConsentPresetMetadata {
	procedureType: ProcedureSpecificConsentProcedure;
	procedureName: string;
	diagnosisOrIndication: string;
	plannedAnesthesia: string;
	materialsAndSystems: string;
	patientSpecificRiskFactors: readonly string[];
	procedureSpecificRisks: readonly string[];
	alternatives: readonly string[];
	aftercareAndLimits: readonly string[];
}
