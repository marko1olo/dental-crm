/**
 * Prep Margin Line & 3D Crown Fit Analysis Engine (DOMAIN: LAB 3D)
 *
 * Аналитический модуль для контроля уступа препарирования (Finish line),
 * минимальной толщины стенок каркаса, вектора пути посадки и поднутрений (Undercuts).
 */

import type { StlMeshTopology } from "./stlParserMath";

export type MarginControlPoint = readonly [number, number, number];

export interface MarginKinkAlert {
	readonly pointIndex: number;
	readonly position: MarginControlPoint;
	readonly kinkAngleDeg: number;
	readonly severity: "warning" | "critical";
	readonly message: string;
}

export interface MarginStepJumpAlert {
	readonly pointIndex: number;
	readonly position: MarginControlPoint;
	readonly stepDeltaMm: number;
	readonly message: string;
}

export interface PrepMarginLineAnalysis {
	readonly id: string;
	readonly toothFdi: string;
	readonly points: readonly MarginControlPoint[];
	readonly perimeterMm: number;
	readonly cervicalWidthMm: number; // Buccal-Lingual
	readonly cervicalLengthMm: number; // Mesio-Distal
	readonly meanHeightZ: number;
	readonly isClosed: boolean;
	readonly isSmooth: boolean;
	readonly kinks: readonly MarginKinkAlert[];
	readonly stepJumps: readonly MarginStepJumpAlert[];
}

export interface MaterialThicknessRequirement {
	readonly materialId: string;
	readonly materialName: string;
	readonly minOcclusalMm: number;
	readonly minAxialMm: number;
	readonly minMarginMm: number;
	readonly clinicalRationale: string;
}

/**
 * Нормативы минимальной толщины конструкционных материалов в ортопедической стоматологии.
 */
export const DENTAL_MATERIAL_THICKNESS_STANDARDS: Readonly<
	Record<string, MaterialThicknessRequirement>
> = {
	zirconia_multilayer: {
		materialId: "zirconia_multilayer",
		materialName: "Диоксид циркония Multi-Layer (Katana/Prettau)",
		minOcclusalMm: 1.0,
		minAxialMm: 0.8,
		minMarginMm: 0.5,
		clinicalRationale:
			"Монолитный диоксид циркония требует минимум 1.0 мм окклюзионно и 0.5 мм на уступе для предотвращения сколов под жевательной нагрузкой (1100 МПа).",
	},
	emax_lithium_disilicate: {
		materialId: "emax_lithium_disilicate",
		materialName: "Дисиликат лития IPS e.max CAD/Press",
		minOcclusalMm: 1.5,
		minAxialMm: 1.0,
		minMarginMm: 0.8,
		clinicalRationale:
			"Стеклокерамика требует окклюзионной толщины не менее 1.5 мм (500 МПа) и обязательной адгезивной фиксации.",
	},
	pfm_cocr: {
		materialId: "pfm_cocr",
		materialName: "Металлокерамика CoCr",
		minOcclusalMm: 1.5,
		minAxialMm: 1.2,
		minMarginMm: 0.5,
		clinicalRationale:
			"Металлический колпачок 0.5 мм + керамическая облицовка 1.0 мм = суммарно 1.5 мм окклюзионного пространства.",
	},
	pmma_temporary: {
		materialId: "pmma_temporary",
		materialName: "Временная пластмасса PMMA CAD/CAM",
		minOcclusalMm: 1.2,
		minAxialMm: 1.0,
		minMarginMm: 0.6,
		clinicalRationale:
			"Полимер для длительного ношения требует запаса прочности 1.2 мм во избежание перелома каркаса.",
	},
	titanium_custom_abutment: {
		materialId: "titanium_custom_abutment",
		materialName: "Титановый сплав Grade 5",
		minOcclusalMm: 0.5,
		minAxialMm: 0.4,
		minMarginMm: 0.3,
		clinicalRationale:
			"Высокая прочность титана позволяет формировать субгингивальный уступ толщиной от 0.3 мм.",
	},
};

export interface UndercutAnalysisResult {
	readonly insertionVector: readonly [number, number, number];
	readonly totalTriangles: number;
	readonly undercutTrianglesCount: number;
	readonly undercutAreaMm2: number;
	readonly totalAreaMm2: number;
	readonly undercutRatioPercent: number;
	readonly isPathClear: boolean;
	readonly colorBuffer: Float32Array; // RGB per vertex = triangleCount * 9
}

