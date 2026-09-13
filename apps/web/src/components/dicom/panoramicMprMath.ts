/**
 * panoramicMprMath.ts
 *
 * Medical Imaging & Multi-Planar Reconstruction (MPR) Pure Mathematical Engine:
 * 1. Catmull-Rom Dental Arch Spline Generator from 7-9 Anatomical Jaw Landmarks
 * 2. Normal & Tangent Frenet-Serret Vector Evaluation along Curve
 * 3. Cross-Sectional Slice Plane Generator (step 1.0-2.0mm, thickness 0.5-20mm)
 * 4. Synchronized 4-Viewport MPR Coordinate Transformation
 * 5. Misch Bone Density (D1-D5) HU Classification & Implant Drilling Protocols
 *
 * Coordinate frame: WORLD millimetres (DICOM Patient coordinate system: +X Left, +Y Posterior, +Z Superior).
 * Pure math: zero DOM, zero Canvas, zero React dependencies for 100% deterministic testability.
 */

export interface Point2D {
	x: number;
	y: number;
}

export interface Point3D {
	x: number;
	y: number;
	z: number;
}

export type AnatomicalJawLandmark =
	| "condyle_right"
	| "angle_right"
	| "molar_right"
	| "canine_right"
	| "incisors"
	| "canine_left"
	| "molar_left"
	| "angle_left"
	| "condyle_left";

export interface AnatomicalJawPoint {
	landmark: AnatomicalJawLandmark;
	x: number;
	y: number;
	z: number;
	label: string;
}

export interface ArchCurvePoint {
	point: Point3D;
	tangent: Point3D; // Normalized unit vector along curve direction
	normal: Point3D; // Normalized unit vector perpendicular to curve (trans-axial/buccal-lingual)
	binormal: Point3D; // Normalized unit vector perpendicular to tangent & normal (along Z / vertical)
	arcLengthMm: number; // Cumulative distance from start of arch in mm
	index: number;
}

export interface CrossSectionSlicePlane {
	sliceIndex: number;
	center: Point3D; // World position on the dental arch
	normal: Point3D; // Direction of the slice plane normal (tangent to arch curve)
	tangent: Point3D; // Horizontal slice axis (buccolingual / curve normal)
	up: Point3D; // Vertical slice axis (apico-coronal / binormal)
	arcLengthMm: number; // Distance along dental arch from right condyle/angle
	widthMm: number; // Buccolingual FOV (typically 20 - 40 mm)
	heightMm: number; // Vertical FOV (typically 30 - 50 mm)
	thicknessMm: number; // Slice thickness for raycasting (0.5 - 20 mm)
}

export interface MprCrosshairSync {
	worldPos: Point3D;
	axialSliceZ: number;
	coronalSliceY: number;
	sagittalSliceX: number;
	activeCrossSectionIndex: number;
	activeArchParamT: number;
	distanceToArchMm: number;
}

export type ExtendedMischClass = "D1" | "D2" | "D3" | "D4" | "D5";

export interface BoneDensityRecommendation {
	mischClass: ExtendedMischClass;
	huRange: string;
	label: string;
	description: string;
	drillingRpm: string;
	torqueNcm: string;
	irrigation: boolean;
	corticalTap: boolean;
	underDrilling: boolean;
	underDrillingMm: number;
	osteotomeCondensation: boolean;
	clinicalAdvice: string;
}

// ---------------------------------------------------------------------------
// VECTOR MATH UTILITIES
// ---------------------------------------------------------------------------

export function vec3Length(v: Point3D): number {
	return Math.hypot(v.x, v.y, v.z);
}

export function vec3Normalize(v: Point3D): Point3D {
	const len = vec3Length(v);
	if (len < 1e-9) return { x: 0, y: 0, z: 1 };
	return { x: v.x / len, y: v.y / len, z: v.z / len };
}

