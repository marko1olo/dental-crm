/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL RADIOLOGY & CBCT: MEASURE STATS & HU PROFILE ENGINE (WAVE 129)
 * ═══════════════════════════════════════════════════════════════════════════
 * High-precision mathematical engine for 3D CBCT diagnostic measurements,
 * volumetric Hounsfield Unit (HU) line profiling, and densitometric statistics:
 * - 3D Euclidean distance measurement (calculateDistance3D)
 * - 3D trajectory angle measurement (calculateAngle3D)
 * - 3D planar polygon area and perimeter via Newell's Stokes theorem (calculatePolygonArea3D)
 * - Continuous volumetric HU line profile sampling with trilinear interpolation (sampleProfileHU)
 * - Statistical distribution (mean, stdDev, median, min, max) and Carl Misch bone classification (computeHUStats)
 * - Official A4 clinical measurement protocol generation adhering to Mandate 8d (zero emojis)
 *
 * Adapted from DenCT core/measureStats.ts.
 * Pure TypeScript, zero DOM/Cornerstone dependencies, 100% unit-testable.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { trilinear, type VolumeSamplingData, type Vec3 } from "./cprMath.js";
import { getMischBoneClinicalGuidance, classifyBone, type BoneClass } from "./boneQualityEngine.js";

export type { Vec3 };

/** 3D Euclidean distance measurement between two anatomical landmarks */
export interface DistanceMeasurement {
	p1: Vec3;
	p2: Vec3;
	distanceMm: number;
}

/** 3D angular measurement between two anatomical vectors originating from a vertex */
export interface AngleMeasurement {
	p1: Vec3;
	vertex: Vec3;
	p2: Vec3;
	angleDeg: number;
}

/** 3D planar polygon area and perimeter measurement in arbitrary spatial orientation */
export interface PolygonAreaMeasurement {
	points: Vec3[];
	areaMm2: number;
	perimeterMm: number;
}

/** Volumetric HU sample along a calibrated 3D diagnostic trajectory */
export interface HUProfileSample {
	distanceMm: number;
	point: Vec3;
	hu: number;
}

/** Statistical distribution of HU density and Carl Misch bone classification */
export interface HUStats {
	min: number;
	max: number;
	mean: number;
	stdDev: number;
	median: number;
	boneDensityClass: "D1" | "D2" | "D3" | "D4";
	count: number;
}

/** Clinical input parameters for generating an official A4 measurement report */
export interface MeasureStatsReportInput {
	patientName?: string;
	patientBirthDate?: string;
	studyDate?: string;
	doctorName?: string;
	clinicName?: string;
	studyModality?: string;
	indication?: string;
	distances?: DistanceMeasurement[];
	angles?: AngleMeasurement[];
	polygons?: PolygonAreaMeasurement[];
	profileSamples?: HUProfileSample[];
	huStats?: HUStats;
	notes?: string;
}

/**
 * Calculates Euclidean distance between two 3D spatial coordinates in millimeters.
 *
 * distance = sqrt((x2 - x1)^2 + (y2 - y1)^2 + (z2 - z1)^2)
 */
export function calculateDistance3D(p1: Vec3, p2: Vec3): number {
	const dx = p2[0] - p1[0];
	const dy = p2[1] - p1[1];
	const dz = p2[2] - p1[2];
	return Math.hypot(dx, dy, dz);
}

/**
 * Measures the 3D angle in degrees at `vertex` between directional rays to `p1` and `p2`.
 * Returns 0 if either ray has negligible length (< 1e-6 mm).
 */
export function calculateAngle3D(p1: Vec3, vertex: Vec3, p2: Vec3): number {
	const u: Vec3 = [
		p1[0] - vertex[0],
		p1[1] - vertex[1],
		p1[2] - vertex[2],
	];
	const w: Vec3 = [
		p2[0] - vertex[0],
		p2[1] - vertex[1],
		p2[2] - vertex[2],
	];

	const lu = Math.hypot(u[0], u[1], u[2]);
	const lw = Math.hypot(w[0], w[1], w[2]);

	if (lu < 1e-6 || lw < 1e-6) {
		return 0;
	}

	const dot = u[0] * w[0] + u[1] * w[1] + u[2] * w[2];
	const cosTheta = Math.max(-1, Math.min(1, dot / (lu * lw)));
	return (Math.acos(cosTheta) * 180) / Math.PI;
}

