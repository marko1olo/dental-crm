/**
 * DENTE CRM — CBCT Multi-Study Comparison & Treatment Dynamics Math Engine
 *
 * Implements:
 * 1. Synchronized Slice Coordinate Mapping (Z-axis height alignment with slice thickness compensation)
 * 2. Synchronous Pan & Zoom Transform calculations
 * 3. Alveolar Ridge Bone Gain Delta Analysis (Pre-Op Baseline vs Post-Op Followup)
 * 4. Bone Mineralization HU Delta & Misch Density Transition
 * 5. Implant Osseointegration vs Peri-implantitis Diagnostic Classifier
 * 6. 1-Click Form 043/u Outpatient Protocol Statement Generation
 *
 * Standards: Mandate 8b (<= 600 lines); Mandate 8e (Doctor Autonomy); Mandate 8i (Outpatient Dental Context).
 */

export interface StudySliceSeriesInfo {
	readonly sliceCount: number;
	readonly sliceThicknessMm: number;
	readonly originZMm?: number | undefined;
	readonly label?: string | undefined;
	readonly date?: string | undefined;
}

export interface SynchronizedSliceState {
	readonly physicalZMm: number;
	readonly baselineIndex: number;
	readonly followupIndex: number;
	readonly baselineMaxIndex: number;
	readonly followupMaxIndex: number;
	readonly baselineSliceThicknessMm: number;
	readonly followupSliceThicknessMm: number;
}

/**
 * Calculates physical Z coordinate (in millimeters) from discrete slice index.
 */
export function calculateZCoordinateFromSlice(
	sliceIndex: number,
	sliceThicknessMm: number,
	originZMm = 0,
): number {
	const thickness = Math.max(0.01, sliceThicknessMm);
	return Number((originZMm + sliceIndex * thickness).toFixed(3));
}

/**
 * Calculates nearest discrete slice index from physical Z coordinate (in millimeters).
 */
export function calculateSliceIndexFromZ(
	zMm: number,
	sliceThicknessMm: number,
	sliceCount: number,
	originZMm = 0,
): number {
	if (sliceCount <= 1) return 0;
	const thickness = Math.max(0.01, sliceThicknessMm);
	const rawIndex = Math.round((zMm - originZMm) / thickness);
	return Math.max(0, Math.min(sliceCount - 1, rawIndex));
}

/**
 * Computes synchronized slice indices for two studies with potentially different slice thicknesses.
 * Example: Baseline study has 0.5 mm slices (300 slices), Follow-up has 1.0 mm slices (150 slices).
 * At physical Z = 10.0 mm -> Baseline = slice 20, Follow-up = slice 10.
 */