export function vec3Dot(a: Point3D, b: Point3D): number {
	return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function vec3Cross(a: Point3D, b: Point3D): Point3D {
	return {
		x: a.y * b.z - a.z * b.y,
		y: a.z * b.x - a.x * b.z,
		z: a.x * b.y - a.y * b.x,
	};
}

export function vec3Distance(a: Point3D, b: Point3D): number {
	return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
}

export function vec3Lerp(a: Point3D, b: Point3D, t: number): Point3D {
	return {
		x: a.x + (b.x - a.x) * t,
		y: a.y + (b.y - a.y) * t,
		z: a.z + (b.z - a.z) * t,
	};
}

// ---------------------------------------------------------------------------
// 1. ANATOMICAL JAW CONTROL POINTS GENERATOR (7-9 LANDMARKS)
// ---------------------------------------------------------------------------

/**
 * Generates default anatomical jaw control points (7 or 9 landmarks):
 * Condyle Right -> Angle Right -> (Molar Right) -> Canine Right -> Central Incisors ->
 * Canine Left -> (Molar Left) -> Angle Left -> Condyle Left.
 */
export function createAnatomicalJawControlPoints(
	options: {
		mandibleWidthMm?: number;
		archDepthMm?: number;
		zPlane?: number;
		includeMolars?: boolean;
	} = {},
): AnatomicalJawPoint[] {
	const width = options.mandibleWidthMm ?? 90; // Condyle-to-condyle ~90mm
	const depth = options.archDepthMm ?? 60; // Condyle-to-incisor depth ~60mm
	const z = options.zPlane ?? -42.5;
	const halfW = width / 2;

	const points: AnatomicalJawPoint[] = [
		{
			landmark: "condyle_right",
			x: -halfW,
			y: -depth * 0.35,
			z,
			label: "Правый мыщелковый отросток (Condyle R)",
		},
		{
			landmark: "angle_right",
			x: -halfW * 0.85,
			y: depth * 0.1,
			z,
			label: "Правый угол челюсти (Angle R)",
		},
	];

	if (options.includeMolars ?? true) {
		points.push({
			landmark: "molar_right",
			x: -halfW * 0.62,
			y: depth * 0.35,
			z,
			label: "Правые моляры (#47-46)",
		});
	}

	points.push(
		{
			landmark: "canine_right",
			x: -halfW * 0.32,
			y: depth * 0.72,
			z,
			label: "Правый клык (#43)",
		},
		{
			landmark: "incisors",
			x: 0,
			y: depth * 0.85,
			z,
			label: "Центральные резцы (#41-31)",
		},
		{
			landmark: "canine_left",
			x: halfW * 0.32,
			y: depth * 0.72,
			z,
			label: "Левый клык (#33)",
		},
	);

	if (options.includeMolars ?? true) {
		points.push({
			landmark: "molar_left",
			x: halfW * 0.62,
			y: depth * 0.35,
			z,
			label: "Левые моляры (#36-37)",
		});
	}

	points.push(
		{
			landmark: "angle_left",
			x: halfW * 0.85,
			y: depth * 0.1,
			z,
			label: "Левый угол челюсти (Angle L)",
		},
		{
			landmark: "condyle_left",
			x: halfW,
			y: -depth * 0.35,
			z,
			label: "Левый мыщелковый отросток (Condyle L)",
		},
	);

	return points;
}

// ---------------------------------------------------------------------------
// 2. CENTRIPETAL CATMULL-ROM SPLINE & FRENET-SERRET FRAME EVALUATION
// ---------------------------------------------------------------------------

function reflectPoint(anchor: Point3D, through: Point3D): Point3D {
	return {
		x: 2 * anchor.x - through.x,
		y: 2 * anchor.y - through.y,
		z: 2 * anchor.z - through.z,
	};
}

/**
 * Centripetal Catmull-Rom point and analytical derivative evaluation.
 */
function evaluateCatmullRom3D(
	p0: Point3D,
	p1: Point3D,
	p2: Point3D,
	p3: Point3D,
	t: number,
	alpha: number = 0.5,
): { pos: Point3D; tangent: Point3D } {
	const knot = (a: Point3D, b: Point3D, prev: number): number =>
		prev + Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) ** alpha;

	const t0 = 0;
	const t1 = knot(p0, p1, t0);
	const t2 = knot(p1, p2, t1);
	const t3 = knot(p2, p3, t2);

	if (t1 === t0 || t2 === t1 || t3 === t2) {
		const pos = vec3Lerp(p1, p2, t);
		const tangent = vec3Normalize({
			x: p2.x - p1.x,
			y: p2.y - p1.y,
			z: p2.z - p1.z,
		});
		return { pos, tangent };
	}

	const dt = 1e-4;
	const tClamped = Math.max(0, Math.min(1, t));
	const tPrev = Math.max(0, tClamped - dt);
	const tNext = Math.min(1, tClamped + dt);

	const evalPos = (paramT: number): Point3D => {
		const tt = t1 + (t2 - t1) * paramT;
		const a1 = vec3Lerp(p0, p1, (tt - t0) / (t1 - t0));
		const a2 = vec3Lerp(p1, p2, (tt - t1) / (t2 - t1));
		const a3 = vec3Lerp(p2, p3, (tt - t2) / (t3 - t2));
		const b1 = vec3Lerp(a1, a2, (tt - t0) / (t2 - t0));
		const b2 = vec3Lerp(a2, a3, (tt - t1) / (t3 - t1));
		return vec3Lerp(b1, b2, (tt - t1) / (t2 - t1));
	};

	const pos = evalPos(tClamped);
	const posPrev = evalPos(tPrev);
	const posNext = evalPos(tNext);
	const delta = tNext - tPrev;

	const rawTangent =
		delta > 0
			? {
					x: (posNext.x - posPrev.x) / delta,
					y: (posNext.y - posPrev.y) / delta,
					z: (posNext.z - posPrev.z) / delta,
				}
			: { x: p2.x - p1.x, y: p2.y - p1.y, z: p2.z - p1.z };

	return { pos, tangent: vec3Normalize(rawTangent) };
}

