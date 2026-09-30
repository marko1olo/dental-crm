/**
 * Misch Bone Density Profiling & Live Telemetry Engine (HU / Misch D1..D4)
 *
 * Clinical domain:
 * - Misch CE (2008) Bone Density Classification (D1..D4/D5).
 * - Cross-sectional HU profile sampling along virtual implant axis.
 * - Live implant telemetry adapter for 4-viewport synchronized MPR.
 * - Surgical torque guidance & bone condensation protocols.
 *
 * Mandate 8b: Декомпозиция монолитов (строго <= 800 строк).
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
} from '@dental/shared';

import {
  analyzeMischBoneQuality,
  computeHUZoneProfile,
  formatMischProtocolToDiaryText,
  type HUZoneSampling,
  type MischClassificationResult,
} from './boneDensityMischMath.js';

import {
  type CbctVoxelVolume,
  type Point3D,
  sampleVoxelTrilinearHU,
  worldMmToVoxelContinuous,
} from './cbctMprMath.js';

import {
  MANDIBULAR_NERVE_DANGER_THRESHOLD_MM,
  type CrossSectionImplantPose,
  type VirtualImplantSpec,
  calculateApexCoordinates,
} from './implantNerveSafetyAudit.js';

// ─── MISCH BONE DENSITY CLINICAL GUIDANCE & TORQUE PROTOCOL ─────────────────

export interface MischClinicalGuidance {
	readonly boneClass: BoneClass | "D5" | "unmeasured";
	readonly huRange: string;
	readonly boneTypeRu: string;
	readonly anatomicalLocationRu: string;
	readonly recommendedTorqueNcm: string;
	readonly torqueMinNcm: number;
	readonly torqueMaxNcm: number;
	readonly drillingProtocolRu: string;
	readonly riskWarningRu: string;
	readonly isUnderdrillingAllowed: boolean;
	readonly isCondensationRequired: boolean;
}

/**
 * Returns clinical Misch bone density profile with exact insertion torque guidelines and risks.
 * Clinical Standards:
 * - D1 (> 1250 HU): 35-45 N*cm (risk of bone overheating, underdrilling excluded, copious irrigation 4°C).
 * - D2 (850..1250 HU): 35-45 N*cm (risk of bone overheating, underdrilling excluded, copious irrigation).
 * - D3 (350..850 HU): 25-35 N*cm (standard / mild condensation).
 * - D4 (150..350 HU): 25-35 N*cm (bone condensation protocol, risk of insufficient primary stability).
 */
export function getMischClinicalGuidance(
	boneClassOrHU: BoneClass | string | number | null | undefined,
): MischClinicalGuidance {
	let cls = "unmeasured";

	if (typeof boneClassOrHU === "number") {
		if (boneClassOrHU > 1250) cls = "D1";
		else if (boneClassOrHU >= 850) cls = "D2";
		else if (boneClassOrHU >= 350) cls = "D3";
		else if (boneClassOrHU >= 150) cls = "D4";
		else cls = "D5";
	} else if (typeof boneClassOrHU === "string") {
		cls = boneClassOrHU.trim().toUpperCase();
	}

	switch (cls) {
		case "D1":
			return {
				boneClass: "D1",
				huRange: "> 1250 HU",
				boneTypeRu: "Плотная кортикальная кость",
				anatomicalLocationRu: "Передний отдел нижней челюсти (симфиз)",
				recommendedTorqueNcm: "35–45 Н·см",
				torqueMinNcm: 35,
				torqueMaxNcm: 45,
				drillingProtocolRu: "Протокол недопрепарирования исключен, нарезание резьбы метчиком на всю глубину, обильная ирригация стерильным физраствором 4°C",
				riskWarningRu: "Риск перегрева кости (термонекроз при сверлении), протокол недопрепарирования исключен, обильная ирригация",
				isUnderdrillingAllowed: false,
				isCondensationRequired: false,
			};
		case "D2":
			return {
				boneClass: "D2",
				huRange: "850–1250 HU",
				boneTypeRu: "Плотная пористая кость (губчатая + кортикальная)",
				anatomicalLocationRu: "Нижняя челюсть, боковые отделы; передний отдел верхней челюсти",
				recommendedTorqueNcm: "35–45 Н·см",
				torqueMinNcm: 35,
				torqueMaxNcm: 45,
				drillingProtocolRu: "Стандартный хирургический протокол, протокол недопрепарирования исключен, обильная ирригация",
				riskWarningRu: "Риск перегрева кости, протокол недопрепарирования исключен, обильная ирригация",
				isUnderdrillingAllowed: false,
				isCondensationRequired: false,
			};
		case "D3":
			return {
				boneClass: "D3",
				huRange: "350–850 HU",
				boneTypeRu: "Тонкая пористая кость",
				anatomicalLocationRu: "Верхняя челюсть; боковые отделы нижней челюсти",
				recommendedTorqueNcm: "25–35 Н·см",
				torqueMinNcm: 25,
				torqueMaxNcm: 35,
				drillingProtocolRu: "Щадящее препарирование без кортикального метчика, умеренная компрессия кости",
				riskWarningRu: "Умеренная первичная стабильность",
				isUnderdrillingAllowed: true,
				isCondensationRequired: false,
			};
		case "D4":
			return {
				boneClass: "D4",
				huRange: "150–350 HU",
				boneTypeRu: "Мягкая губчатая кость",
				anatomicalLocationRu: "Бугры верхней челюсти",
				recommendedTorqueNcm: "25–35 Н·см",
				torqueMinNcm: 25,
				torqueMaxNcm: 35,
				drillingProtocolRu: "Протокол конденсации кости (остеотомы / биконденсация), недопрепарирование ложа (under-drilling)",
				riskWarningRu: "Протокол конденсации кости, риск недостаточной первичной стабильности",
				isUnderdrillingAllowed: true,
				isCondensationRequired: true,
			};
		case "D5":
			return {
				boneClass: "D5",
				huRange: "< 150 HU",
				boneTypeRu: "Экстремально мягкая кость / дефицит минерализации",
				anatomicalLocationRu: "Зоны недавней экстракции, выраженная атрофия",
				recommendedTorqueNcm: "< 15 Н·см",
				torqueMinNcm: 5,
				torqueMaxNcm: 15,
				drillingProtocolRu: "Прямая имплантация противопоказана без предварительной остеопластики (GBR)",
				riskWarningRu: "Высокий риск дезинтеграции, первичная стабильность не гарантирована",
				isUnderdrillingAllowed: true,
				isCondensationRequired: true,
			};
		case "unmeasured":
		default:
			return {
				boneClass: "unmeasured",
				huRange: "Не измерялась",
				boneTypeRu: "Не определено (требуется КЛКТ)",
				anatomicalLocationRu: "Требуется исследование КЛКТ",
				recommendedTorqueNcm: "—",
				torqueMinNcm: 0,
				torqueMaxNcm: 0,
				drillingProtocolRu: "Стандартный хирургический протокол (ожидает данных КЛКТ)",
				riskWarningRu: "Параметры плотности кости не измерены",
				isUnderdrillingAllowed: false,
				isCondensationRequired: false,
			};
	}
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