/**
 * Calculates the exact surface area (mm²) and perimeter (mm) of a planar 3D polygon
 * in arbitrary spatial orientation using Newell's method (Stokes' theorem / 3D Green's theorem).
 *
 * Normal vector component formulation:
 * Nx = 0.5 * sum(yi * z(i+1) - y(i+1) * zi)
 * Ny = 0.5 * sum(zi * x(i+1) - z(i+1) * xi)
 * Nz = 0.5 * sum(xi * y(i+1) - x(i+1) * yi)
 * Area = sqrt(Nx^2 + Ny^2 + Nz^2)
 */
export function calculatePolygonArea3D(points: Vec3[]): {
	areaMm2: number;
	perimeterMm: number;
} {
	if (!points || points.length < 3) {
		let perimeter = 0;
		if (points && points.length === 2) {
			perimeter = calculateDistance3D(points[0]!, points[1]!);
		}
		return { areaMm2: 0, perimeterMm: perimeter };
	}

	// Filter out duplicate trailing vertex if user passed closed loop
	const pts = [...points];
	const first = pts[0]!;
	const last = pts[pts.length - 1]!;
	if (pts.length > 3 && calculateDistance3D(first, last) < 1e-6) {
		pts.pop();
	}

	const n = pts.length;
	if (n < 3) {
		return { areaMm2: 0, perimeterMm: 0 };
	}

	let nx = 0;
	let ny = 0;
	let nz = 0;
	let perimeter = 0;

	for (let i = 0; i < n; i++) {
		const curr = pts[i]!;
		const next = pts[(i + 1) % n]!;

		nx += curr[1] * next[2] - next[1] * curr[2];
		ny += curr[2] * next[0] - next[2] * curr[0];
		nz += curr[0] * next[1] - next[0] * curr[1];

		perimeter += calculateDistance3D(curr, next);
	}

	const area = 0.5 * Math.hypot(nx, ny, nz);

	return {
		areaMm2: area,
		perimeterMm: perimeter,
	};
}

/** Helper to sample voxel intensity at a continuous 3D world coordinate */
export function sampleVolumeHU(vol: VolumeSamplingData, p: Vec3): number {
	const [ox, oy, oz] = vol.origin;
	const ci = (p[0] - ox) * vol.invSx;
	const cj = (p[1] - oy) * vol.invSy;
	const ck = (p[2] - oz) * vol.invSz;
	return trilinear(vol.getVoxel, vol.dims, ci, cj, ck);
}

/**
 * Samples CT Hounsfield Units (HU) along a 3D line segment p1 -> p2 at regular spatial
 * intervals (stepMm) using trilinear voxel interpolation.
 *
 * Always starts at distance 0 (p1) and terminates at distance L (p2).
 */
export function sampleProfileHU(
	volume: VolumeSamplingData,
	p1: Vec3,
	p2: Vec3,
	stepMm = 1.0,
): HUProfileSample[] {
	const totalDist = calculateDistance3D(p1, p2);

	if (totalDist < 1e-6) {
		const hu = sampleVolumeHU(volume, p1);
		return [{ distanceMm: 0, point: [...p1], hu }];
	}

	const step = stepMm > 0 ? stepMm : 1.0;
	const samples: HUProfileSample[] = [];
	let currentDist = 0;

	while (currentDist < totalDist - 1e-6) {
		const t = currentDist / totalDist;
		const pt: Vec3 = [
			p1[0] + (p2[0] - p1[0]) * t,
			p1[1] + (p2[1] - p1[1]) * t,
			p1[2] + (p2[2] - p1[2]) * t,
		];
		const hu = sampleVolumeHU(volume, pt);
		samples.push({
			distanceMm: Math.round(currentDist * 1000) / 1000,
			point: pt,
			hu,
		});
		currentDist += step;
	}

	// Always guarantee the exact termination point at totalDist
	samples.push({
		distanceMm: Math.round(totalDist * 1000) / 1000,
		point: [...p2],
		hu: sampleVolumeHU(volume, p2),
	});

	return samples;
}

