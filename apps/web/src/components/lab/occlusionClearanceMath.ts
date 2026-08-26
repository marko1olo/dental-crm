/**
 * occlusionClearanceMath.ts — Mathematical Occlusal Clearance Engine, Heatmap Color Mapping,
 * Point-Cloud Sampling, and CAD/CAM Antagonist Reduction Calculations.
 *
 * Provides exact clinical prosthetics math for dental laboratory orders and virtual CAD analysis.
 */

import {
	type CrownMaterialId,
	type PreparationZoneType,
	type MaterialClearanceEvaluation,
	CROWN_MATERIAL_SPECS,
	evaluateMaterialClearance,
	getCrownMaterialById,
} from "./crownMaterialTolerances";

// ─── HEATMAP COLOR SCALE & CLEARANCE CONSTANTS ─────────────────────────────────

export interface ClearanceHeatmapZone {
	readonly minMm: number;
	readonly maxMm: number;
	readonly colorHex: string;
	readonly colorRgba: string;
	readonly nameRu: string;
	readonly labelRu: string;
	readonly severity: "danger" | "warning" | "safe" | "excess";
	readonly riskDescriptionRu: string;
	readonly actionRu: string;
}

export const CLEARANCE_HEATMAP_ZONES: ClearanceHeatmapZone[] = [
	{
		minMm: 0.0,
		maxMm: 0.5,
		colorHex: "#ef4444", // Red
		colorRgba: "rgba(239, 68, 68, 0.9)",
		nameRu: "Красная зона (< 0.5 мм)",
		labelRu: "Критический дефицит",
		severity: "danger",
		riskDescriptionRu: "Недостаточно места, высокий риск скола/перфорации коронки при жевании",
		actionRu: "Требуется редукция культи или сошлифовывание бугра зуба-антагониста",
	},
	{
		minMm: 0.5,
		maxMm: 1.0,
		colorHex: "#eab308", // Yellow
		colorRgba: "rgba(234, 179, 8, 0.9)",
		nameRu: "Желтая зона (0.5–1.0 мм)",
		labelRu: "Критический минимум",
		severity: "warning",
		riskDescriptionRu: "Критический минимум толщины. Ограничен выбор материалов (только монолитный цирконий)",
		actionRu: "Рекомендуется редукция зуба-антагониста (0.3–0.5 мм) или тонкостенный цирконий 3Y-TZP",
	},
	{
		minMm: 1.0,
		maxMm: 1.8,
		colorHex: "#22c55e", // Green
		colorRgba: "rgba(34, 197, 94, 0.9)",
		nameRu: "Зеленая зона (1.0–1.8 мм)",
		labelRu: "Идеальное анатомическое пространство",
		severity: "safe",
		riskDescriptionRu: "Оптимальная прочность, анатомическая глубина фиссур и естественная эстетика",
		actionRu: "Анатомическое моделирование в полную анатомию без ограничений",
	},
	{
		minMm: 1.8,
		maxMm: 99.0,
		colorHex: "#3b82f6", // Blue
		colorRgba: "rgba(59, 130, 246, 0.9)",
		nameRu: "Синяя зона (> 1.8–2.0 мм)",
		labelRu: "Избыточный зазор",
		severity: "excess",
		riskDescriptionRu: "Избыточное пространство, риск утолщения реставрации, расхода цемента или консольной нагрузки",
		actionRu: "Моделирование усиленного анатомического каркаса, контроль контактов",
	},
];

/**
 * Maps a clearance distance in mm to a discrete heatmap zone.
 */
export function getClearanceHeatmapZone(clearanceMm: number): ClearanceHeatmapZone {
	const val = Math.max(0, Number.isFinite(clearanceMm) ? clearanceMm : 0);
	if (val < 0.5) return CLEARANCE_HEATMAP_ZONES[0]!;
	if (val < 1.0) return CLEARANCE_HEATMAP_ZONES[1]!;
	if (val <= 1.8) return CLEARANCE_HEATMAP_ZONES[2]!;
	return CLEARANCE_HEATMAP_ZONES[3]!;
}

/**
 * Returns a smooth RGB interpolated color hex for the occlusal clearance distance.
 */
