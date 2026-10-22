/**
 * DENTE CRM — Mandibular Nerve & Bone Safety Audit Types (Layer 0)
 * Compliant with Mandate 8b (strictly <= 120 lines).
 */

import { MANDIBULAR_NERVE_SAFETY_MARGIN_MM } from "../cbctCaliperNerveMath.js";
export { MANDIBULAR_NERVE_SAFETY_MARGIN_MM };
import type { MischClassificationResult } from "../boneDensityMischMath.js";

export const MANDIBULAR_NERVE_DANGER_THRESHOLD_MM = 1.5;
export const MIN_BUCCAL_BONE_WALL_MM = 1.5;
export const MIN_LINGUAL_BONE_WALL_MM = 1.0;

export type ImplantBrandKey = "straumann" | "nobel_biocare" | "osstem" | "dentium" | "mis";

export interface VirtualImplantSpec {
	readonly id: string;
	readonly brand: ImplantBrandKey;
	readonly brandName: string;
	readonly lineName: string;
	readonly diameterMm: number;
	readonly lengthMm: number;
	readonly platformDiameterMm: number;
	readonly apexDiameterMm: number;
	readonly priceKopecks: number;
	readonly articleNumber: string;
}

export interface CrossSectionImplantPose {
	readonly entryPoint: { readonly x: number; readonly y: number };
	readonly apexPoint?: { readonly x: number; readonly y: number } | undefined;
	readonly angulationDeg: number;
	readonly implantSpec: VirtualImplantSpec;
	readonly targetToothFdi?: number | undefined;
}

export interface MandibularCanalCrossSection {
	readonly center: { readonly x: number; readonly y: number };
	readonly radiusMm: number;
	readonly safetyMarginMm: number;
}

export interface AlveolarRidgeEnvelope {
	readonly crestPoint: { readonly x: number; readonly y: number };
	readonly basePoint: { readonly x: number; readonly y: number };
	readonly buccalCrestPoint: { readonly x: number; readonly y: number };
	readonly lingualCrestPoint: { readonly x: number; readonly y: number };
	readonly ridgeWidthMm: number;
	readonly ridgeHeightMm: number;
}

export interface NerveSafetyAuditResult {
	readonly distanceToCanalCenterMm: number;
	readonly netClearanceToCanalWallMm: number;
	readonly netClearanceToSafetyCorridorMm: number;
	readonly safetyStatus: "safe" | "warning" | "danger" | "unmeasured";
	readonly isDangerous: boolean;
	readonly isWarning: boolean;
	readonly shouldTriggerAudioAlarm?: boolean;
	readonly closestImplantPoint: { readonly x: number; readonly y: number };
	readonly closestNervePoint: { readonly x: number; readonly y: number };
	readonly clinicalMessageRu: string;
}

export function createUnmeasuredNerveSafety(): NerveSafetyAuditResult {
	return {
		distanceToCanalCenterMm: 0,
		netClearanceToCanalWallMm: 0,
		netClearanceToSafetyCorridorMm: 0,
		safetyStatus: "unmeasured",
		isDangerous: false,
		isWarning: false,
		shouldTriggerAudioAlarm: false,
		closestImplantPoint: { x: 0, y: 0 },
		closestNervePoint: { x: 0, y: 0 },
		clinicalMessageRu: "Канал не размечен",
	};
}

export interface AlveolarContainmentResult {
	readonly residualBuccalBoneMm: number;
	readonly residualLingualBoneMm: number;
	readonly isBuccalBoneAdequate: boolean;
	readonly isLingualBoneAdequate: boolean;
	readonly isApexContained: boolean;
	readonly requiresGbrAugmentation: boolean;
	readonly clinicalWarningRu?: string | undefined;
	readonly isUnmeasured?: boolean | undefined;
}

export interface ComprehensiveCbctPlanAudit {
	readonly toothFdi: number;
	readonly implantPose: CrossSectionImplantPose;
	readonly apexPoint: { readonly x: number; readonly y: number };
	readonly nerveSafety: NerveSafetyAuditResult;
	readonly boneContainment: AlveolarContainmentResult;
	readonly boneQuality: MischClassificationResult;
	readonly isPlanApproved: boolean;
	readonly form043DiaryText: string;
	readonly treatmentPlanItem: {
		readonly code: string;
		readonly nameRu: string;
		readonly priceKopecks: number;
		readonly priceFormattedRu: string;
	};
}