/**
 * Computes population statistics (min, max, mean, stdDev, median) for a set of HU values
 * or profile samples, and classifies the bone density according to the Carl Misch criteria.
 *
 * Carl Misch Bone Density Classification:
 * - D1: > 1250 HU (Dense cortical bone, anterior mandible)
 * - D2: 850–1250 HU (Thick porous cortical & coarse trabecular bone)
 * - D3: 350–850 HU (Thin porous cortical & fine trabecular bone)
 * - D4: < 350 HU (Fine trabecular bone, posterior maxilla / defect)
 */
export function computeHUStats(
	samples: number[] | HUProfileSample[],
): HUStats {
	if (!samples || samples.length === 0) {
		return {
			min: 0,
			max: 0,
			mean: 0,
			stdDev: 0,
			median: 0,
			boneDensityClass: "D4",
			count: 0,
		};
	}

	const values: number[] = samples.map((s) =>
		typeof s === "number" ? s : s.hu,
	);
	const count = values.length;

	let min = Infinity;
	let max = -Infinity;
	let sum = 0;

	for (let i = 0; i < count; i++) {
		const v = values[i]!;
		sum += v;
		if (v < min) min = v;
		if (v > max) max = v;
	}

	const mean = sum / count;

	let sse = 0;
	for (let i = 0; i < count; i++) {
		const diff = values[i]! - mean;
		sse += diff * diff;
	}
	const stdDev = Math.sqrt(sse / count);

	// Exact median computation
	const sorted = [...values].sort((a, b) => a - b);
	let median: number;
	const mid = Math.floor(count / 2);
	if (count % 2 === 0) {
		median = (sorted[mid - 1]! + sorted[mid]!) / 2;
	} else {
		median = sorted[mid]!;
	}

	// Misch classification
	let boneDensityClass: "D1" | "D2" | "D3" | "D4";
	if (mean > 1250) {
		boneDensityClass = "D1";
	} else if (mean >= 850) {
		boneDensityClass = "D2";
	} else if (mean >= 350) {
		boneDensityClass = "D3";
	} else {
		boneDensityClass = "D4";
	}

	return {
		min: Math.abs(min - Math.round(min)) < 1e-6 ? Math.round(min) : min,
		max: Math.abs(max - Math.round(max)) < 1e-6 ? Math.round(max) : max,
		mean,
		stdDev,
		median,
		boneDensityClass,
		count,
	};
}

/** Helper constructor for distance measurement */
export function measureDistance(p1: Vec3, p2: Vec3): DistanceMeasurement {
	return {
		p1,
		p2,
		distanceMm: calculateDistance3D(p1, p2),
	};
}

/** Helper constructor for angle measurement */
export function measureAngle(
	p1: Vec3,
	vertex: Vec3,
	p2: Vec3,
): AngleMeasurement {
	return {
		p1,
		vertex,
		p2,
		angleDeg: calculateAngle3D(p1, vertex, p2),
	};
}

/** Helper constructor for polygon area measurement */
export function measurePolygonArea(points: Vec3[]): PolygonAreaMeasurement {
	const { areaMm2, perimeterMm } = calculatePolygonArea3D(points);
	return {
		points,
		areaMm2,
		perimeterMm,
	};
}

/** Formats a floating point number to fixed decimals */
function f1(num: number): string {
	return Number.isFinite(num) ? num.toFixed(1) : "0.0";
}

function f2(num: number): string {
	return Number.isFinite(num) ? num.toFixed(2) : "0.00";
}

/**
 * Generates an official clinical A4 measurement report for CBCT diagnostic data.
 * Adheres strictly to Mandate 8d (zero emojis, strict medical density and typography).
 */
