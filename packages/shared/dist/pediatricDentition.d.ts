import { z } from "zod";
/**
 * FDI Primary Dentition Tooth Numbers (51..55, 61..65, 71..75, 81..85)
 * 20 primary teeth total:
 * - Upper Right (Q5): 55, 54, 53, 52, 51
 * - Upper Left (Q6): 61, 62, 63, 64, 65
 * - Lower Left (Q7): 71, 72, 73, 74, 75
 * - Lower Right (Q8): 85, 84, 83, 82, 81
 */
export declare const PRIMARY_UPPER_RIGHT: readonly [55, 54, 53, 52, 51];
export declare const PRIMARY_UPPER_LEFT: readonly [61, 62, 63, 64, 65];
export declare const PRIMARY_LOWER_LEFT: readonly [71, 72, 73, 74, 75];
export declare const PRIMARY_LOWER_RIGHT: readonly [85, 84, 83, 82, 81];
export declare const PRIMARY_UPPER_TEETH: readonly [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
export declare const PRIMARY_LOWER_TEETH: readonly [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];
export declare const ALL_PRIMARY_TEETH: readonly [55, 54, 53, 52, 51, 61, 62, 63, 64, 65, 85, 84, 83, 82, 81, 71, 72, 73, 74, 75];
export declare const primaryToothNumberSchema: z.ZodEffects<z.ZodNumber, number, number>;
export type PrimaryToothNumber = z.infer<typeof primaryToothNumberSchema>;
export declare function isPrimaryTooth(toothNumber: number): boolean;
/**
 * Mapping of Primary Teeth to their permanent successors.
 */
export declare const PRIMARY_TO_PERMANENT_SUCCESSOR_MAP: Readonly<Record<number, number>>;
export declare const PERMANENT_TO_PRIMARY_PREDECESSOR_MAP: Readonly<Record<number, number>>;
/**
 * Mixed Dentition Standard Arch Presets (6–12 years)
 * Standard Mixed Top: First permanent molars (16, 26) + primary teeth (55..51, 61..65)
 * Standard Mixed Bottom: First permanent molars (46, 36) + primary teeth (85..81, 71..75)
 */
export declare const MIXED_DENTITION_TOP: readonly [16, 55, 54, 53, 52, 51, 61, 62, 63, 64, 65, 26];
export declare const MIXED_DENTITION_BOTTOM: readonly [46, 85, 84, 83, 82, 81, 71, 72, 73, 74, 75, 36];
export declare const ALL_MIXED_DENTITION_TEETH: readonly [16, 55, 54, 53, 52, 51, 61, 62, 63, 64, 65, 26, 46, 85, 84, 83, 82, 81, 71, 72, 73, 74, 75, 36];
export declare const resorptionStagePercentSchema: z.ZodUnion<[z.ZodLiteral<0>, z.ZodLiteral<25>, z.ZodLiteral<50>, z.ZodLiteral<75>, z.ZodLiteral<100>]>;
export type ResorptionStagePercent = z.infer<typeof resorptionStagePercentSchema>;
export interface ResorptionStageDefinition {
    readonly stage: ResorptionStagePercent;
    readonly code: string;
    readonly nameRu: string;
    readonly descriptionRu: string;
    readonly clinicalSignRu: string;
    readonly rootLengthRemainingRatio: number;
    readonly expectedMobilityDegree: 0 | 1 | 2 | 3;
    readonly badgeColor: string;
    readonly badgeBg: string;
}
export declare const RESORPTION_STAGE_DEFINITIONS: Readonly<Record<ResorptionStagePercent, ResorptionStageDefinition>>;
export type DentitionStageCategory = "primary" | "early_mixed" | "intermediate_mixed" | "late_mixed" | "permanent";
export interface ToothExchangeStatus {
    readonly fdiNumber: number;
    readonly isPrimary: boolean;
    readonly successorPermanentFdi?: number;
    readonly predecessorPrimaryFdi?: number;
    readonly normalEruptionAgeRangeYears: [number, number];
    readonly status: "erupted" | "resorbing" | "exfoliating" | "erupting" | "future_permanent";
    readonly expectedResorptionPercent: ResorptionStagePercent;
    readonly labelRu: string;
}
export interface EruptionTimelineAnalysis {
    readonly ageYears: number;
    readonly dentalAgeYears: number;
    readonly stageCategory: DentitionStageCategory;
    readonly stageNameRu: string;
    readonly stageDescriptionRu: string;
    readonly expectedExchangeDescriptionRu: string;
    readonly expectedUpperArchTeeth: readonly number[];
    readonly expectedLowerArchTeeth: readonly number[];
    readonly toothStatuses: readonly ToothExchangeStatus[];
    readonly activeExfoliatingTeeth: readonly number[];
    readonly activelyEruptingPermanentTeeth: readonly number[];
    readonly clinicalAlerts: readonly {
        readonly type: "info" | "warning" | "orthodontic_space_maintainer";
        readonly titleRu: string;
        readonly textRu: string;
    }[];
}
/**
 * Calculates expected dental status and tooth exchange at a given chronological age (6-12 years).
 */
export declare function calculateEruptionTimelineByAge(ageYears: number): EruptionTimelineAnalysis;
/**
 * Simplified 3-State Cariogram Clinical Risk Assessment.
 * 1-click selection: "low" | "moderate" | "high".
 */
export declare const cariogramRiskLevelSchema: z.ZodEnum<["low", "moderate", "high"]>;
export type CariogramRiskLevel = z.infer<typeof cariogramRiskLevelSchema>;
export declare const cariogramInputSchema: z.ZodObject<{
    cariesRiskLevel: z.ZodDefault<z.ZodOptional<z.ZodEnum<["low", "moderate", "high"]>>>;
    dietContents: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    dietFrequency: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    plaqueAmount: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    streptococcusMutans: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    fluorideProgram: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    salivaSecretionRate: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    salivaBufferCapacity: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    pastCariesExperience: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    systemicDiseases: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    clinicalJudgment: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    cariesRiskLevel: "low" | "high" | "moderate";
    dietContents: number;
    dietFrequency: number;
    plaqueAmount: number;
    streptococcusMutans: number;
    fluorideProgram: number;
    salivaSecretionRate: number;
    salivaBufferCapacity: number;
    pastCariesExperience: number;
    systemicDiseases: number;
    clinicalJudgment: number;
}, {
    cariesRiskLevel?: "low" | "high" | "moderate" | undefined;
    dietContents?: number | undefined;
    dietFrequency?: number | undefined;
    plaqueAmount?: number | undefined;
    streptococcusMutans?: number | undefined;
    fluorideProgram?: number | undefined;
    salivaSecretionRate?: number | undefined;
    salivaBufferCapacity?: number | undefined;
    pastCariesExperience?: number | undefined;
    systemicDiseases?: number | undefined;
    clinicalJudgment?: number | undefined;
}>;
export type CariogramInput = z.infer<typeof cariogramInputSchema>;
export type CariogramRiskCategory = "very_low" | "low" | "moderate" | "high" | "very_high";
export interface CariogramSectorBreakdown {
    readonly actualChanceOfAvoidingCaries: number;
    readonly dietSectorPercent: number;
    readonly bacteriaSectorPercent: number;
    readonly susceptibilitySectorPercent: number;
    readonly circumstancesSectorPercent: number;
}
export interface CariogramResult {
    readonly chanceOfAvoidingCariesPercent: number;
    readonly riskCategory: CariogramRiskCategory;
    readonly riskCategoryNameRu: string;
    readonly riskCategoryDescriptionRu: string;
    readonly badgeColor: string;
    readonly badgeBg: string;
    readonly sectors: CariogramSectorBreakdown;
    readonly dominantRiskFactorRu: string;
    readonly preventiveProgram: {
        readonly hygieneRecallIntervalMonths: number;
        readonly professionalHygieneRu: string;
        readonly fluorideVarnishProtocolRu: string;
        readonly homeCareProtocolRu: string;
        readonly dietaryGuidanceRu: string;
        readonly fissureSealingIndicationRu: string;
    };
}
/**
 * Calculates the Cariogram caries risk and chance of avoiding caries per 3-state clinical model.
 */
export declare function calculateCariogramRisk(rawInput?: Partial<CariogramInput>): CariogramResult;
export interface PediatricDiaryTextOptions {
    readonly patientAgeYears?: number;
    readonly teethStates?: Record<number, string>;
    readonly resorptionStages?: Record<number, ResorptionStagePercent>;
    readonly cariogramInput?: Partial<CariogramInput>;
    readonly franklRating?: FranklRating;
    readonly silvering?: PediatricSilveringOptions;
    readonly fissureSealing?: PediatricFissureSealingOptions;
    readonly pulpotomy?: PediatricPulpotomyOptions;
    readonly customNotes?: string;
}
/**
 * Generates a structured clinical diary text for pediatric patients (Форма 043/у — Детский протокол).
 * Includes primary teeth resorption stages, mixed dentition analysis, Cariogram risk score, Frankl behavior rating, and preventive plan.
 */
export declare function generatePediatricCariogramDiaryText(options?: PediatricDiaryTextOptions): string;
export interface PediatricAnestheticCalculation {
    readonly drugName: string;
    readonly activeSubstance: string;
    readonly concentrationPercent: number;
    readonly vasoconstrictorRatio: "1:200000" | "1:100000" | "none";
    readonly patientWeightKg: number;
    readonly patientAgeYears: number;
    readonly mrdPerKgMg: number;
    readonly maxAllowedTotalDoseMg: number;
    readonly singleCarpuleDoseMg: number;
    readonly singleCarpuleVolumeMl: number;
    readonly maxSafeCarpulesCount: number;
    readonly carpulesAdministered: number;
    readonly totalDoseAdministeredMg: number;
    readonly totalEpinephrineAdministeredMg: number;
    readonly doseUtilizationPercent: number;
    readonly isSafe: boolean;
    readonly isOverdose: boolean;
    readonly isAgeContraindicated: boolean;
    readonly safetyWarningsRu: readonly string[];
}
export declare const PEDIATRIC_ANESTHETIC_DOSAGE_LIMITS: {
    readonly articaine4Percent: {
        readonly drugCode: "articaine";
        readonly nameRu: "Артикаин 4% с эпинефрином 1:200 000 (Ультракаин Д-С / Септанест)";
        readonly concentrationPercent: 4;
        readonly vasoconstrictorRatio: "1:200000";
        readonly minAgeYears: 4;
        readonly maxDosePerKgMg: 5;
        readonly absoluteMaxDoseMg: 500;
        readonly carpuleVolumeMl: 1.7;
        readonly mgPerCarpule: 68;
        readonly epinephrinePerCarpuleMg: 0.0085;
    };
    readonly mepivacaine3Percent: {
        readonly drugCode: "mepivacaine";
        readonly nameRu: "Мепивакаин 3% без вазоконстриктора (Скандонест)";
        readonly concentrationPercent: 3;
        readonly vasoconstrictorRatio: "none";
        readonly minAgeYears: 4;
        readonly maxDosePerKgMg: 4.4;
        readonly absoluteMaxDoseMg: 300;
        readonly carpuleVolumeMl: 1.8;
        readonly mgPerCarpule: 54;
        readonly epinephrinePerCarpuleMg: 0;
    };
    readonly lidocaine2Percent: {
        readonly drugCode: "lidocaine";
        readonly nameRu: "Лидокаин 2% с адреналином 1:200 000";
        readonly concentrationPercent: 2;
        readonly vasoconstrictorRatio: "1:200000";
        readonly minAgeYears: 4;
        readonly maxDosePerKgMg: 4.4;
        readonly absoluteMaxDoseMg: 300;
        readonly carpuleVolumeMl: 2;
        readonly mgPerCarpule: 40;
        readonly epinephrinePerCarpuleMg: 0.01;
    };
};
/**
 * Расчёт предельно допустимой дозы (MRD) анестетика для детей:
 * - Артикаин 4% с вазоконстриктором 1:200 000: максимум 5.0 мг/кг (детям от 4 лет).
 * - До 4 лет применение артикаина противопоказано.
 */
export declare function calculatePediatricAnestheticSafety(params: {
    drugType?: "articaine4Percent" | "mepivacaine3Percent" | "lidocaine2Percent";
    patientWeightKg: number;
    patientAgeYears: number;
    carpulesAdministered: number;
    carpuleVolumeMl?: number;
}): PediatricAnestheticCalculation;
export declare const franklRatingSchema: z.ZodUnion<[z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>]>;
export type FranklRating = z.infer<typeof franklRatingSchema>;
export interface FranklRatingDefinition {
    readonly rating: FranklRating;
    readonly code: string;
    readonly symbol: "--" | "-" | "+" | "++";
    readonly nameRu: string;
    readonly labelRu: string;
    readonly descriptionRu: string;
    readonly clinicalSignsRu: string;
    readonly badgeColor: string;
    readonly badgeBg: string;
    readonly badgeBorder: string;
    readonly emoji: string;
    readonly managementStrategiesRu: readonly string[];
    readonly clinicalNotesTemplateRu: string;
}
export declare const FRANKL_SCALE_DEFINITIONS: Readonly<Record<FranklRating, FranklRatingDefinition>>;
export declare function getFranklDefinition(rating: FranklRating): FranklRatingDefinition;
export declare const silveringDrugSchema: z.ZodEnum<["Saforide 38%", "Аргенат 30%", "Riva Star SDF"]>;
export type SilveringDrug = z.infer<typeof silveringDrugSchema>;
export interface PediatricSilveringOptions {
    readonly teethNumbers: readonly number[];
    readonly drug?: SilveringDrug | undefined;
    readonly applicationsCount?: number | undefined;
    readonly clinicalNotes?: string | undefined;
}
export interface PediatricSilveringResult {
    readonly procedureNameRu: string;
    readonly teethNumbers: readonly number[];
    readonly drug: SilveringDrug;
    readonly applicationsCount: number;
    readonly indicationsRu: string;
    readonly protocolDescriptionRu: string;
    readonly parentWarningRu: string;
    readonly parentRecommendationsRu: readonly string[];
    readonly formattedDiaryEntryRu: string;
}
export declare function calculatePediatricSilveringProtocol(options: PediatricSilveringOptions): PediatricSilveringResult;
export declare const fissureSealingMethodSchema: z.ZodEnum<["non_invasive", "invasive"]>;
export type FissureSealingMethod = z.infer<typeof fissureSealingMethodSchema>;
export declare const fissureSealantMaterialSchema: z.ZodEnum<["Clinpro Sealant (3M)", "Fissurit FX (VOCO)", "Helioseal F (Ivoclar)", "Grandio Seal"]>;
export type FissureSealantMaterial = z.infer<typeof fissureSealantMaterialSchema>;
export interface PediatricFissureSealingOptions {
    readonly teethNumbers: readonly number[];
    readonly method?: FissureSealingMethod | undefined;
    readonly material?: FissureSealantMaterial | undefined;
    readonly clinicalNotes?: string | undefined;
}
export interface PediatricFissureSealingResult {
    readonly procedureNameRu: string;
    readonly teethNumbers: readonly number[];
    readonly method: FissureSealingMethod;
    readonly methodNameRu: string;
    readonly material: FissureSealantMaterial;
    readonly protocolDescriptionRu: string;
    readonly parentRecommendationsRu: readonly string[];
    readonly formattedDiaryEntryRu: string;
}
export declare function calculatePediatricFissureSealingProtocol(options: PediatricFissureSealingOptions): PediatricFissureSealingResult;
export declare const pulpotomySubBaseMaterialSchema: z.ZodEnum<["Pulpotec", "Biodentine", "MTA ProRoot", "Formocresol"]>;
export type PulpotomySubBaseMaterial = z.infer<typeof pulpotomySubBaseMaterialSchema>;
export declare const pulpotomyRestorationSchema: z.ZodEnum<["composite", "glass_ionomer", "stainless_steel_crown_ssc", "zirconia_crown"]>;
export type PulpotomyRestoration = z.infer<typeof pulpotomyRestorationSchema>;
export interface PediatricPulpotomyOptions {
    readonly toothNumber: number;
    readonly subBaseMaterial?: PulpotomySubBaseMaterial | undefined;
    readonly restoration?: PulpotomyRestoration | undefined;
    readonly patientWeightKg?: number | undefined;
    readonly patientAgeYears?: number | undefined;
    readonly clinicalNotes?: string | undefined;
}
export interface PediatricPulpotomyResult {
    readonly procedureNameRu: string;
    readonly toothNumber: number;
    readonly subBaseMaterial: PulpotomySubBaseMaterial;
    readonly restoration: PulpotomyRestoration;
    readonly restorationNameRu: string;
    readonly protocolDescriptionRu: string;
    readonly anesthesiaSafetyWarningRu: string;
    readonly painManagementRu: string;
    readonly parentRecommendationsRu: readonly string[];
    readonly formattedDiaryEntryRu: string;
}
export declare function calculatePediatricPulpotomyProtocol(options: PediatricPulpotomyOptions): PediatricPulpotomyResult;
export interface PediatricParentMemoOptions {
    readonly patientName?: string | undefined;
    readonly patientAgeYears?: number | undefined;
    readonly clinicName?: string | undefined;
    readonly doctorName?: string | undefined;
    readonly franklRating?: FranklRating | undefined;
    readonly silvering?: PediatricSilveringOptions | undefined;
    readonly fissureSealing?: PediatricFissureSealingOptions | undefined;
    readonly pulpotomy?: PediatricPulpotomyOptions | undefined;
    readonly generalHygieneAdvice?: boolean | undefined;
    readonly customNotes?: string | undefined;
}
export declare function generatePediatricParentRecommendations(options?: PediatricParentMemoOptions): string;