export interface CrownFitChecklist {
	readonly marginFitPassed: boolean; // Краевое прилегание <= 50 мкм
	readonly occlusalClearancePassed: boolean; // Достаточное разобщение
	readonly proximalContactsPassed: boolean; // Плотные апроксимальные контакты
	readonly wallThicknessPassed: boolean; // Минимальная толщина материала
	readonly undercutsClearPassed: boolean; // Отсутствие блокирующих поднутрений
}

export type CrownFitDecision = "approved" | "revision_requested" | "rejected";

export interface CrownFitApprovalReport {
	readonly decision: CrownFitDecision;
	readonly passedCount: number;
	readonly totalCount: number;
	readonly isFullyApproved: boolean;
	readonly blockingIssues: readonly string[];
}

/**
 * Расчет длины периметра замкнутой кривой уступа препарирования (мм).
 */
export function calculateMarginPerimeter(points: readonly MarginControlPoint[]): number {
	const count = points.length;
	if (count < 2) return 0;

	let total = 0;
	for (let i = 0; i < count; i++) {
		const p1 = points[i]!;
		const p2 = points[(i + 1) % count]!; // Замкнутая петля
		const dx = p2[0] - p1[0];
		const dy = p2[1] - p1[1];
		const dz = p2[2] - p1[2];
		total += Math.sqrt(dx * dx + dy * dy + dz * dz);
	}

	return Number(total.toFixed(3));
}

/**
 * Оценка плавности линии уступа и поиск острых ступеней / изломов.
 */
export function evaluateMarginSmoothness(
	points: readonly MarginControlPoint[],
	options: {
		readonly maxKinkAngleDeg?: number | undefined;
		readonly maxStepJumpMm?: number | undefined;
	} = {},
): {
	readonly kinks: readonly MarginKinkAlert[];
	readonly stepJumps: readonly MarginStepJumpAlert[];
	readonly isSmooth: boolean;
	readonly averageCurvatureRad: number;
} {
	const count = points.length;
	if (count < 3) {
		return { kinks: [], stepJumps: [], isSmooth: true, averageCurvatureRad: 0 };
	}

	const maxKinkDeg = options.maxKinkAngleDeg ?? 45;
	const maxStepMm = options.maxStepJumpMm ?? 0.5;

	const kinks: MarginKinkAlert[] = [];
	const stepJumps: MarginStepJumpAlert[] = [];
	let totalCurvature = 0;

	for (let i = 0; i < count; i++) {
		const prev = points[(i - 1 + count) % count]!;
		const curr = points[i]!;
		const next = points[(i + 1) % count]!;

		// Вектор 1 (входящий) и Вектор 2 (исходящий)
		const v1x = curr[0] - prev[0];
		const v1y = curr[1] - prev[1];
		const v1z = curr[2] - prev[2];
		const len1 = Math.sqrt(v1x * v1x + v1y * v1y + v1z * v1z);

		const v2x = next[0] - curr[0];
		const v2y = next[1] - curr[1];
		const v2z = next[2] - curr[2];
		const len2 = Math.sqrt(v2x * v2x + v2y * v2y + v2z * v2z);

		if (len1 > 1e-6 && len2 > 1e-6) {
			const dot = (v1x * v2x + v1y * v2y + v1z * v2z) / (len1 * len2);
			const clamped = Math.max(-1, Math.min(1, dot));
			const angleRad = Math.acos(clamped);
			const angleDeg = (angleRad * 180) / Math.PI;

			totalCurvature += angleRad;

			if (angleDeg > maxKinkDeg) {
				kinks.push({
					pointIndex: i,
					position: curr,
					kinkAngleDeg: Number(angleDeg.toFixed(1)),
					severity: angleDeg > 70 ? "critical" : "warning",
					message: `Острый излом линии уступа (${angleDeg.toFixed(1)}°). Риск неточного краевого прилегания.`,
				});
			}
		}

		// Проверка вертикального перепада (Z-jump)
		const deltaZ = Math.abs(curr[2] - next[2]);
		if (deltaZ > maxStepMm) {
			stepJumps.push({
				pointIndex: i,
				position: curr,
				stepDeltaMm: Number(deltaZ.toFixed(3)),
				message: `Вертикальная ступенька на уступе (Δz = ${deltaZ.toFixed(2)} мм). Требуется сглаживание фрезой.`,
			});
		}
	}

	const averageCurvatureRad = count > 0 ? totalCurvature / count : 0;
	const isSmooth = kinks.length === 0 && stepJumps.length === 0;

	return {
		kinks,
		stepJumps,
		isSmooth,
		averageCurvatureRad: Number(averageCurvatureRad.toFixed(4)),
	};
}