export function getInterpolatedClearanceColor(clearanceMm: number): string {
	const val = Math.max(0, Math.min(3.0, Number.isFinite(clearanceMm) ? clearanceMm : 0));

	// 0.0 - 0.5: Red to Yellow (#ef4444 -> #eab308)
	if (val <= 0.5) {
		const t = val / 0.5;
		const r = Math.round(239 + (234 - 239) * t);
		const g = Math.round(68 + (179 - 68) * t);
		const b = Math.round(68 + (8 - 68) * t);
		return `rgb(${r}, ${g}, ${b})`;
	}
	// 0.5 - 1.0: Yellow to Green (#eab308 -> #22c55e)
	if (val <= 1.0) {
		const t = (val - 0.5) / 0.5;
		const r = Math.round(234 + (34 - 234) * t);
		const g = Math.round(179 + (197 - 179) * t);
		const b = Math.round(8 + (94 - 8) * t);
		return `rgb(${r}, ${g}, ${b})`;
	}
	// 1.0 - 1.8: Green to Cyan/Blue (#22c55e -> #3b82f6)
	if (val <= 1.8) {
		const t = (val - 1.0) / 0.8;
		const r = Math.round(34 + (59 - 34) * t);
		const g = Math.round(197 + (130 - 197) * t);
		const b = Math.round(94 + (246 - 94) * t);
		return `rgb(${r}, ${g}, ${b})`;
	}
	// 1.8+: Deep Blue (#3b82f6 -> #1d4ed8)
	const t = Math.min(1.0, (val - 1.8) / 1.2);
	const r = Math.round(59 + (29 - 59) * t);
	const g = Math.round(130 + (78 - 130) * t);
	const b = Math.round(246 + (216 - 246) * t);
	return `rgb(${r}, ${g}, ${b})`;
}

// ─── ANATOMICAL LANDMARKS & OCCLUSION BIOMECHANICS ────────────────────────────

export type AnatomicalCuspId =
	| "MB" // Mesiobuccal
	| "DB" // Distobuccal
	| "ML" // Mesiolingual (or Mesiopalatal)
	| "DL" // Distolingual (or Distopalatal)
	| "CF" // Central Fossa
	| "MMR" // Mesial Marginal Ridge
	| "DMR" // Distal Marginal Ridge
	| "B_AXIAL" // Buccal Axial Wall
	| "L_AXIAL"; // Lingual Axial Wall

export interface AnatomicalLandmarkInfo {
	readonly id: AnatomicalCuspId;
	readonly nameRu: string;
	readonly shortNameRu: string;
	readonly xPct: number; // 0..100 in 2D occlusal diagram
	readonly yPct: number; // 0..100 in 2D occlusal diagram
	readonly isFunctionalUpper: boolean;
	readonly isFunctionalLower: boolean;
	readonly defaultClearanceMm: number;
}

export const OCCLUSAL_LANDMARKS: Record<AnatomicalCuspId, AnatomicalLandmarkInfo> = {
	MB: {
		id: "MB",
		nameRu: "Мезиально-щечный бугор",
		shortNameRu: "МЩ бугор",
		xPct: 25,
		yPct: 25,
		isFunctionalUpper: false, // Upper buccal is non-functional
		isFunctionalLower: true, // Lower buccal is functional (supporting)
		defaultClearanceMm: 1.4,
	},
	DB: {
		id: "DB",
		nameRu: "Дистально-щечный бугор",
		shortNameRu: "ДЩ бугор",
		xPct: 75,
		yPct: 25,
		isFunctionalUpper: false,
		isFunctionalLower: true,
		defaultClearanceMm: 1.3,
	},
	ML: {
		id: "ML",
		nameRu: "Мезиально-язычный/небный бугор",
		shortNameRu: "МЯ/МН бугор",
		xPct: 25,
		yPct: 75,
		isFunctionalUpper: true, // Upper palatal is functional (supporting)
		isFunctionalLower: false, // Lower lingual is non-functional
		defaultClearanceMm: 1.5,
	},
	DL: {
		id: "DL",
		nameRu: "Дистально-язычный/небный бугор",
		shortNameRu: "ДЯ/ДН бугор",
		xPct: 75,
		yPct: 75,
		isFunctionalUpper: true,
		isFunctionalLower: false,
		defaultClearanceMm: 1.2,
	},
	CF: {
		id: "CF",
		nameRu: "Центральная фиссура / ямка",
		shortNameRu: "Центр. фиссура",
		xPct: 50,
		yPct: 50,
		isFunctionalUpper: false,
		isFunctionalLower: false,
		defaultClearanceMm: 1.6,
	},
	MMR: {
		id: "MMR",
		nameRu: "Мезиальный краевой гребень",
		shortNameRu: "М. гребень",
		xPct: 10,
		yPct: 50,
		isFunctionalUpper: false,
		isFunctionalLower: false,
		defaultClearanceMm: 1.3,
	},
	DMR: {
		id: "DMR",
		nameRu: "Дистальный краевой гребень",
		shortNameRu: "Д. гребень",
		xPct: 90,
		yPct: 50,
		isFunctionalUpper: false,
		isFunctionalLower: false,
		defaultClearanceMm: 1.3,
	},
	B_AXIAL: {
		id: "B_AXIAL",
		nameRu: "Щечная аксиальная стенка",
		shortNameRu: "Щ. стенка",
		xPct: 50,
		yPct: 10,
		isFunctionalUpper: false,
		isFunctionalLower: false,
		defaultClearanceMm: 0.9,
	},
	L_AXIAL: {
		id: "L_AXIAL",
		nameRu: "Язычная/небная аксиальная стенка",
		shortNameRu: "Я/Н. стенка",
		xPct: 50,
		yPct: 90,
		isFunctionalUpper: false,
		isFunctionalLower: false,
		defaultClearanceMm: 0.9,
	},
};

