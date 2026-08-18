/**
 * Cephalometric Analysis Math & Landmark Engine (ТРГ боковая)
 * 
 * Implements standard orthodontic analysis systems:
 * - Steiner Analysis (SNA, SNB, ANB, U1-SN, L1-MP, Interincisal angle, Wits)
 * - Tweed Analysis (FMA, IMPA, FMIA)
 * - Ricketts & Bjork-Jarabak Craniofacial Metrics
 * - Form 043/y (Форма 043/у Приказ МЗ РФ 834н) structured orthodontic protocol generator
 */

export interface Point2D {
	x: number;
	y: number;
}

export type LandmarkKey =
	| "S" // Sella (Турецкое седло)
	| "N" // Nasion (Назион)
	| "A" // Subspinale / Point A (Точка А)
	| "B" // Supramentale / Point B (Точка В)
	| "Pog" // Pogonion (Погонион)
	| "Gn" // Gnathion (Гнатион)
	| "Me" // Menton (Ментон)
	| "Go" // Gonion (Гонион)
	| "ANS" // Anterior Nasal Spine (ПНС / Передняя носовая ость)
	| "PNS" // Posterior Nasal Spine (ЗНС / Задняя носовая ость)
	| "U1t" // Upper Incisor Tip (Режущий край 1.1/2.1)
	| "U1a" // Upper Incisor Apex (Верхушка корня 1.1/2.1)
	| "L1t" // Lower Incisor Tip (Режущий край 4.1/3.1)
	| "L1a" // Lower Incisor Apex (Верхушка корня 4.1/3.1)
	| "Or" // Orbitale (Орбитале) - optional for Frankfort
	| "Po"; // Porion (Порион) - optional for Frankfort

export interface LandmarkDefinition {
	key: LandmarkKey;
	code: string;
	nameRu: string;
	latinName: string;
	anatomicalDescription: string;
	category: "cranial" | "maxillary" | "mandibular" | "dental";
	color: string;
}

export const CEPHALOMETRIC_LANDMARKS: LandmarkDefinition[] = [
	{
		key: "S",
		code: "S",
		nameRu: "Sella (Седло)",
		latinName: "Sella turcica",
		anatomicalDescription: "Геометрический центр турецкого седла клиновидной кости",
		category: "cranial",
		color: "#06b6d4", // cyan
	},
	{
		key: "N",
		code: "N",
		nameRu: "Nasion (Назион)",
		latinName: "Nasion",
		anatomicalDescription: "Самая передняя точка лобно-носового шва",
		category: "cranial",
		color: "#06b6d4",
	},
	{
		key: "ANS",
		code: "ANS",
		nameRu: "ANS (Передняя носовая ость)",
		latinName: "Spina nasalis anterior",
		anatomicalDescription: "Вершина передней носовой ости верхней челюсти",
		category: "maxillary",
		color: "#10b981", // emerald
	},
	{
		key: "PNS",
		code: "PNS",
		nameRu: "PNS (Задняя носовая ость)",
		latinName: "Spina nasalis posterior",
		anatomicalDescription: "Вершина задней носовой ости твердого нёба",
		category: "maxillary",
		color: "#10b981",
	},
	{
		key: "A",
		code: "A",
		nameRu: "Точка A (Субспинале)",
		latinName: "Subspinale",
		anatomicalDescription: "Наиболее глубокая точка на переднем контуре апикального базиса верхней челюсти",
		category: "maxillary",
		color: "#10b981",
	},
	{
		key: "B",
		code: "B",
		nameRu: "Точка B (Супраментале)",
		latinName: "Supramentale",
		anatomicalDescription: "Наиболее глубокая точка на переднем контуре апикального базиса нижней челюсти",
		category: "mandibular",
		color: "#f59e0b", // amber
	},
	{
		key: "Pog",
		code: "Pog",
		nameRu: "Pogonion (Погонион)",
		latinName: "Pogonion",
		anatomicalDescription: "Самая передняя точка подбородочного выступа нижней челюсти",
		category: "mandibular",
		color: "#f59e0b",
	},
	{
		key: "Gn",
		code: "Gn",
		nameRu: "Gnathion (Гнатион)",
		latinName: "Gnathion",
		anatomicalDescription: "Самая выступающая вперед и вниз точка симфиза нижней челюсти",
		category: "mandibular",
		color: "#f59e0b",
	},
	{
		key: "Me",
		code: "Me",
		nameRu: "Menton (Ментон)",
		latinName: "Menton",
		anatomicalDescription: "Самая нижняя точка подбородочного симфиза",
		category: "mandibular",
		color: "#f59e0b",
	},
	{
		key: "Go",
		code: "Go",
		nameRu: "Gonion (Гонион)",
		latinName: "Gonion",
		anatomicalDescription: "Вершина угла нижней челюсти (биссектриса касательных к ветви и телу)",
		category: "mandibular",
		color: "#f59e0b",
	},
	{
		key: "U1t",
		code: "U1-tip",
		nameRu: "U1 Tip (Край верхнего резца)",
		latinName: "Incisor superior incisal",
		anatomicalDescription: "Режущий край наиболее вестибулярного центрального верхнего резца",
		category: "dental",
		color: "#ec4899", // pink
	},
	{
		key: "U1a",
		code: "U1-apex",
		nameRu: "U1 Apex (Корень верхнего резца)",
		latinName: "Incisor superior apical",
		anatomicalDescription: "Верхушка корня наиболее вестибулярного центрального верхнего резца",
		category: "dental",
		color: "#ec4899",
	},
	{
		key: "L1t",
		code: "L1-tip",
		nameRu: "L1 Tip (Край нижнего резца)",
		latinName: "Incisor inferior incisal",
		anatomicalDescription: "Режущий край наиболее вестибулярного центрального нижнего резца",
		category: "dental",
		color: "#8b5cf6", // purple
	},
	{
		key: "L1a",
		code: "L1-apex",
		nameRu: "L1 Apex (Корень нижнего резца)",
		latinName: "Incisor inferior apical",
		anatomicalDescription: "Верхушка корня наиболее вестибулярного центрального нижнего резца",
		category: "dental",
		color: "#8b5cf6",
	},
];