/**
 * Generates an interpolated Catmull-Rom Dental Arch Curve with smooth tangents, normals, and binormals.
 */
export function generateCatmullRomArch(
	controlPoints: (Point3D | Point2D)[],
	stepMm: number = 0.5,
): ArchCurvePoint[] {
	if (controlPoints.length < 2) return [];

	const pts3D: Point3D[] = controlPoints.map((p) => ({
		x: p.x,
		y: p.y,
		z: "z" in p && typeof p.z === "number" ? p.z : 0,
	}));

	const last = pts3D.length - 1;
	const rawCurve: { pos: Point3D; tangent: Point3D }[] = [];

	for (let i = 0; i < last; i++) {
		const p1 = pts3D[i]!;
		const p2 = pts3D[i + 1]!;
		const p0 = i === 0 ? reflectPoint(p1, p2) : pts3D[i - 1] ?? reflectPoint(p1, p2);
		const p3 =
			i + 2 > last ? reflectPoint(p2, p1) : pts3D[i + 2] ?? reflectPoint(p2, p1);

		const chordMm = vec3Distance(p1, p2);
		const steps = Math.max(1, Math.round(chordMm / Math.max(0.1, stepMm)));

		for (let j = 0; j < steps; j++) {
			const t = j / steps;
			rawCurve.push(evaluateCatmullRom3D(p0, p1, p2, p3, t));
		}
	}

	const tail = pts3D[last]!;
	const prevTail = pts3D[last - 1]!;
	rawCurve.push({
		pos: { ...tail },
		tangent: vec3Normalize({
			x: tail.x - prevTail.x,
			y: tail.y - prevTail.y,
			z: tail.z - prevTail.z,
		}),
	});

	// Compute cumulative arc length and Frenet-Serret normal & binormal frames
	const result: ArchCurvePoint[] = [];
	let cumulativeLength = 0;
	const worldUp: Point3D = { x: 0, y: 0, z: 1 };

	for (let i = 0; i < rawCurve.length; i++) {
		const curr = rawCurve[i]!;
		if (i > 0) {
			const prev = rawCurve[i - 1]!;
			cumulativeLength += vec3Distance(prev.pos, curr.pos);
		}

		const tangent = curr.tangent;
		// Normal in axial plane: perpendicular to tangent and world up
		let normalVec = vec3Cross(tangent, worldUp);
		if (vec3Length(normalVec) < 1e-4) {
			normalVec = vec3Cross(tangent, { x: 0, y: 1, z: 0 });
			if (vec3Length(normalVec) < 1e-4) {
				normalVec = vec3Cross(tangent, { x: 1, y: 0, z: 0 });
			}
		}
		const normalLen = vec3Length(normalVec);
		const normal =
			normalLen > 1e-6 ? vec3Normalize(normalVec) : { x: 1, y: 0, z: 0 };
		// Binormal (vertical axis): tangent x normal
		const binormal = vec3Normalize(vec3Cross(normal, tangent));

		result.push({
			point: curr.pos,
			tangent,
			normal,
			binormal,
			arcLengthMm: cumulativeLength,
			index: i,
		});
	}

	return result;
}

// ---------------------------------------------------------------------------
// 3. CROSS-SECTIONAL SLICE PLANE GENERATOR
// ---------------------------------------------------------------------------

export interface CrossSectionOptions {
	stepIntervalMm?: number; // Distance between cross-sectional slices (e.g. 1.0mm - 2.0mm)
	thicknessMm?: number; // Slab thickness for raycast (0.5mm - 20mm)
	widthMm?: number; // Buccolingual width (typically 20 - 40mm)
	heightMm?: number; // Apico-coronal height (typically 30 - 50mm)
}

