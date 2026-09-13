/**
 * CBCT IMPLANT PLANNING & MANDIBULAR NERVE SAFETY ALARM ENGINE
 *
 * Implements clinical algorithms for:
 * 1. 2D Cross-sectional slice virtual implant fitting & geometry.
 * 2. Mandatory 2.0 mm Mandibular Canal (N. alveolaris inferior) safety corridor monitoring.
 * 3. Real-time proximity calculation, danger zone collision detection & alarm triggers.
 * 4. Alveolar bone envelope containment (buccal >= 1.5 mm, lingual >= 1.0 mm).
 * 5. Structured Form 043/u diary generation and Treatment Plan line item export.
 *
 * Clinical Standards:
 * - Misch CE (2008): 2.0 mm safety margin coronal/anterior to mandibular canal to prevent IAN paresthesia.
 * - Buser et al. (2004): Minimum 1.5 mm buccal bone thickness for long-term ridge stability.
 * - Tarnow et al. (2000): 3.0 mm inter-implant biological width distance rule.
 */

import {
	sampleImplantBoneHU,
	evaluateImplantSafety,
	DEFAULT_SAFETY_THRESHOLDS,
	MISCH_BONE_PROFILES,
	classifyBone,
	getMischProfile,
	type BoneClass,
	type BoneSample,
	type MischDensityProfile,
	type ImplantSafety,
	type SafetyThresholds,
	type Vec3,
	type ImplantSeg,
	type VolumeSamplingData,
} from "@dental/shared";

export {
	sampleImplantBoneHU,
	evaluateImplantSafety,
	DEFAULT_SAFETY_THRESHOLDS,
	MISCH_BONE_PROFILES,
	classifyBone,
	getMischProfile,
	type BoneClass,
	type BoneSample,
	type MischDensityProfile,
	type ImplantSafety,
	type SafetyThresholds,
	type Vec3,
	type ImplantSeg,
	type VolumeSamplingData,
};

import {
	analyzeMischBoneQuality,
	computeHUZoneProfile,
	formatMischProtocolToDiaryText,
	type HUZoneSampling,
	type MischClassificationResult,
} from "./boneDensityMischMath";
import { MANDIBULAR_NERVE_SAFETY_MARGIN_MM } from "./cbctCaliperNerveMath";
import {
	type CbctVoxelVolume,
	type Point3D,
	sampleVoxelTrilinearHU,
	worldMmToVoxelContinuous,
} from "./cbctMprMath";
import { soundFeedback } from "../../services/audio/SoundFeedbackService";

export const MANDIBULAR_NERVE_DANGER_THRESHOLD_MM = 1.5;

export const MIN_BUCCAL_BONE_WALL_MM = 1.5;
export const MIN_LINGUAL_BONE_WALL_MM = 1.0;

export type ImplantBrandKey = "straumann" | "nobel_biocare" | "osstem" | "dentium";

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
	readonly entryPoint: { readonly x: number; readonly y: number }; // Coronal crest entry point (mm)
	readonly apexPoint?: { readonly x: number; readonly y: number }; // Optional precomputed apex
	readonly angulationDeg: number; // Tilt in degrees from vertical (0 = straight down)
	readonly implantSpec: VirtualImplantSpec;
	readonly targetToothFdi?: number;
}


