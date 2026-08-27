/**
 * SEPA (Spanish Society of Periodontology) & European Federation of Periodontology (EFP)
 * Periodontal Index Calculation Engine.
 * Inspired by dentalpin perio architecture.
 *
 * Implements theoretical denominator BoP % / PI % anchoring:
 * Anchoring to 6 * present_teeth ensures partial or incomplete examinations
 * do not artificially inflate the bleeding on probing percentage.
 */
export interface SepaProbingSite {
    readonly toothFdi: number;
    readonly site: "MV" | "V" | "DV" | "ML" | "L" | "DL";
    readonly probingDepthMm: number;
    readonly gingivalMarginMm: number;
    readonly hasBleedingOnProbing: boolean;
    readonly hasPlaque: boolean;
    readonly hasSuppuration?: boolean | undefined;
}
export type ToothPrognosis = "good" | "fair" | "poor" | "hopeless";
export interface SepaToothMetrics {
    readonly toothFdi: number;
    readonly isPresent: boolean;
    readonly isImplant: boolean;
    readonly mobilityGrade: 0 | 1 | 2 | 3;
    readonly furcationGradeBuccal: 0 | 1 | 2 | 3;
    readonly furcationGradeLingual: 0 | 1 | 2 | 3;
    readonly keratinizedGingivaMm?: number | undefined;
    readonly clinicalPrognosis?: ToothPrognosis | undefined;
}
export interface SepaPeriodontalSummary {
    readonly presentTeethCount: number;
    readonly totalTheoreticalSites: number;
    readonly probedSitesCount: number;
    readonly bleedingSitesCount: number;
    readonly plaqueSitesCount: number;
    readonly bopPercentageSepa: number;
    readonly bopPercentageProbed: number;
    readonly plaquePercentageSepa: number;
    readonly plaquePercentageProbed: number;
    readonly deepPocketsCount: number;
    readonly teethWithDeepPocketsCount: number;
    readonly meanPocketDepthMm: number;
    readonly meanClinicalAttachmentLossMm: number;
    readonly severityGrade: "mild" | "moderate" | "severe";
}
/**
 * Calculate Clinical Attachment Level (CAL) from Probing Depth (PD) and Gingival Margin (GM).
 * - GM > 0 (Recession): CAL = PD + GM
 * - GM = 0 (Normal): CAL = PD
 * - GM < 0 (Hyperplasia): CAL = max(0, PD + GM)
 */
export declare function calculateSepaCal(probingDepthMm: number, gingivalMarginMm: number): number;
/**
 * Calculate comprehensive SEPA & Florida Periodontal Summary Indices
 */
export declare function calculateSepaIndices(teeth: readonly SepaToothMetrics[], sites: readonly SepaProbingSite[]): SepaPeriodontalSummary;
/**
 * Determine individual tooth periodontal prognosis (Kwok & Caton 2007)
 */
export declare function evaluateToothPrognosis(metrics: SepaToothMetrics, maxProbingDepthMm: number, maxAttachmentLossMm: number): ToothPrognosis;
