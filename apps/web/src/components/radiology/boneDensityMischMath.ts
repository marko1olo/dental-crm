/**
 * BONE DENSITY MISCH CLASSIFICATION & HU SAMPLING ENGINE
 *
 * Implements clinical Hounsfield Unit (HU) bone quality evaluation per Carl E. Misch (1990/2008):
 * - D1: > 1250 HU (Dense cortical bone, symphysis/anterior mandible)
 * - D2: 850..1250 HU (Porous cortical & dense trabecular, posterior mandible / anterior maxilla)
 * - D3: 350..850 HU (Thin porous cortical & fine trabecular, anterior/posterior maxilla)
 * - D4: 150..350 HU (Fine trabecular soft bone, posterior maxilla / tuberosity)
 * - D5: < 150 HU (Extremely soft bone / incomplete mineralization / severe graft remodeling)
 *
 * Provides:
 * 1. 3-Zone HU sampling (Coronal crest 20%, Trabecular core 60%, Apical engagement 20%).
 * 2. Specialized drilling sequence rules (Under-drilling for D4, Cortical Tap for D1).
 * 3. Primary stability ISQ prediction & immediate loading eligibility.
 * 4. Form 043/u surgery diary clinical text formatting.
 */

export type MischBoneClass = "D1" | "D2" | "D3" | "D4" | "D5";

export interface HUZoneSampling {
	readonly coronalCrestalHU: number; // Coronal 20% (Crestal cortical plate)
	readonly trabecularCoreHU: number; // Mid 60% (Cancellous bone core)
	readonly apicalBaseHU: number; // Apical 20% (Apical cortical engagement)
	readonly overallMeanHU: number; // Weighted average HU
}

export interface MischClassificationResult {
	readonly mischClass: MischBoneClass;
	readonly classNameRu: string;
	readonly anatomicalLocationRu: string;
	readonly tactileFeelRu: string;
	readonly vascularityLevel: "low" | "moderate" | "high" | "very_high";
	readonly recommendedDrillingRpm: string;
	readonly underdrillingRecommended: boolean;
	readonly underdrillingMm: number;
	readonly corticalTapRequired: boolean;
	readonly countersinkRequired: boolean;
	readonly estimatedInsertionTorqueNcm: {
		readonly minNcm: number;
		readonly maxNcm: number;
		readonly expectedNcm: number;
	};
	readonly estimatedIsqScore: {
		readonly minIsq: number;
		readonly maxIsq: number;
		readonly expectedIsq: number;
	};
	readonly isImmediateLoadingEligible: boolean;
	readonly healingPeriodWeeks: number;
	readonly clinicalAdvice: readonly string[];
}

export interface ImplantSiteDrillingStep {
	readonly stepNumber: number;
	readonly drillName: string;
	readonly diameterMm: number;
	readonly targetRpm: number;
	readonly maxRpm: number;
	readonly depthGuideRu: string;
	readonly isOptionalInSoftBone?: boolean;
	readonly isMandatoryInDenseBone?: boolean;
}

// ─── MISCH THRESHOLD CONSTANTS ───────────────────────────────────────────────

export const MISCH_HU_THRESHOLDS = {
	D1_MIN: 1250,
	D2_MIN: 850,
	D3_MIN: 350,
	D4_MIN: 150,
} as const;

/**
 * Classifies a raw Hounsfield Unit (HU) value into Misch bone category.
 */
export function classifyHUToMisch(hu: number): MischBoneClass {
	if (hu > MISCH_HU_THRESHOLDS.D1_MIN) return "D1";
	if (hu >= MISCH_HU_THRESHOLDS.D2_MIN) return "D2";
	if (hu >= MISCH_HU_THRESHOLDS.D3_MIN) return "D3";
	if (hu >= MISCH_HU_THRESHOLDS.D4_MIN) return "D4";
	return "D5";
}

/**
 * Computes 3-zone HU bone profile and weighted average.
 */