export function formatMeasureStatsA4Report(
	input: MeasureStatsReportInput,
): string {
	const patientName = input.patientName || "Не указан";
	const patientBirthDate = input.patientBirthDate || "Не указана";
	const studyDate = input.studyDate || new Date().toISOString().split("T")[0]!;
	const doctorName = input.doctorName || "Врач-стоматолог / Рентгенолог";
	const clinicName = input.clinicName || "Стоматологическая клиника DENTE";
	const modality = input.studyModality || "КЛКТ (CBCT, 3D компьютерная томография)";
	const indication = input.indication || "Планирование дентальной имплантации и костной пластики";

	const distances = input.distances || [];
	const angles = input.angles || [];
	const polygons = input.polygons || [];
	const profileSamples = input.profileSamples || [];
	const huStats = input.huStats || (profileSamples.length > 0 ? computeHUStats(profileSamples) : null);

	const lines: string[] = [
		"================================================================================",
		"    ПРОТОКОЛ РЕНТГЕНОМОРФОМЕТРИЧЕСКИХ И ДЕНСИТОМЕТРИЧЕСКИХ ИЗМЕРЕНИЙ КЛКТ",
		"        (Медицинская документация: Форма 043/у, СанПиН 2.6.1.1192-03)",
		"================================================================================",
		"",
		"1. ПАСПОРТНАЯ И ДИАГНОСТИЧЕСКАЯ ЧАСТЬ",
		"--------------------------------------------------------------------------------",
		`Медицинская организация : ${clinicName}`,
		`ФИО Пациента            : ${patientName}`,
		`Дата рождения           : ${patientBirthDate}`,
		`Дата исследования       : ${studyDate}`,
		`Лечащий врач            : ${doctorName}`,
		`Аппаратная модальность  : ${modality}`,
		`Клинические показания   : ${indication}`,
		"",
		"--------------------------------------------------------------------------------",
		"2. ЛИНЕЙНЫЕ 3D ИЗМЕРЕНИЯ (ДИСТАНЦИИ И ТОЛЩИНА АЛЬВЕОЛЯРНОГО ГРЕБНЯ)",
		"--------------------------------------------------------------------------------",
	];

	if (distances.length === 0) {
		lines.push("Линейные измерения не проводились.");
	} else {
		lines.push(" № | Точка P1 [X, Y, Z] (мм)        | Точка P2 [X, Y, Z] (мм)        | Расстояние (мм)");
		lines.push("---+-------------------------------+-------------------------------+----------------");
		for (let i = 0; i < distances.length; i++) {
			const d = distances[i]!;
			const num = String(i + 1).padStart(2, " ");
			const p1Str = `[${f1(d.p1[0])}, ${f1(d.p1[1])}, ${f1(d.p1[2])}]`.padEnd(29, " ");
			const p2Str = `[${f1(d.p2[0])}, ${f1(d.p2[1])}, ${f1(d.p2[2])}]`.padEnd(29, " ");
			const distStr = `${f2(d.distanceMm)} мм`.padStart(15, " ");
			lines.push(`${num} | ${p1Str} | ${p2Str} | ${distStr}`);
		}
		const distVals = distances.map((d) => d.distanceMm);
		const sumDist = distVals.reduce((acc, v) => acc + v, 0);
		const meanDist = sumDist / distVals.length;
		const maxDist = Math.max(...distVals);
		const minDist = Math.min(...distVals);
		lines.push("---+-------------------------------+-------------------------------+----------------");
		lines.push(`Итого измерений: ${distances.length} | Мин: ${f2(minDist)} мм | Макс: ${f2(maxDist)} мм | Среднее: ${f2(meanDist)} мм`);
	}

	lines.push("");
	lines.push("--------------------------------------------------------------------------------");
	lines.push("3. УГЛОВЫЕ 3D ИЗМЕРЕНИЯ (ОСИ ИМПЛАНТАТОВ И АНАТОМИЧЕСКИЕ НАКЛОНЫ)");
	lines.push("--------------------------------------------------------------------------------");

	if (angles.length === 0) {
		lines.push("Угловые измерения не проводились.");
	} else {
		lines.push(" № | Вершина [X, Y, Z] (мм)         | Вектор 1 (P1) (мм)            | Вектор 2 (P2) (мм)            | Угол (град.)");
		lines.push("---+-------------------------------+-------------------------------+-------------------------------+-------------");
		for (let i = 0; i < angles.length; i++) {
			const a = angles[i]!;
			const num = String(i + 1).padStart(2, " ");
			const vertStr = `[${f1(a.vertex[0])}, ${f1(a.vertex[1])}, ${f1(a.vertex[2])}]`.padEnd(29, " ");
			const p1Str = `[${f1(a.p1[0])}, ${f1(a.p1[1])}, ${f1(a.p1[2])}]`.padEnd(29, " ");
			const p2Str = `[${f1(a.p2[0])}, ${f1(a.p2[1])}, ${f1(a.p2[2])}]`.padEnd(29, " ");
			const angStr = `${f1(a.angleDeg)}°`.padStart(12, " ");
			lines.push(`${num} | ${vertStr} | ${p1Str} | ${p2Str} | ${angStr}`);
		}
	}

	lines.push("");
	lines.push("--------------------------------------------------------------------------------");
	lines.push("4. ПЛОЩАДНЫЕ ИЗМЕРЕНИЯ (ПЛОСКИЕ СРЕЗЫ, ДЕФЕКТЫ И РЕЗЕКЦИИ)");
	lines.push("--------------------------------------------------------------------------------");

	if (polygons.length === 0) {
		lines.push("Площадные измерения не проводились.");
	} else {
		lines.push(" № | Количество вершин | Периметр (мм) | Площадь (мм²) | Площадь (см²)");
		lines.push("---+-------------------+---------------+---------------+---------------");
		for (let i = 0; i < polygons.length; i++) {
			const p = polygons[i]!;
			const num = String(i + 1).padStart(2, " ");
			const ptsStr = String(p.points.length).padStart(17, " ");
			const perimStr = `${f2(p.perimeterMm)} мм`.padStart(13, " ");
			const areaStr = `${f2(p.areaMm2)} мм²`.padStart(13, " ");
			const areaCm2Str = `${f2(p.areaMm2 / 100)} см²`.padStart(13, " ");
			lines.push(`${num} | ${ptsStr} | ${perimStr} | ${areaStr} | ${areaCm2Str}`);
		}
	}

	lines.push("");
	lines.push("--------------------------------------------------------------------------------");
	lines.push("5. ДЕНСИТОМЕТРИЯ ХАУНСФИЛДА И КЛАССИФИКАЦИЯ КОСТНОЙ ТКАНИ (CARL MISCH)");
	lines.push("--------------------------------------------------------------------------------");

	if (!huStats) {
		lines.push("Денситометрический профиль не рассчитывался.");
	} else {
		const misch = getMischBoneClinicalGuidance(huStats.boneDensityClass as BoneClass);
		lines.push(`Количество исследованных вокселей (N) : ${huStats.count}`);
		lines.push(`Средняя оптическая плотность (Mean)   : ${f1(huStats.mean)} HU (GV)`);
		lines.push(`Медианная плотность (Median)          : ${f1(huStats.median)} HU (GV)`);
		lines.push(`Стандартное отклонение (StdDev, SD)   : ${f1(huStats.stdDev)} HU`);
		lines.push(`Диапазон плотности [Min .. Max]       : [${f1(huStats.min)} .. ${f1(huStats.max)}] HU`);
		lines.push(`Классификация плотности по Карлу Мишу : ${misch.classNameRu}`);
		lines.push(`Анатомическая локализация             : ${misch.anatomicLocationRu}`);
		lines.push(`Кортикальный слой                     : ${misch.corticalDescriptionRu}`);
		lines.push(`Трабекулярная структура               : ${misch.trabecularDescriptionRu}`);
		lines.push(`Тактильная плотность кости            : ${misch.tactileFeelRu}`);
		lines.push(`Рекомендуемый хирургический протокол  : ${misch.drillingProtocolRu}`);
		lines.push(`Целевой торк при установке имплантата : ${misch.recommendedTorqueNcm.target} Н*см (диапазон ${misch.recommendedTorqueNcm.min}-${misch.recommendedTorqueNcm.max} Н*см)`);
		lines.push(`Прогноз остеоинтеграции (срок заживления): НЧ: ${misch.healingMonths.mandible} мес. / ВЧ: ${misch.healingMonths.maxilla} мес.`);
	}

	if (profileSamples.length > 0) {
		lines.push("");
		lines.push("Профиль плотности по длине траектории (выборка ключевых контрольных точек):");
		const step = Math.max(1, Math.floor(profileSamples.length / 8));
		for (let i = 0; i < profileSamples.length; i += step) {
			const s = profileSamples[i]!;
			lines.push(`  Дистанция: ${f1(s.distanceMm)} мм -> Плотность: ${f1(s.hu)} HU`);
		}
		const lastSample = profileSamples[profileSamples.length - 1]!;
		if (profileSamples.length % step !== 1) {
			lines.push(`  Дистанция: ${f1(lastSample.distanceMm)} мм -> Плотность: ${f1(lastSample.hu)} HU`);
		}
	}

	if (input.notes) {
		lines.push("");
		lines.push("--------------------------------------------------------------------------------");
		lines.push("6. КЛИНИЧЕСКИЕ ПРИМЕЧАНИЯ И ОСОБЫЕ ОТМЕТКИ");
		lines.push("--------------------------------------------------------------------------------");
		lines.push(input.notes);
	}

	lines.push("");
	lines.push("================================================================================");
	lines.push("Протокол сформирован автоматически цифровым модулем CBCT Measure Stats Engine.");
	lines.push(`Врач-исследователь: ____________________ / ${doctorName} /   Дата: ${studyDate}`);
	lines.push("================================================================================");

	return lines.join("\n");
}