/**
 * Generates equidistant perpendicular cross-sectional slice planes along the dental arch curve.
 */
export function generateCrossSectionSlicePlanes(
	curvePoints: ArchCurvePoint[],
	options: CrossSectionOptions = {},
): CrossSectionSlicePlane[] {
	if (curvePoints.length < 2) return [];

	const stepInterval = Math.max(0.5, Math.min(10.0, options.stepIntervalMm ?? 1.5));
	const thickness = Math.max(0.5, Math.min(20.0, options.thicknessMm ?? 1.0));
	const width = Math.max(10.0, Math.min(80.0, options.widthMm ?? 30.0));
	const height = Math.max(10.0, Math.min(80.0, options.heightMm ?? 40.0));

	const totalLength = curvePoints[curvePoints.length - 1]!.arcLengthMm;
	const numSlices = Math.max(2, Math.floor(totalLength / stepInterval) + 1);

	const slices: CrossSectionSlicePlane[] = [];
	let curveIdx = 0;

	for (let sliceIdx = 0; sliceIdx < numSlices; sliceIdx++) {
		const targetArcLength = Math.min(totalLength, sliceIdx * stepInterval);

		// Find surrounding points on curve
		while (
			curveIdx < curvePoints.length - 1 &&
			curvePoints[curveIdx + 1]!.arcLengthMm < targetArcLength
		) {
			curveIdx++;
		}

		const pA = curvePoints[curveIdx]!;
		const pB = curvePoints[Math.min(curvePoints.length - 1, curveIdx + 1)]!;
		const segmentLen = pB.arcLengthMm - pA.arcLengthMm;
		const alpha =
			segmentLen > 1e-6 ? (targetArcLength - pA.arcLengthMm) / segmentLen : 0;

		const center = vec3Lerp(pA.point, pB.point, alpha);
		const tangent = vec3Normalize(vec3Lerp(pA.tangent, pB.tangent, alpha));
		const normal = vec3Normalize(vec3Lerp(pA.normal, pB.normal, alpha));
		const up = vec3Normalize(vec3Lerp(pA.binormal, pB.binormal, alpha));

		slices.push({
			sliceIndex: sliceIdx,
			center,
			normal: tangent, // Normal of slice plane is tangent to arch curve
			tangent: normal, // Horizontal axis of slice plane is normal to arch curve (buccolingual)
			up, // Vertical axis of slice plane is binormal (apico-coronal)
			arcLengthMm: targetArcLength,
			widthMm: width,
			heightMm: height,
			thicknessMm: thickness,
		});
	}

	return slices;
}

// ---------------------------------------------------------------------------
// 4. SYNCHRONIZED 4-VIEWPORT MPR COORDINATE TRANSFORMER
// ---------------------------------------------------------------------------

/**
 * Synchronizes crosshair positions and slice indices across all 4 viewports:
 * Axial (XY), Coronal (XZ), Sagittal (YZ), and Curved Panoramic / Cross-section.
 */
export function synchronizeMprCoordinates(
	worldPos: Point3D,
	archCurve: ArchCurvePoint[],
	crossSections: CrossSectionSlicePlane[],
): MprCrosshairSync {
	let nearestArchIdx = 0;
	let minArchDist = Infinity;

	for (let i = 0; i < archCurve.length; i++) {
		const d = vec3Distance(worldPos, archCurve[i]!.point);
		if (d < minArchDist) {
			minArchDist = d;
			nearestArchIdx = i;
		}
	}

	let nearestSliceIdx = 0;
	let minSliceDist = Infinity;

	for (let i = 0; i < crossSections.length; i++) {
		const d = vec3Distance(worldPos, crossSections[i]!.center);
		if (d < minSliceDist) {
			minSliceDist = d;
			nearestSliceIdx = i;
		}
	}

	const activeArchParamT =
		archCurve.length > 1 ? nearestArchIdx / (archCurve.length - 1) : 0;

	return {
		worldPos,
		axialSliceZ: worldPos.z,
		coronalSliceY: worldPos.y,
		sagittalSliceX: worldPos.x,
		activeCrossSectionIndex: nearestSliceIdx,
		activeArchParamT,
		distanceToArchMm: minArchDist,
	};
}

// ---------------------------------------------------------------------------
// 5. MISCH BONE QUALITY & HU DENSITY METER PROTOCOL
// ---------------------------------------------------------------------------

