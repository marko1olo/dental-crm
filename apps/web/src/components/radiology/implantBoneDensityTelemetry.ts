/**
 * Live Misch Bone Density & 3D Safety Telemetry Engine
 * Calculates safety clearances (IAN >= 2.0 mm, Sinus >= 1.0 mm, Neighbors >= 3.0 mm) and HUD telemetry.
 * Standards: ITI Consensus, Misch CE, Mandate 8b (<= 300 lines).
 */

import {
	sampleImplantBoneHU,
	evaluateImplantSafety,
	DEFAULT_SAFETY_THRESHOLDS,
	getMischProfile,
	type BoneClass,
	type BoneSample,
	type Vec3,
	type ImplantSeg,
	type VolumeSamplingData,
} from "@dental/shared";

import {
	type CbctVoxelVolume,
	type Point3D,
} from "./cbctMprMath.js";

import {
	MANDIBULAR_NERVE_DANGER_THRESHOLD_MM,
	type CrossSectionImplantPose,
	type VirtualImplantSpec,
	calculateApexCoordinates,
} from "./implantNerveSafetyAudit.js";
import type { Implant3DWorldProjection } from "./implantSafetyEngine.js";

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