// ── Consolidated ROI Stats, Profiling & Implant Bed Densitometry ──

/**
 * Population intensity statistics for a sample array of CT/CBCT Hounsfield Units.
 */
export interface RoiStats {
	count: number;
	mean: number;
	stdDev: number;
	min: number;
	max: number;
}

/**
 * Population mean, standard deviation, min, and max of a set of intensity samples.
 * Returns null for empty inputs.
 */
export function roiStats(values: ArrayLike<number>): RoiStats | null {
	const n = values.length;
	if (n === 0) return null;

	let min = Infinity;
	let max = -Infinity;
	let sum = 0;

	for (let i = 0; i < n; i++) {
		const v = values[i] ?? 0;
		sum += v;
		if (v < min) min = v;
		if (v > max) max = v;
	}

	const mean = sum / n;
	let sse = 0;

	for (let i = 0; i < n; i++) {
		const v = values[i] ?? 0;
		const d = v - mean;
		sse += d * d;
	}

	return {
		count: n,
		mean,
		stdDev: Math.sqrt(sse / n),
		min,
		max,
	};
}

/**
 * Samples CT Hounsfield Units (HU) along a 3D world segment a -> b at `samples`
 * evenly spaced points using trilinear voxel interpolation.
 * Consistent with cross-sectional and panoramic CPR reslicing.
 */
