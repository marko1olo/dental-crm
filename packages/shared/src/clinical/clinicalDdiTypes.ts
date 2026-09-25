/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL DDI DRUG SAFETY ENGINE — TYPES & SCHEMAS
 * Evidence-based pharmacological contracts according to Orders № 834n / № 203n
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { z } from "zod";

export const ddiSeveritySchema = z.enum([
	"critical", // Абсолютное противопоказание (смертельный риск, кровотечение, анафилаксия)
	"major", // Тяжелое взаимодействие (требуется отмена или замена препарата)
	"high", // Синоним для тяжелого взаимодействия
	"moderate", // Умеренное взаимодействие (требуется коррекция дозы/интервала)
	"minor", // Незначительное клиническое влияние
]);
export type DdiSeverity = z.infer<typeof ddiSeveritySchema>;

export const safetyRiskLevelSchema = z.enum([
	"safe", // Назначение безопасно
	"caution", // Требуется осторожность (умеренные риски)
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
	/** Mandate 8e/8n: Doctor Autonomy Override */
	allowDoctorOverride: z.boolean().optional().default(false),
	doctorOverrideReason: z.string().optional(),
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
	readonly clinicalActionRu?: string;
	readonly clinicalRecommendationRu?: string;
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
	/** Mandate 8e/8n: Doctor Autonomy Override */
	readonly canDoctorOverride?: boolean;
	readonly isOverridden?: boolean;
	readonly overrideReason?: string | null;
}
