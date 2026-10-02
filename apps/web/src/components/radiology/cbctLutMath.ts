/**
 * DENTE CRM — CBCT 16-Bit Look-Up Table (LUT) & HU Windowing Engine
 * Standards: DICOM Part 3 PS 3.3 (C.11.2.1.2 VOI LUT Windowing)
 * Extracted from cbctMprMath.ts according to Mandate 8b.
 */


/**
 * Generates a precomputed 65536-entry Uint8Array Look-Up Table (LUT) mapping signed 16-bit
 * HU values (-32768..+32767) to 8-bit grayscale intensities [0..255].
 *
 * Direct index mapping: `lutIndex = (hu + 32768) & 0xffff`.
 *
 * Supports:
 * - Sub-millisecond window width / window level contrast calculations.
 * - Negative / Inverted X-ray LUT (White Paper mode) via `invert = true`.
 * - Anti-blinding dark background: Air voxels (HU < -600) remain deep dark (#090d16 -> 10) on inversion.
 * - Non-linear gamma VOI transfer curve via `gamma`.
 */
export interface DenteContrastPreset {
	readonly id: string;
	readonly nameRu: string;
	readonly windowWidth: number;
	readonly windowLevel: number;
	readonly peakEnamel: number;
	readonly airCutoffHU: number;
	readonly description: string;
}

export const DENTE_CONTRAST_PRESETS: readonly DenteContrastPreset[] = [
	{
		id: "preset_1_soft",
		nameRu: "Preset 1 — Мягкий обзорный (Broad/Soft)",
		windowWidth: 3200,
		windowLevel: 600,
		peakEnamel: 195,
		airCutoffHU: -500,
		description: "W: 3200, L: 600, пик эмали ~195 (широкий диапазон, мягкая эмаль, видна вся градация каналов)",
	},
	{
		id: "preset_2_standard",
		nameRu: "Preset 2 — Канонический стандарт",
		windowWidth: 4025,
		windowLevel: 525,
		peakEnamel: 215,
		airCutoffHU: -500,
		description: "W: 4025, L: 525, пик эмали ~215 (канонический стандарт пользователя: W:4025, L:525, Gamma:1.50, Air:-500)",
	},
	{
		id: "preset_3_endo",
		nameRu: "Preset 3 — Трабекулярный / Эндо",
		windowWidth: 2600,
		windowLevel: 850,
		peakEnamel: 185,
		airCutoffHU: -500,
		description: "W: 2600, L: 850, пик эмали ~185 (фокус на губчатой кости и апексах, зубы темнее, каналы как на ладони)",
	},
	{
		id: "preset_4_hard_bone",
		nameRu: "Preset 4 — Высококонтрастный костный",
		windowWidth: 1400,
		windowLevel: 550,
		peakEnamel: 230,
		airCutoffHU: -500,
		description: "W: 1400, L: 550, пик эмали ~230 (резкая кортикальная пластинка, выразительный рельеф)",
	},
	{
		id: "preset_5_wide_dynamic",
		nameRu: "Preset 5 — Плотный динамический",
		windowWidth: 4000,
		windowLevel: 1000,
		peakEnamel: 200,
		airCutoffHU: -500,
		description: "W: 4000, L: 1000, пик эмали ~200 (расширенная динамика под имплантаты и металл, 0 ореолов)",
	},
] as const;

export interface ClinicalRadiologyPreset {
	readonly id: string;
	readonly label: string;
	readonly shortLabel: string;
	readonly windowWidth: number;
	readonly windowLevel: number;
	readonly slabThicknessMm: number;
	readonly slabMode: "single" | "average" | "mip";
	readonly panoThicknessMm: number;
	readonly panoProjectionMode: "ray_sum" | "average" | "single" | "mip";
	readonly descriptionRu: string;
	readonly testId: string;
}

