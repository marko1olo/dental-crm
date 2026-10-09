/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL CBCT BONE QUALITY ENGINE — DENSITY CLASSIFIER (LAYER 1)
 * ═══════════════════════════════════════════════════════════════════════════
 * Pure classification algorithms for Carl E. Misch density scale (D1..D5),
 * extended density profiles, Hounsfield Unit / Gray Value ranges, and
 * descriptive clinical summaries.
 *
 * 100% pure TypeScript, zero side effects.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type {
	MischBoneClass,
	MischClass,
	ExtendedMischClass,
	MischBoneAssessment,
	MischBoneConfig,
	MischDensityProfile,
	MischGuidance,
} from "./types.js";
import {
	MISCH_BONE_CONFIGS,
	MISCH_BONE_PROFILES,
	MISCH_CLINICAL_GUIDANCE,
} from "./constants.js";

/**
 * Classifies CT Hounsfield Units (HU) or CBCT Gray Values (GV) into Carl Misch classes.
 *
 * Range bounds:
 *   D1: > 1250 HU
 *   D2: 850..1250 HU
 *   D3: 350..<850 HU
 *   D4: 150..<350 HU
 *   D5: < 150 HU
 */
export function classifyMischBone(hu: number): MischBoneClass {
	if (hu > 1250) return "D1";
	if (hu >= 850) return "D2";
	if (hu >= 350) return "D3";
	if (hu >= 150) return "D4";
	return "D5";
}

export const classifyBone = classifyMischBone;

/**
 * Classify bone density per Misch classification from averaged HU (classical 4-class scale).
 */
export function classifyMisch(avgHU: number): MischClass {
	if (avgHU > 1250) return "D1";
	if (avgHU >= 850) return "D2";
	if (avgHU >= 350) return "D3";
	return "D4";
}

/**
 * Extended bone density classification supporting D5 (<150 HU) with clinical recommendation.
 */
export function classifyExtendedBoneDensity(hu: number): {
	mischClass: ExtendedMischClass;
	label: string;
	drillingRecommendation: string;
} {
	if (hu > 1250) {
		return {
			mischClass: "D1",
			label: "D1 (>1250 HU) — Плотная кортикальная кость",
			drillingRecommendation:
				"Обязательна кортикальная фреза (Cortical Tap), низкие обороты (400–600 RPM) с обильным охлаждением. Высокий риск перегрева/остеонекроза!",
		};
	}
	if (hu >= 850) {
		return {
			mischClass: "D2",
			label: "D2 (850–1250 HU) — Пористая кортикальная и плотная губчатая",
			drillingRecommendation:
				"Стандартный хирургический протокол (800–1000 RPM). Идеальная первичная стабильность.",
		};
	}
	if (hu >= 350) {
		return {
			mischClass: "D3",
			label: "D3 (350–850 HU) — Тонкая кортикальная и мелкая губчатая",
			drillingRecommendation:
				"Стандартный протокол с финишным профильным сверлом (1000 RPM). Хороший прогноз остеоинтеграции.",
		};
	}
	if (hu >= 150) {
		return {
			mischClass: "D4",
			label: "D4 (150–350 HU) — Мягкая губчатая кость",
			drillingRecommendation:
				"Недопрепарирование (Under-drilling) на 1.0–1.5 мм меньше диаметра имплантата для компрессии кости и набора торка.",
		};
	}
	return {
		mischClass: "D5",
		label: "D5 (<150 HU) — Сверхмягкая / резорбированная кость",
		drillingRecommendation:
			"Критическое недопрепарирование (Under-drilling) на 1.5–2.0 мм, костная конденсация остеотомами или бикортикальная фиксация.",
	};
}

/**
 * Classifies raw CBCT Gray Value into full MischBoneAssessment record.
 */
export function classifyMischBoneDensity(gv: number): MischBoneAssessment {
	let mischClass: MischBoneClass;

	if (gv > 1250) {
		mischClass = "D1";
	} else if (gv >= 850) {
		mischClass = "D2";
	} else if (gv >= 350) {
		mischClass = "D3";
	} else if (gv >= 150) {
		mischClass = "D4";
	} else {
		mischClass = "D5";
	}

	const config = MISCH_BONE_CONFIGS[mischClass];
	return {
		...config,
		measuredGv: Number(gv.toFixed(1)),
	};
}

export function getMischClassConfig(mischClass: MischBoneClass): MischBoneConfig {
	return MISCH_BONE_CONFIGS[mischClass];
}

export function getMischProfile(huOrClass: number | MischBoneClass): MischDensityProfile {
	const boneClass = typeof huOrClass === "number" ? classifyMischBone(huOrClass) : huOrClass;
	return MISCH_BONE_PROFILES[boneClass];
}

export function getMischBoneClinicalGuidance(
	boneClass: MischBoneClass,
): MischGuidance {
	return MISCH_CLINICAL_GUIDANCE[boneClass];
}

/**
 * Human-readable summary for a Misch class.
 */
export function mischDescription(cls: MischClass): string {
	switch (cls) {
		case "D1":
			return "D1 — Очень плотная (>1250 HU): кортикальная, трудно сверлить";
		case "D2":
			return "D2 — Плотная (850–1250 HU): идеальна для имплантации";
		case "D3":
			return "D3 — Средняя (350–850 HU): приемлема, хороший прогноз";
		case "D4":
		default:
			return "D4 — Мягкая (150–350 HU): риск нестабильности, недопрепарирование";
	}
}