/**
 * Полный анализ линии уступа препарирования зуба.
 */
export function analyzePrepMarginLine(
	id: string,
	toothFdi: string,
	points: readonly MarginControlPoint[],
): PrepMarginLineAnalysis {
	const count = points.length;
	const perimeterMm = calculateMarginPerimeter(points);
	const { kinks, stepJumps, isSmooth } = evaluateMarginSmoothness(points);

	let minX = Infinity;
	let maxX = -Infinity;
	let minY = Infinity;
	let maxY = -Infinity;
	let sumZ = 0;

	for (let i = 0; i < count; i++) {
		const p = points[i]!;
		if (p[0] < minX) minX = p[0];
		if (p[0] > maxX) maxX = p[0];
		if (p[1] < minY) minY = p[1];
		if (p[1] > maxY) maxY = p[1];
		sumZ += p[2];
	}

	const cervicalWidthMm = count > 0 ? Number((maxY - minY).toFixed(3)) : 0;
	const cervicalLengthMm = count > 0 ? Number((maxX - minX).toFixed(3)) : 0;
	const meanHeightZ = count > 0 ? Number((sumZ / count).toFixed(3)) : 0;

	return {
		id,
		toothFdi,
		points,
		perimeterMm,
		cervicalWidthMm,
		cervicalLengthMm,
		meanHeightZ,
		isClosed: count >= 3,
		isSmooth,
		kinks,
		stepJumps,
	};
}

/**
 * Анализ поднутрений (Undercuts) относительно вектора пути введения конструкции.
 * Вектор по умолчанию: [0, 0, 1] (окклюзионный путь посадки).
 */
export function analyzeUndercuts(
	mesh: StlMeshTopology,
	insertionVector: readonly [number, number, number] = [0, 0, 1],
): UndercutAnalysisResult {
	const { positions, triangleCount } = mesh;
	const colorBuffer = new Float32Array(triangleCount * 9);

	// Нормализуем вектор пути введения
	const ivx = insertionVector[0];
	const ivy = insertionVector[1];
	const ivz = insertionVector[2];
	const ivLen = Math.sqrt(ivx * ivx + ivy * ivy + ivz * ivz);
	const ix = ivLen > 1e-6 ? ivx / ivLen : 0;
	const iy = ivLen > 1e-6 ? ivy / ivLen : 0;
	const iz = ivLen > 1e-6 ? ivz / ivLen : 1;

	let undercutTrianglesCount = 0;
	let undercutArea = 0;
	let totalArea = 0;

	let cIdx = 0;

	for (let i = 0; i < triangleCount; i++) {
		const pIdx = i * 9;

		const v1x = positions[pIdx]!;
		const v1y = positions[pIdx + 1]!;
		const v1z = positions[pIdx + 2]!;

		const v2x = positions[pIdx + 3]!;
		const v2y = positions[pIdx + 4]!;
		const v2z = positions[pIdx + 5]!;

		const v3x = positions[pIdx + 6]!;
		const v3y = positions[pIdx + 7]!;
		const v3z = positions[pIdx + 8]!;

		// Расчет площади треугольника
		const ax = v2x - v1x;
		const ay = v2y - v1y;
		const az = v2z - v1z;

		const bx = v3x - v1x;
		const by = v3y - v1y;
		const bz = v3z - v1z;

		const cx = ay * bz - az * by;
		const cy = az * bx - ax * bz;
		const cz = ax * by - ay * bx;

		const lenN = Math.sqrt(cx * cx + cy * cy + cz * cz);
		const triArea = 0.5 * lenN;
		totalArea += triArea;

		let r = 0.15;
		let g = 0.85;
		let b = 0.25; // Зеленый по умолчанию (свободный путь посадки)

		if (lenN > 1e-8) {
			const nx = cx / lenN;
			const ny = cy / lenN;
			const nz = cz / lenN;

			// Скалярное произведение нормали на вектор пути введения
			const dot = nx * ix + ny * iy + nz * iz;

			// Угол конусности / наклона стенки
			// Если dot < 0 -> нормаль направлена вниз против направления посадки (поднутрение)
			if (dot < 0) {
				undercutTrianglesCount++;
				undercutArea += triArea;
				// Красный цвет: критическое поднутрение
				r = 0.92;
				g = 0.15;
				b = 0.15;
			} else if (dot < 0.08) {
				// Желтый цвет: пограничный угол (0..5 градусов)
				r = 0.95;
				g = 0.85;
				b = 0.15;
			}
		}

		// Заполняем 3 вершины треугольника цветом
		for (let v = 0; v < 3; v++) {
			colorBuffer[cIdx++] = r;
			colorBuffer[cIdx++] = g;
			colorBuffer[cIdx++] = b;
		}
	}

	const undercutRatioPercent =
		totalArea > 0 ? Number(((undercutArea / totalArea) * 100).toFixed(2)) : 0;
	const isPathClear = undercutRatioPercent <= 2.0;

	return {
		insertionVector: [ix, iy, iz],
		totalTriangles: triangleCount,
		undercutTrianglesCount,
		undercutAreaMm2: Number(undercutArea.toFixed(3)),
		totalAreaMm2: Number(totalArea.toFixed(3)),
		undercutRatioPercent,
		isPathClear,
		colorBuffer,
	};
}