export const CLINICAL_RADIOLOGY_PRESETS: readonly ClinicalRadiologyPreset[] = [
	{
		id: "standard",
		label: "Стандарт",
		shortLabel: "Стандарт",
		windowWidth: 4025,
		windowLevel: 525,
		slabThicknessMm: 1.0,
		slabMode: "single",
		panoThicknessMm: 1.0,
		panoProjectionMode: "average",
		descriptionRu: "Чистый канонический срез (1.0 мм), дентальный диапазон (W: 4025, L: 525, Gamma: 1.50, Air: -500 HU)",
		testId: "cbct-preset-standard",
	},
	{
		id: "ez3d_bone",
		label: "Ez3D-i Кость (5031/1039)",
		shortLabel: "Ez3D-i",
		windowWidth: 5031,
		windowLevel: 1039,
		slabThicknessMm: 0.5,
		slabMode: "single",
		panoThicknessMm: 1.0,
		panoProjectionMode: "average",
		descriptionRu: "Стоматологический стандарт Vatech Ez3D-i (МЕДИКОМ): W: 5031 HU, L: 1039 HU",
		testId: "cbct-preset-ez3d-bone",
	},
	{
		id: "bone",
		label: "Кость",
		shortLabel: "Кость",
		windowWidth: 2000,
		windowLevel: 550,
		slabThicknessMm: 0.0,
		slabMode: "single",
		panoThicknessMm: 2.0,
		panoProjectionMode: "ray_sum",
		descriptionRu: "Резкая кортикальная пластинка и трабекулы губчатой кости альвеолярного гребня",
		testId: "cbct-preset-bone",
	},
	{
		id: "endo",
		label: "Эндо / Каналы",
		shortLabel: "Эндо / Каналы",
		windowWidth: 2600,
		windowLevel: 850,
		slabThicknessMm: 0.0,
		slabMode: "single",
		panoThicknessMm: 2.0,
		panoProjectionMode: "ray_sum",
		descriptionRu: "Глубокая детализация корневых каналов, пульпарных камер, периодонтальной щели и апексов",
		testId: "cbct-preset-endo",
	},
	{
		id: "implant_soft",
		label: "Имплант / Мягкий",
		shortLabel: "Имплант / Мягкий",
		windowWidth: 3200,
		windowLevel: 600,
		slabThicknessMm: 2.0,
		slabMode: "average",
		panoThicknessMm: 3.0,
		panoProjectionMode: "average",
		descriptionRu: "Мягкий интеграл для позиционирования имплантатов, визуализации слизистой и гайморовых пазух",
		testId: "cbct-preset-implant-soft",
	},
] as const;

export interface SoftKneeConfig {
	readonly peakEnamel?: number;
	readonly airCutoffHU?: number;
	readonly enabled?: boolean;
}