/**
 * Determines whether a given tooth FDI is located on the upper jaw (Maxilla).
 */
export function isUpperJawTooth(toothFdi: number | string): boolean {
	const num = Number(toothFdi);
	if (!Number.isFinite(num)) return true;
	// Maxilla quadrants: 10s and 20s (permanent), 50s and 60s (deciduous)
	return (num >= 11 && num <= 28) || (num >= 51 && num <= 65);
}

/**
 * Returns the anatomical antagonist tooth FDI (e.g. 16 <-> 46, 26 <-> 36, 11 <-> 41).
 */
export function getAntagonistToothFdi(toothFdi: number | string): number {
	const num = Number(toothFdi);
	if (!Number.isFinite(num)) return 46;
	const quad = Math.floor(num / 10);
	const pos = num % 10;

	// Upper Right (1) <-> Lower Right (4)
	if (quad === 1) return 40 + pos;
	// Upper Left (2) <-> Lower Left (3)
	if (quad === 2) return 30 + pos;
	// Lower Left (3) <-> Upper Left (2)
	if (quad === 3) return 20 + pos;
	// Lower Right (4) <-> Upper Right (1)
	if (quad === 4) return 10 + pos;

	// Deciduous: 5 <-> 8, 6 <-> 7
	if (quad === 5) return 80 + pos;
	if (quad === 6) return 70 + pos;
	if (quad === 7) return 60 + pos;
	if (quad === 8) return 50 + pos;

	return 46;
}

/**
 * Resolves whether an anatomical cusp is functional (supporting) or non-functional for a given tooth FDI.
 */
export function isCuspFunctional(toothFdi: number | string, cuspId: AnatomicalCuspId): boolean {
	const isUpper = isUpperJawTooth(toothFdi);
	const landmark = OCCLUSAL_LANDMARKS[cuspId];
	if (!landmark) return false;
	return isUpper ? landmark.isFunctionalUpper : landmark.isFunctionalLower;
}

/**
 * Resolves the preparation zone type for a given cusp landmark.
 */
export function getZoneTypeForLandmark(toothFdi: number | string, cuspId: AnatomicalCuspId): PreparationZoneType {
	if (cuspId === "CF") return "central_fossa";
	if (cuspId === "B_AXIAL" || cuspId === "L_AXIAL") return "axial_wall";
	if (cuspId === "MMR" || cuspId === "DMR") return "non_functional_cusp";
	return isCuspFunctional(toothFdi, cuspId) ? "functional_cusp" : "non_functional_cusp";
}

// ─── CLEARANCE POINT & GRID SAMPLING ──────────────────────────────────────────

export interface ClearancePoint {
	readonly id: string;
	readonly cuspId: AnatomicalCuspId;
	readonly nameRu: string;
	readonly xPct: number;
	readonly yPct: number;
	readonly clearanceMm: number;
	readonly isFunctional: boolean;
	readonly zoneType: PreparationZoneType;
	readonly evaluation: MaterialClearanceEvaluation;
	readonly heatmapZone: ClearanceHeatmapZone;
	readonly color: string;
}

export interface GridSamplePoint {
	readonly gridX: number; // 0..cols
	readonly gridY: number; // 0..rows
	readonly posX: number; // 0..100%
	readonly posY: number; // 0..100%
	readonly clearanceMm: number;
	readonly color: string;
	readonly isDeficient: boolean;
}

