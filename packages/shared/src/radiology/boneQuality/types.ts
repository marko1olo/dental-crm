/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL CBCT BONE QUALITY ENGINE — DOMAIN TYPES & SCHEMAS (LAYER 0)
 * ═══════════════════════════════════════════════════════════════════════════
 * Zod schemas and TypeScript interfaces for Carl E. Misch density classes,
 * Lekholm & Zarb morphology types, osteotomy planning, and 3D sampling configs.
 *
 * 100% pure TypeScript, zero runtime dependencies except Zod.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { z } from "zod";
import type { Vec3, VolumeSamplingData } from "../cprMath.js";

// ── Misch Bone Density Classification Types ───────────────────

export const mischBoneClassSchema = z.enum(["D1", "D2", "D3", "D4", "D5"]);
export type MischBoneClass = z.infer<typeof mischBoneClassSchema>;
export type BoneClass = MischBoneClass;
export type MischClass = MischBoneClass;
export type ExtendedMischClass = MischBoneClass;

// ── Lekholm & Zarb Morphology Typing ───────────────────────────

export const lekholmZarbTypeSchema = z.enum(["Type_I", "Type_II", "Type_III", "Type_IV"]);
export type LekholmZarbType = z.infer<typeof lekholmZarbTypeSchema>;

// ── Volumetric Bone Sampling Configuration ─────────────────────

export const boneSamplingConfigSchema = z.object({
	axialSteps: z.number().int().min(1).default(12),
	radialSteps: z.number().int().min(1).default(4),
	radialFraction: z.number().min(0).max(1).default(0.6),
	corticalSearchRadiusMm: z.number().positive().default(3.0),
	corticalThresholdHU: z.number().default(700),
});
export type BoneSamplingConfig = z.infer<typeof boneSamplingConfigSchema>;

// ── Osteotomy Protocol & Stability Forecast Types ──────────────

export const osteotomyDrillProtocolSchema = z.enum([
	"standard",
	"under_drill",
	"bone_tap_countersink",
	"bicortical_fixation",
]);
export type OsteotomyDrillProtocol = z.infer<typeof osteotomyDrillProtocolSchema>;

export const primaryStabilityExpectedSchema = z.enum([
	"high",
	"medium",
	"low",
	"compromised",
]);
export type PrimaryStabilityExpected = z.infer<typeof primaryStabilityExpectedSchema>;

export const osteotomyRecommendationSchema = z.object({
	drillProtocol: osteotomyDrillProtocolSchema,
	drillProtocolDescriptionRu: z.string(),
	recommendedTorqueNcm: z.object({
		min: z.number(),
		max: z.number(),
		target: z.number().optional(),
	}),
	estimatedISQ: z.object({
		min: z.number(),
		max: z.number(),
		target: z.number().optional(),
	}),
	primaryStabilityExpected: primaryStabilityExpectedSchema,
	coolingRecommendationRu: z.string(),
	surgicalTipsRu: z.array(z.string()),
});
export type OsteotomyRecommendation = z.infer<typeof osteotomyRecommendationSchema>;

// ── Bone Site Comprehensive Assessment ─────────────────────────

export const boneSiteAssessmentSchema = z.object({
	implantId: z.string(),
	toothNumber: z.number().int().min(11).max(48),
	meanHU: z.number(),
	mischClass: mischBoneClassSchema,
	lekholmZarbType: lekholmZarbTypeSchema,
	corticalThicknessCrestMm: z.number(),
	corticalThicknessApicalMm: z.number(),
	trabecularDensityHU: z.number(),
	osteotomyRecommendation: osteotomyRecommendationSchema,
	sampleCount: z.number().int().optional(),
	minHU: z.number().optional(),
	maxHU: z.number().optional(),
	stdDevHU: z.number().optional(),
	assessmentDate: z.string().optional(),
});
export type BoneSiteAssessment = z.infer<typeof boneSiteAssessmentSchema>;

// ── Clinical Reference Metadata Interfaces ─────────────────────

export interface MischClassificationInfo {
	readonly mischClass: MischBoneClass;
	readonly classNameRu: string;
	readonly anatomicalLocationRu: string;
	readonly densityRangeRu: string;
	readonly tactileFeelRu: string;
	readonly clinicalDescriptionRu: string;
}