export function lineProfileHU(
	vol: VolumeSamplingData,
	a: Vec3,
	b: Vec3,
	samples = 64,
): number[] {
	const n = Math.max(2, Math.floor(samples));
	const [ox, oy, oz] = vol.origin;
	const out = new Array<number>(n);

	for (let i = 0; i < n; i++) {
		const t = i / (n - 1);
		const wx = a[0] + (b[0] - a[0]) * t;
		const wy = a[1] + (b[1] - a[1]) * t;
		const wz = a[2] + (b[2] - a[2]) * t;

		out[i] = trilinear(
			vol.getVoxel,
			vol.dims,
			(wx - ox) * vol.invSx,
			(wy - oy) * vol.invSy,
			(wz - oz) * vol.invSz,
		);
	}

	return out;
}

/**
 * Angle in degrees at `vertex` between the rays to `a` and `b` (2D or 3D).
 * Returns 0 if either ray has zero length.
 */
export function angleDeg(a: number[], vertex: number[], b: number[]): number {
	const u = a.map((v, i) => v - (vertex[i] ?? 0));
	const w = b.map((v, i) => v - (vertex[i] ?? 0));
	const dot = u.reduce((s, x, i) => s + x * (w[i] ?? 0), 0);
	const lu = Math.hypot(...u);
	const lw = Math.hypot(...w);

	if (lu === 0 || lw === 0) return 0;

	const c = Math.max(-1, Math.min(1, dot / (lu * lw)));
	return (Math.acos(c) * 180) / Math.PI;
}