export function computeHUZoneProfile(
	coronalHU: number,
	trabecularHU: number,
	apicalHU: number,
): HUZoneSampling {
	// Weighted average: 25% coronal, 50% trabecular, 25% apical
	const overall = Math.round(coronalHU * 0.25 + trabecularHU * 0.5 + apicalHU * 0.25);
	return {
		coronalCrestalHU: Math.round(coronalHU),
		trabecularCoreHU: Math.round(trabecularHU),
		apicalBaseHU: Math.round(apicalHU),
		overallMeanHU: overall,
	};
}

/**
 * Performs comprehensive Misch bone quality analysis with surgical guidelines.
 */
export function analyzeMischBoneQuality(
	sampling: HUZoneSampling,
	implantDiameterMm = 4.0,
): MischClassificationResult {
	const mischClass = classifyHUToMisch(sampling.overallMeanHU);

	switch (mischClass) {
		case "D1":
			return {
				mischClass: "D1",
				classNameRu: "D1 (> 1250 HU) — Плотная кортикальная кость",
				anatomicalLocationRu: "Передний отдел нижней челюсти (межапикальная зона подбородка)",
				tactileFeelRu: "Ощущение сверления дубовой древесины или слоновой кости",
				vascularityLevel: "low",
				recommendedDrillingRpm: "400–600 RPM (пониженные обороты)",
				underdrillingRecommended: false,
				underdrillingMm: 0,
				corticalTapRequired: true,
				countersinkRequired: true,
				estimatedInsertionTorqueNcm: { minNcm: 45, maxNcm: 65, expectedNcm: 50 },
				estimatedIsqScore: { minIsq: 75, maxIsq: 85, expectedIsq: 80 },
				isImmediateLoadingEligible: true,
				healingPeriodWeeks: 12,
				clinicalAdvice: [
					"Обязательно использование кортикального метчика (Bone Tap) на всю длину имплантата во избежание микропереломов и заклинивания.",
					"Обильное охлаждение стерильным физраствором (4°C) на низких оборотах (400 RPM): критический риск термического остеонекроза!",
					"Увеличенное время остеоинтеграции (3-4 мес.) из-за низкой васкуляризации плотной пластинчатой кости.",
				],
			};

		case "D2":
			return {
				mischClass: "D2",
				classNameRu: "D2 (850–1250 HU) — Пористая кортикальная + плотная губчатая",
				anatomicalLocationRu: "Дистальные отделы н/ч, передний отдел в/ч",
				tactileFeelRu: "Ощущение сверления плотной древесины сосны",
				vascularityLevel: "moderate",
				recommendedDrillingRpm: "800–1000 RPM (стандартный протокол)",
				underdrillingRecommended: false,
				underdrillingMm: 0,
				corticalTapRequired: sampling.coronalCrestalHU > 1200,
				countersinkRequired: true,
				estimatedInsertionTorqueNcm: { minNcm: 35, maxNcm: 45, expectedNcm: 40 },
				estimatedIsqScore: { minIsq: 70, maxIsq: 80, expectedIsq: 75 },
				isImmediateLoadingEligible: true,
				healingPeriodWeeks: 10,
				clinicalAdvice: [
					"Золотой стандарт для дентальной имплантации: идеальный баланс механической фиксации и микрососудистого русла.",
					"Превосходный кандидат для немедленной функциональной нагрузки (Immediate Loading) при торке >= 35 Н·см.",
					"Стандартный хирургический протокол производителя без модификаций диаметра сверления.",
				],
			};

		case "D3":
			return {
				mischClass: "D3",
				classNameRu: "D3 (350–850 HU) — Тонкая кортикальная + мелкопористая губчатая",
				anatomicalLocationRu: "Передний и боковой отделы верхней челюсти, дистальный отдел н/ч",
				tactileFeelRu: "Ощущение сверления прессованной фанеры или бальсового дерева",
				vascularityLevel: "high",
				recommendedDrillingRpm: "1000–1200 RPM",
				underdrillingRecommended: false,
				underdrillingMm: 0,
				corticalTapRequired: false,
				countersinkRequired: false,
				estimatedInsertionTorqueNcm: { minNcm: 25, maxNcm: 35, expectedNcm: 30 },
				estimatedIsqScore: { minIsq: 62, maxIsq: 72, expectedIsq: 67 },
				isImmediateLoadingEligible: false,
				healingPeriodWeeks: 12,
				clinicalAdvice: [
					"Рекомендуется щадящее сверление без кортикального метчика.",
					"Высокая васкуляризация обеспечивает быструю биологическую остеоинтеграцию (8-12 недель).",
					"При торке < 30 Н·см предпочтителен двухэтапный протокол с установкой формирователя через 3 мес.",
				],
			};

		case "D4":
			return {
				mischClass: "D4",
				classNameRu: "D4 (150–350 HU) — Мягкая губчатая кость",
				anatomicalLocationRu: "Бугор верхней челюсти, область синуса после аугментации",
				tactileFeelRu: "Ощущение сверления пенопласта или прессованного сахара",
				vascularityLevel: "very_high",
				recommendedDrillingRpm: "600–800 RPM (с конденсацией кости)",
				underdrillingRecommended: true,
				underdrillingMm: implantDiameterMm >= 4.0 ? 0.8 : 0.5,
				corticalTapRequired: false,
				countersinkRequired: false,
				estimatedInsertionTorqueNcm: { minNcm: 15, maxNcm: 25, expectedNcm: 20 },
				estimatedIsqScore: { minIsq: 50, maxIsq: 62, expectedIsq: 56 },
				isImmediateLoadingEligible: false,
				healingPeriodWeeks: 16,
				clinicalAdvice: [
					"Недопрепарирование (Under-Drilling): завершайте сверление на 1-2 шага меньше номинального диаметра имплантата.",
					"Рекомендуется применение костных остеотомов (Bone Condensation) для радиального уплотнения трабекулярного рисунка.",
					"Немедленная нагрузка строго противопоказана (двухэтапный протокол с заглушкой, заживление 4–6 месяцев).",
				],
			};

		case "D5":
		default:
			return {
				mischClass: "D5",
				classNameRu: "D5 (< 150 HU) — Экстремально мягкая кость / выраженный дефицит",
				anatomicalLocationRu: "Постэкстракционная лунка в фазе ранней регенерации, выраженная атрофия",
				tactileFeelRu: "Отсутствие механического сопротивления",
				vascularityLevel: "very_high",
				recommendedDrillingRpm: "400–600 RPM (пилотное сверление + остеотомы)",
				underdrillingRecommended: true,
				underdrillingMm: 1.2,
				corticalTapRequired: false,
				countersinkRequired: false,
				estimatedInsertionTorqueNcm: { minNcm: 10, maxNcm: 20, expectedNcm: 15 },
				estimatedIsqScore: { minIsq: 40, maxIsq: 52, expectedIsq: 46 },
				isImmediateLoadingEligible: false,
				healingPeriodWeeks: 24,
				clinicalAdvice: [
					"Необходима предварительная костная пластика (GBR/НКР) или применение имплантатов с прогрессивным шагом резьбы (BLX / NobelActive).",
					"Обязательно бикортикальное зацепление апекса для достижения минимальной стабильности.",
				],
			};
	}
}