export interface ClearanceStats {
	readonly toothFdi: number;
	readonly materialId: CrownMaterialId;
	readonly minClearanceMm: number;
	readonly maxClearanceMm: number;
	readonly avgClearanceMm: number;
	readonly medianClearanceMm: number;
	readonly totalPoints: number;
	readonly redCount: number;
	readonly yellowCount: number;
	readonly greenCount: number;
	readonly blueCount: number;
	readonly redPct: number;
	readonly yellowPct: number;
	readonly greenPct: number;
	readonly bluePct: number;
	readonly criticalDeficientPoints: ClearancePoint[];
	readonly worstPoint: ClearancePoint | null;
	readonly isMaterialCompliant: boolean;
	readonly maxDeficiencyMm: number;
	readonly requiredAntagonistReductionMm: number;
	readonly requiredPrepReductionMm: number;
	readonly overallSeverity: "danger" | "warning" | "safe" | "excess";
	readonly clinicalSummaryRu: string;
}

/**
 * Calculates clearance for landmark points given adjustments (VDO, antagonist reduction, prep reduction).
 */
export function evaluateLandmarkPoints(
	toothFdi: number | string,
	materialId: CrownMaterialId,
	customClearances?: Partial<Record<AnatomicalCuspId, number>>,
	adjustments?: {
		vdoDeltaMm?: number; // Virtual vertical dimension offset (±0.5 mm)
		antagonistReductionMm?: number; // Enameloplasty on antagonist (+0..1.5 mm)
		prepReductionMm?: number; // Additional tooth prep (+0..1.5 mm)
	},
): ClearancePoint[] {
	const toothNum = Number(toothFdi) || 16;
	const vdo = Number(adjustments?.vdoDeltaMm) || 0;
	const antagRed = Math.max(0, Number(adjustments?.antagonistReductionMm) || 0);
	const prepRed = Math.max(0, Number(adjustments?.prepReductionMm) || 0);
	const totalOffset = vdo + antagRed + prepRed;

	const landmarkKeys = Object.keys(OCCLUSAL_LANDMARKS) as AnatomicalCuspId[];

	return landmarkKeys.map((key) => {
		const landmark = OCCLUSAL_LANDMARKS[key]!;
		const baseClearance = customClearances?.[key] ?? landmark.defaultClearanceMm;
		const finalClearance = Math.max(0, Number((baseClearance + totalOffset).toFixed(2)));
		const isFunctional = isCuspFunctional(toothNum, key);
		const zoneType = getZoneTypeForLandmark(toothNum, key);
		const evaluation = evaluateMaterialClearance(materialId, zoneType, finalClearance);
		const heatmapZone = getClearanceHeatmapZone(finalClearance);
		const color = getInterpolatedClearanceColor(finalClearance);

		return {
			id: key,
			cuspId: key,
			nameRu: landmark.nameRu,
			xPct: landmark.xPct,
			yPct: landmark.yPct,
			clearanceMm: finalClearance,
			isFunctional,
			zoneType,
			evaluation,
			heatmapZone,
			color,
		};
	});
}

/**
 * Aggregates statistics across all evaluated occlusal clearance points.
 */
