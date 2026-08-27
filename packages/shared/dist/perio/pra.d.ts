import type { DiabetesStatus, PerioChartSummary, PerioToothRecord, PraRiskLevel, SmokingStatus } from "./types.js";
export interface PraInput {
    readonly teeth: readonly PerioToothRecord[];
    readonly summary?: PerioChartSummary | undefined;
    readonly patientAgeYears?: number | undefined;
    readonly radiographicBoneLossPercent?: number | undefined;
    readonly smokingStatus?: SmokingStatus | undefined;
    readonly diabetesStatus?: DiabetesStatus | undefined;
}
export interface PraVectorResult {
    readonly nameRu: string;
    readonly shortName: string;
    readonly valueDisplay: string;
    readonly numericValue: number;
    readonly riskLevel: PraRiskLevel;
    readonly thresholdDescriptionRu: string;
    readonly scoreNormalized: number;
}
export interface PraSpiderResult {
    readonly overallRisk: PraRiskLevel;
    readonly overallRiskLabelRu: string;
    readonly highRiskVectorsCount: number;
    readonly moderateRiskVectorsCount: number;
    readonly lowRiskVectorsCount: number;
    readonly vectors: {
        readonly bop: PraVectorResult;
        readonly deepPockets: PraVectorResult;
        readonly toothLoss: PraVectorResult;
        readonly boneLossAgeRatio: PraVectorResult;
        readonly systemicDiabetes: PraVectorResult;
        readonly environmentalSmoking: PraVectorResult;
    };
    readonly radarPolygonPoints: string;
    readonly radarPolygonCoordinates: ReadonlyArray<{
        readonly x: number;
        readonly y: number;
    }>;
}
/**
 * Computes Lang & Tonetti (2003) Periodontal Risk Assessment (PRA) Spider Diagram across 6 vectors:
 * 1. BOP % (Bleeding on Probing)
 * 2. Residual pockets PPD >= 5mm count
 * 3. Tooth loss (Missing teeth)
 * 4. Bone Loss / Age ratio (BL/Age)
 * 5. Systemic / Genetic factor (Diabetes HbA1c)
 * 6. Environmental factor (Smoking cigarettes/day)
 */
export declare function calculatePeriodontalRiskAssessment(input: PraInput): PraSpiderResult;
