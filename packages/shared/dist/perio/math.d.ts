import { type PerioChartSummary, type PerioToothRecord, type ProbingStep } from "./types.js";
/**
 * Calculates Clinical Attachment Level (CAL):
 * CAL = Probing Depth (PD) + Gingival Margin (GM).
 * - Positive GM (Recession): CAL = PD + GM (loss is greater than pocket depth)
 * - Zero GM (Normal margin at CEJ): CAL = PD
 * - Negative GM (Gingival overgrowth / Hyperplasia / False pocket): CAL = max(0, PD + GM)
 */
export declare function calculateClinicalAttachmentLevel(probingDepthMm: number, gingivalMarginMm: number): number;
/**
 * Checks whether a tooth is multi-rooted (where furcation assessment is clinically relevant).
 * - Upper molars (16..18, 26..28) have 3 roots (trifurcation: mesio-palatal, disto-palatal, buccal).
 * - Upper first premolars (14, 24) frequently have 2 roots (bifurcation: buccal & palatal).
 * - Lower molars (36..38, 46..48) have 2 roots (bifurcation: buccal & lingual).
 * - Primary molars (54, 55, 64, 65, 74, 75, 84, 85).
 */
export declare function isFurcationEligibleTooth(toothNumber: number): boolean;
export { isFurcationEligibleTooth as isPerioMultiRootedTooth };
/**
 * Generates continuous anatomical probing sequence across the entire dentition (Florida Probe):
 * 1. Upper Arch Buccal (18 DB -> 18 B -> 18 MB ... -> 28 DB)
 * 2. Upper Arch Palatal (28 DB -> ... -> 18 DL)
 * 3. Lower Arch Buccal (48 DB -> ... -> 38 DB)
 * 4. Lower Arch Lingual (38 DL -> ... -> 48 DL)
 */
export declare function generateFullMouthProbingSequence(teeth: readonly PerioToothRecord[]): ProbingStep[];
/**
 * Calculates Bone Loss / Age ratio (BL/Age) according to AAP/EFP 2018 Grading criteria.
 * - Grade A (Slow): < 0.25 - 0.5
 * - Grade B (Moderate): 0.5 - 1.0
 * - Grade C (Rapid): > 1.0
 */
export declare function calculateBoneLossAgeRatio(boneLossPercent: number, patientAgeYears: number): number;
/**
 * Derives default radiographic bone loss percentage from worst CAL if not explicitly provided.
 * Standard anatomical root length assumed ~12-14mm, so 1mm CAL loss ~ 7-8% bone loss.
 */
export declare function estimateBoneLossPercentFromTeeth(teeth: readonly PerioToothRecord[], maxCalMm?: number): number;
/**
 * Probing depth color classification for UI presentation.
 */
export declare function getProbingDepthColor(depthMm: number): {
    readonly textColor: string;
    readonly bgColor: string;
    readonly borderColor: string;
    readonly labelRu: string;
    readonly isDeep: boolean;
};
/**
 * Pure calculation function for periodontal indices (FMBS, FMPS, CAL, Suppuration, PRA risk).
 */
export declare function calculatePerioIndices(teeth: PerioToothRecord[]): PerioChartSummary;
export { calculateClinicalAttachmentLevel as calculateSepaCal };