export function generate16BitLut(
	windowWidth: number,
	windowLevel: number,
	invert = false,
	gamma = 1.0,
	softKnee: boolean | SoftKneeConfig = false,
): Uint8Array {
	const lut = new Uint8Array(65536);
	const safeWW = Math.max(1, windowWidth);
	const low = windowLevel - safeWW / 2.0;
	const high = windowLevel + safeWW / 2.0;
	const invWW = 1.0 / safeWW;

	const lowIdx = Math.max(0, Math.min(65536, Math.floor(low + 32768)));
	const highIdx = Math.max(0, Math.min(65536, Math.ceil(high + 32768)));

	// Air threshold for pitch black air background (-500 HU canonical standard)
	const hasAirCutoff = typeof softKnee === "object" && typeof softKnee?.airCutoffHU === "number"
		? true
		: (windowWidth === 4025 && windowLevel === 525);
	const airCutoff = typeof softKnee === "object" && typeof softKnee?.airCutoffHU === "number"
		? softKnee.airCutoffHU!
		: -500;
	const airThresholdIdx = Math.max(0, Math.min(65536, Math.floor(airCutoff + 32768)));

	// Clinical soft-knee compression: prevents blinding 255/255/255 whiteout for dense enamel/metal when requested
	const useSoftKnee = typeof softKnee === "object"
		? Boolean(softKnee.enabled ?? (softKnee.peakEnamel !== undefined))
		: Boolean(softKnee);
	const peakEnamel = typeof softKnee === "object" && typeof softKnee?.peakEnamel === "number"
		? softKnee.peakEnamel
		: 185;

	const bottomVal = invert ? 255 : 0;
	const topVal = invert ? (useSoftKnee ? Math.max(0, 255 - peakEnamel) : 0) : (useSoftKnee ? peakEnamel : 255);

	if (useSoftKnee) {
		// Calibrated clinical dental radiology soft-knee curve:
		// 1. Air background (HU <= airCutoff, default -100): pitch black (0,0,0), zero halo fog
		// 2. Bone range (HU 600..1200): strictly 90..115 (trabecular 90..96, cortical 105..115)
		// 3. Dentin range (HU 1300..2000): 115..155
		// 4. Enamel range (HU 2200..3500): smooth rational shoulder approaching peakEnamel (170..190)
		const trabecularBoneHU = 600;
		const trabecularIntensity = 92;
		const corticalBoneHU = 1200;
		const corticalIntensity = 114;
		const maxDelta = Math.max(1, peakEnamel - corticalIntensity);
		const k = 240; // Rational shoulder curvature

		const isGamma = gamma !== 1.0 && gamma > 0;
		const gammaPow = isGamma ? gamma * 1.15 : 1.2;

		for (let i = 0; i < 65536; i++) {
			const hu = i - 32768;
			if (hu <= airCutoff) {
				lut[i] = bottomVal;
				continue;
			}

			let val: number;
			if (hu <= trabecularBoneHU) {
				const t = Math.max(0, (hu - airCutoff) / (trabecularBoneHU - airCutoff));
				val = Math.round(Math.pow(t, gammaPow) * trabecularIntensity);
			} else if (hu <= corticalBoneHU) {
				const t = (hu - trabecularBoneHU) / (corticalBoneHU - trabecularBoneHU);
				val = Math.round(trabecularIntensity + t * (corticalIntensity - trabecularIntensity));
			} else {
				const deltaHU = hu - corticalBoneHU;
				const comp = maxDelta * (deltaHU / (deltaHU + k));
				val = Math.min(peakEnamel, Math.round(corticalIntensity + comp));
			}

			lut[i] = invert ? (255 - val) : val;
		}

		if (invert) {
			const darkAirThresholdIdx = Math.max(0, Math.min(65536, Math.floor(-600 + 32768)));
			for (let i = 0; i < darkAirThresholdIdx; i++) {
				lut[i] = 10;
			}
		}

		return lut;
	}

	// Standard linear DICOM Part 3 PS 3.3 VOI LUT Windowing (when softKnee === false)
	if (lowIdx > 0) {
		lut.fill(bottomVal, 0, lowIdx);
	}
	if (highIdx < 65536) {
		lut.fill(topVal, highIdx, 65536);
	}

	const isGamma = gamma !== 1.0 && gamma > 0;
	for (let i = lowIdx; i < highIdx; i++) {
		const hu = i - 32768;
		if (hasAirCutoff && hu <= airCutoff) {
			lut[i] = bottomVal;
			continue;
		}
		if (hu <= low) {
			lut[i] = bottomVal;
		} else if (hu >= high) {
			lut[i] = topVal;
		} else {
			const t = Math.max(0, Math.min(1.0, (hu - low) * invWW));
			const correctedT = isGamma ? Math.pow(t, gamma) : t;
			const val = Math.round(correctedT * 255);
			lut[i] = invert ? 255 - val : val;
		}
	}

	// Invert LUT: keep ambient air voxels (HU < -600) deep dark (#090d16) to eliminate white background blinding
	if (invert) {
		const darkAirThresholdIdx = Math.max(0, Math.min(65536, Math.floor(-600 + 32768)));
		for (let i = 0; i < darkAirThresholdIdx; i++) {
			lut[i] = 10;
		}
	}

	return lut;
}

const LUT_CACHE_MAX_SIZE = 64;
const lutCache = new Map<string, Uint8Array>();

/**
 * Retrieves a cached 65536-entry Uint8Array Look-Up Table (LUT) for instantaneous
 * (< 0.05 ms) Window/Level mapping without memory allocation churn.
 */