export function calculateClearanceStats(
	toothFdi: number | string,
	materialId: CrownMaterialId,
	points: ClearancePoint[],
): ClearanceStats {
	const toothNum = Number(toothFdi) || 16;
	if (!points || points.length === 0) {
		return {
			toothFdi: toothNum,
			materialId,
			minClearanceMm: 0,
			maxClearanceMm: 0,
			avgClearanceMm: 0,
			medianClearanceMm: 0,
			totalPoints: 0,
			redCount: 0,
			yellowCount: 0,
			greenCount: 0,
			blueCount: 0,
			redPct: 0,
			yellowPct: 0,
			greenPct: 0,
			bluePct: 0,
			criticalDeficientPoints: [],
			worstPoint: null,
			isMaterialCompliant: false,
			maxDeficiencyMm: 0,
			requiredAntagonistReductionMm: 0,
			requiredPrepReductionMm: 0,
			overallSeverity: "danger",
			clinicalSummaryRu: "Нет данных для анализа окклюзионного пространства",
		};
	}

	const clearances = points.map((p) => p.clearanceMm).sort((a, b) => a - b);
	const total = points.length;
	const minVal = clearances[0] ?? 0;
	const maxVal = clearances[total - 1] ?? 0;
	const sum = clearances.reduce((acc, v) => acc + v, 0);
	const avgVal = Number((sum / total).toFixed(2));
	const medianVal = clearances[Math.floor(total / 2)] ?? 0;

	let redCount = 0;
	let yellowCount = 0;
	let greenCount = 0;
	let blueCount = 0;
	const criticalDeficientPoints: ClearancePoint[] = [];

	let worstDeficiency = 0;
	let worstPt: ClearancePoint | null = null;

	for (const pt of points) {
		if (pt.clearanceMm < 0.5) redCount++;
		else if (pt.clearanceMm < 1.0) yellowCount++;
		else if (pt.clearanceMm <= 1.8) greenCount++;
		else blueCount++;

		if (!pt.evaluation.isSafe || pt.evaluation.safetyLevel === "critical_shortage") {
			criticalDeficientPoints.push(pt);
		}

		if (pt.evaluation.deficiencyMm > worstDeficiency) {
			worstDeficiency = pt.evaluation.deficiencyMm;
			worstPt = pt;
		}
	}

	// Fallback to absolute lowest clearance point if none has deficiency
	if (!worstPt && points.length > 0) {
		worstPt = points.reduce((prev, curr) => (curr.clearanceMm < prev.clearanceMm ? curr : prev), points[0]!);
	}

	const redPct = Math.round((redCount / total) * 100);
	const yellowPct = Math.round((yellowCount / total) * 100);
	const greenPct = Math.round((greenCount / total) * 100);
	const bluePct = Math.round((blueCount / total) * 100);

	const isCompliant = criticalDeficientPoints.length === 0;
	const requiredAntagRed = Number(worstDeficiency.toFixed(2));
	const requiredPrepRed = Number(worstDeficiency.toFixed(2));

	let overallSeverity: "danger" | "warning" | "safe" | "excess" = "safe";
	if (redCount > 0 || !isCompliant) {
		overallSeverity = "danger";
	} else if (yellowCount > 0) {
		overallSeverity = "warning";
	} else if (blueCount > greenCount) {
		overallSeverity = "excess";
	}

	const matSpec = getCrownMaterialById(materialId);
	let clinicalSummaryRu = "";
	if (overallSeverity === "danger") {
		clinicalSummaryRu = `ВНИМАНИЕ: Обнаружен критический дефицит толщины для материала «${matSpec.nameRu}» на ${criticalDeficientPoints.length} участке(ах). Максимальный дефицит: ${worstDeficiency} мм. Требуется редукция антагониста или культи перед фрезеровкой.`;
	} else if (overallSeverity === "warning") {
		clinicalSummaryRu = `Предупреждение: Пространство ограничено (${minVal}–${maxVal} мм). Материал «${matSpec.nameRu}» находится на нижней границе допустимого допуска.`;
	} else if (overallSeverity === "excess") {
		clinicalSummaryRu = `Окклюзионное пространство избыточно (${minVal}–${maxVal} мм). Рекомендуется моделирование в полную анатомию для исключения толстого слоя цемента.`;
	} else {
		clinicalSummaryRu = `Окклюзионный клиренс идеален (${minVal}–${maxVal} мм). Полное соответствие анатомическим и прочностным стандартам для «${matSpec.nameRu}».`;
	}

	return {
		toothFdi: toothNum,
		materialId,
		minClearanceMm: minVal,
		maxClearanceMm: maxVal,
		avgClearanceMm: avgVal,
		medianClearanceMm: medianVal,
		totalPoints: total,
		redCount,
		yellowCount,
		greenCount,
		blueCount,
		redPct,
		yellowPct,
		greenPct,
		bluePct,
		criticalDeficientPoints,
		worstPoint: worstPt,
		isMaterialCompliant: isCompliant,
		maxDeficiencyMm: worstDeficiency,
		requiredAntagonistReductionMm: requiredAntagRed,
		requiredPrepReductionMm: requiredPrepRed,
		overallSeverity,
		clinicalSummaryRu,
	};
}

// ─── 2D CONTINUOUS DENSE HEATMAP GRID GENERATION ──────────────────────────────

/**
 * Generates a dense 10x10 or 15x15 interpolating grid for realistic occlusal heatmap rendering.
 */
export function generateDenseOcclusalHeatmapGrid(
	points: ClearancePoint[],
	gridSize = 12,
): GridSamplePoint[][] {
	const grid: GridSamplePoint[][] = [];

	// Inverse Distance Weighting (IDW) interpolation from landmark points
	for (let r = 0; r < gridSize; r++) {
		const row: GridSamplePoint[] = [];
		const posY = (r / (gridSize - 1)) * 100;

		for (let c = 0; c < gridSize; c++) {
			const posX = (c / (gridSize - 1)) * 100;

			let weightedSum = 0;
			let weightTotal = 0;

			for (const pt of points) {
				const dx = posX - pt.xPct;
				const dy = posY - pt.yPct;
				const distSq = dx * dx + dy * dy;

				if (distSq < 1e-4) {
					weightedSum = pt.clearanceMm;
					weightTotal = 1;
					break;
				}

				// Power = 2 for smooth IDW
				const w = 1 / Math.pow(distSq, 1.2);
				weightedSum += pt.clearanceMm * w;
				weightTotal += w;
			}

			const clearanceMm = Number((weightedSum / (weightTotal || 1)).toFixed(2));
			const color = getInterpolatedClearanceColor(clearanceMm);
			const isDeficient = clearanceMm < 0.8;

			row.push({
				gridX: c,
				gridY: r,
				posX,
				posY,
				clearanceMm,
				color,
				isDeficient,
			});
		}
		grid.push(row);
	}

	return grid;
}

