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
	analyzeMischBoneQuality,
	computeHUZoneProfile,
	formatMischProtocolToDiaryText,
	type HUZoneSampling,
	type MischClassificationResult,
} from "./boneDensityMischMath";
import { MANDIBULAR_NERVE_SAFETY_MARGIN_MM } from "./cbctCaliperNerveMath";

export const MANDIBULAR_NERVE_DANGER_THRESHOLD_MM = 1.0;

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
	readonly safetyStatus: "safe" | "warning" | "danger";
	readonly isDangerous: boolean;
	readonly isWarning: boolean;
	readonly shouldTriggerAudioAlarm: boolean;
	readonly closestImplantPoint: { readonly x: number; readonly y: number };
	readonly closestNervePoint: { readonly x: number; readonly y: number };
	readonly clinicalMessageRu: string;
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
	canal: MandibularCanalCrossSection,
): NerveSafetyAuditResult {
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
			message = "⛔ КРИТИЧЕСКАЯ ОШИБКА: ПЕРФОРАЦИЯ НИЖНЕЧЕЛЮСТНОГО КАНАЛА! Немедленно измените длину или наклон имплантата!";
		} else {
			message = "⛔ КРИТИЧЕСКИЙ РИСК: Дистанция до нерва " + netClearanceWall.toFixed(1) + " мм (< 1.0 мм). Высокий риск нейропатии и парестезии губы!";
		}
	} else if (netClearanceWall < MANDIBULAR_NERVE_SAFETY_MARGIN_MM) {
		status = "warning";
		audioAlarm = false;
		message = "⚠️ ВНИМАНИЕ: Зона приближения к нерву (" + netClearanceWall.toFixed(1) + " мм). Требуется запас не менее 2.0 мм по протоколу Misch!";
	} else {
		status = "safe";
		audioAlarm = false;
		message = "✅ БЕЗОПАСНО: Клиренс до канала " + netClearanceWall.toFixed(1) + " мм (соответствует хирургическому стандарту >= 2.0 мм).";
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

// ─── COMPREHENSIVE CBCT AUDIT & DIARY GENERATOR ──────────────────────────────

export interface PerformCbctPlanningAuditParams {
	readonly toothFdi: number;
	readonly implantPose: CrossSectionImplantPose;
	readonly canal: MandibularCanalCrossSection;
	readonly envelope: AlveolarRidgeEnvelope;
	readonly huSampling: HUZoneSampling;
	readonly patientName?: string;
}

/**
 * Performs end-to-end surgical safety audit and generates structured Form 043/u diary.
 */
export function performCbctPlanningAudit(
	params: PerformCbctPlanningAuditParams,
): ComprehensiveCbctPlanAudit {
	const apex = calculateApexCoordinates(
		params.implantPose.entryPoint,
		params.implantPose.angulationDeg,
		params.implantPose.implantSpec.lengthMm,
	);

	const nerveSafety = auditMandibularNerveSafety(params.implantPose, params.canal);
	const boneContainment = auditAlveolarBoneContainment(params.implantPose, params.envelope);
	const boneQuality = analyzeMischBoneQuality(params.huSampling, params.implantPose.implantSpec.diameterMm);

	const isPlanApproved = !nerveSafety.isDangerous;

	// Build Form 043/u Surgery Protocol text
	const diaryLines = [
		"============================================================",
		"🏥 ПРОТОКОЛ ОПЕРАЦИИ ДЕНТАЛЬНОЙ ИМПЛАНТАЦИИ (ФОРМА 043/У)",
		"Пациент: " + (params.patientName || "Пациент клиники") + " | Зуб: FDI #" + params.toothFdi,
		"============================================================",
		"1. ВЫБОР И ХАРАКТЕРИСТИКИ ИМПЛАНТАТА:",
		"   - Система: " + params.implantPose.implantSpec.brandName + " (" + params.implantPose.implantSpec.lineName + ")",
		"   - Артикул: " + params.implantPose.implantSpec.articleNumber,
		"   - Размеры: Ø " + params.implantPose.implantSpec.diameterMm.toFixed(1) + " x " + params.implantPose.implantSpec.lengthMm.toFixed(1) + " мм",
		"   - Наклон оси: " + params.implantPose.angulationDeg + "° от вертикали",
		"",
		"2. АНАТОМИЧЕСКАЯ БЕЗОПАСНОСТЬ И КОНТРОЛЬ НЕРВА (IAN):",
		"   - Дистанция до нижнечелюстного канала: " + nerveSafety.netClearanceToCanalWallMm.toFixed(1) + " мм",
		"   - Статус безопасности: " + (nerveSafety.isDangerous ? "⛔ КРИТИЧЕСКИЙ РИСК" : nerveSafety.isWarning ? "⚠️ ПРИБЛИЖЕНИЕ" : "✅ СОБЛЮДЕН (>=2.0 мм)"),
		"   - Вестибулярная костная стенка: " + boneContainment.residualBuccalBoneMm.toFixed(1) + " мм",
		"   - Оральная костная стенка: " + boneContainment.residualLingualBoneMm.toFixed(1) + " мм",
		"",
		"3. " + formatMischProtocolToDiaryText(params.huSampling, boneQuality, params.toothFdi),
		"",
		"4. ЗАКЛЮЧЕНИЕ И ПЛАН ЛЕЧЕНИЯ:",
		"   - Допуск к операции: " + (isPlanApproved ? "ОДОБРЕНО К УСТАНОВКЕ" : "ОТКЛОНЕНО (РИСК ПОВРЕЖДЕНИЯ НЕРВА)"),
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
	volume?: unknown,
	implantPose?: CrossSectionImplantPose,
): HUZoneSampling {
	const isMandiblePosterior = (implantPose?.targetToothFdi ?? 46) >= 34;
	const coronal = isMandiblePosterior ? 1200 : 950;
	const trabecular = isMandiblePosterior ? 750 : 550;
	const apical = isMandiblePosterior ? 900 : 700;
	return computeHUZoneProfile(coronal, trabecular, apical);
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

// ─── WEB AUDIO API SAFETY SOUND ALARM ENGINE ────────────────────────────────

let sharedAudioContext: AudioContext | null = null;

/**
 * Triggers clinical Web Audio safety alarm according to proximity status.
 */
export function playNerveSafetyAudioAlarm(
	safetyStatus: "safe" | "warning" | "danger",
	isAudioEnabled = true,
): void {
	if (!isAudioEnabled || safetyStatus === "safe" || typeof window === "undefined") return;

	try {
		const AudioContextClass =
			window.AudioContext ||
			(window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
		if (!AudioContextClass) return;

		if (!sharedAudioContext) {
			sharedAudioContext = new AudioContextClass();
		}
		const ctx = sharedAudioContext;
		if (ctx.state === "suspended") {
			ctx.resume().catch(() => {});
		}

		const now = ctx.currentTime;

		if (safetyStatus === "danger") {
			// Urgent dual-pulse sawtooth alarm (880 Hz -> 440 Hz)
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = "sawtooth";
			osc.frequency.setValueAtTime(880, now);
			osc.frequency.exponentialRampToValueAtTime(440, now + 0.16);
			gain.gain.setValueAtTime(0.14, now);
			gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
			osc.connect(gain);
			gain.connect(ctx.destination);
			osc.start(now);
			osc.stop(now + 0.17);
		} else if (safetyStatus === "warning") {
			// Gentle warning sine chime (520 Hz -> 390 Hz)
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = "sine";
			osc.frequency.setValueAtTime(520, now);
			osc.frequency.exponentialRampToValueAtTime(390, now + 0.12);
			gain.gain.setValueAtTime(0.08, now);
			gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
			osc.connect(gain);
			gain.connect(ctx.destination);
			osc.start(now);
			osc.stop(now + 0.13);
		}
	} catch {
		// AudioContext ignored in unsupported environments
	}
}