export const MISCH_THRESHOLDS = {
	D1_MIN: 1250,
	D2_MIN: 850,
	D3_MIN: 350,
	D4_MIN: 150,
} as const;

/**
 * Classifies bone density according to the Misch bone classification standard
 * and generates evidence-based clinical drilling and condensation recommendations.
 */
export function classifyMischBoneDensity(hu: number): BoneDensityRecommendation {
	if (!Number.isFinite(hu)) {
		return {
			mischClass: "D5",
			huRange: "N/A",
			label: "Неопределенная плотность (NaN / N/A)",
			description: "Некорректные или отсутствующие денситометрические данные.",
			drillingRpm: "—",
			torqueNcm: "—",
			irrigation: false,
			corticalTap: false,
			underDrilling: false,
			underDrillingMm: 0,
			osteotomeCondensation: false,
			clinicalAdvice:
				"Недостаточно данных для формирования хирургического протокола препарирования.",
		};
	}

	if (hu < 0) {
		return {
			mischClass: "D5",
			huRange: "<0 HU (Воздух / Дефект / Синус)",
			label: "Дефект / Воздушная полость / Мягкие ткани (<0 HU)",
			description:
				"Плотность соответствует воздуху (-1000 HU), верхнечелюстному синусу, кисте или выраженному костному дефекту. Костная ткань отсутствует.",
			drillingRpm: "—",
			torqueNcm: "0 N·cm",
			irrigation: false,
			corticalTap: false,
			underDrilling: false,
			underDrillingMm: 0,
			osteotomeCondensation: false,
			clinicalAdvice:
				"Имплантация без костной пластики НЕВОЗМОЖНА! Показан синус-лифтинг или направленная костная регенерация (НКР / GBR). Остеотомия и сверление противопоказаны.",
		};
	}

	if (hu > MISCH_THRESHOLDS.D1_MIN) {
		return {
			mischClass: "D1",
			huRange: ">1250 HU",
			label: "D1 — Плотная кортикальная кость (Oak-like)",
			description: "Гомогенная плотная кортикальная пластинка, минимальная васкуляризация.",
			drillingRpm: "400–600 RPM",
			torqueNcm: "40–45 N·cm",
			irrigation: true,
			corticalTap: true,
			underDrilling: false,
			underDrillingMm: 0,
			osteotomeCondensation: false,
			clinicalAdvice:
				"ОБЯЗАТЕЛЕН кортикальный метчик (Cortical Tap) на 100% длины кортикала. Обильное охлаждение физраствором для предотвращения термического остеонекроза!",
		};
	}

	if (hu >= MISCH_THRESHOLDS.D2_MIN) {
		return {
			mischClass: "D2",
			huRange: "850–1250 HU",
			label: "D2 — Плотная кортикальная и губчатая кость (Pine-like)",
			description: "Плотный наружный кортикал и плотные трабекулы губчатого вещества.",
			drillingRpm: "800–1000 RPM",
			torqueNcm: "35–45 N·cm",
			irrigation: true,
			corticalTap: false,
			underDrilling: false,
			underDrillingMm: 0,
			osteotomeCondensation: false,
			clinicalAdvice:
				"Золотой стандарт имплантации: стандартный протокол препарирования, отличный прогноз первичной стабильности (ISQ 75+).",
		};
	}

	if (hu >= MISCH_THRESHOLDS.D3_MIN) {
		return {
			mischClass: "D3",
			huRange: "350–850 HU",
			label: "D3 — Тонкая кортикальная и мелкопористая губчатая (Balsa-like)",
			description: "Тонкий кортикальный слой, трабекулярная сеть нормальной плотности.",
			drillingRpm: "1000–1200 RPM",
			torqueNcm: "30–35 N·cm",
			irrigation: true,
			corticalTap: false,
			underDrilling: false,
			underDrillingMm: 0,
			osteotomeCondensation: false,
			clinicalAdvice:
				"Стандартный протокол с финишным профильным сверлом. Исключить остеотомию без показаний.",
		};
	}

	if (hu >= MISCH_THRESHOLDS.D4_MIN) {
		return {
			mischClass: "D4",
			huRange: "150–350 HU",
			label: "D4 — Мягкая крупнопористая губчатая кость (Styrofoam-like)",
			description: "Очень тонкий кортикальный слой или его отсутствие, редкие трабекулы.",
			drillingRpm: "1000–1200 RPM",
			torqueNcm: "25–30 N·cm",
			irrigation: false,
			corticalTap: false,
			underDrilling: true,
			underDrillingMm: 1.0,
			osteotomeCondensation: true,
			clinicalAdvice:
				"Применить недопрепарирование (Under-drilling на 1.0 мм меньше диаметра) и биконическую компрессию для достижения первичного торка ≥ 35 N·cm.",
		};
	}

	return {
		mischClass: "D5",
		huRange: "0–150 HU",
		label: "D5 — Сверхмягкая / выраженно резорбированная кость",
		description: "Критически низкая плотность, жировая дегенерация или остеопороз.",
		drillingRpm: "800–1000 RPM (только пилот)",
		torqueNcm: "15–20 N·cm",
		irrigation: false,
		corticalTap: false,
		underDrilling: true,
		underDrillingMm: 1.5,
		osteotomeCondensation: true,
		clinicalAdvice:
			"Критический риск дестабилизации. Препарирование только пилотным бором с последующей ступенчатой экспансией остеотомами (Bone Condensers) или бикортикальная фиксация.",
	};
}