// ─── 2D/3D CROSS-SECTION PROFILE ENGINE ───────────────────────────────────────

export interface CrossSectionPoint {
	readonly xPct: number; // 0..100% across slice
	readonly prepStumpY: number; // Y coordinate in SVG canvas (higher = lower in mouth)
	readonly crownTopY: number; // Y coordinate of modeled restoration surface
	readonly antagonistY: number; // Y coordinate of antagonist tooth enamel
	readonly clearanceMm: number;
	readonly thicknessMm: number;
	readonly zoneColor: string;
	readonly isCollision: boolean;
}

export interface CrossSectionSlice {
	readonly plane: "buccolingual" | "mesiodistal";
	readonly titleRu: string;
	readonly points: CrossSectionPoint[];
	readonly minClearanceMm: number;
	readonly maxClearanceMm: number;
	readonly minThicknessMm: number;
}

/**
 * Computes a buccolingual or mesiodistal cross-section profile with stump, restoration, and antagonist layers.
 */
export function computeCrossSectionSlice(
	plane: "buccolingual" | "mesiodistal",
	points: ClearancePoint[],
	targetMaterial: CrownMaterialId,
	cementGapMicrons = 40,
): CrossSectionSlice {
	const sampleCount = 21;
	const slicePoints: CrossSectionPoint[] = [];
	const cementOffsetMm = (cementGapMicrons || 40) / 1000;
	const matSpec = getCrownMaterialById(targetMaterial);

	// Extract primary landmarks along the cut plane
	let cusp1Clearance = 1.4;
	let fossaClearance = 1.6;
	let cusp2Clearance = 1.5;

	if (plane === "buccolingual") {
		// Buccal (MB/DB avg) -> Fossa (CF) -> Lingual (ML/DL avg)
		const mb = points.find((p) => p.cuspId === "MB")?.clearanceMm ?? 1.4;
		const db = points.find((p) => p.cuspId === "DB")?.clearanceMm ?? 1.3;
		const ml = points.find((p) => p.cuspId === "ML")?.clearanceMm ?? 1.5;
		const dl = points.find((p) => p.cuspId === "DL")?.clearanceMm ?? 1.2;
		const cf = points.find((p) => p.cuspId === "CF")?.clearanceMm ?? 1.6;

		cusp1Clearance = (mb + db) / 2;
		fossaClearance = cf;
		cusp2Clearance = (ml + dl) / 2;
	} else {
		// Mesial (MMR) -> Fossa (CF) -> Distal (DMR)
		cusp1Clearance = points.find((p) => p.cuspId === "MMR")?.clearanceMm ?? 1.3;
		fossaClearance = points.find((p) => p.cuspId === "CF")?.clearanceMm ?? 1.6;
		cusp2Clearance = points.find((p) => p.cuspId === "DMR")?.clearanceMm ?? 1.3;
	}

	let minClearance = Infinity;
	let maxClearance = -Infinity;
	let minThickness = Infinity;

	const canvasBaseY = 160; // Prep base Y coordinate

	for (let i = 0; i < sampleCount; i++) {
		const t = i / (sampleCount - 1);
		const xPct = t * 100;

		// Preparation stump contour (bell curve shape)
		// Stump profile: chamfer margin at edges (t=0.1, 0.9), peak at center/cusp shoulders
		const stumpShape = Math.sin(t * Math.PI);
		const stumpHeight = stumpShape * 70; // 0 to 70px height
		const prepStumpY = canvasBaseY - stumpHeight;

		// Interpolated clearance across slice (cusp1 -> fossa -> cusp2)
		let clearanceMm: number;
		if (t < 0.5) {
			const localT = t / 0.5;
			clearanceMm = cusp1Clearance + (fossaClearance - cusp1Clearance) * Math.sin(localT * (Math.PI / 2));
		} else {
			const localT = (t - 0.5) / 0.5;
			clearanceMm = fossaClearance + (cusp2Clearance - fossaClearance) * (1 - Math.cos(localT * (Math.PI / 2)));
		}

		clearanceMm = Math.max(0, Number(clearanceMm.toFixed(2)));
		minClearance = Math.min(minClearance, clearanceMm);
		maxClearance = Math.max(maxClearance, clearanceMm);

		// Antagonist position (antagonist surface is located above stump by clearanceMm)
		// 1 mm = ~25 px in SVG scale
		const pxPerMm = 28;
		const clearancePx = clearanceMm * pxPerMm;
		const antagonistY = prepStumpY - clearancePx;

		// Crown restoration thickness (ideal: fills the gap minus small buffer, or matches material min)
		const targetZone: PreparationZoneType = (t < 0.35 || t > 0.65) ? "functional_cusp" : "central_fossa";
		const minReqThickness = matSpec.zones[targetZone].minMm;
		const thicknessMm = Math.max(0.2, Number((clearanceMm - cementOffsetMm).toFixed(2)));
		minThickness = Math.min(minThickness, thicknessMm);

		const crownTopY = prepStumpY - (thicknessMm * pxPerMm);
		const isCollision = clearanceMm < minReqThickness;
		const zoneColor = getInterpolatedClearanceColor(clearanceMm);

		slicePoints.push({
			xPct,
			prepStumpY,
			crownTopY,
			antagonistY,
			clearanceMm,
			thicknessMm,
			zoneColor,
			isCollision,
		});
	}

	return {
		plane,
		titleRu: plane === "buccolingual" ? "Вестибуло-оральный срез (Щечно-язычный)" : "Мезио-дистальный срез (Апроксимальный)",
		points: slicePoints,
		minClearanceMm: minClearance === Infinity ? 0 : minClearance,
		maxClearanceMm: maxClearance === -Infinity ? 0 : maxClearance,
		minThicknessMm: minThickness === Infinity ? 0 : minThickness,
	};
}

