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
export declare const SEPA_PERMANENT_TEETH: readonly [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28, 38, 37, 36, 35, 34, 33, 32, 31, 41, 42, 43, 44, 45, 46, 47, 48];
export declare const SEPA_SITE_CODES: readonly ["MV", "V", "DV", "ML", "L", "DL"];
export type SepaSiteCode = (typeof SEPA_SITE_CODES)[number];
export declare const VESTIBULAR_SEPA_SITES: readonly SepaSiteCode[];
export declare const PALATAL_SEPA_SITES: readonly SepaSiteCode[];
export declare const PROGNOSIS_VALUES: readonly ["good", "fair", "poor", "hopeless"];
export type PeriodontalPrognosis = (typeof PROGNOSIS_VALUES)[number];
export declare const FURCATION_VALUES: readonly ["0", "I", "II", "III"];
export type SepaFurcationGrade = (typeof FURCATION_VALUES)[number];
export declare const SNAPSHOT_STATUS_VALUES: readonly ["draft", "closed"];
export type SepaSnapshotStatus = (typeof SNAPSHOT_STATUS_VALUES)[number];
export declare const SITES_PER_TOOTH = 6;
export declare const DEEP_POCKET_THRESHOLD_MM = 5;
export type HeatmapTone = "neutral" | "success" | "warning-low" | "warning-high" | "error";
export declare const HEATMAP_TONE_TO_HEX: Record<HeatmapTone, string>;
/**
 * Maps probing depth to discrete 4-tone pastel clinical heatmap tone.
 */