export interface MandibularCanalCrossSection {
	readonly center: { readonly x: number; readonly y: number }; // Center coordinate in mm
	readonly radiusMm: number; // Anatomical radius of canal (typically 1.25..1.5 mm)
	readonly safetyMarginMm: number; // Required buffer (default 2.0 mm)
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
	readonly shouldTriggerAudioAlarm: boolean;
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
		clinicalMessageRu: "Загрузите КЛКТ для измерения плотности кости и расстояния до IAN",
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

// ─── STANDARD VIRTUAL IMPLANT FIXTURE CATALOG ────────────────────────────────

export const STANDARD_IMPLANT_CATALOG: readonly VirtualImplantSpec[] = [
	// STRAUMANN (BLX & Bone Level)
	{ id: "st-35-10", brand: "straumann", brandName: "Straumann", lineName: "BLX", diameterMm: 3.5, lengthMm: 10.0, platformDiameterMm: 3.5, apexDiameterMm: 2.2, priceKopecks: 3850000, articleNumber: "061.4110" },
	{ id: "st-40-10", brand: "straumann", brandName: "Straumann", lineName: "BLX", diameterMm: 4.0, lengthMm: 10.0, platformDiameterMm: 4.0, apexDiameterMm: 2.5, priceKopecks: 3850000, articleNumber: "061.4310" },
	{ id: "st-41-10", brand: "straumann", brandName: "Straumann", lineName: "BLT", diameterMm: 4.1, lengthMm: 10.0, platformDiameterMm: 4.1, apexDiameterMm: 2.5, priceKopecks: 3850000, articleNumber: "021.4110" },
	{ id: "st-40-115", brand: "straumann", brandName: "Straumann", lineName: "BLX", diameterMm: 4.0, lengthMm: 11.5, platformDiameterMm: 4.0, apexDiameterMm: 2.5, priceKopecks: 3850000, articleNumber: "061.4312" },
	{ id: "st-45-10", brand: "straumann", brandName: "Straumann", lineName: "BLX", diameterMm: 4.5, lengthMm: 10.0, platformDiameterMm: 4.5, apexDiameterMm: 2.8, priceKopecks: 3850000, articleNumber: "061.4510" },
	{ id: "st-50-10", brand: "straumann", brandName: "Straumann", lineName: "BLX", diameterMm: 5.0, lengthMm: 10.0, platformDiameterMm: 5.0, apexDiameterMm: 3.2, priceKopecks: 3850000, articleNumber: "061.4710" },

	// NOBEL BIOCARE (NobelActive)
	{ id: "nb-35-10", brand: "nobel_biocare", brandName: "Nobel Biocare", lineName: "NobelActive", diameterMm: 3.5, lengthMm: 10.0, platformDiameterMm: 3.5, apexDiameterMm: 2.4, priceKopecks: 3950000, articleNumber: "35221" },
	{ id: "nb-43-10", brand: "nobel_biocare", brandName: "Nobel Biocare", lineName: "NobelActive", diameterMm: 4.3, lengthMm: 10.0, platformDiameterMm: 4.3, apexDiameterMm: 2.8, priceKopecks: 3950000, articleNumber: "35222" },
	{ id: "nb-43-115", brand: "nobel_biocare", brandName: "Nobel Biocare", lineName: "NobelActive", diameterMm: 4.3, lengthMm: 11.5, platformDiameterMm: 4.3, apexDiameterMm: 2.8, priceKopecks: 3950000, articleNumber: "35223" },
	{ id: "nb-50-10", brand: "nobel_biocare", brandName: "Nobel Biocare", lineName: "NobelActive", diameterMm: 5.0, lengthMm: 10.0, platformDiameterMm: 5.0, apexDiameterMm: 3.2, priceKopecks: 3950000, articleNumber: "35225" },

	// OSSTEM (TS III SA)
	{ id: "os-35-10", brand: "osstem", brandName: "Osstem", lineName: "TS III SA", diameterMm: 3.5, lengthMm: 10.0, platformDiameterMm: 3.5, apexDiameterMm: 2.5, priceKopecks: 1850000, articleNumber: "TS3S3510S" },
	{ id: "os-40-10", brand: "osstem", brandName: "Osstem", lineName: "TS III SA", diameterMm: 4.0, lengthMm: 10.0, platformDiameterMm: 4.0, apexDiameterMm: 2.8, priceKopecks: 1850000, articleNumber: "TS3S4010S" },
	{ id: "os-45-85", brand: "osstem", brandName: "Osstem", lineName: "TS III SA", diameterMm: 4.5, lengthMm: 8.5, platformDiameterMm: 4.5, apexDiameterMm: 3.0, priceKopecks: 1850000, articleNumber: "TS3S4585S" },
	{ id: "os-40-115", brand: "osstem", brandName: "Osstem", lineName: "TS III SA", diameterMm: 4.0, lengthMm: 11.5, platformDiameterMm: 4.0, apexDiameterMm: 2.8, priceKopecks: 1850000, articleNumber: "TS3S4011S" },
	{ id: "os-45-10", brand: "osstem", brandName: "Osstem", lineName: "TS III SA", diameterMm: 4.5, lengthMm: 10.0, platformDiameterMm: 4.5, apexDiameterMm: 3.0, priceKopecks: 1850000, articleNumber: "TS3S4510S" },
	{ id: "os-50-10", brand: "osstem", brandName: "Osstem", lineName: "TS III SA", diameterMm: 5.0, lengthMm: 10.0, platformDiameterMm: 5.0, apexDiameterMm: 3.4, priceKopecks: 1850000, articleNumber: "TS3S5010S" },

	// DENTIUM (SuperLine)
	{ id: "dt-36-10", brand: "dentium", brandName: "Dentium", lineName: "SuperLine", diameterMm: 3.6, lengthMm: 10.0, platformDiameterMm: 4.0, apexDiameterMm: 2.6, priceKopecks: 1900000, articleNumber: "FXT3610" },
	{ id: "dt-40-10", brand: "dentium", brandName: "Dentium", lineName: "SuperLine", diameterMm: 4.0, lengthMm: 10.0, platformDiameterMm: 4.0, apexDiameterMm: 2.8, priceKopecks: 1900000, articleNumber: "FXT4010" },
	{ id: "dt-40-115", brand: "dentium", brandName: "Dentium", lineName: "SuperLine", diameterMm: 4.0, lengthMm: 11.5, platformDiameterMm: 4.0, apexDiameterMm: 2.8, priceKopecks: 1900000, articleNumber: "FXT4012" },
	{ id: "dt-45-10", brand: "dentium", brandName: "Dentium", lineName: "SuperLine", diameterMm: 4.5, lengthMm: 10.0, platformDiameterMm: 4.5, apexDiameterMm: 3.1, priceKopecks: 1900000, articleNumber: "FXT4510" },
	{ id: "dt-50-10", brand: "dentium", brandName: "Dentium", lineName: "SuperLine", diameterMm: 5.0, lengthMm: 10.0, platformDiameterMm: 5.0, apexDiameterMm: 3.5, priceKopecks: 1900000, articleNumber: "FXT5010" },
];

export interface SurgeonImplantPreset {
	readonly id: string;
	readonly title: string;
	readonly shortLabel: string;
	readonly brand: ImplantBrandKey;
	readonly brandName: string;
	readonly lineName: string;
	readonly diameterMm: number;
	readonly lengthMm: number;
	readonly clinicalIndicationRu: string;
}

export const SURGEON_IMPLANT_PRESETS: readonly SurgeonImplantPreset[] = [
	{
		id: "osstem_ts3_regular",
		title: "Osstem TSIII Regular (4.0 x 10 мм)",
		shortLabel: "Osstem TSIII 4.0x10",
		brand: "osstem",
		brandName: "Osstem",
		lineName: "TS III SA",
		diameterMm: 4.0,
		lengthMm: 10.0,
		clinicalIndicationRu: "Золотой стандарт для премоляров и фронтальных отделов",
	},
	{
		id: "osstem_ts3_wide_molar",
		title: "Osstem TSIII Wide / Моляр (4.5 x 8.5 мм)",
		shortLabel: "Osstem Wide 4.5x8.5",
		brand: "osstem",
		brandName: "Osstem",
		lineName: "TS III SA",
		diameterMm: 4.5,
		lengthMm: 8.5,
		clinicalIndicationRu: "Широкая платформа для моляров при дефиците высоты до канала",
	},
	{
		id: "straumann_blt_41",
		title: "Straumann BLT (4.1 x 10 мм)",
		shortLabel: "Straumann BLT 4.1x10",
		brand: "straumann",
		brandName: "Straumann",
		lineName: "BLT",
		diameterMm: 4.1,
		lengthMm: 10.0,
		clinicalIndicationRu: "Премиум конический дизайн Roxolid SLA для немедленной нагрузки",
	},
	{
		id: "dentium_superline_40",
		title: "Dentium SuperLine (4.0 x 10 мм)",
		shortLabel: "Dentium SuperLine 4.0x10",
		brand: "dentium",
		brandName: "Dentium",
		lineName: "SuperLine",
		diameterMm: 4.0,
		lengthMm: 10.0,
		clinicalIndicationRu: "Агрессивная самонарезающая резьба для кости D2-D3",
	},
] as const;

/**
 * Finds implant specification by brand, diameter, and length.
 */
export function findImplantSpec(
	brand: ImplantBrandKey,
	diameterMm: number,
	lengthMm: number,
): VirtualImplantSpec {
	const match = STANDARD_IMPLANT_CATALOG.find(
		(i) => i.brand === brand && Math.abs(i.diameterMm - diameterMm) <= 0.25 && Math.abs(i.lengthMm - lengthMm) <= 0.5,
	);
	if (match) {
		return match;
	}
	const fallback = STANDARD_IMPLANT_CATALOG[0];
	if (!fallback) {
		throw new Error("STANDARD_IMPLANT_CATALOG must not be empty");
	}
	return fallback;
}

// ─── GEOMETRY & APEX POSITION MATH ───────────────────────────────────────────

/**
 * Calculates 2D Apex position given entry point, angle, and length.
 * Angle 0° = vertical downwards (+Y), positive angle = tilt to the right (+X).
 */
export function calculateApexCoordinates(
	entryPoint: { readonly x: number; readonly y: number },
	angulationDeg: number,
	lengthMm: number,
): { readonly x: number; readonly y: number } {
	const angRad = (angulationDeg * Math.PI) / 180.0;
	const apexX = entryPoint.x + lengthMm * Math.sin(angRad);
	const apexY = entryPoint.y + lengthMm * Math.cos(angRad);
	return {
		x: Math.round(apexX * 100) / 100,
		y: Math.round(apexY * 100) / 100,
	};
}

/**
 * Computes shortest distance from a 2D point to a line segment.
 */
export function pointToSegmentDistance2D(
	p: { readonly x: number; readonly y: number },
	a: { readonly x: number; readonly y: number },
	b: { readonly x: number; readonly y: number },
): { distance: number; closestPoint: { readonly x: number; readonly y: number } } {
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	const lenSq = dx * dx + dy * dy;

	if (lenSq <= 0.00001) {
		const dist = Math.hypot(p.x - a.x, p.y - a.y);
		return { distance: dist, closestPoint: { x: a.x, y: a.y } };
	}

	const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
	const projX = a.x + t * dx;
	const projY = a.y + t * dy;
	const dist = Math.hypot(p.x - projX, p.y - projY);

	return {
		distance: dist,
		closestPoint: { x: projX, y: projY },
	};
}

// ─── MANDIBULAR NERVE SAFETY EVALUATION ──────────────────────────────────────

/**
 * Audits clearance from the virtual implant to the mandibular canal (N. alveolaris inferior).
 */
export function auditMandibularNerveSafety(
	implantPose: CrossSectionImplantPose,
	canal?: MandibularCanalCrossSection | null,
): NerveSafetyAuditResult {
	if (!canal) {
		return createUnmeasuredNerveSafety();
	}
	const apex = calculateApexCoordinates(
		implantPose.entryPoint,
		implantPose.angulationDeg,
		implantPose.implantSpec.lengthMm,
	);

	// Find closest point on implant axis segment to nerve center
	const segResult = pointToSegmentDistance2D(canal.center, implantPose.entryPoint, apex);
	const distCenterToAxis = segResult.distance;

	// Physical clearance from outer implant cylinder to outer canal wall
	const implantRadius = implantPose.implantSpec.diameterMm / 2.0;
	const netClearanceWall = distCenterToAxis - (implantRadius + canal.radiusMm);
	const netClearanceSafety = netClearanceWall - canal.safetyMarginMm;

	// Calculate closest point on nerve circle boundary
	const dirX = segResult.closestPoint.x - canal.center.x;
	const dirY = segResult.closestPoint.y - canal.center.y;
	const dirLen = Math.hypot(dirX, dirY) || 1;
	const closestNerveX = canal.center.x + (dirX / dirLen) * canal.radiusMm;
	const closestNerveY = canal.center.y + (dirY / dirLen) * canal.radiusMm;

	let status: "safe" | "warning" | "danger" = "safe";
	let message = "";
	let audioAlarm = false;

	if (netClearanceWall < MANDIBULAR_NERVE_DANGER_THRESHOLD_MM) {
		status = "danger";
		audioAlarm = true;
		if (netClearanceWall <= 0) {
			message = "КРИТИЧЕСКАЯ ОШИБКА: ПЕРФОРАЦИЯ НИЖНЕЧЕЛЮСТНОГО КАНАЛА! Немедленно измените длину или наклон имплантата!";
		} else {
			message = "КРИТИЧЕСКИЙ РИСК: Дистанция до нерва " + netClearanceWall.toFixed(1) + " мм (< 1.5 мм). Высокий риск нейропатии и парестезии губы!";
		}
	} else if (netClearanceWall < MANDIBULAR_NERVE_SAFETY_MARGIN_MM) {
		status = "warning";
		audioAlarm = false;
		message = "ВНИМАНИЕ: Зона приближения к нерву (" + netClearanceWall.toFixed(1) + " мм). Требуется запас не менее 2.0 мм по протоколу Misch!";
	} else {
		status = "safe";
		audioAlarm = false;
		message = "БЕЗОПАСНО: Клиренс до канала " + netClearanceWall.toFixed(1) + " мм (соответствует хирургическому стандарту >= 2.0 мм).";
	}

	return {
		distanceToCanalCenterMm: Math.round(distCenterToAxis * 100) / 100,
		netClearanceToCanalWallMm: Math.round(netClearanceWall * 100) / 100,
		netClearanceToSafetyCorridorMm: Math.round(netClearanceSafety * 100) / 100,
		safetyStatus: status,
		isDangerous: status === "danger",
		isWarning: status === "warning",
		shouldTriggerAudioAlarm: audioAlarm,
		closestImplantPoint: segResult.closestPoint,
		closestNervePoint: { x: closestNerveX, y: closestNerveY },
		clinicalMessageRu: message,
	};
}

// ─── ALVEOLAR BONE ENVELOPE CONTAINMENT ──────────────────────────────────────

/**
 * Checks if virtual implant is adequately contained inside the alveolar bone envelope.
 */
export function auditAlveolarBoneContainment(
	implantPose: CrossSectionImplantPose,
	envelope: AlveolarRidgeEnvelope,
): AlveolarContainmentResult {
	const implantRadius = implantPose.implantSpec.diameterMm / 2.0;

	// Estimate buccal and lingual bone thickness at crest level
	const buccalDist = Math.abs(implantPose.entryPoint.x - envelope.buccalCrestPoint.x) - implantRadius;
	const lingualDist = Math.abs(implantPose.entryPoint.x - envelope.lingualCrestPoint.x) - implantRadius;

	const isBuccalOk = buccalDist >= MIN_BUCCAL_BONE_WALL_MM;
	const isLingualOk = lingualDist >= MIN_LINGUAL_BONE_WALL_MM;
	const requiresGbr = !isBuccalOk || !isLingualOk;

	let warning: string | undefined;
	if (!isBuccalOk) {
		warning = "Толщина вестибулярной костной стенки " + buccalDist.toFixed(1) + " мм (< 1.5 мм). Показана НКР (GBR) с мембраной и аугментатом!";
	} else if (!isLingualOk) {
		warning = "Толщина оральной костной стенки " + lingualDist.toFixed(1) + " мм (< 1.0 мм). Риск язычной фенестрации!";
	}

	return {
		residualBuccalBoneMm: Math.max(0, Math.round(buccalDist * 10) / 10),
		residualLingualBoneMm: Math.max(0, Math.round(lingualDist * 10) / 10),
		isBuccalBoneAdequate: isBuccalOk,
		isLingualBoneAdequate: isLingualOk,
		isApexContained: true,
		requiresGbrAugmentation: requiresGbr,
		...(warning ? { clinicalWarningRu: warning } : {}),
	};
}

// ─── MAXILLARY SINUS SAFETY EVALUATION (TOOTH 16 / UPPER TEETH) ──────────────

/**
 * Audits clearance from the virtual implant apex to the maxillary sinus floor (Дно гайморовой пазухи).
 * Standard: FDI 11–28 (especially upper molars 16, 17, 26, 27).
 */
export function auditMaxillarySinusSafety(
	implantPose: CrossSectionImplantPose,
	sinusFloorY = 0,
	sinusMarginMm = 1.0,
): NerveSafetyAuditResult {
	const apex = calculateApexCoordinates(
		implantPose.entryPoint,
		implantPose.angulationDeg,
		implantPose.implantSpec.lengthMm,
	);
	const netClearanceWall = Math.abs(apex.y - sinusFloorY);
	const isPerforation = apex.y < sinusFloorY;
	let status: "safe" | "warning" | "danger" = "safe";
	let message = "";

	if (isPerforation) {
		status = "danger";
		message = "ВНИМАНИЕ: Перфорация дна гайморовой пазухи (зуб 16/верхний моляр). Необходим синус-лифтинг или уменьшение длины имплантата!";
	} else if (netClearanceWall < sinusMarginMm) {
		status = "warning";
		message = "Зона дна гайморовой пазухи: остаточная высота кости " + netClearanceWall.toFixed(1) + " мм. Показан закрытый синус-лифтинг.";
	} else {
		status = "safe";
		message = "Дно гайморовой пазухи интактно: дистанция " + netClearanceWall.toFixed(1) + " мм (безопасный коридор).";
	}

	return {
		distanceToCanalCenterMm: Math.round(netClearanceWall * 100) / 100,
		netClearanceToCanalWallMm: Math.round(netClearanceWall * 100) / 100,
		netClearanceToSafetyCorridorMm: Math.round((netClearanceWall - sinusMarginMm) * 100) / 100,
		safetyStatus: status,
		isDangerous: status === "danger",
		isWarning: status === "warning",
		shouldTriggerAudioAlarm: status === "danger",
		closestImplantPoint: apex,
		closestNervePoint: { x: apex.x, y: sinusFloorY },
		clinicalMessageRu: message,
	};
}

// ─── COMPREHENSIVE CBCT AUDIT & DIARY GENERATOR ──────────────────────────────

export interface PerformCbctPlanningAuditParams {
	readonly toothFdi: number;
	readonly implantPose: CrossSectionImplantPose;
	readonly canal?: MandibularCanalCrossSection | null;
	readonly envelope?: AlveolarRidgeEnvelope | null;
	readonly huSampling: HUZoneSampling;
	readonly patientName?: string;
	readonly clinicName?: string;
}

/**
 * Performs end-to-end surgical safety audit and generates structured Form 043/u diary.
 * Handles Maxillary Sinus for FDI 11–28 (tooth 16) and Mandibular Canal for FDI 31–48.
 */
export function performCbctPlanningAudit(
	params: PerformCbctPlanningAuditParams,
): ComprehensiveCbctPlanAudit {
	const apex = calculateApexCoordinates(
		params.implantPose.entryPoint,
		params.implantPose.angulationDeg,
		params.implantPose.implantSpec.lengthMm,
	);

	const isMaxilla = params.toothFdi < 30;
	const nerveSafety = isMaxilla
		? auditMaxillarySinusSafety(params.implantPose)
		: params.canal
			? auditMandibularNerveSafety(params.implantPose, params.canal)
			: createUnmeasuredNerveSafety();

	const defaultEnvelope: AlveolarRidgeEnvelope = {
		crestPoint: { x: 0, y: 0 },
		basePoint: { x: 0, y: 22.0 },
		buccalCrestPoint: { x: -4.0, y: 0 },
		lingualCrestPoint: { x: 4.0, y: 0 },
		ridgeWidthMm: 8.0,
		ridgeHeightMm: 22.0,
	};
	const boneContainment = auditAlveolarBoneContainment(
		params.implantPose,
		params.envelope ?? defaultEnvelope,
	);
	const boneQuality = analyzeMischBoneQuality(params.huSampling, params.implantPose.implantSpec.diameterMm);
	const isPlanApproved =
		nerveSafety.safetyStatus !== "unmeasured" && !nerveSafety.isDangerous && !nerveSafety.isWarning;

	// Build Form 043/u Surgery Protocol text
	const anatomyTitle = isMaxilla
		? "2. АНАТОМИЧЕСКАЯ БЕЗОПАСНОСТЬ И КОНТРОЛЬ ГАЙМОРОВОЙ ПАЗУХИ (Maxillary Sinus):"
		: "2. АНАТОМИЧЕСКАЯ БЕЗОПАСНОСТЬ И КОНТРОЛЬ НЕРВА (IAN):";
	const distanceLine =
		nerveSafety.safetyStatus === "unmeasured"
			? "   - Дистанция до нижнечелюстного канала: Не определена (требуется разметка на КЛКТ)"
			: isMaxilla
				? "   - Дистанция до дна гайморовой пазухи: " + nerveSafety.netClearanceToCanalWallMm.toFixed(1) + " мм"
				: "   - Дистанция до нижнечелюстного канала: " + nerveSafety.netClearanceToCanalWallMm.toFixed(1) + " мм";

	const approvalStatusText =
		nerveSafety.safetyStatus === "unmeasured"
			? "ОЖИДАЕТ РАСЧЕТА ПО КЛКТ"
			: isPlanApproved
				? "ОДОБРЕНО К УСТАНОВКЕ"
				: nerveSafety.isWarning
					? "ТРЕБУЕТСЯ УМЕНЬШЕНИЕ ДЛИНЫ ИМПЛАНТАТА ДЛЯ ЗАЗОРА >= 2.0 ММ"
					: isMaxilla
						? "ОТКЛОНЕНО (ТРЕБУЕТСЯ СИНУС-ЛИФТИНГ)"
						: "ОТКЛОНЕНО (РИСК ПОВРЕЖДЕНИЯ НЕРВА)";

	const diaryLines = [
		"============================================================",
		"ПРОТОКОЛ ОПЕРАЦИИ ДЕНТАЛЬНОЙ ИМПЛАНТАЦИИ (ФОРМА 043/У)",
		`Пациент: ${params.patientName || "Пациент"} | Клиника: ${params.clinicName || "Стоматологический центр DENTE"} | Зуб: FDI #${params.toothFdi}`,
		"============================================================",
		"1. ВЫБОР И ХАРАКТЕРИСТИКИ ИМПЛАНТАТА:",
		"   - Система: " + params.implantPose.implantSpec.brandName + " (" + params.implantPose.implantSpec.lineName + ")",
		"   - Артикул: " + params.implantPose.implantSpec.articleNumber,
		"   - Размеры: Ø " + params.implantPose.implantSpec.diameterMm.toFixed(1) + " x " + params.implantPose.implantSpec.lengthMm.toFixed(1) + " мм",
		"   - Наклон оси: " + params.implantPose.angulationDeg + "° от вертикали",
		"",
		anatomyTitle,
		distanceLine,
		"   - Статус безопасности: " +
			(nerveSafety.safetyStatus === "unmeasured"
				? "НЕ ОПРЕДЕЛЕН (ТРЕБУЕТСЯ КЛКТ)"
				: nerveSafety.isDangerous
					? "КРИТИЧЕСКИЙ РИСК"
					: nerveSafety.isWarning
						? "ВНИМАНИЕ: ЗОНА ПРИБЛИЖЕНИЯ К НЕРВУ"
						: "СОБЛЮДЕН (>=2.0 мм)"),
		"   - Вестибулярная костная стенка: " + boneContainment.residualBuccalBoneMm.toFixed(1) + " мм",
		"   - Оральная костная стенка: " + boneContainment.residualLingualBoneMm.toFixed(1) + " мм",
		"",
		"3. " + formatMischProtocolToDiaryText(params.huSampling, boneQuality, params.toothFdi),
		"",
		"4. ЗАКЛЮЧЕНИЕ И ПЛАН ЛЕЧЕНИЯ:",
		"   - Допуск к операции: " + approvalStatusText,
		boneContainment.requiresGbrAugmentation
			? "   - Рекомендована сопутствующая НКР (GBR) с установкой коллагеновой мембраны."
			: "   - Дополнительной костной пластики не требуется.",
		"============================================================",
	];

	const treatmentPlanItem = {
		code: "A16.07.054." + params.toothFdi,
		nameRu: "Установка дентального имплантата " + params.implantPose.implantSpec.brandName + " " + params.implantPose.implantSpec.lineName + " Ø" + params.implantPose.implantSpec.diameterMm + "x" + params.implantPose.implantSpec.lengthMm + " (позиция #" + params.toothFdi + ")",
		priceKopecks: params.implantPose.implantSpec.priceKopecks,
		priceFormattedRu: (params.implantPose.implantSpec.priceKopecks / 100).toLocaleString("ru-RU") + " ₽",
	};

	return {
		toothFdi: params.toothFdi,
		implantPose: params.implantPose,
		apexPoint: apex,
		nerveSafety,
		boneContainment,
		boneQuality,
		isPlanApproved,
		form043DiaryText: diaryLines.join("\n"),
		treatmentPlanItem,
	};
}

export const auditImplantNerveSafety = auditMandibularNerveSafety;
export const auditNerveSafetyMargin = auditMandibularNerveSafety;

export function generateForm043CbctDiary(
	paramsOrAudit: PerformCbctPlanningAuditParams | ComprehensiveCbctPlanAudit,
): string {
	if ("form043DiaryText" in paramsOrAudit) {
		return paramsOrAudit.form043DiaryText;
	}
	return performCbctPlanningAudit(paramsOrAudit).form043DiaryText;
}

export function sampleCrossSectionHUProfile(
	volume?: CbctVoxelVolume | null,
	implantPose?: CrossSectionImplantPose,
	implant3DWorld?: Implant3DWorldProjection | null,
): HUZoneSampling {
	const toothFdi = implantPose?.targetToothFdi ?? implant3DWorld?.targetToothFdi ?? 46;
	const isMandible = toothFdi >= 31;
	const isPosterior = (toothFdi >= 34 && toothFdi <= 38) || (toothFdi >= 44 && toothFdi <= 48);

	// If a real 3D voxel volume and implant pose are provided, compute true HU via trilinear interpolation
	if (
		volume &&
		volume.data &&
		!volume.isDisposed &&
		volume.dimensions.width > 0 &&
		volume.dimensions.height > 0 &&
		volume.dimensions.depth > 0 &&
		implant3DWorld
	) {
		const { entry3D, apex3D, lengthMm, platformDiameterMm, apexDiameterMm } = implant3DWorld;
		const dx = apex3D.x - entry3D.x;
		const dy = apex3D.y - entry3D.y;
		const dz = apex3D.z - entry3D.z;
		const len = Math.hypot(dx, dy, dz) || lengthMm || 10.0;
		const dir = { x: dx / len, y: dy / len, z: dz / len };

		// Orthogonal basis vectors for cylindrical volume sampling
		const up = Math.abs(dir.z) < 0.9 ? { x: 0, y: 0, z: 1 } : { x: 1, y: 0, z: 0 };
		const n1x = dir.y * up.z - dir.z * up.y;
		const n1y = dir.z * up.x - dir.x * up.z;
		const n1z = dir.x * up.y - dir.y * up.x;
		const n1Len = Math.hypot(n1x, n1y, n1z) || 1.0;
		const n1 = { x: n1x / n1Len, y: n1y / n1Len, z: n1z / n1Len };

		const n2x = dir.y * n1.z - dir.z * n1.y;
		const n2y = dir.z * n1.x - dir.x * n1.z;
		const n2z = dir.x * n1.y - dir.y * n1.x;
		const n2 = { x: n2x, y: n2y, z: n2z };

		const sampleAt = (sMm: number, radialFraction: number, angleRad: number): number => {
			const sRatio = Math.max(0, Math.min(1, sMm / len));
			const currentRadius = (platformDiameterMm / 2.0) * (1 - sRatio) + (apexDiameterMm / 2.0) * sRatio;
			const r = currentRadius * radialFraction;

			const px = entry3D.x + dir.x * sMm + r * (Math.cos(angleRad) * n1.x + Math.sin(angleRad) * n2.x);
			const py = entry3D.y + dir.y * sMm + r * (Math.cos(angleRad) * n1.y + Math.sin(angleRad) * n2.y);
			const pz = entry3D.z + dir.z * sMm + r * (Math.cos(angleRad) * n1.z + Math.sin(angleRad) * n2.z);

			const vox = worldMmToVoxelContinuous({ x: px, y: py, z: pz }, volume);
			return sampleVoxelTrilinearHU(vox.x, vox.y, vox.z, volume);
		};

		// 1. Coronal Crestal Zone (0..20% length): 5 depth steps, central + 4 radial probes
		const coronalSamples: number[] = [];
		const coronalSteps = [0.04 * len, 0.08 * len, 0.12 * len, 0.16 * len, 0.20 * len];
		for (const s of coronalSteps) {
			coronalSamples.push(sampleAt(s, 0.0, 0));
			for (let a = 0; a < 4; a++) {
				coronalSamples.push(sampleAt(s, 0.7, (a * Math.PI) / 2));
			}
		}

		// 2. Trabecular Core Zone (25..75% length): 6 depth steps, central + 4 radial probes
		const trabecularSamples: number[] = [];
		const trabecularSteps = [0.25 * len, 0.35 * len, 0.45 * len, 0.55 * len, 0.65 * len, 0.75 * len];
		for (const s of trabecularSteps) {
			trabecularSamples.push(sampleAt(s, 0.0, 0));
			for (let a = 0; a < 4; a++) {
				trabecularSamples.push(sampleAt(s, 0.5, (a * Math.PI) / 2 + Math.PI / 4));
			}
		}

		// 3. Apical Engagement Zone (80..100% length): 4 depth steps, central + 4 radial probes
		const apicalSamples: number[] = [];
		const apicalSteps = [0.80 * len, 0.86 * len, 0.93 * len, 1.00 * len];
		for (const s of apicalSteps) {
			apicalSamples.push(sampleAt(s, 0.0, 0));
			for (let a = 0; a < 4; a++) {
				apicalSamples.push(sampleAt(s, 0.6, (a * Math.PI) / 2));
			}
		}

		const calcAverageHU = (samples: number[]): number => {
			if (samples.length === 0) return 0;
			const validSamples = samples.filter((v) => v > -600);
			const pool = validSamples.length >= 3 ? validSamples : samples;
			const sum = pool.reduce((acc, val) => acc + val, 0);
			return Math.round(sum / pool.length);
		};

		const coronalHU = calcAverageHU(coronalSamples);
		const trabecularHU = calcAverageHU(trabecularSamples);
		const apicalHU = calcAverageHU(apicalSamples);

		if (coronalHU > -400 || trabecularHU > -400 || apicalHU > -400) {
			return computeHUZoneProfile(
				coronalHU,
				trabecularHU,
				apicalHU,
				"measured",
			);
		}
	}

	// Clinical honest state: when CBCT volume is absent or area is unmeasured,
	// return unmeasured status. Never generate fake D1/D2 bone density!
	return {
		coronalCrestalHU: 0,
		trabecularCoreHU: 0,
		apicalBaseHU: 0,
		overallMeanHU: 0,
		status: "unmeasured",
	};
}

// ─── 3D SYNCHRONIZED MULTI-VIEWPORT PROJECTION MATH ─────────────────────────

export interface Implant3DWorldProjection {
	readonly entry3D: { readonly x: number; readonly y: number; readonly z: number };
	readonly apex3D: { readonly x: number; readonly y: number; readonly z: number };
	readonly axisUnit3D: { readonly x: number; readonly y: number; readonly z: number };
	readonly lengthMm: number;
	readonly diameterMm: number;
	readonly platformDiameterMm: number;
	readonly apexDiameterMm: number;
	readonly angulationDeg: number;
	readonly targetToothFdi: number;
	readonly normal2D: { readonly x: number; readonly y: number };
}

export interface AxialImplantIntersection {
	readonly isInsideSpan: boolean;
	readonly centerMm: { readonly x: number; readonly y: number; readonly z: number };
	readonly radiusMm: number;
	readonly semiMajorMm: number;
	readonly semiMinorMm: number;
	readonly rotationRad: number;
	readonly safetyHaloSemiMajorMm: number;
	readonly safetyHaloSemiMinorMm: number;
	readonly signedDistanceToZMm: number;
}

export interface SliceImplantIntersection {
	readonly isIntersecting: boolean;
	readonly distanceMm: number;
	readonly alpha: number;
	readonly signedDistanceMm: number;
	readonly closestPoint3D: { readonly x: number; readonly y: number; readonly z: number };
}

/**
 * Calculates 3D world coordinates (physical millimeters) of the virtual implant in CBCT volume space.
 */
export function calculateImplant3DWorldPose(
	implantPose: CrossSectionImplantPose,
	sliceCenterMm: { readonly x: number; readonly y: number; readonly z: number },
	normal2D: { readonly x: number; readonly y: number },
	sliceHeightMm = 32.0,
	topCrestMarginMm = 4.0,
): Implant3DWorldProjection {
	const apex2D = calculateApexCoordinates(
		implantPose.entryPoint,
		implantPose.angulationDeg,
		implantPose.implantSpec.lengthMm,
	);

	const crestZ = sliceCenterMm.z + (sliceHeightMm / 2.0 - topCrestMarginMm);

	const entry3D = {
		x: Number((sliceCenterMm.x + normal2D.x * implantPose.entryPoint.x).toFixed(2)),
		y: Number((sliceCenterMm.y + normal2D.y * implantPose.entryPoint.x).toFixed(2)),
		z: Number((crestZ - implantPose.entryPoint.y).toFixed(2)),
	};

	const apex3D = {
		x: Number((sliceCenterMm.x + normal2D.x * apex2D.x).toFixed(2)),
		y: Number((sliceCenterMm.y + normal2D.y * apex2D.x).toFixed(2)),
		z: Number((crestZ - apex2D.y).toFixed(2)),
	};

	const dx = apex3D.x - entry3D.x;
	const dy = apex3D.y - entry3D.y;
	const dz = apex3D.z - entry3D.z;
	const len = Math.hypot(dx, dy, dz) || 1.0;

	return {
		entry3D,
		apex3D,
		axisUnit3D: { x: dx / len, y: dy / len, z: dz / len },
		lengthMm: implantPose.implantSpec.lengthMm,
		diameterMm: implantPose.implantSpec.diameterMm,
		platformDiameterMm: implantPose.implantSpec.platformDiameterMm,
		apexDiameterMm: implantPose.implantSpec.apexDiameterMm,
		angulationDeg: implantPose.angulationDeg,
		targetToothFdi: implantPose.targetToothFdi ?? 46,
		normal2D,
	};
}

/**
 * Computes intersection of the virtual implant cylinder with an Axial horizontal plane (Z = constant).
 */
export function calculateAxialImplantIntersection(
	implant3D: Implant3DWorldProjection,
	zWorldMm: number,
	safetyMarginMm = 2.0,
): AxialImplantIntersection {
	const zTop = Math.max(implant3D.entry3D.z, implant3D.apex3D.z);
	const zBottom = Math.min(implant3D.entry3D.z, implant3D.apex3D.z);
	const span = zTop - zBottom;

	const isInside = zWorldMm <= zTop + 0.5 && zWorldMm >= zBottom - 0.5;
	const signedDist = zWorldMm > zTop ? zWorldMm - zTop : zWorldMm < zBottom ? zWorldMm - zBottom : 0;

	let t = 0;
	if (span > 0.001) {
		t = Math.max(0, Math.min(1, (implant3D.entry3D.z - zWorldMm) / (implant3D.entry3D.z - implant3D.apex3D.z)));
	}

	const centerX = implant3D.entry3D.x + t * (implant3D.apex3D.x - implant3D.entry3D.x);
	const centerY = implant3D.entry3D.y + t * (implant3D.apex3D.y - implant3D.entry3D.y);

	const diameterAtZ =
		implant3D.platformDiameterMm + t * (implant3D.apexDiameterMm - implant3D.platformDiameterMm);
	const radiusAtZ = Math.max(1.0, diameterAtZ / 2.0);

	const tiltRad = (Math.abs(implant3D.angulationDeg) * Math.PI) / 180.0;
	const cosTilt = Math.max(0.2, Math.cos(tiltRad));

	const semiMajor = Number((radiusAtZ / cosTilt).toFixed(2));
	const semiMinor = Number(radiusAtZ.toFixed(2));

	const safetyRadius = radiusAtZ + safetyMarginMm;
	const safetySemiMajor = Number((safetyRadius / cosTilt).toFixed(2));
	const safetySemiMinor = Number(safetyRadius.toFixed(2));

	const rotRad = Math.atan2(implant3D.normal2D.y, implant3D.normal2D.x);

	return {
		isInsideSpan: isInside,
		centerMm: { x: Number(centerX.toFixed(2)), y: Number(centerY.toFixed(2)), z: zWorldMm },
		radiusMm: Number(radiusAtZ.toFixed(2)),
		semiMajorMm: semiMajor,
		semiMinorMm: semiMinor,
		rotationRad: rotRad,
		safetyHaloSemiMajorMm: safetySemiMajor,
		safetyHaloSemiMinorMm: safetySemiMinor,
		signedDistanceToZMm: Number(signedDist.toFixed(2)),
	};
}

/**
 * Checks whether an orthogonal MPR slice (Coronal or Sagittal) intersects the virtual implant
 * within a tolerance distance margin (default 2.5 mm), and returns distance-attenuated alpha.
 * Prevents phantom projections into distant anatomical structures (e.g. cervical spine or front incisors).
 */
export function checkImplantSliceIntersection(
	implant3D: Implant3DWorldProjection,
	plane: "coronal" | "sagittal" | "axial",
	sliceCoordMm: number,
	maxDistanceMm = 2.5,
): SliceImplantIntersection {
	const { entry3D, apex3D, platformDiameterMm, apexDiameterMm } = implant3D;

	if (plane === "coronal") {
		// Coronal plane: Y = sliceCoordMm
		const dy = apex3D.y - entry3D.y;
		let t = 0;
		if (Math.abs(dy) > 0.001) {
			t = Math.max(0, Math.min(1, (sliceCoordMm - entry3D.y) / dy));
		} else {
			t = 0.5;
		}

		const closestX = entry3D.x + t * (apex3D.x - entry3D.x);
		const closestY = entry3D.y + t * (apex3D.y - entry3D.y);
		const closestZ = entry3D.z + t * (apex3D.z - entry3D.z);

		const signedDist = sliceCoordMm - closestY;
		const absDist = Math.abs(signedDist);

		const radiusAtT = (platformDiameterMm / 2.0) * (1 - t) + (apexDiameterMm / 2.0) * t;
		const netDist = Math.max(0, absDist - radiusAtT);

		const isInside = netDist <= maxDistanceMm;
		const alpha = isInside
			? Number(Math.max(0.15, 1.0 - (netDist / maxDistanceMm) * 0.85).toFixed(2))
			: 0;

		return {
			isIntersecting: isInside,
			distanceMm: Number(netDist.toFixed(2)),
			alpha,
			signedDistanceMm: Number(signedDist.toFixed(2)),
			closestPoint3D: { x: Number(closestX.toFixed(2)), y: Number(closestY.toFixed(2)), z: Number(closestZ.toFixed(2)) },
		};
	}

	if (plane === "sagittal") {
		// Sagittal plane: X = sliceCoordMm
		const dx = apex3D.x - entry3D.x;
		let t = 0;
		if (Math.abs(dx) > 0.001) {
			t = Math.max(0, Math.min(1, (sliceCoordMm - entry3D.x) / dx));
		} else {
			t = 0.5;
		}

		const closestX = entry3D.x + t * (apex3D.x - entry3D.x);
		const closestY = entry3D.y + t * (apex3D.y - entry3D.y);
		const closestZ = entry3D.z + t * (apex3D.z - entry3D.z);

		const signedDist = sliceCoordMm - closestX;
		const absDist = Math.abs(signedDist);

		const radiusAtT = (platformDiameterMm / 2.0) * (1 - t) + (apexDiameterMm / 2.0) * t;
		const netDist = Math.max(0, absDist - radiusAtT);

		const isInside = netDist <= maxDistanceMm;
		const alpha = isInside
			? Number(Math.max(0.15, 1.0 - (netDist / maxDistanceMm) * 0.85).toFixed(2))
			: 0;

		return {
			isIntersecting: isInside,
			distanceMm: Number(netDist.toFixed(2)),
			alpha,
			signedDistanceMm: Number(signedDist.toFixed(2)),
			closestPoint3D: { x: Number(closestX.toFixed(2)), y: Number(closestY.toFixed(2)), z: Number(closestZ.toFixed(2)) },
		};
	}

	// Axial plane: Z = sliceCoordMm
	const zTop = Math.max(entry3D.z, apex3D.z);
	const zBottom = Math.min(entry3D.z, apex3D.z);
	let t = 0;
	if (Math.abs(zTop - zBottom) > 0.001) {
		t = Math.max(0, Math.min(1, (entry3D.z - sliceCoordMm) / (entry3D.z - apex3D.z)));
	}
	const closestX = entry3D.x + t * (apex3D.x - entry3D.x);
	const closestY = entry3D.y + t * (apex3D.y - entry3D.y);
	const closestZ = sliceCoordMm;

	const signedDist = sliceCoordMm > zTop ? sliceCoordMm - zTop : sliceCoordMm < zBottom ? sliceCoordMm - zBottom : 0;
	const absDist = Math.abs(signedDist);
	const isInside = absDist <= maxDistanceMm;
	const alpha = isInside ? Number(Math.max(0.15, 1.0 - (absDist / maxDistanceMm) * 0.85).toFixed(2)) : 0;

	return {
		isIntersecting: isInside,
		distanceMm: Number(absDist.toFixed(2)),
		alpha,
		signedDistanceMm: Number(signedDist.toFixed(2)),
		closestPoint3D: { x: Number(closestX.toFixed(2)), y: Number(closestY.toFixed(2)), z: Number(closestZ.toFixed(2)) },
	};
}

// ─── WEB AUDIO API SAFETY SOUND ALARM ENGINE ────────────────────────────────

/**
 * Triggers clinical safety alarm according to proximity status.
 * Delegates cleanly to SoundFeedbackService without embedding raw Web Audio logic into the math engine.
 */
export function playNerveSafetyAudioAlarm(
	safetyStatus: "safe" | "warning" | "danger" | "unmeasured",
	isAudioEnabled = false,
): void {
	if (!isAudioEnabled || safetyStatus === "safe" || safetyStatus === "unmeasured" || typeof window === "undefined") return;

	try {
		if (safetyStatus === "danger" || safetyStatus === "warning") {
			void soundFeedback.playSound("warning_alert");
		}
	} catch {
		// Ignore if sound feedback is unavailable
	}
}

export function disposeNerveSafetyAudioAlarm(): void {
	// Clean no-op, lifecycle managed centrally by SoundFeedbackService
}

// ─── LIVE MISCH BONE DENSITY & 3D SAFETY TELEMETRY ADAPTER ──────────────────

export interface LiveBoneDensityTelemetry {
	readonly isMeasured: boolean;
	readonly meanHU: number | null;
	readonly minHU: number | null;
	readonly maxHU: number | null;
	readonly stdDevHU: number | null;
	readonly boneClass: BoneClass | null;
	readonly tissueDescription: string;
	readonly recommendedTorqueNcm: string;
	readonly drillingProtocol: string;
	readonly healingMonths: number | null;
	readonly samplesCount: number;
}

export interface LiveSafetyClearanceTelemetry {
	readonly nerveClearanceMm: number | null;
	readonly sinusClearanceMm: number | null;
	readonly neighborClearanceMm: number | null;
	readonly isNerveSafe: boolean;
	readonly isSinusSafe: boolean;
	readonly isNeighborSafe: boolean;
	readonly worstSafetyStatus: "safe" | "warning" | "danger" | "unmeasured";
	readonly warnings: readonly string[];
}

export interface LiveImplantTelemetry {
	readonly boneDensity: LiveBoneDensityTelemetry;
	readonly safety: LiveSafetyClearanceTelemetry;
	readonly meanHU: number | null;
	readonly minHU: number | null;
	readonly maxHU: number | null;
	readonly boneClass: BoneClass | null;
	readonly tissueDescription: string;
	readonly recommendedTorqueNcm: string;
	readonly drillingProtocol: string;
	readonly nerveClearanceMm: number | null;
	readonly sinusClearanceMm: number | null;
	readonly neighborClearanceMm: number | null;
	readonly isNerveSafe: boolean;
	readonly isSinusSafe: boolean;
	readonly isNeighborSafe: boolean;
	readonly worstSafetyStatus: "safe" | "warning" | "danger" | "unmeasured";
	readonly warnings: readonly string[];
}

export type LiveImplantInput =
	| Implant3DWorldProjection
	| ImplantSeg
	| CrossSectionImplantPose
	| {
			readonly id?: string;
			readonly entry?: Vec3 | Point3D;
			readonly apex?: Vec3 | Point3D;
			readonly entry3D?: Point3D | Vec3;
			readonly apex3D?: Point3D | Vec3;
			readonly entryPoint?: { readonly x: number; readonly y: number };
			readonly apexPoint?: { readonly x: number; readonly y: number };
			readonly radius?: number;
			readonly diameterMm?: number;
			readonly platformDiameterMm?: number;
			readonly apexDiameterMm?: number;
			readonly lengthMm?: number;
			readonly angulationDeg?: number;
			readonly targetToothFdi?: number;
			readonly implantSpec?: VirtualImplantSpec;
	  };

export type LiveAnatomyMarkerInput =
	| {
			readonly id?: string;
			readonly type?: "nerve" | "sinus";
			readonly radius?: number;
			readonly points: readonly (Vec3 | Point3D)[];
	  }
	| readonly (Vec3 | Point3D)[];

function extractVec3Coord(p: unknown): Vec3 {
	if (Array.isArray(p)) {
		return [Number(p[0]) || 0, Number(p[1]) || 0, Number(p[2]) || 0];
	}
	if (p && typeof p === "object") {
		const obj = p as Record<string, unknown>;
		const x = Number(obj.x) || 0;
		const y = Number(obj.y) || 0;
		const z = Number(obj.z) || 0;
		return [x, y, z];
	}
	return [0, 0, 0];
}

export function normalizeImplantToSeg(
	input: LiveImplantInput,
	defaultId = "implant-primary",
): ImplantSeg & { targetToothFdi?: number } {
	const id = "id" in input && typeof input.id === "string" && input.id ? input.id : defaultId;

	let entry: Vec3 = [0, 0, 0];
	let apex: Vec3 = [0, 0, -10];

	if ("entry3D" in input && input.entry3D && "apex3D" in input && input.apex3D) {
		entry = extractVec3Coord(input.entry3D);
		apex = extractVec3Coord(input.apex3D);
	} else if ("entry" in input && input.entry && "apex" in input && input.apex) {
		entry = extractVec3Coord(input.entry);
		apex = extractVec3Coord(input.apex);
	} else if ("entryPoint" in input && input.entryPoint) {
		const ep = input.entryPoint;
		entry = [ep.x, ep.y, 0];
		if ("apexPoint" in input && input.apexPoint) {
			apex = [input.apexPoint.x, input.apexPoint.y, 0];
		} else {
			const spec = "implantSpec" in input && input.implantSpec ? input.implantSpec : null;
			const len =
				spec?.lengthMm ??
				("lengthMm" in input && typeof input.lengthMm === "number" ? input.lengthMm : 10);
			const ang =
				"angulationDeg" in input && typeof input.angulationDeg === "number"
					? input.angulationDeg
					: 0;
			const ap = calculateApexCoordinates(ep, ang, len);
			apex = [ap.x, ap.y, 0];
		}
	}

	let radius = 2.0;
	if ("radius" in input && typeof input.radius === "number" && input.radius > 0) {
		radius = input.radius;
	} else if ("diameterMm" in input && typeof input.diameterMm === "number" && input.diameterMm > 0) {
		radius = input.diameterMm / 2.0;
	} else if (
		"platformDiameterMm" in input &&
		typeof input.platformDiameterMm === "number" &&
		input.platformDiameterMm > 0
	) {
		radius = input.platformDiameterMm / 2.0;
	} else if (
		"implantSpec" in input &&
		input.implantSpec &&
		typeof input.implantSpec.diameterMm === "number"
	) {
		radius = input.implantSpec.diameterMm / 2.0;
	}

	const targetToothFdi =
		"targetToothFdi" in input && typeof input.targetToothFdi === "number"
			? input.targetToothFdi
			: undefined;

	return {
		id,
		entry,
		apex,
		radius,
		...(targetToothFdi !== undefined ? { targetToothFdi } : {}),
	};
}

export function adaptVolumeToSamplingData(
	vol: VolumeSamplingData | CbctVoxelVolume | null | undefined,
): VolumeSamplingData | null {
	if (!vol) return null;
	if ("getVoxel" in vol && typeof vol.getVoxel === "function" && "dims" in vol && Array.isArray(vol.dims)) {
		return vol as VolumeSamplingData;
	}
	if ("dimensions" in vol && "spacingMm" in vol && vol.data && !vol.isDisposed) {
		const { width, height, depth } = vol.dimensions;
		if (width <= 0 || height <= 0 || depth <= 0) return null;
		const sx = vol.spacingMm.x || 1.0;
		const sy = vol.spacingMm.y || 1.0;
		const sz = vol.spacingMm.z || 1.0;
		const data = vol.data;
		const strideZ = width * height;
		const origin: Vec3 = [vol.originMm.x, vol.originMm.y, vol.originMm.z];

		return {
			dims: [width, height, depth],
			origin,
			invSx: 1.0 / sx,
			invSy: 1.0 / sy,
			invSz: 1.0 / sz,
			zMin: origin[2],
			zMax: origin[2] + (depth - 1) * sz,
			vSpacing: sz,
			getVoxel: (i: number, j: number, k: number) => {
				if (i < 0 || j < 0 || k < 0 || i >= width || j >= height || k >= depth) {
					return -1024;
				}
				return data[k * strideZ + j * width + i] ?? -1024;
			},
		};
	}
	return null;
}

export function normalizeAnatomyMarkers(
	markers?: readonly LiveAnatomyMarkerInput[] | readonly (Vec3 | Point3D)[] | null,
): Array<{ id: string; type: "nerve" | "sinus"; radius: number; points: Vec3[] }> {
	if (!markers || markers.length === 0) return [];

	const first = markers[0];
	if (first && (Array.isArray(first) || ("x" in first && typeof (first as Point3D).x === "number"))) {
		const pts = (markers as readonly (Vec3 | Point3D)[]).map(extractVec3Coord);
		return [{ id: "ian-nerve-spline", type: "nerve", radius: 1.4, points: pts }];
	}

	const result: Array<{ id: string; type: "nerve" | "sinus"; radius: number; points: Vec3[] }> = [];
	for (let i = 0; i < markers.length; i++) {
		const m = markers[i] as {
			id?: string;
			type?: "nerve" | "sinus";
			radius?: number;
			points?: readonly (Vec3 | Point3D)[];
		};
		if (!m || !m.points || m.points.length === 0) continue;
		const type = m.type === "sinus" ? "sinus" : "nerve";
		const radius =
			typeof m.radius === "number" && m.radius >= 0 ? m.radius : type === "nerve" ? 1.4 : 0.0;
		const id = m.id ?? `${type}-${i}`;
		const points = m.points.map(extractVec3Coord);
		result.push({ id, type, radius, points });
	}

	return result;
}

/**
 * Computes live Misch bone density classification and 3D safety clearances
 * for dental implant placement (MANDATE 8e: 100% doctor autonomy, purely advisory HUD telemetry,
 * never blocks save / export operations).
 *
 * @param implant Virtual implant pose (3D world projection or segment)
 * @param volume CBCT voxel volume or sampling data
 * @param markers Anatomical structures (IAN nerve canal polyline, maxillary sinus)
 * @param otherImplants Neighbouring virtual implants
 */
export function computeLiveImplantTelemetry(
	implant: LiveImplantInput,
	volume?: VolumeSamplingData | CbctVoxelVolume | null,
	markers?: readonly LiveAnatomyMarkerInput[] | readonly (Vec3 | Point3D)[] | null,
	otherImplants?: readonly LiveImplantInput[] | null,
): LiveImplantTelemetry {
	const seg = normalizeImplantToSeg(implant);
	const samplingVol = adaptVolumeToSamplingData(volume);

	// 1. Bone Density Analysis via 3D osteotomy bed sampling (Misch D1..D5)
	let boneSample: BoneSample | null = null;
	if (samplingVol) {
		boneSample = sampleImplantBoneHU(samplingVol, seg.entry, seg.apex, seg.radius);
	}

	let boneDensity: LiveBoneDensityTelemetry;
	if (boneSample) {
		const profile = getMischProfile(boneSample.bone);
		const corticalDesc = profile.corticalDescription;
		const trabecularDesc = profile.trabecularDescription;
		const tissueDesc = [corticalDesc, trabecularDesc]
			.filter(Boolean)
			.join("; ");

		const torque = profile.expectedTorqueNcm;
		const drilling = profile.drillingProtocol;
		const healing = profile.recommendedHealingMonths;

		boneDensity = {
			isMeasured: true,
			meanHU: boneSample.meanHU,
			minHU: boneSample.minHU ?? null,
			maxHU: boneSample.maxHU ?? null,
			stdDevHU: boneSample.stdDevHU ?? null,
			boneClass: boneSample.bone,
			tissueDescription: tissueDesc,
			recommendedTorqueNcm: torque,
			drillingProtocol: drilling,
			healingMonths: healing,
			samplesCount: boneSample.samples,
		};
	} else {
		boneDensity = {
			isMeasured: false,
			meanHU: null,
			minHU: null,
			maxHU: null,
			stdDevHU: null,
			boneClass: null,
			tissueDescription: "Не измерено (требуется КЛКТ)",
			recommendedTorqueNcm: "—",
			drillingProtocol: "Стандартный хирургический протокол (ожидает КЛКТ)",
			healingMonths: null,
			samplesCount: 0,
		};
	}

	// 2. Safety Clearance Evaluation (IAN >= 2.0 mm, Sinus >= 1.0 mm, Neighbors >= 3.0 mm)
	const normalizedMarkers = normalizeAnatomyMarkers(markers);
	const normalizedOthers = (otherImplants ?? [])
		.filter((o): o is LiveImplantInput => o != null)
		.map((o, idx) => normalizeImplantToSeg(o, `other-${idx}`));

	const safetyResult = evaluateImplantSafety(
		seg,
		normalizedOthers,
		normalizedMarkers,
		DEFAULT_SAFETY_THRESHOLDS,
	);

	const nerveEvals = safetyResult.anatomy.filter((a) => a.type === "nerve");
	const nerveClearanceMm =
		nerveEvals.length > 0 ? Math.min(...nerveEvals.map((a) => a.mm)) : null;
	const isNerveSafe =
		nerveClearanceMm !== null ? nerveClearanceMm >= DEFAULT_SAFETY_THRESHOLDS.nerve : true;

	const sinusEvals = safetyResult.anatomy.filter((a) => a.type === "sinus");
	const sinusClearanceMm =
		sinusEvals.length > 0 ? Math.min(...sinusEvals.map((a) => a.mm)) : null;
	const isSinusSafe =
		sinusClearanceMm !== null ? sinusClearanceMm >= DEFAULT_SAFETY_THRESHOLDS.sinus : true;

	const neighborClearanceMm = safetyResult.neighborMm;
	const isNeighborSafe = safetyResult.neighborOk;

	// Determine worst safety status for HUD indicator
	let worstSafetyStatus: "safe" | "warning" | "danger" | "unmeasured" = "safe";
	if (nerveClearanceMm === null && sinusClearanceMm === null && neighborClearanceMm === null) {
		worstSafetyStatus = "unmeasured";
	} else {
		const isDanger =
			(nerveClearanceMm !== null && nerveClearanceMm < MANDIBULAR_NERVE_DANGER_THRESHOLD_MM) ||
			(sinusClearanceMm !== null && sinusClearanceMm < 0.0) ||
			(neighborClearanceMm !== null && neighborClearanceMm < 1.5);

		const isWarning =
			!isDanger &&
			((nerveClearanceMm !== null && nerveClearanceMm < DEFAULT_SAFETY_THRESHOLDS.nerve) ||
				(sinusClearanceMm !== null && sinusClearanceMm < DEFAULT_SAFETY_THRESHOLDS.sinus) ||
				(neighborClearanceMm !== null && neighborClearanceMm < DEFAULT_SAFETY_THRESHOLDS.neighbor));

		if (isDanger) {
			worstSafetyStatus = "danger";
		} else if (isWarning) {
			worstSafetyStatus = "warning";
		} else {
			worstSafetyStatus = "safe";
		}
	}

	const warnings =
		safetyResult.warnings.length > 0
			? safetyResult.warnings
			: worstSafetyStatus === "unmeasured"
				? ["Анатомические структуры не размечены (требуется разметка канала IAN или пазухи)"]
				: ["Анатомические зазоры безопасности соблюдены (IAN >= 2.0 мм, Sinus >= 1.0 мм)"];

	const safety: LiveSafetyClearanceTelemetry = {
		nerveClearanceMm: nerveClearanceMm !== null ? Number(nerveClearanceMm.toFixed(2)) : null,
		sinusClearanceMm: sinusClearanceMm !== null ? Number(sinusClearanceMm.toFixed(2)) : null,
		neighborClearanceMm:
			neighborClearanceMm !== null ? Number(neighborClearanceMm.toFixed(2)) : null,
		isNerveSafe,
		isSinusSafe,
		isNeighborSafe,
		worstSafetyStatus,
		warnings,
	};

	return {
		boneDensity,
		safety,
		meanHU: boneDensity.meanHU,
		minHU: boneDensity.minHU,
		maxHU: boneDensity.maxHU,
		boneClass: boneDensity.boneClass,
		tissueDescription: boneDensity.tissueDescription,
		recommendedTorqueNcm: boneDensity.recommendedTorqueNcm,
		drillingProtocol: boneDensity.drillingProtocol,
		nerveClearanceMm: safety.nerveClearanceMm,
		sinusClearanceMm: safety.sinusClearanceMm,
		neighborClearanceMm: safety.neighborClearanceMm,
		isNerveSafe: safety.isNerveSafe,
		isSinusSafe: safety.isSinusSafe,
		isNeighborSafe: safety.isNeighborSafe,
		worstSafetyStatus: safety.worstSafetyStatus,
		warnings: safety.warnings,
	};
}