export type LandmarkMap = Partial<Record<LandmarkKey, Point2D>>;

export interface CephalometricMeasurement {
	id: string;
	name: string;
	symbol: string;
	category: "sagittal" | "vertical" | "dental" | "linear";
	value: number | null;
	unit: "°" | "mm" | "%";
	normMin: number;
	normMax: number;
	normMean: number;
	normText: string;
	status: "normal" | "increased" | "decreased" | "pending";
	clinicalInterpretation: string;
	method: "Steiner" | "Tweed" | "Ricketts" | "Jacobson";
}

export interface CephalometricDiagnosis {
	skeletalClass: "Class I" | "Class II" | "Class III" | "Undefined";
	skeletalClassRu: string;
	maxillaryPosition: "Normal" | "Prognathism" | "Retrognathism" | "Undefined";
	maxillaryPositionRu: string;
	mandibularPosition: "Normal" | "Prognathism" | "Retrognathism" | "Undefined";
	mandibularPositionRu: string;
	growthPattern: "Mesofacial" | "Dolichofacial (Hyperdivergent)" | "Brachyfacial (Hypodivergent)" | "Undefined";
	growthPatternRu: string;
	upperIncisorInclination: "Normal" | "Proclination" | "Retroclination" | "Undefined";
	upperIncisorInclinationRu: string;
	lowerIncisorInclination: "Normal" | "Proclination" | "Retroclination" | "Undefined";
	lowerIncisorInclinationRu: string;
	witsRelationshipRu: string;
	summaryRu: string;
	protocol043Text: string;
}

export interface CephalometricAnalysisResult {
	measurements: CephalometricMeasurement[];
	diagnosis: CephalometricDiagnosis;
	landmarks: LandmarkMap;
	scaleMmPerPixel: number;
	isComplete: boolean;
	placedCount: number;
	totalCount: number;
}

// ─── Mathematical Geometry Utilities ──────────────────────────────────────────

/**
 * Calculates Euclidean distance between two 2D points.
 */