export declare function getProbingDepthHeatmapTone(pd: number | null | undefined): HeatmapTone;
export declare function getProbingDepthHexColor(pd: number | null | undefined): string;
export declare const sepaSiteCodeSchema: z.ZodEnum<["MV", "V", "DV", "ML", "L", "DL"]>;
export declare const sepaSiteValueSchema: z.ZodObject<{
    siteCode: z.ZodEnum<["MV", "V", "DV", "ML", "L", "DL"]>;
    probingDepthMm: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
    gingivalMarginMm: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
    bleedingOnProbing: z.ZodDefault<z.ZodBoolean>;
    plaque: z.ZodDefault<z.ZodBoolean>;
    suppuration: z.ZodDefault<z.ZodBoolean>;
    calculus: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    probingDepthMm: number | null;
    gingivalMarginMm: number | null;
    bleedingOnProbing: boolean;
    suppuration: boolean;
    plaque: boolean;
    calculus: boolean;
    siteCode: "L" | "ML" | "DL" | "MV" | "V" | "DV";
}, {
    siteCode: "L" | "ML" | "DL" | "MV" | "V" | "DV";
    probingDepthMm?: number | null | undefined;
    gingivalMarginMm?: number | null | undefined;
    bleedingOnProbing?: boolean | undefined;
    suppuration?: boolean | undefined;
    plaque?: boolean | undefined;
    calculus?: boolean | undefined;
}>;
export type SepaSiteValue = z.infer<typeof sepaSiteValueSchema>;
export declare const sepaSitePatchSchema: z.ZodObject<{
    probingDepthMm: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    gingivalMarginMm: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    bleedingOnProbing: z.ZodOptional<z.ZodBoolean>;
    plaque: z.ZodOptional<z.ZodBoolean>;
    suppuration: z.ZodOptional<z.ZodBoolean>;
    calculus: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    probingDepthMm?: number | null | undefined;
    gingivalMarginMm?: number | null | undefined;
    bleedingOnProbing?: boolean | undefined;
    suppuration?: boolean | undefined;
    plaque?: boolean | undefined;
    calculus?: boolean | undefined;
}, {
    probingDepthMm?: number | null | undefined;
    gingivalMarginMm?: number | null | undefined;
    bleedingOnProbing?: boolean | undefined;
    suppuration?: boolean | undefined;
    plaque?: boolean | undefined;
    calculus?: boolean | undefined;
}>;
export type SepaSitePatch = z.infer<typeof sepaSitePatchSchema>;
export declare const sepaToothValueSchema: z.ZodObject<{
    toothNumber: z.ZodNumber;
    isPresent: z.ZodDefault<z.ZodBoolean>;
    isImplant: z.ZodDefault<z.ZodBoolean>;
    mobility: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
    prognosis: z.ZodDefault<z.ZodNullable<z.ZodEnum<["good", "fair", "poor", "hopeless"]>>>;
    furcationBuccal: z.ZodDefault<z.ZodNullable<z.ZodEnum<["0", "I", "II", "III"]>>>;
    furcationLingual: z.ZodDefault<z.ZodNullable<z.ZodEnum<["0", "I", "II", "III"]>>>;
    keratinizedGingivaMm: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
    sites: z.ZodDefault<z.ZodArray<z.ZodObject<{
        siteCode: z.ZodEnum<["MV", "V", "DV", "ML", "L", "DL"]>;
        probingDepthMm: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
        gingivalMarginMm: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
        bleedingOnProbing: z.ZodDefault<z.ZodBoolean>;
        plaque: z.ZodDefault<z.ZodBoolean>;
        suppuration: z.ZodDefault<z.ZodBoolean>;
        calculus: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        probingDepthMm: number | null;
        gingivalMarginMm: number | null;
        bleedingOnProbing: boolean;
        suppuration: boolean;
        plaque: boolean;
        calculus: boolean;
        siteCode: "L" | "ML" | "DL" | "MV" | "V" | "DV";
    }, {
        siteCode: "L" | "ML" | "DL" | "MV" | "V" | "DV";
        probingDepthMm?: number | null | undefined;
        gingivalMarginMm?: number | null | undefined;
        bleedingOnProbing?: boolean | undefined;
        suppuration?: boolean | undefined;
        plaque?: boolean | undefined;
        calculus?: boolean | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    toothNumber: number;
    mobility: number | null;
    isImplant: boolean;
    isPresent: boolean;
    prognosis: "good" | "fair" | "poor" | "hopeless" | null;
    furcationBuccal: "0" | "I" | "II" | "III" | null;
    furcationLingual: "0" | "I" | "II" | "III" | null;
    keratinizedGingivaMm: number | null;
    sites: {
        probingDepthMm: number | null;
        gingivalMarginMm: number | null;
        bleedingOnProbing: boolean;
        suppuration: boolean;
        plaque: boolean;
        calculus: boolean;
        siteCode: "L" | "ML" | "DL" | "MV" | "V" | "DV";
    }[];
}, {
    toothNumber: number;
    mobility?: number | null | undefined;
    isImplant?: boolean | undefined;
    isPresent?: boolean | undefined;
    prognosis?: "good" | "fair" | "poor" | "hopeless" | null | undefined;
    furcationBuccal?: "0" | "I" | "II" | "III" | null | undefined;
    furcationLingual?: "0" | "I" | "II" | "III" | null | undefined;
    keratinizedGingivaMm?: number | null | undefined;
    sites?: {
        siteCode: "L" | "ML" | "DL" | "MV" | "V" | "DV";
        probingDepthMm?: number | null | undefined;
        gingivalMarginMm?: number | null | undefined;
        bleedingOnProbing?: boolean | undefined;
        suppuration?: boolean | undefined;
        plaque?: boolean | undefined;
        calculus?: boolean | undefined;
    }[] | undefined;
}>;
export type SepaToothValue = z.infer<typeof sepaToothValueSchema>;
export declare const sepaToothPatchSchema: z.ZodObject<{
    isPresent: z.ZodOptional<z.ZodBoolean>;
    isImplant: z.ZodOptional<z.ZodBoolean>;
    mobility: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    prognosis: z.ZodOptional<z.ZodNullable<z.ZodEnum<["good", "fair", "poor", "hopeless"]>>>;
    furcationBuccal: z.ZodOptional<z.ZodNullable<z.ZodEnum<["0", "I", "II", "III"]>>>;
    furcationLingual: z.ZodOptional<z.ZodNullable<z.ZodEnum<["0", "I", "II", "III"]>>>;
    keratinizedGingivaMm: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    mobility?: number | null | undefined;
    isImplant?: boolean | undefined;
    isPresent?: boolean | undefined;
    prognosis?: "good" | "fair" | "poor" | "hopeless" | null | undefined;
    furcationBuccal?: "0" | "I" | "II" | "III" | null | undefined;
    furcationLingual?: "0" | "I" | "II" | "III" | null | undefined;
    keratinizedGingivaMm?: number | null | undefined;
}, {
    mobility?: number | null | undefined;
    isImplant?: boolean | undefined;
    isPresent?: boolean | undefined;
    prognosis?: "good" | "fair" | "poor" | "hopeless" | null | undefined;
    furcationBuccal?: "0" | "I" | "II" | "III" | null | undefined;
    furcationLingual?: "0" | "I" | "II" | "III" | null | undefined;
    keratinizedGingivaMm?: number | null | undefined;
}>;
export type SepaToothPatch = z.infer<typeof sepaToothPatchSchema>;
export declare const periodontogramIndicesSchema: z.ZodObject<{
    bopPct: z.ZodNumber;
    piPct: z.ZodNumber;
    calMeanMm: z.ZodNumber;
    deepPocketsCount: z.ZodNumber;
    moderatePocketsCount: z.ZodOptional<z.ZodNumber>;
    teethWithMobilityCount: z.ZodOptional<z.ZodNumber>;
    teethWithFurcationCount: z.ZodOptional<z.ZodNumber>;
    sitesWithSuppurationCount: z.ZodOptional<z.ZodNumber>;
    totalSitesProbed: z.ZodOptional<z.ZodNumber>;
    totalTeethExamined: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    deepPocketsCount: number;
    bopPct: number;
    piPct: number;
    calMeanMm: number;
    totalTeethExamined?: number | undefined;
    totalSitesProbed?: number | undefined;
    moderatePocketsCount?: number | undefined;
    sitesWithSuppurationCount?: number | undefined;
    teethWithMobilityCount?: number | undefined;
    teethWithFurcationCount?: number | undefined;
}, {
    deepPocketsCount: number;
    bopPct: number;
    piPct: number;
    calMeanMm: number;
    totalTeethExamined?: number | undefined;
    totalSitesProbed?: number | undefined;
    moderatePocketsCount?: number | undefined;
    sitesWithSuppurationCount?: number | undefined;
    teethWithMobilityCount?: number | undefined;
    teethWithFurcationCount?: number | undefined;
}>;
export type PeriodontogramIndices = z.infer<typeof periodontogramIndicesSchema>;
export declare const periodontogramSnapshotSchema: z.ZodObject<{
    id: z.ZodString;
    clinicId: z.ZodString;
    patientId: z.ZodString;
    status: z.ZodEnum<["draft", "closed"]>;
    recordedAt: z.ZodString;
    recordedBy: z.ZodString;
    closedAt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    closedBy: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    notes: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    indices: z.ZodDefault<z.ZodNullable<z.ZodObject<{
        bopPct: z.ZodNumber;
        piPct: z.ZodNumber;
        calMeanMm: z.ZodNumber;
        deepPocketsCount: z.ZodNumber;
        moderatePocketsCount: z.ZodOptional<z.ZodNumber>;
        teethWithMobilityCount: z.ZodOptional<z.ZodNumber>;
        teethWithFurcationCount: z.ZodOptional<z.ZodNumber>;
        sitesWithSuppurationCount: z.ZodOptional<z.ZodNumber>;
        totalSitesProbed: z.ZodOptional<z.ZodNumber>;
        totalTeethExamined: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        deepPocketsCount: number;
        bopPct: number;
        piPct: number;
        calMeanMm: number;
        totalTeethExamined?: number | undefined;
        totalSitesProbed?: number | undefined;
        moderatePocketsCount?: number | undefined;
        sitesWithSuppurationCount?: number | undefined;
        teethWithMobilityCount?: number | undefined;
        teethWithFurcationCount?: number | undefined;
    }, {
        deepPocketsCount: number;
        bopPct: number;
        piPct: number;
        calMeanMm: number;
        totalTeethExamined?: number | undefined;
        totalSitesProbed?: number | undefined;
        moderatePocketsCount?: number | undefined;
        sitesWithSuppurationCount?: number | undefined;
        teethWithMobilityCount?: number | undefined;
        teethWithFurcationCount?: number | undefined;
    }>>>;
    teeth: z.ZodDefault<z.ZodArray<z.ZodObject<{
        toothNumber: z.ZodNumber;
        isPresent: z.ZodDefault<z.ZodBoolean>;
        isImplant: z.ZodDefault<z.ZodBoolean>;
        mobility: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
        prognosis: z.ZodDefault<z.ZodNullable<z.ZodEnum<["good", "fair", "poor", "hopeless"]>>>;
        furcationBuccal: z.ZodDefault<z.ZodNullable<z.ZodEnum<["0", "I", "II", "III"]>>>;
        furcationLingual: z.ZodDefault<z.ZodNullable<z.ZodEnum<["0", "I", "II", "III"]>>>;
        keratinizedGingivaMm: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
        sites: z.ZodDefault<z.ZodArray<z.ZodObject<{
            siteCode: z.ZodEnum<["MV", "V", "DV", "ML", "L", "DL"]>;
            probingDepthMm: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
            gingivalMarginMm: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
            bleedingOnProbing: z.ZodDefault<z.ZodBoolean>;
            plaque: z.ZodDefault<z.ZodBoolean>;
            suppuration: z.ZodDefault<z.ZodBoolean>;
            calculus: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            probingDepthMm: number | null;
            gingivalMarginMm: number | null;
            bleedingOnProbing: boolean;
            suppuration: boolean;
            plaque: boolean;
            calculus: boolean;
            siteCode: "L" | "ML" | "DL" | "MV" | "V" | "DV";
        }, {
            siteCode: "L" | "ML" | "DL" | "MV" | "V" | "DV";
            probingDepthMm?: number | null | undefined;
            gingivalMarginMm?: number | null | undefined;
            bleedingOnProbing?: boolean | undefined;
            suppuration?: boolean | undefined;
            plaque?: boolean | undefined;
            calculus?: boolean | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        toothNumber: number;
        mobility: number | null;
        isImplant: boolean;
        isPresent: boolean;
        prognosis: "good" | "fair" | "poor" | "hopeless" | null;
        furcationBuccal: "0" | "I" | "II" | "III" | null;
        furcationLingual: "0" | "I" | "II" | "III" | null;
        keratinizedGingivaMm: number | null;
        sites: {
            probingDepthMm: number | null;
            gingivalMarginMm: number | null;
            bleedingOnProbing: boolean;
            suppuration: boolean;
            plaque: boolean;
            calculus: boolean;
            siteCode: "L" | "ML" | "DL" | "MV" | "V" | "DV";
        }[];
    }, {
        toothNumber: number;
        mobility?: number | null | undefined;
        isImplant?: boolean | undefined;
        isPresent?: boolean | undefined;
        prognosis?: "good" | "fair" | "poor" | "hopeless" | null | undefined;
        furcationBuccal?: "0" | "I" | "II" | "III" | null | undefined;
        furcationLingual?: "0" | "I" | "II" | "III" | null | undefined;
        keratinizedGingivaMm?: number | null | undefined;
        sites?: {
            siteCode: "L" | "ML" | "DL" | "MV" | "V" | "DV";
            probingDepthMm?: number | null | undefined;
            gingivalMarginMm?: number | null | undefined;
            bleedingOnProbing?: boolean | undefined;
            suppuration?: boolean | undefined;
            plaque?: boolean | undefined;
            calculus?: boolean | undefined;
        }[] | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    status: "draft" | "closed";
    id: string;
    patientId: string;
    notes: string | null;
    teeth: {
        toothNumber: number;
        mobility: number | null;
        isImplant: boolean;
        isPresent: boolean;
        prognosis: "good" | "fair" | "poor" | "hopeless" | null;
        furcationBuccal: "0" | "I" | "II" | "III" | null;
        furcationLingual: "0" | "I" | "II" | "III" | null;
        keratinizedGingivaMm: number | null;
        sites: {
            probingDepthMm: number | null;
            gingivalMarginMm: number | null;
            bleedingOnProbing: boolean;
            suppuration: boolean;
            plaque: boolean;
            calculus: boolean;
            siteCode: "L" | "ML" | "DL" | "MV" | "V" | "DV";
        }[];
    }[];
    clinicId: string;
    recordedAt: string;
    recordedBy: string;
    closedAt: string | null;
    closedBy: string | null;
    indices: {
        deepPocketsCount: number;
        bopPct: number;
        piPct: number;
        calMeanMm: number;
        totalTeethExamined?: number | undefined;
        totalSitesProbed?: number | undefined;
        moderatePocketsCount?: number | undefined;
        sitesWithSuppurationCount?: number | undefined;
        teethWithMobilityCount?: number | undefined;
        teethWithFurcationCount?: number | undefined;
    } | null;
}, {
    status: "draft" | "closed";
    id: string;
    patientId: string;
    clinicId: string;
    recordedAt: string;
    recordedBy: string;
    notes?: string | null | undefined;
    teeth?: {
        toothNumber: number;
        mobility?: number | null | undefined;
        isImplant?: boolean | undefined;
        isPresent?: boolean | undefined;
        prognosis?: "good" | "fair" | "poor" | "hopeless" | null | undefined;
        furcationBuccal?: "0" | "I" | "II" | "III" | null | undefined;
        furcationLingual?: "0" | "I" | "II" | "III" | null | undefined;
        keratinizedGingivaMm?: number | null | undefined;
        sites?: {
            siteCode: "L" | "ML" | "DL" | "MV" | "V" | "DV";
            probingDepthMm?: number | null | undefined;
            gingivalMarginMm?: number | null | undefined;
            bleedingOnProbing?: boolean | undefined;
            suppuration?: boolean | undefined;
            plaque?: boolean | undefined;
            calculus?: boolean | undefined;
        }[] | undefined;
    }[] | undefined;
    closedAt?: string | null | undefined;
    closedBy?: string | null | undefined;
    indices?: {
        deepPocketsCount: number;
        bopPct: number;
        piPct: number;
        calMeanMm: number;
        totalTeethExamined?: number | undefined;
        totalSitesProbed?: number | undefined;
        moderatePocketsCount?: number | undefined;
        sitesWithSuppurationCount?: number | undefined;
        teethWithMobilityCount?: number | undefined;
        teethWithFurcationCount?: number | undefined;
    } | null | undefined;
}>;
export type PeriodontogramSnapshot = z.infer<typeof periodontogramSnapshotSchema>;
export declare const periodontogramTimelineEntrySchema: z.ZodObject<{
    snapshotId: z.ZodString;
    date: z.ZodString;
    changeCount: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    date: string;
    snapshotId: string;
    changeCount: number;
}, {
    date: string;
    snapshotId: string;
    changeCount: number;
}>;
export type PeriodontogramTimelineEntry = z.infer<typeof periodontogramTimelineEntrySchema>;
export declare const periodontogramTimelineResponseSchema: z.ZodObject<{
    dates: z.ZodArray<z.ZodObject<{
        snapshotId: z.ZodString;
        date: z.ZodString;
        changeCount: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        date: string;
        snapshotId: string;
        changeCount: number;
    }, {
        date: string;
        snapshotId: string;
        changeCount: number;
    }>, "many">;
    draft: z.ZodDefault<z.ZodNullable<z.ZodObject<{
        id: z.ZodString;
        clinicId: z.ZodString;
        patientId: z.ZodString;
        status: z.ZodEnum<["draft", "closed"]>;
        recordedAt: z.ZodString;
        recordedBy: z.ZodString;
        closedAt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        closedBy: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        notes: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        indices: z.ZodDefault<z.ZodNullable<z.ZodObject<{
            bopPct: z.ZodNumber;
            piPct: z.ZodNumber;
            calMeanMm: z.ZodNumber;
            deepPocketsCount: z.ZodNumber;
            moderatePocketsCount: z.ZodOptional<z.ZodNumber>;
            teethWithMobilityCount: z.ZodOptional<z.ZodNumber>;
            teethWithFurcationCount: z.ZodOptional<z.ZodNumber>;
            sitesWithSuppurationCount: z.ZodOptional<z.ZodNumber>;
            totalSitesProbed: z.ZodOptional<z.ZodNumber>;
            totalTeethExamined: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            deepPocketsCount: number;
            bopPct: number;
            piPct: number;
            calMeanMm: number;
            totalTeethExamined?: number | undefined;
            totalSitesProbed?: number | undefined;
            moderatePocketsCount?: number | undefined;
            sitesWithSuppurationCount?: number | undefined;
            teethWithMobilityCount?: number | undefined;
            teethWithFurcationCount?: number | undefined;
        }, {
            deepPocketsCount: number;
            bopPct: number;
            piPct: number;
            calMeanMm: number;
            totalTeethExamined?: number | undefined;
            totalSitesProbed?: number | undefined;
            moderatePocketsCount?: number | undefined;
            sitesWithSuppurationCount?: number | undefined;
            teethWithMobilityCount?: number | undefined;
            teethWithFurcationCount?: number | undefined;
        }>>>;
        teeth: z.ZodDefault<z.ZodArray<z.ZodObject<{
            toothNumber: z.ZodNumber;
            isPresent: z.ZodDefault<z.ZodBoolean>;
            isImplant: z.ZodDefault<z.ZodBoolean>;
            mobility: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
            prognosis: z.ZodDefault<z.ZodNullable<z.ZodEnum<["good", "fair", "poor", "hopeless"]>>>;
            furcationBuccal: z.ZodDefault<z.ZodNullable<z.ZodEnum<["0", "I", "II", "III"]>>>;
            furcationLingual: z.ZodDefault<z.ZodNullable<z.ZodEnum<["0", "I", "II", "III"]>>>;
            keratinizedGingivaMm: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
            sites: z.ZodDefault<z.ZodArray<z.ZodObject<{
                siteCode: z.ZodEnum<["MV", "V", "DV", "ML", "L", "DL"]>;
                probingDepthMm: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
                gingivalMarginMm: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
                bleedingOnProbing: z.ZodDefault<z.ZodBoolean>;
                plaque: z.ZodDefault<z.ZodBoolean>;
                suppuration: z.ZodDefault<z.ZodBoolean>;
                calculus: z.ZodDefault<z.ZodBoolean>;
            }, "strip", z.ZodTypeAny, {
                probingDepthMm: number | null;
                gingivalMarginMm: number | null;
                bleedingOnProbing: boolean;
                suppuration: boolean;
                plaque: boolean;
                calculus: boolean;
                siteCode: "L" | "ML" | "DL" | "MV" | "V" | "DV";
            }, {
                siteCode: "L" | "ML" | "DL" | "MV" | "V" | "DV";
                probingDepthMm?: number | null | undefined;
                gingivalMarginMm?: number | null | undefined;
                bleedingOnProbing?: boolean | undefined;
                suppuration?: boolean | undefined;
                plaque?: boolean | undefined;
                calculus?: boolean | undefined;
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            toothNumber: number;
            mobility: number | null;
            isImplant: boolean;
            isPresent: boolean;
            prognosis: "good" | "fair" | "poor" | "hopeless" | null;
            furcationBuccal: "0" | "I" | "II" | "III" | null;
            furcationLingual: "0" | "I" | "II" | "III" | null;
            keratinizedGingivaMm: number | null;
            sites: {
                probingDepthMm: number | null;
                gingivalMarginMm: number | null;
                bleedingOnProbing: boolean;
                suppuration: boolean;
                plaque: boolean;
                calculus: boolean;
                siteCode: "L" | "ML" | "DL" | "MV" | "V" | "DV";
            }[];
        }, {
            toothNumber: number;
            mobility?: number | null | undefined;
            isImplant?: boolean | undefined;
            isPresent?: boolean | undefined;
            prognosis?: "good" | "fair" | "poor" | "hopeless" | null | undefined;
            furcationBuccal?: "0" | "I" | "II" | "III" | null | undefined;
            furcationLingual?: "0" | "I" | "II" | "III" | null | undefined;
            keratinizedGingivaMm?: number | null | undefined;
            sites?: {
                siteCode: "L" | "ML" | "DL" | "MV" | "V" | "DV";
                probingDepthMm?: number | null | undefined;
                gingivalMarginMm?: number | null | undefined;
                bleedingOnProbing?: boolean | undefined;
                suppuration?: boolean | undefined;
                plaque?: boolean | undefined;
                calculus?: boolean | undefined;
            }[] | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        status: "draft" | "closed";
        id: string;
        patientId: string;
        notes: string | null;
        teeth: {
            toothNumber: number;
            mobility: number | null;
            isImplant: boolean;
            isPresent: boolean;
            prognosis: "good" | "fair" | "poor" | "hopeless" | null;
            furcationBuccal: "0" | "I" | "II" | "III" | null;
            furcationLingual: "0" | "I" | "II" | "III" | null;
            keratinizedGingivaMm: number | null;
            sites: {
                probingDepthMm: number | null;
                gingivalMarginMm: number | null;
                bleedingOnProbing: boolean;
                suppuration: boolean;
                plaque: boolean;
                calculus: boolean;
                siteCode: "L" | "ML" | "DL" | "MV" | "V" | "DV";
            }[];
        }[];
        clinicId: string;
        recordedAt: string;
        recordedBy: string;
        closedAt: string | null;
        closedBy: string | null;
        indices: {
            deepPocketsCount: number;
            bopPct: number;
            piPct: number;
            calMeanMm: number;
            totalTeethExamined?: number | undefined;
            totalSitesProbed?: number | undefined;
            moderatePocketsCount?: number | undefined;
            sitesWithSuppurationCount?: number | undefined;
            teethWithMobilityCount?: number | undefined;
            teethWithFurcationCount?: number | undefined;
        } | null;
    }, {
        status: "draft" | "closed";
        id: string;
        patientId: string;
        clinicId: string;
        recordedAt: string;
        recordedBy: string;
        notes?: string | null | undefined;
        teeth?: {
            toothNumber: number;
            mobility?: number | null | undefined;
            isImplant?: boolean | undefined;
            isPresent?: boolean | undefined;
            prognosis?: "good" | "fair" | "poor" | "hopeless" | null | undefined;
            furcationBuccal?: "0" | "I" | "II" | "III" | null | undefined;
            furcationLingual?: "0" | "I" | "II" | "III" | null | undefined;
            keratinizedGingivaMm?: number | null | undefined;
            sites?: {
                siteCode: "L" | "ML" | "DL" | "MV" | "V" | "DV";
                probingDepthMm?: number | null | undefined;
                gingivalMarginMm?: number | null | undefined;
                bleedingOnProbing?: boolean | undefined;
                suppuration?: boolean | undefined;
                plaque?: boolean | undefined;
                calculus?: boolean | undefined;
            }[] | undefined;
        }[] | undefined;
        closedAt?: string | null | undefined;
        closedBy?: string | null | undefined;
        indices?: {
            deepPocketsCount: number;
            bopPct: number;
            piPct: number;
            calMeanMm: number;
            totalTeethExamined?: number | undefined;
            totalSitesProbed?: number | undefined;
            moderatePocketsCount?: number | undefined;
            sitesWithSuppurationCount?: number | undefined;
            teethWithMobilityCount?: number | undefined;
            teethWithFurcationCount?: number | undefined;
        } | null | undefined;
    }>>>;
}, "strip", z.ZodTypeAny, {
    draft: {
        status: "draft" | "closed";
        id: string;
        patientId: string;
        notes: string | null;
        teeth: {
            toothNumber: number;
            mobility: number | null;
            isImplant: boolean;
            isPresent: boolean;
            prognosis: "good" | "fair" | "poor" | "hopeless" | null;
            furcationBuccal: "0" | "I" | "II" | "III" | null;
            furcationLingual: "0" | "I" | "II" | "III" | null;
            keratinizedGingivaMm: number | null;
            sites: {
                probingDepthMm: number | null;
                gingivalMarginMm: number | null;
                bleedingOnProbing: boolean;
                suppuration: boolean;
                plaque: boolean;
                calculus: boolean;
                siteCode: "L" | "ML" | "DL" | "MV" | "V" | "DV";
            }[];
        }[];
        clinicId: string;
        recordedAt: string;
        recordedBy: string;
        closedAt: string | null;
        closedBy: string | null;
        indices: {
            deepPocketsCount: number;
            bopPct: number;
            piPct: number;
            calMeanMm: number;
            totalTeethExamined?: number | undefined;
            totalSitesProbed?: number | undefined;
            moderatePocketsCount?: number | undefined;
            sitesWithSuppurationCount?: number | undefined;
            teethWithMobilityCount?: number | undefined;
            teethWithFurcationCount?: number | undefined;
        } | null;
    } | null;
    dates: {
        date: string;
        snapshotId: string;
        changeCount: number;
    }[];
}, {
    dates: {
        date: string;
        snapshotId: string;
        changeCount: number;
    }[];
    draft?: {
        status: "draft" | "closed";
        id: string;
        patientId: string;
        clinicId: string;
        recordedAt: string;
        recordedBy: string;
        notes?: string | null | undefined;
        teeth?: {
            toothNumber: number;
            mobility?: number | null | undefined;
            isImplant?: boolean | undefined;
            isPresent?: boolean | undefined;
            prognosis?: "good" | "fair" | "poor" | "hopeless" | null | undefined;
            furcationBuccal?: "0" | "I" | "II" | "III" | null | undefined;
            furcationLingual?: "0" | "I" | "II" | "III" | null | undefined;
            keratinizedGingivaMm?: number | null | undefined;
            sites?: {
                siteCode: "L" | "ML" | "DL" | "MV" | "V" | "DV";
                probingDepthMm?: number | null | undefined;
                gingivalMarginMm?: number | null | undefined;
                bleedingOnProbing?: boolean | undefined;
                suppuration?: boolean | undefined;
                plaque?: boolean | undefined;
                calculus?: boolean | undefined;
            }[] | undefined;
        }[] | undefined;
        closedAt?: string | null | undefined;
        closedBy?: string | null | undefined;
        indices?: {
            deepPocketsCount: number;
            bopPct: number;
            piPct: number;
            calMeanMm: number;
            totalTeethExamined?: number | undefined;
            totalSitesProbed?: number | undefined;
            moderatePocketsCount?: number | undefined;
            sitesWithSuppurationCount?: number | undefined;
            teethWithMobilityCount?: number | undefined;
            teethWithFurcationCount?: number | undefined;
        } | null | undefined;
    } | null | undefined;
}>;
export type PeriodontogramTimelineResponse = z.infer<typeof periodontogramTimelineResponseSchema>;
export interface ComputationOptions {
    /**
     * "theoretical": Denominator is 6 * present_teeth (SEPA standard, prevents incomplete probe inflation).
     * "probed": Denominator is actual filled/measured sites (Florida probe standard).
     */
    mode?: "theoretical" | "probed";
    deepPocketThresholdMm?: number;
}
/**
 * Computes Bleeding on Probing (BOP) percentage.
 */
export declare function computeBopPercentage(teeth: readonly SepaToothValue[], options?: ComputationOptions): number;
/**
 * Computes Plaque Index (PI) percentage.
 */
export declare function computePlaqueIndex(teeth: readonly SepaToothValue[], options?: ComputationOptions): number;
/**
 * Computes Mean Clinical Attachment Level in mm.
 */
export declare function computeMeanCal(teeth: readonly SepaToothValue[], options?: ComputationOptions): number;
/**
 * Counts distinct teeth with at least one deep pocket (PD >= threshold).
 */
export declare function countTeethWithDeepPockets(teeth: readonly SepaToothValue[], thresholdMm?: number): number;
/**
 * Computes complete bundle of periodontal indices.
 */
export declare function computeCompletePerioIndices(teeth: readonly SepaToothValue[], options?: ComputationOptions): PeriodontogramIndices;