export interface MischGuidance {
	boneClass: MischBoneClass;
	classNameRu: string;
	densityRangeRu: string;
	anatomicLocationRu: string;
	corticalDescriptionRu: string;
	trabecularDescriptionRu: string;
	tactileFeelRu: string;
	clinicalDescriptionRu: string;
	surgicalPreparationProtocolRu: string;
	drillingProtocolRu: string;
	recommendedTorqueNcm: {
		min: number;
		max: number;
		target: number;
	};
	healingMonths: {
		mandible: number;
		maxilla: number;
	};
	colorHex: string;
	bgBadgeHex: string;
	borderBadgeHex: string;
}

export type BoneQualityProfile = MischGuidance;

export interface MischDensityProfile {
	boneClass: MischBoneClass;
	minHU: number;
	maxHU: number;
	anatomicLocation: string;
	corticalDescription: string;
	trabecularDescription: string;
	drillingProtocol: string;
	expectedTorqueNcm: string;
	recommendedHealingMonths: number;
}

export interface MischBoneConfig {
	readonly mischClass: MischBoneClass;
	readonly classNameRu: string;
	readonly anatomicalLocationRu: string;
	readonly densityRangeRu: string;
	readonly gvMinInclusive: number;
	readonly gvMaxInclusive: number;
	readonly tactileFeelRu: string;
	readonly colorHex: string;
	readonly bgBadgeHex: string;
	readonly borderBadgeHex: string;
	readonly clinicalDescriptionRu: string;
	readonly surgicalPreparationProtocolRu: string;
	readonly recommendedTorqueNcm: {
		readonly min: number;
		readonly max: number;
		readonly target: number;
	};
	readonly healingMonths: {
		readonly mandible: number;
		readonly maxilla: number;
	};
}

export interface MischBoneAssessment extends MischBoneConfig {
	readonly measuredGv: number;
}

export interface LekholmZarbInfo {
	readonly type: LekholmZarbType;
	readonly nameRu: string;
	readonly descriptionRu: string;
	readonly morphologyRu: string;
}

// ── Volumetric Sampling & Metric Structures ────────────────────

export interface SampleImplantSiteBoneQualityParams {
	vol: VolumeSamplingData;
	entry: Vec3;
	apex: Vec3;
	radiusMm: number;
	config?: Partial<BoneSamplingConfig>;
	implantId?: string;
	toothNumber?: number;
}

export interface BoneSample {
	meanHU: number;
	bone: MischBoneClass;
	samples: number;
	minHU?: number;
	maxHU?: number;
	stdDevHU?: number;
	profile?: MischGuidance;
}

// ── Implant Drilling Sequence & HU Profile Structures ─────────

export type ImplantSystem =
	| "osstem"
	| "straumann"
	| "nobel"
	| "bredent"
	| "mdi"
	| "other";

export interface HUZoneProfile {
	corticalHU: number; // avg HU of coronal 20% (cortical plate)
	cancellousHU: number; // avg HU of middle 60% (trabecular)
	apicalHU: number; // avg HU of apical 20%
}

export interface DrillStep {
	step: number;
	drillType: string;
	diameterMm: number;
	depthMm: number;
	rpmRange: string;
	torqueNcm: string;
	irrigation: boolean;
	note?: string;
}

export interface DrillProtocol {
	mischClass: MischClass;
	implantSystem: ImplantSystem;
	implantDiameterMm: number;
	implantLengthMm: number;
	avgOverallHU: number;
	zones: HUZoneProfile;
	steps: DrillStep[];
	warnings: string[];
	underdrillingApplied: boolean;
	corticalTapRequired: boolean;
}

export interface ImplantStabilityMetrics {
	primaryStabilityExpected: PrimaryStabilityExpected;
	recommendedTorqueNcm: { min: number; max: number; target?: number };
	estimatedISQ: { min: number; max: number; target?: number };
}

export interface AnatomicalRiskMetrics {
	mandibularCanalDistanceMm?: number;
	maxillarySinusDistanceMm?: number;
	isSafeDistance: boolean;
	clinicalWarningRu?: string;
}