// ---------------------------------------------------------------------------
// 6. CPR (CURVED PLANAR REFORMATION) SPLINE & NORMAL VECTOR ENGINE
// ---------------------------------------------------------------------------

export type Point2 = [number, number];

export function point2DToPoint2(p: Point2D): Point2 {
	return [p.x, p.y];
}

export function point2ToPoint2D(p: Point2): Point2D {
	return { x: p[0], y: p[1] };
}

/**
 * Catmull-Rom cubic spline interpolation in 2D plane (XY).
 * Evaluates position between p1 and p2 at normalized parameter t in [0, 1].
 */
export function catmullRom2D(
	p0: Point2,
	p1: Point2,
	p2: Point2,
	p3: Point2,
	t: number,
): Point2 {
	const t2 = t * t;
	const t3 = t2 * t;
	return [
		0.5 *
			(2 * p1[0] +
				(-p0[0] + p2[0]) * t +
				(2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
				(-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
		0.5 *
			(2 * p1[1] +
				(-p0[1] + p2[1]) * t +
				(2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
				(-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
	];
}

/**
 * Interpolate control points through a Catmull-Rom spline.
 * Returns a dense polyline in the same 2D coordinate space.
 */
export function interpolateArchCurve(
	controlPoints: Point2[],
	samplesPerSegment = 50,
): Point2[] {
	const n = controlPoints.length;
	if (n < 2) return [...controlPoints];

	const result: Point2[] = [];
	for (let i = 0; i < n - 1; i++) {
		const p0 = controlPoints[Math.max(0, i - 1)]!;
		const p1 = controlPoints[i]!;
		const p2 = controlPoints[i + 1]!;
		const p3 = controlPoints[Math.min(n - 1, i + 2)]!;
		for (let s = 0; s < samplesPerSegment; s++) {
			result.push(catmullRom2D(p0, p1, p2, p3, s / samplesPerSegment));
		}
	}
	result.push(controlPoints[n - 1]!);
	return result;
}

/**
 * Compute unit normals perpendicular to the curve at each point.
 * The normal is rotated 90° CW from the tangent in the XY plane: [-ty / len, tx / len].
 */
export function computeCurveNormals(curve: Point2[]): Point2[] {
	if (curve.length < 2) return curve.map((): Point2 => [0, 1]);
	return curve.map((_, i, arr) => {
		let tx: number;
		let ty: number;
		if (i === 0) {
			tx = arr[1]![0] - arr[0]![0];
			ty = arr[1]![1] - arr[0]![1];
		} else if (i === arr.length - 1) {
			tx = arr[i]![0] - arr[i - 1]![0];
			ty = arr[i]![1] - arr[i - 1]![1];
		} else {
			tx = arr[i + 1]![0] - arr[i - 1]![0];
			ty = arr[i + 1]![1] - arr[i - 1]![1];
		}
		const len = Math.hypot(tx, ty);
		if (len === 0) return [0, 1];
		return [-ty / len, tx / len];
	});
}

/** Total arc length of polyline in mm. */
export function totalArcLength(curve: Point2[]): number {
	let len = 0;
	for (let i = 1; i < curve.length; i++) {
		len += Math.hypot(
			curve[i]![0] - curve[i - 1]![0],
			curve[i]![1] - curve[i - 1]![1],
		);
	}
	return len;
}

/**
 * Resample a polyline so that points are uniformly spaced by arc length.
 * Eliminates distortion caused by uneven control point spacing.
 */
export function resampleByArcLength(
	curve: Point2[],
	numSamples: number,
): Point2[] {
	if (curve.length < 2 || numSamples < 2) return [...curve];

	const cumLen = [0];
	for (let i = 1; i < curve.length; i++) {
		cumLen.push(
			cumLen[i - 1]! +
				Math.hypot(
					curve[i]![0] - curve[i - 1]![0],
					curve[i]![1] - curve[i - 1]![1],
				),
		);
	}
	const total = cumLen[cumLen.length - 1]!;
	if (total === 0) return [curve[0]!];

	const result: Point2[] = [];
	let seg = 0;

	for (let s = 0; s < numSamples; s++) {
		const target = (s / (numSamples - 1)) * total;
		while (seg < curve.length - 2 && cumLen[seg + 1]! < target) seg++;

		const segStart = cumLen[seg]!;
		const segLen = cumLen[seg + 1]! - segStart;
		const t = segLen > 0 ? (target - segStart) / segLen : 0;

		result.push([
			curve[seg]![0] + t * (curve[seg + 1]![0] - curve[seg]![0]),
			curve[seg]![1] + t * (curve[seg + 1]![1] - curve[seg]![1]),
		]);
	}

	return result;
}

/**
 * Build a dense, arc-length-uniform curve with unit normals from control points.
 */
export function buildUniformCurve(
	controlPoints: Point2[],
	numSamples = 500,
): { curve: Point2[]; normals: Point2[]; arcLen: number } {
	const numSegments = Math.max(1, controlPoints.length - 1);
	const subsPerSeg = Math.max(10, Math.ceil(numSamples / numSegments) * 2);
	const rawCurve = interpolateArchCurve(controlPoints, subsPerSeg);

	const curve = resampleByArcLength(rawCurve, numSamples);
	if (curve.length === 0) return { curve, normals: [], arcLen: 0 };
	const safeCurve = curve.length < 2 ? [curve[0]!, curve[0]!] : curve;
	const normals = computeCurveNormals(safeCurve);
	const arcLen = totalArcLength(safeCurve);

	return { curve: safeCurve, normals, arcLen };
}

/**
 * Generate default U-shaped dental arch centered on `center` with XY extent `size`.
 */
export function generateDefaultArchCurve(
	center: Point2,
	size: Point2,
): Point2[] {
	const [cx, cy] = center;
	const sx = size[0] * 0.32;
	const sy = size[1] * 0.32;

	return [
		[cx - sx, cy + sy * 0.85],
		[cx - sx * 0.97, cy + sy * 0.35],
		[cx - sx * 0.85, cy - sy * 0.2],
		[cx - sx * 0.55, cy - sy * 0.7],
		[cx, cy - sy],
		[cx + sx * 0.55, cy - sy * 0.7],
		[cx + sx * 0.85, cy - sy * 0.2],
		[cx + sx * 0.97, cy + sy * 0.35],
		[cx + sx, cy + sy * 0.85],
	];
}

/**
 * Parallel offset curve for slab-width visualization.
 */
export function offsetCurve(
	curve: Point2[],
	normals: Point2[],
	distance: number,
): Point2[] {
	return curve.map((p, i) => [
		p[0] + normals[i]![0] * distance,
		p[1] + normals[i]![1] * distance,
	]);
}

// ---------------------------------------------------------------------------
// 7. CROSS-SECTIONAL CPR SAMPLING & TRILINEAR INTERPOLATION
// ---------------------------------------------------------------------------

export const AIR_HU = -1024;

export interface CPRResult {
	pixelData: Float32Array;
	width: number;
	height: number;
	horizontalSpacing: number;
	verticalSpacing: number;
	zMin: number;
	zMax: number;
}

export interface VolumeSamplingData {
	dims: [number, number, number];
	origin: [number, number, number];
	getVoxel: (i: number, j: number, k: number) => number;
	invSx: number;
	invSy: number;
	invSz: number;
	zMin: number;
	zMax: number;
	vSpacing: number;
}

export interface CrossSectionGeometryParams {
	controlPoints: Point2[];
	position: number; // 0-1 normalized along arch curve
	tiltDeg: number; // degrees, lean of slice vertical axis along curve
	widthMm: number; // total width of cross-section in mm
	resolution: number; // mm per pixel
}

export interface CrossSectionFrame {
	point: Point2;
	normal: Point2;
	tangent: Point2;
	origin: [number, number, number];
	eU: [number, number, number];
	eV: [number, number, number];
}

/**
 * Trilinear interpolation of volume voxels with air sentinel (-1024 HU) for boundary.
 */
export function trilinear(
	getVoxel: (i: number, j: number, k: number) => number,
	dims: [number, number, number],
	ci: number,
	cj: number,
	ck: number,
): number {
	if (
		ci < 0 ||
		ci > dims[0] - 1 ||
		cj < 0 ||
		cj > dims[1] - 1 ||
		ck < 0 ||
		ck > dims[2] - 1
	) {
		return AIR_HU;
	}

	const qi = Math.max(0, Math.min(ci, dims[0] - 1 - 1e-6));
	const qj = Math.max(0, Math.min(cj, dims[1] - 1 - 1e-6));
	const qk = Math.max(0, Math.min(ck, dims[2] - 1 - 1e-6));

	const i0 = Math.floor(qi);
	const j0 = Math.floor(qj);
	const k0 = Math.floor(qk);
	const i1 = i0 + 1;
	const j1 = j0 + 1;
	const k1 = k0 + 1;

	const fi = qi - i0;
	const fj = qj - j0;
	const fk = qk - k0;
	const nfi = 1 - fi;
	const nfj = 1 - fj;
	const nfk = 1 - fk;

	return (
		getVoxel(i0, j0, k0) * nfi * nfj * nfk +
		getVoxel(i1, j0, k0) * fi * nfj * nfk +
		getVoxel(i0, j1, k0) * nfi * fj * nfk +
		getVoxel(i1, j1, k0) * fi * fj * nfk +
		getVoxel(i0, j0, k1) * nfi * nfj * fk +
		getVoxel(i1, j0, k1) * fi * nfj * fk +
		getVoxel(i0, j1, k1) * nfi * fj * fk +
		getVoxel(i1, j1, k1) * fi * fj * fk
	);
}

export function crossSectionFrame(
	controlPoints: Point2[],
	position: number,
	tiltDeg: number,
	zMin: number,
	zMax: number,
): CrossSectionFrame | null {
	const { curve, normals } = buildUniformCurve(controlPoints, 500);
	if (curve.length < 2) return null;

	const idx = Math.round(
		Math.max(0, Math.min(1, position)) * (curve.length - 1),
	);
	const point = curve[idx]!;
	const normal = normals[idx]!;
	const tangent: Point2 = [normal[1], -normal[0]];

	const MAX_TILT_DEG = 30;
	const clampedTiltDeg = Math.max(
		-MAX_TILT_DEG,
		Math.min(MAX_TILT_DEG, tiltDeg),
	);
	const tiltRad = (clampedTiltDeg * Math.PI) / 180;
	const sinT = Math.sin(tiltRad);
	const cosT = Math.cos(tiltRad);
	const zMid = (zMin + zMax) / 2;

	return {
		point,
		normal,
		tangent,
		origin: [point[0], point[1], zMid],
		eU: [normal[0], normal[1], 0],
		eV: [tangent[0] * sinT, tangent[1] * sinT, cosT],
	};
}

export function computeCrossSection(
	vol: VolumeSamplingData,
	params: CrossSectionGeometryParams,
): CPRResult | null {
	const frame = crossSectionFrame(
		params.controlPoints,
		params.position,
		params.tiltDeg,
		vol.zMin,
		vol.zMax,
	);
	if (!frame) return null;
	const { origin, eU, eV } = frame;

	const halfW = params.widthMm / 2;
	const width = Math.max(1, Math.round(params.widthMm / params.resolution));
	const height = Math.max(
		1,
		Math.round((vol.zMax - vol.zMin) / vol.vSpacing),
	);
	const hSpacing = params.widthMm / Math.max(1, width - 1);
	const zMid = (vol.zMin + vol.zMax) / 2;

	const pixelData = new Float32Array(width * height);

	for (let y = 0; y < height; y++) {
		const v = vol.zMax - y * vol.vSpacing - zMid;
		const bx = origin[0] + eV[0] * v;
		const by = origin[1] + eV[1] * v;
		const ck = (origin[2] + eV[2] * v - vol.origin[2]) * vol.invSz;

		for (let x = 0; x < width; x++) {
			const offset = -halfW + x * hSpacing;
			const ci = (bx + eU[0] * offset - vol.origin[0]) * vol.invSx;
			const cj = (by + eU[1] * offset - vol.origin[1]) * vol.invSy;
			pixelData[y * width + x] = trilinear(
				vol.getVoxel,
				vol.dims,
				ci,
				cj,
				ck,
			);
		}
	}

	return {
		pixelData,
		width,
		height,
		horizontalSpacing: hSpacing,
		verticalSpacing: vol.vSpacing,
		zMin: vol.zMin,
		zMax: vol.zMax,
	};
}