export function distance(p1: Point2D, p2: Point2D): number {
	const dx = p2.x - p1.x;
	const dy = p2.y - p1.y;
	return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculates vector between two 2D points (from -> to).
 */
export function vector(from: Point2D, to: Point2D): Point2D {
	return { x: to.x - from.x, y: to.y - from.y };
}

/**
 * Calculates dot product of two 2D vectors.
 */
export function dotProduct(v1: Point2D, v2: Point2D): number {
	return v1.x * v2.x + v1.y * v2.y;
}

/**
 * Calculates length/magnitude of a 2D vector.
 */
export function vectorLength(v: Point2D): number {
	return Math.sqrt(v.x * v.x + v.y * v.y);
}

/**
 * Calculates angle in degrees between two 2D vectors (0° to 180°).
 */
export function angleBetweenVectors(v1: Point2D, v2: Point2D): number {
	const l1 = vectorLength(v1);
	const l2 = vectorLength(v2);
	if (l1 === 0 || l2 === 0) return 0;
	const cosVal = Math.max(-1, Math.min(1, dotProduct(v1, v2) / (l1 * l2)));
	return (Math.acos(cosVal) * 180) / Math.PI;
}

/**
 * Calculates angle between three points where `vertex` is the angle vertex:
 * Angle formed by P1 - Vertex - P2.
 */
export function angle3Points(p1: Point2D, vertex: Point2D, p2: Point2D): number {
	const v1 = vector(vertex, p1);
	const v2 = vector(vertex, p2);
	return angleBetweenVectors(v1, v2);
}

/**
 * Calculates angle between two lines defined by (p1 -> p2) and (p3 -> p4).
 * Returns positive acute/obtuse angle (0° to 180°).
 */
export function angleBetweenLines(
	p1: Point2D,
	p2: Point2D,
	p3: Point2D,
	p4: Point2D,
): number {
	const v1 = vector(p1, p2);
	const v2 = vector(p3, p4);
	return angleBetweenVectors(v1, v2);
}

/**
 * Projects point P perpendicularly onto line (A -> B).
 * Returns the projected point on the line.
 */
export function projectPointOntoLine(p: Point2D, a: Point2D, b: Point2D): Point2D {
	const ab = vector(a, b);
	const ap = vector(a, p);
	const abLenSq = ab.x * ab.x + ab.y * ab.y;
	if (abLenSq === 0) return { ...a };
	const t = dotProduct(ap, ab) / abLenSq;
	return {
		x: a.x + t * ab.x,
		y: a.y + t * ab.y,
	};
}

// ─── Default Sample Cephalometric Preset (Clinically Accurate Lateral Ceph) ───

export const DEFAULT_CEPH_LANDMARKS_PRESET: LandmarkMap = {
	S: { x: 280, y: 190 }, // Sella
	N: { x: 440, y: 155 }, // Nasion
	ANS: { x: 475, y: 310 }, // Anterior Nasal Spine
	PNS: { x: 305, y: 325 }, // Posterior Nasal Spine
	A: { x: 462, y: 342 }, // Point A
	B: { x: 446, y: 440 }, // Point B
	Pog: { x: 452, y: 490 }, // Pogonion
	Gn: { x: 442, y: 520 }, // Gnathion
	Me: { x: 420, y: 540 }, // Menton
	Go: { x: 250, y: 435 }, // Gonion
	U1t: { x: 468, y: 395 }, // Upper Incisor Tip
	U1a: { x: 438, y: 325 }, // Upper Incisor Apex
	L1t: { x: 458, y: 400 }, // Lower Incisor Tip
	L1a: { x: 425, y: 495 }, // Lower Incisor Apex
	Or: { x: 415, y: 230 }, // Orbitale
	Po: { x: 245, y: 245 }, // Porion
};

// ─── Core Cephalometric Calculator ────────────────────────────────────────────

export function calculateCephalometrics(
	landmarks: LandmarkMap,
	scaleMmPerPixel = 0.15, // Default scale approx: 1 pixel ~ 0.15mm
): CephalometricAnalysisResult {
	const S = landmarks.S;
	const N = landmarks.N;
	const A = landmarks.A;
	const B = landmarks.B;
	const Pog = landmarks.Pog;
	const Gn = landmarks.Gn ?? landmarks.Me;
	const Me = landmarks.Me ?? landmarks.Gn;
	const Go = landmarks.Go;
	const ANS = landmarks.ANS;
	const PNS = landmarks.PNS;
	const U1t = landmarks.U1t;
	const U1a = landmarks.U1a;
	const L1t = landmarks.L1t;
	const L1a = landmarks.L1a;

	const measurements: CephalometricMeasurement[] = [];

	// 1. SNA Angle (Steiner) - Norm: 82° ± 2°
	let snaVal: number | null = null;
	let snaStatus: CephalometricMeasurement["status"] = "pending";
	let snaInterp = "Требуется установка точек S, N, A";
	if (S && N && A) {
		snaVal = Number(angle3Points(S, N, A).toFixed(1));
		if (snaVal > 84) {
			snaStatus = "increased";
			snaInterp = "Верхнечелюстная прогнатия (переднее положение базиса)";
		} else if (snaVal < 80) {
			snaStatus = "decreased";
			snaInterp = "Верхнечелюстная ретрогнатия (дистальное положение базиса)";
		} else {
			snaStatus = "normal";
			snaInterp = "Ортогнатическое сагиттальное положение верхней челюсти";
		}
	}
	measurements.push({
		id: "SNA",
		name: "Угол SNA (Положение верхней челюсти)",
		symbol: "SNA",
		category: "sagittal",
		value: snaVal,
		unit: "°",
		normMin: 80,
		normMax: 84,
		normMean: 82,
		normText: "82° ± 2°",
		status: snaStatus,
		clinicalInterpretation: snaInterp,
		method: "Steiner",
	});

	// 2. SNB Angle (Steiner) - Norm: 80° ± 2°
	let snbVal: number | null = null;
	let snbStatus: CephalometricMeasurement["status"] = "pending";
	let snbInterp = "Требуется установка точек S, N, B";
	if (S && N && B) {
		snbVal = Number(angle3Points(S, N, B).toFixed(1));
		if (snbVal > 82) {
			snbStatus = "increased";
			snbInterp = "Нижнечелюстная прогнатия (переднее положение челюсти)";
		} else if (snbVal < 78) {
			snbStatus = "decreased";
			snbInterp = "Нижнечелюстная ретрогнатия (дистальное положение челюсти)";
		} else {
			snbStatus = "normal";
			snbInterp = "Ортогнатическое сагиттальное положение нижней челюсти";
		}
	}
	measurements.push({
		id: "SNB",
		name: "Угол SNB (Положение нижней челюсти)",
		symbol: "SNB",
		category: "sagittal",
		value: snbVal,
		unit: "°",
		normMin: 78,
		normMax: 82,
		normMean: 80,
		normText: "80° ± 2°",
		status: snbStatus,
		clinicalInterpretation: snbInterp,
		method: "Steiner",
	});

	// 3. ANB Angle (Steiner) - Norm: 2° ± 2° (0° to 4°)
	let anbVal: number | null = null;
	let anbStatus: CephalometricMeasurement["status"] = "pending";
	let anbInterp = "Требуется расчет углов SNA и SNB";
	if (snaVal !== null && snbVal !== null) {
		anbVal = Number((snaVal - snbVal).toFixed(1));
		if (anbVal > 4.0) {
			anbStatus = "increased";
			anbInterp = "Скелетный класс II (сагиттальное опережение верхней челюсти)";
		} else if (anbVal < 0.0) {
			anbStatus = "decreased";
			anbInterp = "Скелетный класс III (сагиттальное опережение нижней челюсти)";
		} else {
			anbStatus = "normal";
			anbInterp = "Скелетный класс I (нейтральное гармоничное соотношение базисов)";
		}
	}
	measurements.push({
		id: "ANB",
		name: "Угол ANB (Скелетный класс)",
		symbol: "ANB",
		category: "sagittal",
		value: anbVal,
		unit: "°",
		normMin: 0,
		normMax: 4,
		normMean: 2,
		normText: "2° ± 2°",
		status: anbStatus,
		clinicalInterpretation: anbInterp,
		method: "Steiner",
	});

	// 4. Wits Appraisal (Jacobson) - Norm: 0 ± 1 mm (Male: -1mm, Female: 0mm)
	let witsVal: number | null = null;
	let witsStatus: CephalometricMeasurement["status"] = "pending";
	let witsInterp = "Требуется установка точек A, B, U1, L1";
	if (A && B && (U1t || ANS) && (L1t || Me)) {
		// Define occlusal plane: from midpoint of incisors (or ANS/PNS bisector)
		const opAnt: Point2D = U1t && L1t
			? { x: (U1t.x + L1t.x) / 2, y: (U1t.y + L1t.y) / 2 }
			: ANS && Me
				? { x: (ANS.x + Me.x) / 2, y: (ANS.y + Me.y) / 2 }
				: { x: (A.x + B.x) / 2 + 50, y: (A.y + B.y) / 2 };

		const opPost: Point2D = PNS && Go
			? { x: (PNS.x + Go.x) / 2, y: (PNS.y + Go.y) / 2 }
			: { x: opAnt.x - 150, y: opAnt.y - 10 };

		const projA = projectPointOntoLine(A, opPost, opAnt);
		const projB = projectPointOntoLine(B, opPost, opAnt);

		// Vector along OP pointing anteriorly
		const opVec = vector(opPost, opAnt);
		const opLen = vectorLength(opVec);
		if (opLen > 0) {
			const unitOp = { x: opVec.x / opLen, y: opVec.y / opLen };
			const diffVec = vector(projB, projA); // A relative to B along OP
			const distPx = dotProduct(diffVec, unitOp);
			witsVal = Number((distPx * scaleMmPerPixel).toFixed(1));

			if (witsVal > 2.0) {
				witsStatus = "increased";
				witsInterp = "Скелетный класс II (базис A смещен кпереди относительно B)";
			} else if (witsVal < -2.0) {
				witsStatus = "decreased";
				witsInterp = "Скелетный класс III (базис B смещен кпереди относительно A)";
			} else {
				witsStatus = "normal";
				witsInterp = "Скелетный класс I (гармоничное сагиттальное соотношение апикальных базисов)";
			}
		}
	}
	measurements.push({
		id: "Wits",
		name: "Wits-число (Jacobson)",
		symbol: "Wits",
		category: "sagittal",
		value: witsVal,
		unit: "mm",
		normMin: -1,
		normMax: 1,
		normMean: 0,
		normText: "0 ± 1 мм",
		status: witsStatus,
		clinicalInterpretation: witsInterp,
		method: "Jacobson",
	});

	// 5. SN-GoGn Angle (Steiner) - Norm: 32° ± 3°
	let snGognVal: number | null = null;
	let snGognStatus: CephalometricMeasurement["status"] = "pending";
	let snGognInterp = "Требуется установка точек S, N, Go, Gn/Me";
	if (S && N && Go && (Gn || Me)) {
		const antMand = Gn ?? Me;
		if (antMand) {
			snGognVal = Number(angleBetweenLines(S, N, Go, antMand).toFixed(1));
			if (snGognVal > 35) {
				snGognStatus = "increased";
				snGognInterp = "Гипердивергентный (вертикальный) тип роста / Долихофациал";
			} else if (snGognVal < 29) {
				snGognStatus = "decreased";
				snGognInterp = "Гиподивергентный (горизонтальный) тип роста / Брахифациал";
			} else {
				snGognStatus = "normal";
				snGognInterp = "Нормодивергентный (мезофациальный) тип лицевого скелета";
			}
		}
	}
	measurements.push({
		id: "SN-GoGn",
		name: "Угол SN-GoGn (Тип роста)",
		symbol: "SN-GoGn",
		category: "vertical",
		value: snGognVal,
		unit: "°",
		normMin: 29,
		normMax: 35,
		normMean: 32,
		normText: "32° ± 3°",
		status: snGognStatus,
		clinicalInterpretation: snGognInterp,
		method: "Steiner",
	});

	// 6. FMA Angle (Tweed - Frankfort Mandibular Plane Angle) - Norm: 25° ± 3°
	let fmaVal: number | null = null;
	let fmaStatus: CephalometricMeasurement["status"] = "pending";
	let fmaInterp = "Требуется установка плоскостей";
	if (Go && (Me || Gn)) {
		const antMand = Me ?? Gn;
		if (antMand) {
			if (landmarks.Po && landmarks.Or) {
				fmaVal = Number(angleBetweenLines(landmarks.Po, landmarks.Or, Go, antMand).toFixed(1));
			} else if (S && N) {
				// Approximation when FH is estimated from SN (FH is roughly 7° to SN)
				const rawAngle = angleBetweenLines(S, N, Go, antMand);
				fmaVal = Number(Math.max(10, Math.min(50, rawAngle - 7)).toFixed(1));
			}
		}
	}
	if (fmaVal !== null) {
		if (fmaVal > 28) {
			fmaStatus = "increased";
			fmaInterp = "Высокий угол (High angle) — вертикальный рост, склонность к открытому прикусу";
		} else if (fmaVal < 22) {
			fmaStatus = "decreased";
			fmaInterp = "Низкий угол (Low angle) — горизонтальный рост, глубокое резцовое перекрытие";
		} else {
			fmaStatus = "normal";
			fmaInterp = "Нормальный угол FMA — сбалансированный тип лицевого роста";
		}
	}
	measurements.push({
		id: "FMA",
		name: "Угол FMA (Tweed)",
		symbol: "FMA",
		category: "vertical",
		value: fmaVal,
		unit: "°",
		normMin: 22,
		normMax: 28,
		normMean: 25,
		normText: "25° ± 3°",
		status: fmaStatus,
		clinicalInterpretation: fmaInterp,
		method: "Tweed",
	});

	// 7. U1-SN Angle (Steiner - Upper Incisor to SN) - Norm: 104° ± 2°
	let u1SnVal: number | null = null;
	let u1SnStatus: CephalometricMeasurement["status"] = "pending";
	let u1SnInterp = "Требуется установка S, N, U1t, U1a";
	if (S && N && U1t && U1a) {
		// Inferior-posterior angle between U1 axis (apex to tip) and S-N
		const u1Vec = vector(U1a, U1t);
		const snVec = vector(N, S); // pointing posteriorly
		u1SnVal = Number(angleBetweenVectors(u1Vec, snVec).toFixed(1));
		if (u1SnVal > 106) {
			u1SnStatus = "increased";
			u1SnInterp = "Протрузия (вестибулярный наклон) верхних резцов";
		} else if (u1SnVal < 102) {
			u1SnStatus = "decreased";
			u1SnInterp = "Ретрузия (палатинальный наклон) верхних резцов";
		} else {
			u1SnStatus = "normal";
			u1SnInterp = "Нормальный торк / инклинация верхних резцов";
		}
	}
	measurements.push({
		id: "U1-SN",
		name: "Угол U1-SN (Инклинация верхних резцов)",
		symbol: "U1-SN",
		category: "dental",
		value: u1SnVal,
		unit: "°",
		normMin: 102,
		normMax: 106,
		normMean: 104,
		normText: "104° ± 2°",
		status: u1SnStatus,
		clinicalInterpretation: u1SnInterp,
		method: "Steiner",
	});

	// 8. L1-MP / IMPA (Tweed / Steiner - Lower Incisor to Mandibular Plane) - Norm: 90° ± 3°
	let l1MpVal: number | null = null;
	let l1MpStatus: CephalometricMeasurement["status"] = "pending";
	let l1MpInterp = "Требуется установка Go, Me/Gn, L1t, L1a";
	if (Go && (Me || Gn) && L1t && L1a) {
		const antMand = Me ?? Gn;
		if (antMand) {
			const l1Vec = vector(L1a, L1t); // pointing superiorly
			const mpVec = vector(antMand, Go); // pointing posteriorly
			l1MpVal = Number(angleBetweenVectors(l1Vec, mpVec).toFixed(1));
			if (l1MpVal > 93) {
				l1MpStatus = "increased";
				l1MpInterp = "Протрузия (вестибулярный наклон) нижних резцов";
			} else if (l1MpVal < 87) {
				l1MpStatus = "decreased";
				l1MpInterp = "Ретрузия (лингвальный наклон) нижних резцов";
			} else {
				l1MpStatus = "normal";
				l1MpInterp = "Нормальный наклон нижних резцов (IMPA в норме)";
			}
		}
	}
	measurements.push({
		id: "L1-MP",
		name: "Угол L1-MP / IMPA (Наклон нижних резцов)",
		symbol: "L1-MP",
		category: "dental",
		value: l1MpVal,
		unit: "°",
		normMin: 87,
		normMax: 93,
		normMean: 90,
		normText: "90° ± 3°",
		status: l1MpStatus,
		clinicalInterpretation: l1MpInterp,
		method: "Tweed",
	});

	// 9. Interincisal Angle (U1-L1) - Norm: 131° ± 5° (126° - 136°)
	let u1L1Val: number | null = null;
	let u1L1Status: CephalometricMeasurement["status"] = "pending";
	let u1L1Interp = "Требуется установка U1 и L1";
	if (U1t && U1a && L1t && L1a) {
		u1L1Val = Number(angleBetweenLines(U1a, U1t, L1a, L1t).toFixed(1));
		if (u1L1Val < 126) {
			u1L1Status = "decreased";
			u1L1Interp = "Бипротрузия резцов (уменьшенный межрезцовый угол)";
		} else if (u1L1Val > 136) {
			u1L1Status = "increased";
			u1L1Interp = "Биретрузия резцов / отвесный прикус (увеличенный угол)";
		} else {
			u1L1Status = "normal";
			u1L1Interp = "Гармоничное межрезцовое соотношение";
		}
	}
	measurements.push({
		id: "U1-L1",
		name: "Межрезцовый угол (U1-L1)",
		symbol: "U1-L1",
		category: "dental",
		value: u1L1Val,
		unit: "°",
		normMin: 126,
		normMax: 136,
		normMean: 131,
		normText: "131° ± 5°",
		status: u1L1Status,
		clinicalInterpretation: u1L1Interp,
		method: "Steiner",
	});

	// 10. Maxillary-Mandibular Plane Angle (ANS-PNS to Go-Me) - Norm: 25° ± 4°
	let mmAngleVal: number | null = null;
	let mmStatus: CephalometricMeasurement["status"] = "pending";
	let mmInterp = "Требуется установка ANS, PNS, Go, Me";
	if (ANS && PNS && Go && (Me || Gn)) {
		const antMand = Me ?? Gn;
		if (antMand) {
			mmAngleVal = Number(angleBetweenLines(PNS, ANS, Go, antMand).toFixed(1));
			if (mmAngleVal > 29) {
				mmStatus = "increased";
				mmInterp = "Дивергенция челюстей (вертикальная резцовая дезокклюзия)";
			} else if (mmAngleVal < 21) {
				mmStatus = "decreased";
				mmInterp = "Конвергенция челюстей (глубокий прикус)";
			} else {
				mmStatus = "normal";
				mmInterp = "Нормальная высота межапикального пространства";
			}
		}
	}
	measurements.push({
		id: "NL-ML",
		name: "Межбазисный угол (NL-ML / ANS-PNS to MP)",
		symbol: "NL-ML",
		category: "vertical",
		value: mmAngleVal,
		unit: "°",
		normMin: 21,
		normMax: 29,
		normMean: 25,
		normText: "25° ± 4°",
		status: mmStatus,
		clinicalInterpretation: mmInterp,
		method: "Ricketts",
	});

	// ── Diagnosis Synthesis ───────────────────────────────────────────────────

	const skeletalClass = anbVal === null
		? "Undefined"
		: anbVal > 4.0
			? "Class II"
			: anbVal < 0.0
				? "Class III"
				: "Class I";

	const skeletalClassRu = skeletalClass === "Class II"
		? "Скелетный класс II (Дистальное соотношение базисов)"
		: skeletalClass === "Class III"
			? "Скелетный класс III (Мезиальное соотношение базисов)"
			: skeletalClass === "Class I"
				? "Скелетный класс I (Нейтральное гармоничное соотношение)"
				: "Не определен (установите реперные точки)";

	const maxillaryPosition = snaVal === null
		? "Undefined"
		: snaVal > 84
			? "Prognathism"
			: snaVal < 80
				? "Retrognathism"
				: "Normal";

	const maxillaryPositionRu = maxillaryPosition === "Prognathism"
		? "Верхнечелюстная прогнатия"
		: maxillaryPosition === "Retrognathism"
			? "Верхнечелюстная ретрогнатия"
			: maxillaryPosition === "Normal"
				? "Ортогнатическое положение верхней челюсти"
				: "Не определено";

	const mandibularPosition = snbVal === null
		? "Undefined"
		: snbVal > 82
			? "Prognathism"
			: snbVal < 78
				? "Retrognathism"
				: "Normal";

	const mandibularPositionRu = mandibularPosition === "Prognathism"
		? "Нижнечелюстная прогнатия"
		: mandibularPosition === "Retrognathism"
			? "Нижнечелюстная ретрогнатия"
			: mandibularPosition === "Normal"
				? "Ортогнатическое положение нижней челюсти"
				: "Не определено";

	const growthPattern = snGognVal === null
		? "Undefined"
		: snGognVal > 35 || (fmaVal !== null && fmaVal > 28)
			? "Dolichofacial (Hyperdivergent)"
			: snGognVal < 29 || (fmaVal !== null && fmaVal < 22)
				? "Brachyfacial (Hypodivergent)"
				: "Mesofacial";

	const growthPatternRu = growthPattern === "Dolichofacial (Hyperdivergent)"
		? "Долихофациальный (гипердивергентный, вертикальный вектор роста)"
		: growthPattern === "Brachyfacial (Hypodivergent)"
			? "Брахифациальный (гиподивергентный, горизонтальный вектор роста)"
			: growthPattern === "Mesofacial"
				? "Мезофациальный (нейтральный, сбалансированный тип роста)"
				: "Не определен";

	const upperIncisorInclination = u1SnVal === null
		? "Undefined"
		: u1SnVal > 106
			? "Proclination"
			: u1SnVal < 102
				? "Retroclination"
				: "Normal";

	const upperIncisorInclinationRu = upperIncisorInclination === "Proclination"
		? "Протрузия (вестибулоокклюзия) резцов"
		: upperIncisorInclination === "Retroclination"
			? "Ретрузия (палатоокклюзия) резцов"
			: upperIncisorInclination === "Normal"
				? "Нормальный наклон"
				: "Не определен";

	const lowerIncisorInclination = l1MpVal === null
		? "Undefined"
		: l1MpVal > 93
			? "Proclination"
			: l1MpVal < 87
				? "Retroclination"
				: "Normal";

	const lowerIncisorInclinationRu = lowerIncisorInclination === "Proclination"
		? "Протрузия (вестибулоокклюзия) резцов"
		: lowerIncisorInclination === "Retroclination"
			? "Ретрузия (лингвоокклюзия) резцов"
			: lowerIncisorInclination === "Normal"
				? "Нормальный наклон (IMPA в норме)"
				: "Не определен";

	const witsRelationshipRu = witsVal === null
		? "Wits не рассчитан"
		: witsVal > 2
			? `Wits = +${witsVal} мм (Скелетный класс II)`
			: witsVal < -2
				? `Wits = ${witsVal} мм (Скелетный класс III)`
				: `Wits = ${witsVal >= 0 ? "+" : ""}${witsVal} мм (Скелетный класс I)`;

	const summaryRu = skeletalClass === "Undefined"
		? "Для построения ортодонтического заключения расставьте все анатомические реперные точки на снимке ТРГ."
		: `${skeletalClassRu}. ${maxillaryPositionRu}, ${mandibularPositionRu}. ${growthPatternRu}. Положение резцов: верхние — ${upperIncisorInclinationRu.toLowerCase()}, нижние — ${lowerIncisorInclinationRu.toLowerCase()}. ${witsRelationshipRu}.`;

	// ── Generation of Structured Form 043/y Text ──────────────────────────────

	const dateStr = new Date().toLocaleDateString("ru-RU");
	const protocol043Text = `ПРОТОКОЛ ТЕЛЕРЕНТГЕНОГРАФИЧЕСКОГО (ТРГ) ИССЛЕДОВАНИЯ В БОКОВОЙ ПРОЕКЦИИ
(Форма 043/у · Приказ МЗ РФ №834н · Анализ по Steiner, Tweed, Ricketts)
Дата расчета: ${dateStr}

1. Сагиттальные скелетные взаимоотношения:
• Угол SNA: ${snaVal !== null ? `${snaVal}° (Норма 82°±2°)` : "—"} — ${snaInterp}
• Угол SNB: ${snbVal !== null ? `${snbVal}° (Норма 80°±2°)` : "—"} — ${snbInterp}
• Угол ANB: ${anbVal !== null ? `${anbVal}° (Норма 2°±2°)` : "—"} — ${anbInterp}
• Wits-число: ${witsVal !== null ? `${witsVal >= 0 ? "+" : ""}${witsVal} мм (Норма 0±1 мм)` : "—"} — ${witsInterp}

2. Вертикальные параметры и тип лицевого роста:
• Угол SN-GoGn: ${snGognVal !== null ? `${snGognVal}° (Норма 32°±3°)` : "—"} — ${snGognInterp}
• Угол FMA (Tweed): ${fmaVal !== null ? `${fmaVal}° (Норма 25°±3°)` : "—"} — ${fmaInterp}
• Межбазисный угол NL-ML: ${mmAngleVal !== null ? `${mmAngleVal}° (Норма 25°±4°)` : "—"} — ${mmInterp}
• Тип роста: ${growthPatternRu}

3. Дентальные характеристики и наклон резцов:
• Инклинация верхних резцов (U1-SN): ${u1SnVal !== null ? `${u1SnVal}° (Норма 104°±2°)` : "—"} — ${u1SnInterp}
• Наклон нижних резцов (L1-MP / IMPA): ${l1MpVal !== null ? `${l1MpVal}° (Норма 90°±3°)` : "—"} — ${l1MpInterp}
• Межрезцовый угол (U1-L1): ${u1L1Val !== null ? `${u1L1Val}° (Норма 131°±5°)` : "—"} — ${u1L1Interp}

ЗАКЛЮЧЕНИЕ ЦЕФАЛОМЕТРИИ (ТРГ):
${summaryRu}
Рекомендована ортодонтическая коррекция с учетом индивидуального вектора роста лицевого скелета и торка резцовой группы.`;

	const placedCount = CEPHALOMETRIC_LANDMARKS.filter(
		(l) => landmarks[l.key] !== undefined,
	).length;
	const totalCount = CEPHALOMETRIC_LANDMARKS.length;
	const isComplete = placedCount >= 10; // At least core 10 points

	return {
		measurements,
		diagnosis: {
			skeletalClass,
			skeletalClassRu,
			maxillaryPosition,
			maxillaryPositionRu,
			mandibularPosition,
			mandibularPositionRu,
			growthPattern,
			growthPatternRu,
			upperIncisorInclination,
			upperIncisorInclinationRu,
			lowerIncisorInclination,
			lowerIncisorInclinationRu,
			witsRelationshipRu,
			summaryRu,
			protocol043Text,
		},
		landmarks,
		scaleMmPerPixel,
		isComplete,
		placedCount,
		totalCount,
	};
}
