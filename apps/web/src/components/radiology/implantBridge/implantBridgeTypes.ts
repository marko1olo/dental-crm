/**
 * implantBridgeTypes.ts — типы, константы и прейскуранты для КЛКТ-имплантологического моста.
 * Mandate 8b: Модульность, строго < 120 строк.
 * Mandate 8d: Ноль мультяшных эмодзи.
 */

import type {
	ImplantBrandKey,
	VirtualImplantSpec,
	CrossSectionImplantPose,
	MandibularCanalCrossSection,
	NerveSafetyAuditResult,
	AlveolarRidgeEnvelope,
} from "../implantSafetyEngine";
import type { AlveolarRidgeCaliperMeasurement } from "../cbctCaliperNerveMath";
import type { HUZoneSampling, MischClassificationResult } from "../boneDensityMischMath";
import type { RadiologyStudy } from "../types";

export type {
	ImplantBrandKey,
	VirtualImplantSpec,
	CrossSectionImplantPose,
	MandibularCanalCrossSection,
	NerveSafetyAuditResult,
	AlveolarRidgeEnvelope,
};

export interface CtImplantBridgeParams {
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly doctorId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly toothFdi: number;
	readonly implantSpec: VirtualImplantSpec;
	readonly angulationDeg: number;
	readonly ridgeHeightMm?: number | null | undefined;
	readonly ridgeWidthMm?: number | null | undefined;
	readonly ridgeW2Mm?: number | null | undefined;
	readonly ridgeW6Mm?: number | null | undefined;
	readonly sinusLiftRecommendation?: string | null | undefined;
	readonly mischClass?: string | null | undefined;
	readonly meanHU: number | null;
	readonly nerveClearanceMm: number | null;
	readonly recommendedTorqueNcm: string;
	readonly drillingProtocol: string;
	readonly isNerveWarning?: boolean | undefined;
	readonly isNerveDanger?: boolean | undefined;
	readonly customPriceRub?: number | undefined;
}

export interface ImplantDiarySoapPayload {
	readonly statusLocalis: string;
	readonly treatmentDescription: string;
	readonly diagnosisIcd10: string;
	readonly diagnosisTooth: string;
}

export interface QuickScheduleDraftPayload {
	readonly toothNumber: number;
	readonly title: string;
	readonly procedureName: string;
	readonly durationMinutes: number;
	readonly stageKind: "stage_2_surgery";
	readonly notes: string;
}

export interface ExportPdfReportParams {
	readonly targetTooth: number;
	readonly currentImplantPose: CrossSectionImplantPose;
	readonly currentCanal: MandibularCanalCrossSection;
	readonly huSamplingResult: HUZoneSampling;
	readonly patientDisplayName: string;
	readonly study?: RadiologyStudy | null | undefined;
	readonly mischClassification: MischClassificationResult;
	readonly nerveAuditResult: NerveSafetyAuditResult;
	readonly activeCaliper?: AlveolarRidgeCaliperMeasurement | null | undefined;
	readonly ridgeHeightMm?: number | null | undefined;
	readonly ridgeWidthMm?: number | null | undefined;
	readonly envelope?: AlveolarRidgeEnvelope | null | undefined;
}

export interface AddCbctToFinanceParams {
	readonly patientId?: string | undefined;
	readonly toothFdi?: number | undefined;
	readonly priceRub?: number | undefined;
	readonly doctorName?: string | undefined;
}

export interface AddCbctSurgicalToFinanceParams {
	readonly patientId?: string | undefined;
	readonly toothFdi: number;
	readonly implantSpec: VirtualImplantSpec;
	readonly ridgeHeightMm?: number | null | undefined;
	readonly ridgeWidthMm?: number | null | undefined;
	readonly sinusLiftRecommendation?: string | null | undefined;
	readonly doctorName?: string | undefined;
}

export interface SurgicalFinanceExportResult {
	readonly services: ReadonlyArray<{ code: string; title: string; priceRub: number }>;
	readonly totalRub: number;
}

export const BRAND_LABELS: Record<ImplantBrandKey, string> = {
	straumann: "Straumann (Швейцария)",
	nobel_biocare: "Nobel Biocare (Швеция/США)",
	osstem: "Osstem TS III (Южная Корея)",
	dentium: "Dentium SuperLine (Южная Корея)",
	mis: "MIS V3/Seven (Израиль)",
};

export const DEFAULT_IMPLANT_PRICES_RUB: Record<ImplantBrandKey, number> = {
	straumann: 48000,
	nobel_biocare: 45000,
	osstem: 24000,
	dentium: 26000,
	mis: 22000,
};

export const STORAGE_PREFIX = "dente_custom_plan_items_";

export function getImplantBrandTitle(brand: ImplantBrandKey): string {
	return BRAND_LABELS[brand] || brand.toUpperCase();
}

export const STATUTORY_CBCT_804N = {
	code804n: "A06.07.012",
	statutoryTitle804n: "Компьютерная томография челюстно-лицевой области",
	commercialTitle: "3D Компьютерная томография (КЛКТ) челюстно-лицевой области (обе челюсти)",
	category: "radiology",
	basePriceRub: 3800,
	basePriceKopecks: 380000,
	stageKind: "stage_1_therapy" as const,
	vatRate: 0 as const,
	vatExemptionArticle: "пп. 2 п. 2 ст. 149 НК РФ",
};