export function get16BitLut(
	windowWidth: number,
	windowLevel: number,
	invert = false,
	gamma = 1.0,
	softKnee: boolean | SoftKneeConfig = false,
): Uint8Array {
	const skKey = typeof softKnee === "object"
		? `${softKnee.enabled ? "1" : "0"}_${softKnee.peakEnamel ?? ""}_${softKnee.airCutoffHU ?? ""}`
		: (softKnee ? "1" : "0");
	const key = `${windowWidth}|${windowLevel}|${invert ? 1 : 0}|${gamma}|${skKey}`;
	let lut = lutCache.get(key);
	if (!lut) {
		lut = generate16BitLut(windowWidth, windowLevel, invert, gamma, softKnee);
		if (lutCache.size >= LUT_CACHE_MAX_SIZE) {
			const firstKey = lutCache.keys().next().value;
			if (firstKey !== undefined) {
				lutCache.delete(firstKey);
			}
		}
		lutCache.set(key, lut);
	}
	return lut;
}

/**
 * Clears the 16-bit Window/Level LUT cache.
 */
export function clearLutCache(): void {
	lutCache.clear();
}

/**
 * Applies a precomputed 16-bit LUT to a single Hounsfield Unit (HU) or raw voxel value.
 * Indexing: `(clamp(hu, -32768, 32767) + 32768) & 0xffff`.
 */
export function applyLutToHU(lut: Uint8Array, hu: number): number {
	const idx = (Math.max(-32768, Math.min(32767, Math.round(hu))) + 32768) & 0xffff;
	return lut[idx] ?? 0;
}

/**
 * Maps Hounsfield Unit (HU) to 8-bit grayscale intensity [0..255] via linear or gamma windowing.
 * Standards: DICOM Part 3 PS 3.3 (C.11.2.1.2 VOI LUT Windowing), Planmeca Romexis, Vatech Ez3D-i.
 * Uses cached 16-bit LUT for instantaneous sub-microsecond evaluation.
 *
 * Tissue HU Reference under WW 4400 / WL 1300:
 * - Air (-1000 HU) -> 0 (Black)
 * - Pulp / Nerve soft tissue (+50..200 HU) -> 55..64 (Dark gray / black)
 * - Trabecular Bone (+600..900 HU) -> 90..104 (Medium gray)
 * - Cortical Bone (+1300..1600 HU) -> 127..145 (Medium gray)
 * - Dentin (+1800..2500 HU) -> 156..197 (Light gray)
 * - Enamel (+3000..4000 HU) -> 226..255 (Bright white)
 */
export function huToGrayscale(
	hu: number,
	windowWidth: number,
	windowLevel: number,
	invert = false,
	gamma = 1.0,
): number {
	const lut = get16BitLut(windowWidth, windowLevel, invert, gamma);
	const idx = (Math.max(-32768, Math.min(32767, Math.round(hu))) + 32768) & 0xffff;
	return lut[idx] ?? 0;
}

// ─── 3. DOCTOR CBCT DEFAULT SETTINGS PERSISTENCE ────────────────────────────

export interface DoctorCbctDefaultSettings {
	readonly windowWidth: number;
	readonly windowLevel: number;
	readonly gamma: number;
	readonly airCutoffHU: number;
	readonly mprThicknessMm: number;
	readonly panoThicknessMm: number;
}

export const CANONICAL_CBCT_SETTINGS: DoctorCbctDefaultSettings = {
	windowWidth: 4025,
	windowLevel: 525,
	gamma: 1.50,
	airCutoffHU: -500,
	mprThicknessMm: 1.0,
	panoThicknessMm: 1.0,
};

export const DOCTOR_CBCT_SETTINGS_STORAGE_KEY = "dente_doctor_cbct_defaults_v1";

/**
 * Loads persisted doctor CBCT default settings from safeLocalStorage.
 * Falls back to canonical standards (W: 4025, L: 525, Gamma: 1.50, Air: -500, MPR: 1.0, Pano: 1.0).
 */
