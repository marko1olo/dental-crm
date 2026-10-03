/**
 * CBCT IMPLANT PLANNING & MANDIBULAR NERVE SAFETY ALARM ENGINE (FACADE)
 *
 * Mandate 8b: Декомпозиция монолитов (строго <= 700 строк).
 * 100% transparent backwards compatibility for all existing call sites.
 */

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
} from '@dental/shared';

export * from './implantNerveSafetyAudit.js';
export * from './implantBoneDensityMath.js';
export * from './fastMarchingNerve.js';
export * from './implantCatalog.js';
export * from './implantCorticalAndSleeveEngine.js';

import type { Point3D, CbctVoxelVolume } from './cbctMprMath.js';
import {
  type CrossSectionImplantPose,
  type VirtualImplantSpec,
  type ImplantBrandKey,
  calculateApexCoordinates,
} from './implantNerveSafetyAudit.js';
import { CANONICAL_IMPLANT_CATALOG } from './implantCatalog.js';

// ─── STANDARD VIRTUAL IMPLANT FIXTURE CATALOG ────────────────────────────────

const MAPPED_CANONICAL_CATALOG: readonly VirtualImplantSpec[] = CANONICAL_IMPLANT_CATALOG.map((f) => ({
	id: f.id,
	brand: f.brandKey as ImplantBrandKey,
	brandName: f.brandName,
	lineName: f.lineName,
	diameterMm: f.diameterMm,
	lengthMm: f.lengthMm,
	platformDiameterMm: f.platformDiameterMm,
	apexDiameterMm: f.apexDiameterMm,
	priceKopecks: f.priceKopecks,
	articleNumber: f.articleNumber,
}));

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

	// MIS IMPLANTS (SEVEN / C1 / V3)
	{ id: "mis-375-10", brand: "mis", brandName: "MIS Implants", lineName: "SEVEN", diameterMm: 3.75, lengthMm: 10.0, platformDiameterMm: 3.75, apexDiameterMm: 2.4, priceKopecks: 1950000, articleNumber: "MF7-10375" },
	{ id: "mis-42-10", brand: "mis", brandName: "MIS Implants", lineName: "SEVEN", diameterMm: 4.2, lengthMm: 10.0, platformDiameterMm: 4.2, apexDiameterMm: 2.8, priceKopecks: 1950000, articleNumber: "MF7-10420" },
	{ id: "mis-50-10", brand: "mis", brandName: "MIS Implants", lineName: "SEVEN", diameterMm: 5.0, lengthMm: 10.0, platformDiameterMm: 5.0, apexDiameterMm: 3.2, priceKopecks: 1950000, articleNumber: "MF7-10500" },
	{ id: "mis-c1-375-10", brand: "mis", brandName: "MIS Implants", lineName: "C1", diameterMm: 3.75, lengthMm: 10.0, platformDiameterMm: 3.75, apexDiameterMm: 2.4, priceKopecks: 2150000, articleNumber: "C1-10375" },
	{ id: "mis-v3-39-10", brand: "mis", brandName: "MIS Implants", lineName: "V3", diameterMm: 3.9, lengthMm: 10.0, platformDiameterMm: 3.9, apexDiameterMm: 2.5, priceKopecks: 2450000, articleNumber: "V3-10390" },
	...MAPPED_CANONICAL_CATALOG,
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
	{
		id: "mis_seven_regular",
		title: "MIS SEVEN Regular (3.75 x 10 мм)",
		shortLabel: "MIS SEVEN 3.75x10",
		brand: "mis",
		brandName: "MIS Implants",
		lineName: "SEVEN",
		diameterMm: 3.75,
		lengthMm: 10.0,
		clinicalIndicationRu: "Универсальный конический дизайн с двойной резьбой для кости любого типа",
	},
] as const;

/**
 * Finds implant specification by brand, diameter, and length.
 */