/**
 * Проверка соответствия толщины каркаса реставрации стандарту выбранного материала.
 */
export function evaluateCrownThickness(
	measuredThicknessMm: number,
	materialId: string,
	location: "occlusal" | "axial" | "margin" = "occlusal",
): {
	readonly isCompliant: boolean;
	readonly minimumRequiredMm: number;
	readonly deltaMm: number;
	readonly warning?: string | undefined;
} {
	const standard =
		DENTAL_MATERIAL_THICKNESS_STANDARDS[materialId] ||
		DENTAL_MATERIAL_THICKNESS_STANDARDS.zirconia_multilayer!;

	let minimumRequiredMm = standard.minOcclusalMm;
	if (location === "axial") minimumRequiredMm = standard.minAxialMm;
	if (location === "margin") minimumRequiredMm = standard.minMarginMm;

	const deltaMm = Number((measuredThicknessMm - minimumRequiredMm).toFixed(3));
	const isCompliant = deltaMm >= 0;

	const warning = !isCompliant
		? `Недостаточная толщина (${measuredThicknessMm.toFixed(2)} мм < нормы ${minimumRequiredMm.toFixed(2)} мм для ${standard.materialName}). Высокий риск скола/перфорации.`
		: undefined;

	return {
		isCompliant,
		minimumRequiredMm,
		deltaMm,
		warning,
	};
}

/**
 * Разрешение статуса утверждения посадки конструкции (Lab-to-Clinic Handoff).
 */
export function resolveFitApprovalStatus(checklist: CrownFitChecklist): CrownFitApprovalReport {
	const blockingIssues: string[] = [];

	if (!checklist.marginFitPassed) {
		blockingIssues.push("Краевое прилегание на уступе превышает допустимый зазор 50 мкм.");
	}
	if (!checklist.wallThicknessPassed) {
		blockingIssues.push("Толщина стенок каркаса ниже клинического норматива материала.");
	}
	if (!checklist.undercutsClearPassed) {
		blockingIssues.push("Обнаружены блокирующие поднутрения по оси введения конструкции.");
	}
	if (!checklist.occlusalClearancePassed) {
		blockingIssues.push("Недостаточное окклюзионное разобщение с зубами-антагонистами.");
	}
	if (!checklist.proximalContactsPassed) {
		blockingIssues.push("Нарушена плотность апроксимальных контактных пунктов.");
	}

	const totalCount = 5;
	const passedCount = totalCount - blockingIssues.length;
	const isFullyApproved = blockingIssues.length === 0;

	let decision: CrownFitDecision = "approved";
	if (blockingIssues.length >= 3) {
		decision = "rejected";
	} else if (blockingIssues.length > 0) {
		decision = "revision_requested";
	}

	return {
		decision,
		passedCount,
		totalCount,
		isFullyApproved,
		blockingIssues,
	};
}

/**
 * Создание синтетической линии уступа препарирования для зуба FDI (эллипс со ступенькой для тестов).
 */
export function generateSyntheticMarginLine(
	toothFdi = "1.6",
	radiusX = 4.5,
	radiusY = 4.0,
	pointCount = 32,
): PrepMarginLineAnalysis {
	const points: MarginControlPoint[] = [];

	for (let i = 0; i < pointCount; i++) {
		const angle = (i / pointCount) * Math.PI * 2;
		const x = Number((Math.cos(angle) * radiusX).toFixed(4));
		const y = Number((Math.sin(angle) * radiusY).toFixed(4));
		// Небольшой анатомический прогиб по десневому краю (вестибулярный / оральный)
		const z = Number((Math.sin(angle * 2) * 0.8).toFixed(4));
		points.push([x, y, z]);
	}

	return analyzePrepMarginLine(`margin-${toothFdi}`, toothFdi, points);
}