export const classifyMischBoneQuality = analyzeMischBoneQuality;

/**
 * Builds tailored step-by-step drilling protocol tailored to bone density.
 */

export function generateMischDrillSequence(
	mischClassOrResult: MischBoneClass | MischClassificationResult,
	targetDiameterMm: number,
	targetLengthMm = 10.0,
): readonly ImplantSiteDrillingStep[] {
	const cls = typeof mischClassOrResult === "string" ? mischClassOrResult : mischClassOrResult.mischClass;
	const steps: ImplantSiteDrillingStep[] = [
		{
			stepNumber: 1,
			drillName: "Маркировочный шаровидный бор Ø2.0 мм",
			diameterMm: 2.0,
			targetRpm: 1200,
			maxRpm: 1500,
			depthGuideRu: "Перфорация кортикального слоя гребня в точке входа",
		},
		{
			stepNumber: 2,
			drillName: "Пилотное сверло Ø2.2 мм с лазерными метками глубины",
			diameterMm: 2.2,
			targetRpm: 1000,
			maxRpm: 1200,
			depthGuideRu: "Формирование ложа на полную длину " + targetLengthMm.toFixed(1) + " мм с контролем оси",
		},
	];

	if (targetDiameterMm >= 3.5) {
		steps.push({
			stepNumber: steps.length + 1,
			drillName: "Формирующее сверло Ø2.8 мм",
			diameterMm: 2.8,
			targetRpm: 800,
			maxRpm: 1000,
			depthGuideRu: "Расширение ложа на длину " + targetLengthMm.toFixed(1) + " мм",
		});
	}

	if (targetDiameterMm >= 4.0 && (cls !== "D4" && cls !== "D5")) {
		steps.push({
			stepNumber: steps.length + 1,
			drillName: "Формирующее сверло Ø3.5 мм",
			diameterMm: 3.5,
			targetRpm: 800,
			maxRpm: 900,
			depthGuideRu: "Расширение ложа (пропускается при D4 для недопрепарирования)",
			isOptionalInSoftBone: true,
		});
	}

	if (targetDiameterMm >= 4.5 && (cls === "D1" || cls === "D2")) {
		steps.push({
			stepNumber: steps.length + 1,
			drillName: "Формирующее сверло Ø4.0/4.2 мм",
			diameterMm: 4.2,
			targetRpm: 600,
			maxRpm: 800,
			depthGuideRu: "Финишное сверление для имплантатов Ø4.5–5.0 мм",
		});
	}

	if (cls === "D1") {
		steps.push({
			stepNumber: steps.length + 1,
			drillName: "Кортикальный метчик (Bone Tap) Ø" + targetDiameterMm.toFixed(1) + " мм",
			diameterMm: targetDiameterMm,
			targetRpm: 25,
			maxRpm: 50,
			depthGuideRu: "Обязательное нарезание резьбы в плотной кости D1 при 25–30 Н·см",
			isMandatoryInDenseBone: true,
		});
	}

	return steps;
}