export function findImplantSpec(
	brand: ImplantBrandKey | string,
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

// ─── COMPANION SURGICAL & PROSTHETIC FIXTURES (1-CLICK ESTIMATE SUITE) ──────

export interface HealingAbutmentSpec {
	readonly id: string;
	readonly brand: ImplantBrandKey;
	readonly nameRu: string;
	readonly code804n: string;
	readonly diameterMm: number;
	readonly heightMm: number;
	readonly priceKopecks: number;
	readonly priceRub: number;
}

export interface AbutmentSpec {
	readonly id: string;
	readonly brand: ImplantBrandKey;
	readonly nameRu: string;
	readonly code804n: string;
	readonly materialRu: string;
	readonly priceKopecks: number;
	readonly priceRub: number;
}

export const STANDARD_HEALING_ABUTMENTS: Record<ImplantBrandKey, HealingAbutmentSpec> = {
	straumann: {
		id: "ha-straumann-blx",
		brand: "straumann",
		nameRu: "Формирователь десны Straumann BLX / BLT",
		code804n: "A16.07.054.005",
		diameterMm: 4.5,
		heightMm: 4.0,
		priceKopecks: 650000,
		priceRub: 6500,
	},
	nobel_biocare: {
		id: "ha-nobel-active",
		brand: "nobel_biocare",
		nameRu: "Формирователь десны NobelActive Regular",
		code804n: "A16.07.054.005",
		diameterMm: 4.3,
		heightMm: 4.0,
		priceKopecks: 650000,
		priceRub: 6500,
	},
	osstem: {
		id: "ha-osstem-ts3",
		brand: "osstem",
		nameRu: "Формирователь десны Osstem TS III (Regular)",
		code804n: "A16.07.054.005",
		diameterMm: 4.5,
		heightMm: 4.0,
		priceKopecks: 350000,
		priceRub: 3500,
	},
	dentium: {
		id: "ha-dentium-superline",
		brand: "dentium",
		nameRu: "Формирователь десны Dentium SuperLine",
		code804n: "A16.07.054.005",
		diameterMm: 4.5,
		heightMm: 4.0,
		priceKopecks: 350000,
		priceRub: 3500,
	},
	mis: {
		id: "ha-mis-seven",
		brand: "mis",
		nameRu: "Формирователь десны MIS V3 / SEVEN",
		code804n: "A16.07.054.005",
		diameterMm: 4.5,
		heightMm: 4.0,
		priceKopecks: 350000,
		priceRub: 3500,
	},
};

export const STANDARD_PROSTHETIC_ABUTMENTS: Record<ImplantBrandKey, AbutmentSpec> = {
	straumann: {
		id: "ab-straumann-tibase",
		brand: "straumann",
		nameRu: "Индивидуальный титановый абатмент CAD/CAM Straumann Roxolid",
		code804n: "A16.07.054.006",
		materialRu: "Ti-Base Grade 5 (Ti-Zr)",
		priceKopecks: 1250000,
		priceRub: 12500,
	},
	nobel_biocare: {
		id: "ab-nobel-procera",
		brand: "nobel_biocare",
		nameRu: "Индивидуальный титановый абатмент NobelProcera Ti-Base",
		code804n: "A16.07.054.006",
		materialRu: "Titanium Grade 5 ELI",
		priceKopecks: 1200000,
		priceRub: 12000,
	},
	osstem: {
		id: "ab-osstem-custom",
		brand: "osstem",
		nameRu: "Индивидуальный титановый абатмент Osstem Custom Ti-Base",
		code804n: "A16.07.054.006",
		materialRu: "Medical Titanium Grade 4/5",
		priceKopecks: 750000,
		priceRub: 7500,
	},
	dentium: {
		id: "ab-dentium-custom",
		brand: "dentium",
		nameRu: "Индивидуальный титановый абатмент Dentium Dual / Ti-Base",
		code804n: "A16.07.054.006",
		materialRu: "Medical Titanium Ti-6Al-4V",
		priceKopecks: 750000,
		priceRub: 7500,
	},
	mis: {
		id: "ab-mis-connect",
		brand: "mis",
		nameRu: "Индивидуальный титановый абатмент MIS Connect / Ti-Base",
		code804n: "A16.07.054.006",
		materialRu: "Medical Titanium Grade 5",
		priceKopecks: 700000,
		priceRub: 7000,
	},
};

export interface ImplantProstheticSuiteItem {
	readonly code804n: string;
	readonly name: string;
	readonly category: string;
	readonly priceRub: number;
	readonly priceKopecks: number;
	readonly stageKind: string;
	readonly phase: number;
	readonly materials: string;
	readonly clinicalRationale: string;
}

export interface ImplantProstheticSuiteResult {
	readonly toothFdi: number;
	readonly implantSpec: VirtualImplantSpec;
	readonly healingAbutment: HealingAbutmentSpec;
	readonly abutment: AbutmentSpec;
	readonly implantPriceKopecks: number;
	readonly healingAbutmentPriceKopecks: number;
	readonly abutmentPriceKopecks: number;
	readonly totalPriceKopecks: number;
	readonly totalPriceRub: number;
	readonly suiteItems: readonly ImplantProstheticSuiteItem[];
}

export function buildImplantProstheticSuite(
	implantSpec: VirtualImplantSpec,
	toothFdi = 46,
	clinicalRationale = "",
): ImplantProstheticSuiteResult {
	const brand = implantSpec.brand;
	const healingAbutment: HealingAbutmentSpec = (STANDARD_HEALING_ABUTMENTS[brand] ?? STANDARD_HEALING_ABUTMENTS.osstem)!;
	const abutment: AbutmentSpec = (STANDARD_PROSTHETIC_ABUTMENTS[brand] ?? STANDARD_PROSTHETIC_ABUTMENTS.osstem)!;

	const implantPriceKopecks = implantSpec.priceKopecks;
	const healingAbutmentPriceKopecks = healingAbutment.priceKopecks;
	const abutmentPriceKopecks = abutment.priceKopecks;
	const totalPriceKopecks = implantPriceKopecks + healingAbutmentPriceKopecks + abutmentPriceKopecks;
	const totalPriceRub = Math.round(totalPriceKopecks / 100);

	const diameterStr = implantSpec.diameterMm.toFixed(1);
	const lengthStr = implantSpec.lengthMm.toFixed(1);

	const suiteItems: ImplantProstheticSuiteItem[] = [
		{
			code804n: "A16.07.054",
			name: `Внутрикостная дентальная имплантация: ${implantSpec.brandName} ${implantSpec.lineName} (Ø${diameterStr} × ${lengthStr} мм)`,
			category: "Хирургия",
			priceRub: Math.round(implantPriceKopecks / 100),
			priceKopecks: implantPriceKopecks,
			stageKind: "stage_2_surgery",
			phase: 2,
			materials: `Имплантат ${implantSpec.brandName} ${implantSpec.lineName} Ø${diameterStr} × ${lengthStr} мм (арт. ${implantSpec.articleNumber || "—"})`,
			clinicalRationale: clinicalRationale || `Установка имплантата в позиции зуба #${toothFdi} по результатам 3D КЛКТ-планирования.`,
		},
		{
			code804n: healingAbutment.code804n,
			name: `Установка формирователя десны: ${healingAbutment.nameRu}`,
			category: "Хирургия",
			priceRub: healingAbutment.priceRub,
			priceKopecks: healingAbutmentPriceKopecks,
			stageKind: "stage_2_surgery",
			phase: 2,
			materials: `Титановый формирователь десны Ø${healingAbutment.diameterMm} × H${healingAbutment.heightMm} мм`,
			clinicalRationale: `Формирование эстетического десневого профиля прорезывания в области зуба #${toothFdi}.`,
		},
		{
			code804n: abutment.code804n,
			name: `Установка индивидуального абатмента: ${abutment.nameRu}`,
			category: "Ортопедия",
			priceRub: abutment.priceRub,
			priceKopecks: abutmentPriceKopecks,
			stageKind: "stage_3_ortho",
			phase: 3,
			materials: `${abutment.materialRu} (${implantSpec.brandName})`,
			clinicalRationale: `Ортопедический этап: опора под коронку с винтовой фиксацией на имплантате #${toothFdi}.`,
		},
	];

	return {
		toothFdi,
		implantSpec,
		healingAbutment,
		abutment,
		implantPriceKopecks,
		healingAbutmentPriceKopecks,
		abutmentPriceKopecks,
		totalPriceKopecks,
		totalPriceRub,
		suiteItems,
	};
}

