/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE & SEPA PERIODONTOGRAM CLINICAL ENGINE & SCHEMAS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Implements SEPA (Sociedad Española de Periodoncia) & Florida Probe standard
 * 6-point clinical periodontal charting, snapshot models, and index computations.
 *
 * Probing sites per tooth (6 points):
 * - Vestibular / Buccal: MV (Mesio-Vestibular), V (Mid-Vestibular), DV (Disto-Vestibular)
 * - Lingual / Palatal:   ML (Mesio-Lingual),    L (Mid-Lingual),    DL (Disto-Lingual)
 */
import { z } from "zod";
// FDI Permanent Teeth tracked in Periodontogram (11–18, 21–28, 31–38, 41–48)
export const SEPA_PERMANENT_TEETH = [
    18, 17, 16, 15, 14, 13, 12, 11,
    21, 22, 23, 24, 25, 26, 27, 28,
    38, 37, 36, 35, 34, 33, 32, 31,
    41, 42, 43, 44, 45, 46, 47, 48,
];
export const SEPA_SITE_CODES = ["MV", "V", "DV", "ML", "L", "DL"];
export const VESTIBULAR_SEPA_SITES = ["MV", "V", "DV"];
export const PALATAL_SEPA_SITES = ["ML", "L", "DL"];
export const PROGNOSIS_VALUES = ["good", "fair", "poor", "hopeless"];
export const FURCATION_VALUES = ["0", "I", "II", "III"];
export const SNAPSHOT_STATUS_VALUES = ["draft", "closed"];
export const SITES_PER_TOOTH = 6;
export const DEEP_POCKET_THRESHOLD_MM = 5;
export const HEATMAP_TONE_TO_HEX = {
    neutral: "#94a3b8", // slate-400
    success: "#10b981", // emerald-500 (<= 3mm)
    "warning-low": "#f59e0b", // amber-500 (4mm)
    "warning-high": "#f97316", // orange-500 (5-6mm)
    error: "#ef4444", // rose-500 (>= 7mm)
};
/**
 * Maps probing depth to discrete 4-tone pastel clinical heatmap tone.
 */