/**
 * Quantitative densitometric analysis of a planned dental implant osteotomy bed.
 */
export interface ImplantBedDensitometry {
	profile: number[];
	stats: RoiStats;
	boneClass: string;
	corticalThicknessMm: number;
	trabecularMeanHU: number;
	warningLowDensity: boolean;
}

/**
 * Quantitative densitometric analysis of a planned dental implant osteotomy bed:
 * 1. Samples bone HU density profile from crest to apex via lineProfileHU.
 * 2. Calculates comprehensive ROI statistics over the trajectory.
 * 3. Classifies overall bed bone quality according to Carl Misch (D1–D5).
 * 4. Measures cortical plate thickness from crest to point of drop below 850 HU.
 * 5. Computes mean trabecular / cancellous core density.
 * 6. Sets warningLowDensity = true if trabecularMeanHU < 350 HU or min < 150 HU.
 */
export function calculateImplantBedDensitometry(
	vol: VolumeSamplingData,
	crestPoint: Vec3,
	apexPoint: Vec3,
	samples = 64,
): ImplantBedDensitometry {
	const profile = lineProfileHU(vol, crestPoint, apexPoint, samples);
	const n = profile.length;
	const stats = roiStats(profile) ?? {
		count: 0,
		mean: 0,
		stdDev: 0,
		min: 0,
		max: 0,
	};

	const totalLengthMm = Math.hypot(
		apexPoint[0] - crestPoint[0],
		apexPoint[1] - crestPoint[1],
		apexPoint[2] - crestPoint[2],
	);

	// Misch bone classification based on mean density across the osteotomy bed
	const boneClass = classifyBone(stats.mean);

	// Find the first sample index where bone density drops below the cortical threshold (850 HU)
	const dropIndex = profile.findIndex((v) => v < 850);

	let corticalThicknessMm = 0;
	if (n >= 2 && totalLengthMm > 0) {
		if (dropIndex === -1) {
			// Pure cortical bone throughout the entire length (e.g. solid D1)
			corticalThicknessMm = totalLengthMm;
		} else if (dropIndex > 0) {
			// Distance from crest (index 0) to the sample where density drops below 850 HU
			corticalThicknessMm = (dropIndex / (n - 1)) * totalLengthMm;
		} else {
			// Crest point itself is already below 850 HU (no dense crestal cortex)
			corticalThicknessMm = 0;
		}
	}

	// Trabecular bone corresponds to the region beyond the crestal cortical plate
	let trabecularMeanHU = stats.mean;
	if (dropIndex >= 0) {
		const trabecularSamples = profile.slice(dropIndex);
		if (trabecularSamples.length > 0) {
			const trabStats = roiStats(trabecularSamples);
			if (trabStats) {
				trabecularMeanHU = trabStats.mean;
			}
		}
	}

	// Clinical safety warning: trabecular bone density < 350 HU (D4) or localized defect / soft tissue < 150 HU (D5)
	const warningLowDensity = trabecularMeanHU < 350 || stats.min < 150;

	return {
		profile,
		stats,
		boneClass,
		corticalThicknessMm,
		trabecularMeanHU,
		warningLowDensity,
	};
}