/**
 * Formats a structured Misch bone analysis into text for clinical diary.
 */
export function formatMischProtocolToDiaryText(
	sampling: HUZoneSampling,
	analysis: MischClassificationResult,
	fdiTooth?: string | number,
): string {
	const toothPrefix = fdiTooth ? "Зуб FDI #" + fdiTooth + " | " : "";
	const lines = [
		toothPrefix + "ОЦЕНКА ПЛОТНОСТИ КОСТНОЙ ТКАНИ (КЛКТ / ХАУНСФИЛД):",
		"- Класс по Misch: " + analysis.classNameRu,
		"- Кортикальный гребень (Coronal 20%): " + sampling.coronalCrestalHU + " HU",
		"- Губчатый слой (Trabecular Core): " + sampling.trabecularCoreHU + " HU",
		"- Апикальная зона (Apical 20%): " + sampling.apicalBaseHU + " HU",
		"- Средняя плотность ложа: " + sampling.overallMeanHU + " HU",
		"- Режим сверления: " + analysis.recommendedDrillingRpm,
		"- Прогноз торка фиксации: " + analysis.estimatedInsertionTorqueNcm.expectedNcm + " Н·см (ISQ ~" + analysis.estimatedIsqScore.expectedIsq + ")",
		"- Сроки остеоинтеграции: " + analysis.healingPeriodWeeks + " недель",
		analysis.underdrillingRecommended
			? "- Применен протокол недопрепарирования (Under-drilling -" + analysis.underdrillingMm + " мм)"
			: analysis.corticalTapRequired
				? "- Применен кортикальный метчик (Bone Tap) для кости D1"
				: "- Стандартный протокол сверления",
	];

	return lines.join("\n");
}