// ─── LABORATORY SPECIFICATION & REPORT BUILDER ─────────────────────────────────

export interface LabOcclusionReport {
	readonly toothFdi: number;
	readonly antagonistToothFdi: number;
	readonly materialNameRu: string;
	readonly materialCategoryRu: string;
	readonly measuredMinClearanceMm: number;
	readonly measuredAvgClearanceMm: number;
	readonly recommendedCrownThicknessMm: string;
	readonly recommendedCementGapMicrons: number;
	readonly complianceStatusRu: "ПОЛНОЕ СООТВЕТСТВИЕ" | "ТРЕБУЕТСЯ КОРРЕКЦИЯ" | "КРИТИЧЕСКИЙ ДЕФИЦИТ";
	readonly antagonistAdjustmentRu: string;
	readonly labNotesRu: string;
	readonly rawTextForCopy: string;
}

/**
 * Builds a structured, copyable specification for the dental technician (ЗТЛ).
 */
export function generateLabOcclusionReport(params: {
	toothFdi: number | string;
	materialId: CrownMaterialId;
	stats: ClearanceStats;
	cementGapMicrons?: number;
	doctorNotes?: string;
}): LabOcclusionReport {
	const toothNum = Number(params.toothFdi) || 16;
	const antagNum = getAntagonistToothFdi(toothNum);
	const matSpec = getCrownMaterialById(params.materialId);
	const cementGap = params.cementGapMicrons || 40;

	let statusRu: "ПОЛНОЕ СООТВЕТСТВИЕ" | "ТРЕБУЕТСЯ КОРРЕКЦИЯ" | "КРИТИЧЕСКИЙ ДЕФИЦИТ" = "ПОЛНОЕ СООТВЕТСТВИЕ";
	if (params.stats.overallSeverity === "danger") {
		statusRu = "КРИТИЧЕСКИЙ ДЕФИЦИТ";
	} else if (params.stats.overallSeverity === "warning") {
		statusRu = "ТРЕБУЕТСЯ КОРРЕКЦИЯ";
	}

	const antagonistAdjustmentRu =
		params.stats.requiredAntagonistReductionMm > 0
			? `Рекомендовано избирательное сошлифовывание (эмалопластика) антагониста №${antagNum} на ${params.stats.requiredAntagonistReductionMm} мм`
			: "Коррекция антагониста не требуется (пространство достаточно)";

	const funcGuide = matSpec.zones.functional_cusp;
	const nonFuncGuide = matSpec.zones.non_functional_cusp;
	const recommendedCrownThicknessMm = `Бугры: ${funcGuide.minMm}–${funcGuide.idealMm} мм (функц.), ${nonFuncGuide.minMm}–${nonFuncGuide.idealMm} мм (нефункц.); Фиссуры: ${matSpec.zones.central_fossa.idealMm} мм`;

	const labNotesLines: string[] = [
		`• Материал конструкции: ${matSpec.nameRu} (Прочность: ${matSpec.flexuralStrengthMpa} МПа).`,
		`• Цементный зазор: ${cementGap} мкм (CAD/CAM Offset).`,
		`• Тип препарирования края: ${matSpec.marginTypeRu}.`,
		`• Протокол фиксации: ${matSpec.cementationProtocolRu}.`,
	];

	if (params.stats.overallSeverity === "danger") {
		labNotesLines.push(
			`⚠️ ВНИМАНИЕ ЗТЛ: Минимальный зазор ${params.stats.minClearanceMm} мм ниже допуска ${funcGuide.minMm} мм. Выполнить виртуальную редукцию антагониста или уведомить клинику о риске скола.`,
		);
	} else {
		labNotesLines.push("✅ Окклюзионный клиренс достаточен для полноценного анатомического моделирования.");
	}

	if (params.doctorNotes) {
		labNotesLines.push(`• Комментарий врача: ${params.doctorNotes}`);
	}

	const labNotesRu = labNotesLines.join("\n");

	const rawTextForCopy = `=== НАСТРОЙКИ CAD/CAM ОККЛЮЗИОННОГО КЛИРЕНСА (ЗТЛ) ===
Зуб: №${toothNum} (Антагонист: №${antagNum})
Материал: ${matSpec.nameRu}
Статус соответствия: ${statusRu}
Минимальный измеренный зазор: ${params.stats.minClearanceMm} мм
Средний окклюзионный зазор: ${params.stats.avgClearanceMm} мм
Рекомендуемая толщина коронки: ${recommendedCrownThicknessMm}
Цементный зазор: ${cementGap} мкм
Антагонист: ${antagonistAdjustmentRu}
Примечания лаборатории:
${labNotesRu}`;

	return {
		toothFdi: toothNum,
		antagonistToothFdi: antagNum,
		materialNameRu: matSpec.nameRu,
		materialCategoryRu: matSpec.category,
		measuredMinClearanceMm: params.stats.minClearanceMm,
		measuredAvgClearanceMm: params.stats.avgClearanceMm,
		recommendedCrownThicknessMm,
		recommendedCementGapMicrons: cementGap,
		complianceStatusRu: statusRu,
		antagonistAdjustmentRu,
		labNotesRu,
		rawTextForCopy,
	};
}