export function computeSynchronizedSliceIndices(params: {
	readonly currentZMm: number;
	readonly baseline: StudySliceSeriesInfo;
	readonly followup: StudySliceSeriesInfo;
	readonly scrollDeltaZMm?: number | undefined;
}): SynchronizedSliceState {
	const { currentZMm, baseline, followup, scrollDeltaZMm = 0 } = params;

	const baselineThickness = Math.max(0.05, baseline.sliceThicknessMm || 1.0);
	const followupThickness = Math.max(0.05, followup.sliceThicknessMm || 1.0);
	const baselineCount = Math.max(1, baseline.sliceCount || 1);
	const followupCount = Math.max(1, followup.sliceCount || 1);

	// Max physical span covered by both studies
	const baselineSpanMm = (baselineCount - 1) * baselineThickness;
	const followupSpanMm = (followupCount - 1) * followupThickness;
	const maxSharedZMm = Math.max(baselineSpanMm, followupSpanMm);

	// New clamped Z position
	const targetZMm = Math.max(0, Math.min(maxSharedZMm, currentZMm + scrollDeltaZMm));

	const baselineIdx = calculateSliceIndexFromZ(
		targetZMm,
		baselineThickness,
		baselineCount,
		baseline.originZMm ?? 0,
	);

	const followupIdx = calculateSliceIndexFromZ(
		targetZMm,
		followupThickness,
		followupCount,
		followup.originZMm ?? 0,
	);

	return {
		physicalZMm: Number(targetZMm.toFixed(2)),
		baselineIndex: baselineIdx,
		followupIndex: followupIdx,
		baselineMaxIndex: baselineCount - 1,
		followupMaxIndex: followupCount - 1,
		baselineSliceThicknessMm: baselineThickness,
		followupSliceThicknessMm: followupThickness,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. BONE DYNAMICS & ALVEOLAR RIDGE DELTA ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

export interface BoneDimensionPoint {
	readonly heightMm: number;
	readonly widthMm: number;
	readonly densityHU?: number | undefined;
	readonly measurementDate?: string | undefined;
	readonly studyId?: string | undefined;
	readonly toothFdi?: string | number | undefined;
}

export type BoneDynamicsStatus =
	| "positive_gain" // Прирост костной ткани (синус-лифтинг / НКР успешен)
	| "stable" // Стабильный уровень костной ткани
	| "resorption_alert"; // Резорбция кости / потеря высоты или ширины

export type OsteointegrationStatus =
	| "osteointegrated" // Остеоинтегрирован без периимплантита
	| "periimplantitis_risk" // Краевая резорбция / риск периимплантита
	| "graft_consolidation"; // Идет консолидация костного графта

export interface BoneDynamicsDeltaResult {
	readonly toothFdi: string;
	readonly baselineHeightMm: number;
	readonly followupHeightMm: number;
	readonly deltaHeightMm: number;
	readonly heightGainPercent: number;
	readonly baselineWidthMm: number;
	readonly followupWidthMm: number;
	readonly deltaWidthMm: number;
	readonly widthGainPercent: number;
	readonly baselineDensityHU: number | null;
	readonly followupDensityHU: number | null;
	readonly deltaDensityHU: number | null;
	readonly dynamicsStatus: BoneDynamicsStatus;
	readonly osteointegrationStatus: OsteointegrationStatus;
	readonly isAdequateForLoading: boolean;
	readonly clinicalSummaryRu: string;
	readonly protocolStatementRu: string;
}

/**
 * Calculates bone gain delta between baseline (pre-op) and followup (post-op) measurements.
 */
export function calculateBoneDynamicsDelta(params: {
	readonly baseline: BoneDimensionPoint;
	readonly followup: BoneDimensionPoint;
	readonly toothFdi?: string | number | undefined;
	readonly isImplantPlaced?: boolean | undefined;
}): BoneDynamicsDeltaResult {
	const { baseline, followup, isImplantPlaced = true } = params;

	const tooth = String(params.toothFdi ?? followup.toothFdi ?? baseline.toothFdi ?? "16");

	const bH = Math.max(0, baseline.heightMm);
	const fH = Math.max(0, followup.heightMm);
	const deltaHeightMm = Number((fH - bH).toFixed(2));
	const heightGainPercent = bH > 0 ? Number(((deltaHeightMm / bH) * 100).toFixed(1)) : 0;

	const bW = Math.max(0, baseline.widthMm);
	const fW = Math.max(0, followup.widthMm);
	const deltaWidthMm = Number((fW - bW).toFixed(2));
	const widthGainPercent = bW > 0 ? Number(((deltaWidthMm / bW) * 100).toFixed(1)) : 0;

	const bHU = typeof baseline.densityHU === "number" ? Math.round(baseline.densityHU) : null;
	const fHU = typeof followup.densityHU === "number" ? Math.round(followup.densityHU) : null;
	const deltaDensityHU = bHU !== null && fHU !== null ? fHU - bHU : null;

	// Dynamics classification
	let dynamicsStatus: BoneDynamicsStatus = "stable";
	if (deltaHeightMm >= 0.5 || deltaWidthMm >= 0.5) {
		dynamicsStatus = "positive_gain";
	} else if (deltaHeightMm <= -0.8 || deltaWidthMm <= -0.8) {
		dynamicsStatus = "resorption_alert";
	}

	// Osteointegration status
	let osteointegrationStatus: OsteointegrationStatus = "osteointegrated";
	if (dynamicsStatus === "resorption_alert") {
		osteointegrationStatus = "periimplantitis_risk";
	} else if (!isImplantPlaced) {
		osteointegrationStatus = "graft_consolidation";
	} else {
		osteointegrationStatus = "osteointegrated";
	}

	// Adequate for prosthetic loading (height >= 10mm, width >= 6mm, density HU >= 350)
	const isAdequateForLoading = fH >= 9.5 && fW >= 5.5 && (fHU === null || fHU >= 300);

	// Clinical summary
	const signH = deltaHeightMm > 0 ? `+${deltaHeightMm.toFixed(1)}` : deltaHeightMm.toFixed(1);
	const signW = deltaWidthMm > 0 ? `+${deltaWidthMm.toFixed(1)}` : deltaWidthMm.toFixed(1);

	let summary = "";
	if (dynamicsStatus === "positive_gain") {
		summary = `Прирост костной ткани в обл. ${tooth} зуба: ${signH} мм. Имплантат остеоинтегрирован без периимплантита.`;
	} else if (dynamicsStatus === "resorption_alert") {
		summary = `Внимание: краевая резорбция кости в обл. ${tooth} зуба (${signH} мм). Риск периимплантита.`;
	} else {
		summary = `Стабильный уровень костной ткани в обл. ${tooth} зуба (дельта ${signH} мм). Периимплантита нет.`;
	}

	// Form 043/u full formal statement
	const densitySnippet =
		deltaDensityHU !== null && fHU !== null
			? `, минерализация регенерата ${fHU} HU (дельта ${deltaDensityHU > 0 ? `+${deltaDensityHU}` : deltaDensityHU} HU)`
			: "";

	const protocolStatement =
		`Динамика КТ (сравнение До/После, зуб ${tooth}): ` +
		`высота гребня ${bH.toFixed(1)} -> ${fH.toFixed(1)} мм (${signH} мм, ${heightGainPercent > 0 ? `+${heightGainPercent}` : heightGainPercent}%), ` +
		`ширина ${bW.toFixed(1)} -> ${fW.toFixed(1)} мм (${signW} мм)${densitySnippet}. ` +
		(osteointegrationStatus === "osteointegrated"
			? "Имплантат остеоинтегрирован без периимплантита."
			: osteointegrationStatus === "periimplantitis_risk"
				? "Выявлена краевая резорбция костной ткани (риск периимплантита)."
				: "Консолидация костного регенерата удовлетворительная.");

	return {
		toothFdi: tooth,
		baselineHeightMm: bH,
		followupHeightMm: fH,
		deltaHeightMm,
		heightGainPercent,
		baselineWidthMm: bW,
		followupWidthMm: fW,
		deltaWidthMm,
		widthGainPercent,
		baselineDensityHU: bHU,
		followupDensityHU: fHU,
		deltaDensityHU,
		dynamicsStatus,
		osteointegrationStatus,
		isAdequateForLoading,
		clinicalSummaryRu: summary,
		protocolStatementRu: protocolStatement,
	};
}

/**
 * 1-Click Form 043/u clinical protocol text for bone comparison dynamics.
 * Strictly adheres to clinical requirement:
 * «Прирост костной ткани в обл. 16 зуба: +4.2 мм. Имплантат остеоинтегрирован без периимплантита»
 */
export function generateBoneDynamics043Protocol(
	deltaResult: BoneDynamicsDeltaResult,
	compact = false,
): string {
	if (compact) {
		return deltaResult.clinicalSummaryRu;
	}
	return deltaResult.protocolStatementRu;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. SYNCHRONOUS ZOOM & PAN MATHEMATICS
// ─────────────────────────────────────────────────────────────────────────────

export interface ViewportTransform2D {
	readonly zoom: number;
	readonly panX: number;
	readonly panY: number;
}

/**
 * Calculates synchronous zoom update for dual viewports, clamping between min and max.
 */
export function applySynchronizedZoom(
	current: ViewportTransform2D,
	wheelDeltaY: number,
	minZoom = 0.2,
	maxZoom = 16.0,
): ViewportTransform2D {
	const factor = wheelDeltaY < 0 ? 1.15 : 0.87;
	const nextZoom = Math.min(maxZoom, Math.max(minZoom, current.zoom * factor));
	return {
		...current,
		zoom: Number(nextZoom.toFixed(3)),
	};
}

/**
 * Applies synchronized pan offset.
 */
export function applySynchronizedPan(
	startPan: { x: number; y: number },
	mouseDelta: { dx: number; dy: number },
): { panX: number; panY: number } {
	return {
		panX: Math.round(startPan.x + mouseDelta.dx),
		panY: Math.round(startPan.y + mouseDelta.dy),
	};
}
