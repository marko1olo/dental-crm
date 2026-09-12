/**
 * boneQualityEngine.ts
 *
 * Transparent facade delegating to canonical @dental/shared radiology engine.
 * Per Mandate 8s: Single source of truth in packages/shared/src/radiology/boneQualityEngine.ts.
 */

export {
	type MischClass,
	type ExtendedMischClass,
	type ImplantSystem,
	type HUZoneProfile,
	type DrillStep,
	type DrillProtocol,
	classifyMisch,
	classifyExtendedBoneDensity,
	extractHUZones,
	generateDrillProtocol,
	mischDescription,
	// Canonical shared radiology types & functions
	type MischBoneClass,
	type BoneClass,
	type BoneQualityProfile,
	type MischGuidance,
	MISCH_CLINICAL_GUIDANCE,
	getMischBoneClinicalGuidance,
	type MischDensityProfile,
	MISCH_BONE_PROFILES,
	getMischProfile,
	type MischBoneConfig,
	MISCH_BONE_CONFIGS,
	type MischBoneAssessment,
	classifyMischBoneDensity,
	getMischClassConfig,
	type BoneSiteAssessment,
	type BoneSample,
	sampleImplantBoneHU,
	sampleImplantSiteBoneQuality,
	classifyBone,
	classifyMischBone,
	formatBoneQualityForm043A4Protocol,
} from "@dental/shared";
