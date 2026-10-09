/**
 * packages/shared/src/clinical/ddi/types.ts
 * Layer 0: Clinical Drug-Drug Interaction (DDI), Allergy & Somatic Safety Contracts.
 * Zero runtime dependencies (except zod for contracts).
 */

import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// 1. ZOD SCHEMAS & CONTRACTS
// ─────────────────────────────────────────────────────────────────────────────

export const ddiSeveritySchema = z.enum([
	"critical", // Абсолютно противопоказано (угроза жизни, фатальное кровотечение, анафилаксия, криз)
	"high", // Высокий риск (требуется отмена или коррекция дозы / гастропротекция)
	"moderate", // Умеренное взаимодействие (требуется клинический мониторинг)
	"minor", // Незначительное взаимодействие
]);
export type DdiSeverity = z.infer<typeof ddiSeveritySchema>;

export const safetyRiskLevelSchema = z.enum([
	"safe", // Назначение безопасно
	"caution", // Назначение допустимо с предосторожностями
	"critical_danger", // Обнаружены критические противопоказания (назначение заблокировано)
]);
export type SafetyRiskLevel = z.infer<typeof safetyRiskLevelSchema>;

export const drugSafetyAuditInputSchema = z.object({
	patientId: z.string().optional(),
	organizationId: z.string().optional(),
	proposedMedications: z
		.array(z.string().min(1))
		.min(1, "Укажите хотя бы один назначаемый препарат"),
	existingMedications: z.array(z.string()).optional().default([]),
	patientConditions: z.array(z.string()).optional().default([]),
	knownAllergies: z.array(z.string()).optional().default([]),
	patientAgeYears: z.number().optional(),
	patientWeightKg: z.number().optional(),
});
export type DrugSafetyAuditInput = z.input<typeof drugSafetyAuditInputSchema>;

export interface ClinicalAllergyWarning {
	readonly allergenGroup: string;
	readonly proposedDrug: string;
	readonly severity: DdiSeverity;
	readonly manifestationsRu: string;
	readonly clinicalActionRu: string;
}

export interface ClinicalDdiInteraction {
	readonly primaryDrug: string;
	readonly interactingDrug: string;
	readonly severity: DdiSeverity;
	readonly effectDescriptionRu: string;
	readonly clinicalRecommendationRu: string;
}

export interface ClinicalConditionContraindication {
	readonly condition: string;
	readonly proposedDrug: string;
	readonly severity: DdiSeverity;
	readonly reasonRu: string;
	readonly clinicalGuidanceRu: string;
}

export interface SafeAlternativeRecommendation {
	readonly originalDrug: string;
	readonly recommendedAlternatives: readonly string[];
	readonly rationaleRu: string;
}

export interface ClinicalDrugSafetyAuditResult {
	readonly isSafe: boolean;
	readonly riskLevel: SafetyRiskLevel;
	readonly hasAllergyClash: boolean;
	readonly hasSevereDdi: boolean;
	readonly hasConditionContraindication: boolean;
	readonly blockedPrescriptions: readonly string[];
	readonly allergyWarnings: readonly ClinicalAllergyWarning[];
	readonly drugInteractions: readonly ClinicalDdiInteraction[];
	readonly conditionContraindications: readonly ClinicalConditionContraindication[];
	readonly safeAlternativeRecommendations: readonly SafeAlternativeRecommendation[];
	readonly summaryRu: string;
	readonly evaluatedAtIso: string;
}

export interface DrugClassMatcher {
	readonly classId: string;
	readonly labelRu: string;
	readonly keywords: readonly string[];
}