export function loadDoctorCbctSettings(): DoctorCbctDefaultSettings {
	if (typeof window === "undefined") {
		return CANONICAL_CBCT_SETTINGS;
	}
	try {
		const raw = window.localStorage?.getItem(DOCTOR_CBCT_SETTINGS_STORAGE_KEY);
		if (!raw) return CANONICAL_CBCT_SETTINGS;
		const parsed = JSON.parse(raw);
		return {
			windowWidth:
				typeof parsed.windowWidth === "number" && parsed.windowWidth >= 400 && parsed.windowWidth <= 6000
					? parsed.windowWidth
					: CANONICAL_CBCT_SETTINGS.windowWidth,
			windowLevel:
				typeof parsed.windowLevel === "number" && parsed.windowLevel >= -1000 && parsed.windowLevel <= 3000
					? parsed.windowLevel
					: CANONICAL_CBCT_SETTINGS.windowLevel,
			gamma:
				typeof parsed.gamma === "number" && parsed.gamma >= 0.2 && parsed.gamma <= 3.0
					? Number(parsed.gamma.toFixed(2))
					: CANONICAL_CBCT_SETTINGS.gamma,
			airCutoffHU:
				typeof parsed.airCutoffHU === "number" && parsed.airCutoffHU >= -1000 && parsed.airCutoffHU <= 0
					? parsed.airCutoffHU
					: CANONICAL_CBCT_SETTINGS.airCutoffHU,
			mprThicknessMm:
				typeof parsed.mprThicknessMm === "number" && parsed.mprThicknessMm >= 0 && parsed.mprThicknessMm <= 20
					? Number(parsed.mprThicknessMm.toFixed(1))
					: CANONICAL_CBCT_SETTINGS.mprThicknessMm,
			panoThicknessMm:
				typeof parsed.panoThicknessMm === "number" && parsed.panoThicknessMm >= 0.5 && parsed.panoThicknessMm <= 30
					? Number(parsed.panoThicknessMm.toFixed(1))
					: CANONICAL_CBCT_SETTINGS.panoThicknessMm,
		};
	} catch {
		return CANONICAL_CBCT_SETTINGS;
	}
}

/**
 * Saves doctor CBCT default settings to safeLocalStorage.
 * Dispatches a DOM event 'dente:cbct-defaults-updated' for reactive UI sync.
 */
export function saveDoctorCbctSettings(
	settings: Partial<DoctorCbctDefaultSettings>,
): DoctorCbctDefaultSettings {
	const current = loadDoctorCbctSettings();
	const merged: DoctorCbctDefaultSettings = {
		windowWidth:
			typeof settings.windowWidth === "number" && settings.windowWidth >= 400 && settings.windowWidth <= 6000
				? Math.round(settings.windowWidth)
				: current.windowWidth,
		windowLevel:
			typeof settings.windowLevel === "number" && settings.windowLevel >= -1000 && settings.windowLevel <= 3000
				? Math.round(settings.windowLevel)
				: current.windowLevel,
		gamma:
			typeof settings.gamma === "number" && settings.gamma >= 0.2 && settings.gamma <= 3.0
				? Number(settings.gamma.toFixed(2))
				: current.gamma,
		airCutoffHU:
			typeof settings.airCutoffHU === "number" && settings.airCutoffHU >= -1000 && settings.airCutoffHU <= 0
				? Math.round(settings.airCutoffHU)
				: current.airCutoffHU,
		mprThicknessMm:
			typeof settings.mprThicknessMm === "number" && settings.mprThicknessMm >= 0 && settings.mprThicknessMm <= 20
				? Number(settings.mprThicknessMm.toFixed(1))
				: current.mprThicknessMm,
		panoThicknessMm:
			typeof settings.panoThicknessMm === "number" && settings.panoThicknessMm >= 0.5 && settings.panoThicknessMm <= 30
				? Number(settings.panoThicknessMm.toFixed(1))
				: current.panoThicknessMm,
	};

	if (typeof window !== "undefined") {
		try {
			window.localStorage?.setItem(DOCTOR_CBCT_SETTINGS_STORAGE_KEY, JSON.stringify(merged));
			window.dispatchEvent(new CustomEvent("dente:cbct-defaults-updated", { detail: merged }));
		} catch {
			// ignore storage quota errors
		}
	}
	return merged;
}

/**
 * Resets doctor CBCT default settings back to canonical standard (4025 HU / 525 HU).
 */
export function resetDoctorCbctSettings(): DoctorCbctDefaultSettings {
	if (typeof window !== "undefined") {
		try {
			window.localStorage?.removeItem(DOCTOR_CBCT_SETTINGS_STORAGE_KEY);
			window.dispatchEvent(new CustomEvent("dente:cbct-defaults-updated", { detail: CANONICAL_CBCT_SETTINGS }));
		} catch {
			// ignore
		}
	}
	return CANONICAL_CBCT_SETTINGS;
}
