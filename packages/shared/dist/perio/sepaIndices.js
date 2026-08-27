/**
 * SEPA (Spanish Society of Periodontology) & European Federation of Periodontology (EFP)
 * Periodontal Index Calculation Engine.
 * Inspired by dentalpin perio architecture.
 *
 * Implements theoretical denominator BoP % / PI % anchoring:
 * Anchoring to 6 * present_teeth ensures partial or incomplete examinations
 * do not artificially inflate the bleeding on probing percentage.
 */
/**
 * Calculate Clinical Attachment Level (CAL) from Probing Depth (PD) and Gingival Margin (GM).
 * - GM > 0 (Recession): CAL = PD + GM
 * - GM = 0 (Normal): CAL = PD
 * - GM < 0 (Hyperplasia): CAL = max(0, PD + GM)
 */
export function calculateSepaCal(probingDepthMm, gingivalMarginMm) {
    return Math.max(0, probingDepthMm + gingivalMarginMm);
}
/**
 * Calculate comprehensive SEPA & Florida Periodontal Summary Indices
 */
export function calculateSepaIndices(teeth, sites) {
    const presentTeeth = teeth.filter((t) => t.isPresent);
    const presentTeethCount = presentTeeth.length;
    const totalTheoreticalSites = Math.max(1, presentTeethCount * 6);
    const probedSitesCount = sites.length;
    let bleedingSitesCount = 0;
    let plaqueSitesCount = 0;
    let deepPocketsCount = 0;
    let totalPdMm = 0;
    let totalCalMm = 0;
    const teethWithDeepPockets = new Set();
    for (const site of sites) {
        if (site.hasBleedingOnProbing)
            bleedingSitesCount++;
        if (site.hasPlaque)
            plaqueSitesCount++;
        totalPdMm += site.probingDepthMm;
        const cal = calculateSepaCal(site.probingDepthMm, site.gingivalMarginMm);
        totalCalMm += cal;
        if (site.probingDepthMm >= 5) {
            deepPocketsCount++;
            teethWithDeepPockets.add(site.toothFdi);
        }
    }
    const probedDenominator = Math.max(1, probedSitesCount);
    const bopPercentageSepa = Number.parseFloat(((bleedingSitesCount / totalTheoreticalSites) * 100).toFixed(1));
    const bopPercentageProbed = Number.parseFloat(((bleedingSitesCount / probedDenominator) * 100).toFixed(1));
    const plaquePercentageSepa = Number.parseFloat(((plaqueSitesCount / totalTheoreticalSites) * 100).toFixed(1));
    const plaquePercentageProbed = Number.parseFloat(((plaqueSitesCount / probedDenominator) * 100).toFixed(1));
    const meanPocketDepthMm = probedSitesCount > 0
        ? Number.parseFloat((totalPdMm / probedSitesCount).toFixed(2))
        : 0;
    const meanClinicalAttachmentLossMm = probedSitesCount > 0
        ? Number.parseFloat((totalCalMm / probedSitesCount).toFixed(2))
        : 0;
    let severityGrade = "mild";
    if (deepPocketsCount >= 8 || meanClinicalAttachmentLossMm >= 4.0) {
        severityGrade = "severe";
    }
    else if (deepPocketsCount >= 4 || meanClinicalAttachmentLossMm >= 2.5) {
        severityGrade = "moderate";
    }
    return {
        presentTeethCount,
        totalTheoreticalSites,
        probedSitesCount,
        bleedingSitesCount,
        plaqueSitesCount,
        bopPercentageSepa,
        bopPercentageProbed,
        plaquePercentageSepa,
        plaquePercentageProbed,
        deepPocketsCount,
        teethWithDeepPocketsCount: teethWithDeepPockets.size,
        meanPocketDepthMm,
        meanClinicalAttachmentLossMm,
        severityGrade,
    };
}
/**
 * Determine individual tooth periodontal prognosis (Kwok & Caton 2007)
 */
export function evaluateToothPrognosis(metrics, maxProbingDepthMm, maxAttachmentLossMm) {
    if (!metrics.isPresent)
        return "hopeless";
    // Hopeless: Miller Class 3 mobility + Severe furcation Grade 3 + Attachment loss to apex
    if (metrics.mobilityGrade === 3 && (metrics.furcationGradeBuccal === 3 || metrics.furcationGradeLingual === 3)) {
        return "hopeless";
    }
    // Poor: Miller Class 2 mobility OR Furcation Grade 2 OR Attachment loss >= 7mm
    if (metrics.mobilityGrade >= 2 || metrics.furcationGradeBuccal >= 2 || metrics.furcationGradeLingual >= 2 || maxAttachmentLossMm >= 7.0) {
        return "poor";
    }
    // Fair: Miller Class 1 mobility OR Furcation Grade 1 OR Probing depth 5-6mm
    if (metrics.mobilityGrade === 1 || metrics.furcationGradeBuccal === 1 || metrics.furcationGradeLingual === 1 || maxProbingDepthMm >= 5.0) {
        return "fair";
    }
    return "good";
}