// ─── SIMULATION & DEMO PRESET GENERATOR ────────────────────────────────────────

export type OcclusionSimulationPreset =
	| "optimal"
	| "tight_buccal"
	| "tight_central"
	| "excessive"
	| "severe_collision";

/**
 * Generates custom landmark clearance values for realistic CAD/CAM testing and demo scenarios.
 */
export function getSimulationPresetClearances(
	preset: OcclusionSimulationPreset,
): Record<AnatomicalCuspId, number> {
	switch (preset) {
		case "optimal":
			return {
				MB: 1.4,
				DB: 1.3,
				ML: 1.5,
				DL: 1.3,
				CF: 1.6,
				MMR: 1.3,
				DMR: 1.3,
				B_AXIAL: 0.9,
				L_AXIAL: 0.9,
			};
		case "tight_buccal":
			return {
				MB: 0.7,
				DB: 0.6,
				ML: 1.4,
				DL: 1.3,
				CF: 1.1,
				MMR: 1.0,
				DMR: 1.0,
				B_AXIAL: 0.7,
				L_AXIAL: 0.9,
			};
		case "tight_central":
			return {
				MB: 1.2,
				DB: 1.1,
				ML: 1.3,
				DL: 1.2,
				CF: 0.4, // Critical red in central fossa
				MMR: 0.8,
				DMR: 0.8,
				B_AXIAL: 0.8,
				L_AXIAL: 0.8,
			};
		case "severe_collision":
			return {
				MB: 0.3, // Severe collision
				DB: 0.4,
				ML: 0.6,
				DL: 0.5,
				CF: 0.3,
				MMR: 0.5,
				DMR: 0.5,
				B_AXIAL: 0.4,
				L_AXIAL: 0.5,
			};
		case "excessive":
			return {
				MB: 2.4,
				DB: 2.2,
				ML: 2.5,
				DL: 2.3,
				CF: 2.8,
				MMR: 2.1,
				DMR: 2.1,
				B_AXIAL: 1.5,
				L_AXIAL: 1.5,
			};
	}
}