export function getProbingDepthHeatmapTone(pd) {
    if (pd === null || pd === undefined || !Number.isFinite(pd))
        return "neutral";
    if (pd <= 3)
        return "success";
    if (pd === 4)
        return "warning-low";
    if (pd <= 6)
        return "warning-high";
    return "error";
}
export function getProbingDepthHexColor(pd) {
    return HEATMAP_TONE_TO_HEX[getProbingDepthHeatmapTone(pd)];
}
// ───────────────────────────────────────────────────────────────────────────
// Zod Schemas
// ───────────────────────────────────────────────────────────────────────────
export const sepaSiteCodeSchema = z.enum(["MV", "V", "DV", "ML", "L", "DL"]);
export const sepaSiteValueSchema = z.object({
    siteCode: sepaSiteCodeSchema,
    probingDepthMm: z.number().int().min(0).max(15).nullable().default(null),
    gingivalMarginMm: z.number().int().min(-5).max(10).nullable().default(null),
    bleedingOnProbing: z.boolean().default(false),
    plaque: z.boolean().default(false),
    suppuration: z.boolean().default(false),
    calculus: z.boolean().default(false),
});
export const sepaSitePatchSchema = z.object({
    probingDepthMm: z.number().int().min(0).max(15).nullable().optional(),
    gingivalMarginMm: z.number().int().min(-5).max(10).nullable().optional(),
    bleedingOnProbing: z.boolean().optional(),
    plaque: z.boolean().optional(),
    suppuration: z.boolean().optional(),
    calculus: z.boolean().optional(),
});
export const sepaToothValueSchema = z.object({
    toothNumber: z.number().int().min(11).max(48),
    isPresent: z.boolean().default(true),
    isImplant: z.boolean().default(false),
    mobility: z.number().int().min(0).max(3).nullable().default(null),
    prognosis: z.enum(PROGNOSIS_VALUES).nullable().default(null),
    furcationBuccal: z.enum(FURCATION_VALUES).nullable().default(null),
    furcationLingual: z.enum(FURCATION_VALUES).nullable().default(null),
    keratinizedGingivaMm: z.number().int().min(0).max(20).nullable().default(null),
    sites: z.array(sepaSiteValueSchema).default([]),
});
export const sepaToothPatchSchema = z.object({
    isPresent: z.boolean().optional(),
    isImplant: z.boolean().optional(),
    mobility: z.number().int().min(0).max(3).nullable().optional(),
    prognosis: z.enum(PROGNOSIS_VALUES).nullable().optional(),
    furcationBuccal: z.enum(FURCATION_VALUES).nullable().optional(),
    furcationLingual: z.enum(FURCATION_VALUES).nullable().optional(),
    keratinizedGingivaMm: z.number().int().min(0).max(20).nullable().optional(),
});
export const periodontogramIndicesSchema = z.object({
    bopPct: z.number().min(0).max(100),
    piPct: z.number().min(0).max(100),
    calMeanMm: z.number().min(0),
    deepPocketsCount: z.number().int().min(0),
    moderatePocketsCount: z.number().int().min(0).optional(),
    teethWithMobilityCount: z.number().int().min(0).optional(),
    teethWithFurcationCount: z.number().int().min(0).optional(),
    sitesWithSuppurationCount: z.number().int().min(0).optional(),
    totalSitesProbed: z.number().int().min(0).optional(),
    totalTeethExamined: z.number().int().min(0).optional(),
});
export const periodontogramSnapshotSchema = z.object({
    id: z.string().uuid(),
    clinicId: z.string().uuid(),
    patientId: z.string().uuid(),
    status: z.enum(SNAPSHOT_STATUS_VALUES),
    recordedAt: z.string().datetime(),
    recordedBy: z.string().uuid(),
    closedAt: z.string().datetime().nullable().default(null),
    closedBy: z.string().uuid().nullable().default(null),
    notes: z.string().max(4000).nullable().default(null),
    indices: periodontogramIndicesSchema.nullable().default(null),
    teeth: z.array(sepaToothValueSchema).default([]),
});
export const periodontogramTimelineEntrySchema = z.object({
    snapshotId: z.string().uuid(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    changeCount: z.number().int().min(0),
});
export const periodontogramTimelineResponseSchema = z.object({
    dates: z.array(periodontogramTimelineEntrySchema),
    draft: periodontogramSnapshotSchema.nullable().default(null),
});
function getPresentTeeth(teeth) {
    return teeth.filter((t) => t.isPresent);
}
function getDenominator(teeth, mode) {
    const present = getPresentTeeth(teeth);
    if (mode === "theoretical") {
        return present.length * SITES_PER_TOOTH;
    }
    let count = 0;
    for (const t of present) {
        for (const s of t.sites) {
            if (s.probingDepthMm !== null)
                count++;
        }
    }
    return count;
}
/**
 * Computes Bleeding on Probing (BOP) percentage.
 */
export function computeBopPercentage(teeth, options = {}) {
    const mode = options.mode ?? "theoretical";
    const denom = getDenominator(teeth, mode);
    if (denom === 0)
        return 0.0;
    let bleedingSites = 0;
    for (const t of getPresentTeeth(teeth)) {
        for (const s of t.sites) {
            if (s.bleedingOnProbing)
                bleedingSites++;
        }
    }
    return Math.round((100.0 * bleedingSites * 10) / denom) / 10;
}
/**
 * Computes Plaque Index (PI) percentage.
 */
export function computePlaqueIndex(teeth, options = {}) {
    const mode = options.mode ?? "theoretical";
    const denom = getDenominator(teeth, mode);
    if (denom === 0)
        return 0.0;
    let plaqueSites = 0;
    for (const t of getPresentTeeth(teeth)) {
        for (const s of t.sites) {
            if (s.plaque)
                plaqueSites++;
        }
    }
    return Math.round((100.0 * plaqueSites * 10) / denom) / 10;
}
/**
 * Computes Mean Clinical Attachment Level in mm.
 */
export function computeMeanCal(teeth, options = {}) {
    const mode = options.mode ?? "theoretical";
    const denom = getDenominator(teeth, mode);
    if (denom === 0)
        return 0.0;
    let calSum = 0;
    for (const t of getPresentTeeth(teeth)) {
        for (const s of t.sites) {
            if (s.probingDepthMm !== null) {
                calSum += Math.max(0, s.probingDepthMm + (s.gingivalMarginMm ?? 0));
            }
        }
    }
    return Math.round((calSum / denom) * 100) / 100;
}
/**
 * Counts distinct teeth with at least one deep pocket (PD >= threshold).
 */
export function countTeethWithDeepPockets(teeth, thresholdMm = DEEP_POCKET_THRESHOLD_MM) {
    let count = 0;
    for (const t of getPresentTeeth(teeth)) {
        const hasDeep = t.sites.some((s) => s.probingDepthMm !== null && s.probingDepthMm >= thresholdMm);
        if (hasDeep)
            count++;
    }
    return count;
}
/**
 * Computes complete bundle of periodontal indices.
 */
export function computeCompletePerioIndices(teeth, options = {}) {
    const threshold = options.deepPocketThresholdMm ?? DEEP_POCKET_THRESHOLD_MM;
    const presentTeeth = getPresentTeeth(teeth);
    let moderatePockets = 0;
    let mobileTeeth = 0;
    let furcationTeeth = 0;
    let suppurationSites = 0;
    let totalProbed = 0;
    for (const t of presentTeeth) {
        if (t.mobility !== null && t.mobility > 0)
            mobileTeeth++;
        if ((t.furcationBuccal !== null && t.furcationBuccal !== "0") ||
            (t.furcationLingual !== null && t.furcationLingual !== "0")) {
            furcationTeeth++;
        }
        for (const s of t.sites) {
            if (s.probingDepthMm !== null) {
                totalProbed++;
                if (s.probingDepthMm === 4)
                    moderatePockets++;
            }
            if (s.suppuration)
                suppurationSites++;
        }
    }
    return {
        bopPct: computeBopPercentage(teeth, options),
        piPct: computePlaqueIndex(teeth, options),
        calMeanMm: computeMeanCal(teeth, options),
        deepPocketsCount: countTeethWithDeepPockets(teeth, threshold),
        moderatePocketsCount: moderatePockets,
        teethWithMobilityCount: mobileTeeth,
        teethWithFurcationCount: furcationTeeth,
        sitesWithSuppurationCount: suppurationSites,
        totalSitesProbed: totalProbed,
        totalTeethExamined: presentTeeth.length,
    };
}
