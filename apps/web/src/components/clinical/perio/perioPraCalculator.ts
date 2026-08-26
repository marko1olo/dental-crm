/**
 * DENTE Dental CRM — Lang & Tonetti Periodontal Risk Assessment (PRA) Engine
 *
 * Implements:
 * 1. Lang & Tonetti (2003) 6-Vector Periodontal Risk Assessment (PRA):
 *    - Vector 1: BOP % (Bleeding on Probing percentage)
 *    - Vector 2: Residual deep pockets (PPD >= 5mm site count)
 *    - Vector 3: Tooth loss (Missing teeth count out of 28/32)
 *    - Vector 4: Radiographic Bone Loss / Age ratio (BL/Age)
 *    - Vector 5: Systemic & Genetic condition (Diabetes mellitus / HbA1c)
 *    - Vector 6: Environmental condition (Smoking / Cigarettes per day)
 * 2. Overall Periodontal Risk Classification (Low / Moderate / High)
 * 3. Clinical SPT (Supportive Periodontal Therapy) Recall Interval (3..12 months)
 * 4. SVG Spider / Radar Geometry calculations for interactive polygon visualization
 * 5. Comprehensive clinical PRA summary reporting
 */

import {
	calculateClinicalAttachmentLevel,
	type PerioChartSummary,
	type PerioToothRecord,
} from "@dental/shared";
import { calculateFullMouth6PointMetrics, type FullMouth6PointMetrics } from "./perio6PointMath";

export type PraRiskLevel = "low" | "moderate" | "high";

export type SmokingCategory = "non_smoker" | "light" | "heavy";
export type DiabetesCategory = "none" | "controlled" | "uncontrolled";

export interface PraCalculationInput {
	readonly teeth: readonly PerioToothRecord[];
	readonly summary?: PerioChartSummary | FullMouth6PointMetrics | undefined;
	readonly patientAgeYears?: number | undefined;
	readonly radiographicBoneLossPercent?: number | undefined;
	readonly smokingStatus?: SmokingCategory | undefined;
	readonly diabetesStatus?: DiabetesCategory | undefined;
	readonly cigarettesPerDay?: number | undefined;
	readonly hbA1cPercent?: number | undefined;
}

export interface PraVectorCalculation {
	readonly vectorKey: "bop" | "deepPockets" | "toothLoss" | "boneLossAgeRatio" | "systemicDiabetes" | "environmentalSmoking";
	readonly nameRu: string;
	readonly shortName: string;
	readonly valueDisplay: string;
	readonly numericValue: number;
	readonly riskLevel: PraRiskLevel;
	readonly thresholdDescriptionRu: string;
	readonly scoreNormalized: number; // 0.0 .. 1.0 (for radar chart radial positioning)
	readonly clinicalAdviceRu: string;
}

export interface RadarPoint {
	readonly x: number;
	readonly y: number;
	readonly angleRad: number;
	readonly radiusPx: number;
}

export interface PraDetailedSpiderResult {
	readonly overallRisk: PraRiskLevel;
	readonly overallRiskLabelRu: string;
	readonly overallPrognosisRu: string;
	readonly recommendedRecallIntervalMonths: number;
	readonly recommendedRecallDescriptionRu: string;
	readonly highRiskVectorsCount: number;
	readonly moderateRiskVectorsCount: number;
	readonly lowRiskVectorsCount: number;
	readonly calculatedBoneLossPercent: number;
	readonly calculatedAgeYears: number;
	readonly calculatedBlAgeRatio: number;
	readonly vectors: {
		readonly bop: PraVectorCalculation;
		readonly deepPockets: PraVectorCalculation;
		readonly toothLoss: PraVectorCalculation;
		readonly boneLossAgeRatio: PraVectorCalculation;
		readonly systemicDiabetes: PraVectorCalculation;
		readonly environmentalSmoking: PraVectorCalculation;
	};
	readonly radarPolygonPoints: string;
	readonly radarCoordinates: readonly RadarPoint[];
	readonly zonePolygonRings: {
		readonly lowZonePoints: string;
		readonly moderateZonePoints: string;
		readonly highZonePoints: string;
	};
}

/**
 * Calculates Bone Loss / Age ratio (BL/Age) according to AAP/EFP 2018 Grading:
 * - Grade A (< 0.5): Slow rate of progression
 * - Grade B (0.5 - 1.0): Moderate rate of progression
 * - Grade C (> 1.0): Rapid rate of progression
 */
export function calculateBoneLossAgeRatio(
	boneLossPercent: number,
	patientAgeYears: number,
): number {
	const safeAge = Math.max(18, Math.min(120, patientAgeYears));
	const safeLoss = Math.max(0, Math.min(100, boneLossPercent));
	const ratio = safeLoss / safeAge;
	return Math.round(ratio * 100) / 100;
}

/**
 * Derives default radiographic bone loss percentage from worst CAL if not explicitly measured.
 * Assumes standard anatomical root length ~12mm (1mm CAL ~ 8.3% bone loss).
 */
export function estimateBoneLossPercentFromTeeth(
	teeth: readonly PerioToothRecord[],
	maxCalMm?: number,
): number {
	if (typeof maxCalMm === "number" && maxCalMm >= 0) {
		return Math.min(95, Math.max(0, Math.round((maxCalMm / 12) * 100)));
	}

	let maxCal = 0;
	for (const tooth of teeth) {
		if (tooth.isMissing) continue;
		const sites = [
			tooth.distoBuccal,
			tooth.midBuccal,
			tooth.mesioBuccal,
			tooth.distoLingual,
			tooth.midLingual,
			tooth.mesioLingual,
		];
		for (const s of sites) {
			const cal = calculateClinicalAttachmentLevel(s.probingDepthMm, s.gingivalMarginMm);
			if (cal > maxCal) maxCal = cal;
		}
	}
	return Math.min(95, Math.max(0, Math.round((maxCal / 12) * 100)));
}

/**
 * Maps smoking inputs (status or exact cigs/day) into canonical categories.
 */
export function resolveSmokingCategory(
	status?: SmokingCategory,
	cigsPerDay?: number,
): { category: SmokingCategory; display: string; count: number } {
	if (typeof cigsPerDay === "number" && cigsPerDay >= 0) {
		if (cigsPerDay === 0) {
			return { category: "non_smoker", display: "Не курит (0 сиг/день)", count: 0 };
		}
		if (cigsPerDay <= 10) {
			return {
				category: "light",
				display: `Легкое курение (${cigsPerDay} сиг/день)`,
				count: cigsPerDay,
			};
		}
		return {
			category: "heavy",
			display: `Тяжелое курение (${cigsPerDay} сиг/день)`,
			count: cigsPerDay,
		};
	}

	if (status === "heavy") {
		return { category: "heavy", display: "Курение > 10 сигарет/день", count: 20 };
	}
	if (status === "light") {
		return { category: "light", display: "Курение ≤ 10 сигарет/день", count: 5 };
	}
	return { category: "non_smoker", display: "Не курит", count: 0 };
}

/**
 * Maps diabetes inputs (status or HbA1c %) into canonical categories.
 */
export function resolveDiabetesCategory(
	status?: DiabetesCategory,
	hbA1c?: number,
): { category: DiabetesCategory; display: string; hbA1cVal?: number } {
	if (typeof hbA1c === "number" && hbA1c > 0) {
		if (hbA1c < 6.0) {
			return { category: "none", display: `Норма (HbA1c ${hbA1c}%)`, hbA1cVal: hbA1c };
		}
		if (hbA1c <= 7.0) {
			return {
				category: "controlled",
				display: `СД компенсированный (HbA1c ${hbA1c}%)`,
				hbA1cVal: hbA1c,
			};
		}
		return {
			category: "uncontrolled",
			display: `СД декомпенсированный (HbA1c ${hbA1c}%)`,
			hbA1cVal: hbA1c,
		};
	}

	if (status === "uncontrolled") {
		return { category: "uncontrolled", display: "СД декомпенсированный (HbA1c > 7.0%)" };
	}
	if (status === "controlled") {
		return { category: "controlled", display: "СД компенсированный (HbA1c 6.0-7.0%)" };
	}
	return { category: "none", display: "Нет диабета (норма)" };
}

/**
 * Executes Lang & Tonetti (2003) 6-Vector Periodontal Risk Assessment (PRA).
 */
export function calculateDetailedPra(input: PraCalculationInput): PraDetailedSpiderResult {
	const metrics = calculateFullMouth6PointMetrics(input.teeth);
	const missingTeethCount = metrics.missingTeethCount;
	const age = input.patientAgeYears ?? 45;
	const boneLoss =
		input.radiographicBoneLossPercent ??
		estimateBoneLossPercentFromTeeth(input.teeth, metrics.maxCalMm);
	const blAgeRatio = calculateBoneLossAgeRatio(boneLoss, age);

	const smokingResolved = resolveSmokingCategory(input.smokingStatus, input.cigarettesPerDay);
	const diabetesResolved = resolveDiabetesCategory(input.diabetesStatus, input.hbA1cPercent);

	// 1. Vector: Bleeding on Probing (BOP %)
	// Low: <= 9% (score 0.1 .. 0.33)
	// Moderate: 10% - 25% (score 0.34 .. 0.66)
	// High: > 25% (score 0.67 .. 1.0)
	const bopVal = metrics.bopPercent;
	let bopRisk: PraRiskLevel = "low";
	let bopScore = 0.2;
	let bopAdvice = "Воспаление десны под контролем, поддерживать уровень гигиены.";

	if (bopVal > 25) {
		bopRisk = "high";
		bopScore = Math.min(1.0, 0.67 + ((bopVal - 25) / 75) * 0.33);
		bopAdvice = "Высокая активность биопленки: показана комплексная гигиена и антисептическая обработка.";
	} else if (bopVal >= 10) {
		bopRisk = "moderate";
		bopScore = 0.34 + ((bopVal - 10) / 15) * 0.32;
		bopAdvice = "Локальное воспаление: усилить межзубную гигиену (ёршики/нить).";
	} else {
		bopScore = Math.max(0.1, (bopVal / 10) * 0.33);
	}

	const vectorBop: PraVectorCalculation = {
		vectorKey: "bop",
		nameRu: "Кровоточивость десны (BOP %)",
		shortName: "BOP %",
		valueDisplay: `${bopVal}%`,
		numericValue: bopVal,
		riskLevel: bopRisk,
		thresholdDescriptionRu: "Низкий: ≤ 9% | Средний: 10–25% | Высокий: > 25%",
		scoreNormalized: bopScore,
		clinicalAdviceRu: bopAdvice,
	};

	// 2. Vector: Residual Deep Pockets (PD >= 5 mm)
	// Low: <= 4 sites (score 0.1 .. 0.33)
	// Moderate: 5 - 8 sites (score 0.34 .. 0.66)
	// High: >= 9 sites (score 0.67 .. 1.0)
	const deepPocketsCount = metrics.deepPocketsCount;
	let pocketsRisk: PraRiskLevel = "low";
	let pocketsScore = 0.2;
	let pocketsAdvice = "Патологических глубоких карманов мало, риск деструкции минимален.";

	if (deepPocketsCount >= 9) {
		pocketsRisk = "high";
		pocketsScore = Math.min(1.0, 0.67 + Math.min(1, (deepPocketsCount - 9) / 15) * 0.33);
		pocketsAdvice = "Множественные глубокие карманы: показан поддесневой скейлинг (SRP) и вектор-терапия.";
	} else if (deepPocketsCount >= 5) {
		pocketsRisk = "moderate";
		pocketsScore = 0.34 + ((deepPocketsCount - 5) / 4) * 0.32;
		pocketsAdvice = "Очаговые карманы: требуется локальный кюретаж и мониторинг.";
	} else {
		pocketsScore = Math.max(0.1, (deepPocketsCount / 4) * 0.33);
	}

	const vectorDeepPockets: PraVectorCalculation = {
		vectorKey: "deepPockets",
		nameRu: "Глубокие карманы (PD ≥ 5 мм)",
		shortName: "Карманы ≥ 5мм",
		valueDisplay: `${deepPocketsCount} уч.`,
		numericValue: deepPocketsCount,
		riskLevel: pocketsRisk,
		thresholdDescriptionRu: "Низкий: ≤ 4 | Средний: 5–8 | Высокий: ≥ 9 участков",
		scoreNormalized: pocketsScore,
		clinicalAdviceRu: pocketsAdvice,
	};

	// 3. Vector: Tooth Loss (Missing teeth count)
	// Low: <= 4 teeth (score 0.1 .. 0.33)
	// Moderate: 5 - 8 teeth (score 0.34 .. 0.66)
	// High: > 8 teeth (score 0.67 .. 1.0)
	let toothLossRisk: PraRiskLevel = "low";
	let toothLossScore = 0.2;
	let toothLossAdvice = "Зубной ряд сохранен, окклюзионная нагрузка сбалансирована.";

	if (missingTeethCount > 8) {
		toothLossRisk = "high";
		toothLossScore = Math.min(1.0, 0.67 + Math.min(1, (missingTeethCount - 8) / 16) * 0.33);
		toothLossAdvice = "Выраженная вторичная адентия: перегрузка оставшихся зубов, показано ортопедическое протезирование.";
	} else if (missingTeethCount >= 5) {
		toothLossRisk = "moderate";
		toothLossScore = 0.34 + ((missingTeethCount - 5) / 4) * 0.32;
		toothLossAdvice = "Частичная потеря зубов: спланировать замещение дефектов для защиты пародонта.";
	} else {
		toothLossScore = Math.max(0.1, (missingTeethCount / 4) * 0.33);
	}

	const vectorToothLoss: PraVectorCalculation = {
		vectorKey: "toothLoss",
		nameRu: "Потеря зубов (Адентия)",
		shortName: "Потеря зубов",
		valueDisplay: `${missingTeethCount} шт.`,
		numericValue: missingTeethCount,
		riskLevel: toothLossRisk,
		thresholdDescriptionRu: "Низкий: ≤ 4 | Средний: 5–8 | Высокий: > 8 зубов",
		scoreNormalized: toothLossScore,
		clinicalAdviceRu: toothLossAdvice,
	};

	// 4. Vector: Bone Loss / Age ratio (BL/Age)
	// Low: < 0.5 (Grade A)
	// Moderate: 0.5 - 1.0 (Grade B)
	// High: > 1.0 (Grade C)
	let blAgeRisk: PraRiskLevel = "low";
	let blAgeScore = 0.2;
	let blAgeAdvice = "Скорость костной резорбции низкая (Grade A: возрастная норма).";

	if (blAgeRatio > 1.0) {
		blAgeRisk = "high";
		blAgeScore = Math.min(1.0, 0.67 + Math.min(1, (blAgeRatio - 1.0) / 1.0) * 0.33);
		blAgeAdvice = "Быстропрогрессирующая потеря костной ткани (Grade C): агрессивный характер деструкции.";
	} else if (blAgeRatio >= 0.5) {
		blAgeRisk = "moderate";
		blAgeScore = 0.34 + ((blAgeRatio - 0.5) / 0.5) * 0.32;
		blAgeAdvice = "Умеренная скорость деструкции (Grade B): регулярный рентгенологический контроль.";
	} else {
		blAgeScore = Math.max(0.1, (blAgeRatio / 0.5) * 0.33);
	}

	const vectorBlAge: PraVectorCalculation = {
		vectorKey: "boneLossAgeRatio",
		nameRu: "Костная резорбция / Возраст (BL/Age)",
		shortName: "BL / Возраст",
		valueDisplay: `${blAgeRatio} (${boneLoss}% / ${age}л)`,
		numericValue: blAgeRatio,
		riskLevel: blAgeRisk,
		thresholdDescriptionRu: "Низкий: < 0.5 | Средний: 0.5–1.0 | Высокий: > 1.0 (AAP 2018)",
		scoreNormalized: blAgeScore,
		clinicalAdviceRu: blAgeAdvice,
	};

	// 5. Vector: Systemic & Genetic condition (Diabetes / HbA1c)
	let diabetesRisk: PraRiskLevel = "low";
	let diabetesScore = 0.2;
	let diabetesAdvice = "Системный метаболический фактор риска отсутствует.";

	if (diabetesResolved.category === "uncontrolled") {
		diabetesRisk = "high";
		diabetesScore = 0.88;
		diabetesAdvice = "Декомпенсация диабета резко снижает местный иммунитет: консультация эндокринолога обязательна.";
	} else if (diabetesResolved.category === "controlled") {
		diabetesRisk = "moderate";
		diabetesScore = 0.52;
		diabetesAdvice = "Компенсированный диабет требует строгого контроля гликемии и сокращения интервалов гигиены.";
	}

	const vectorDiabetes: PraVectorCalculation = {
		vectorKey: "systemicDiabetes",
		nameRu: "Системный фактор (Сахарный диабет)",
		shortName: "Диабет (HbA1c)",
		valueDisplay: diabetesResolved.display,
		numericValue:
			diabetesResolved.category === "uncontrolled" ? 2 : diabetesResolved.category === "controlled" ? 1 : 0,
		riskLevel: diabetesRisk,
		thresholdDescriptionRu: "Низкий: Нет | Средний: HbA1c 6.0–7.0% | Высокий: HbA1c > 7.0%",
		scoreNormalized: diabetesScore,
		clinicalAdviceRu: diabetesAdvice,
	};

	// 6. Vector: Environmental factor (Smoking / Tobacco)
	let smokingRisk: PraRiskLevel = "low";
	let smokingScore = 0.2;
	let smokingAdvice = "Пациент не курит: микроциркуляция в пародонте не нарушена.";

	if (smokingResolved.category === "heavy") {
		smokingRisk = "high";
		smokingScore = 0.88;
		smokingAdvice = "Интенсивное курение подавляет регенерацию и маскирует кровоточивость: рекомендовать отказ от табака.";
	} else if (smokingResolved.category === "light") {
		smokingRisk = "moderate";
		smokingScore = 0.52;
		smokingAdvice = "Умеренное курение увеличивает риск рецидива пародонтита: мотивировать на снижение дозы.";
	}

	const vectorSmoking: PraVectorCalculation = {
		vectorKey: "environmentalSmoking",
		nameRu: "Фактор среды (Табакокурение)",
		shortName: "Курение",
		valueDisplay: smokingResolved.display,
		numericValue:
			smokingResolved.category === "heavy" ? 2 : smokingResolved.category === "light" ? 1 : 0,
		riskLevel: smokingRisk,
		thresholdDescriptionRu: "Низкий: Не курит | Средний: ≤ 10 сиг/день | Высокий: > 10 сиг/день",
		scoreNormalized: smokingScore,
		clinicalAdviceRu: smokingAdvice,
	};

	const allVectors = [
		vectorBop,
		vectorDeepPockets,
		vectorToothLoss,
		vectorBlAge,
		vectorDiabetes,
		vectorSmoking,
	];

	let highCount = 0;
	let moderateCount = 0;
	let lowCount = 0;

	for (const v of allVectors) {
		if (v.riskLevel === "high") highCount++;
		else if (v.riskLevel === "moderate") moderateCount++;
		else lowCount++;
	}

	// Lang & Tonetti (2003) Decision Matrix:
	// - Low Risk: all low OR at most 1 moderate (0 high)
	// - Moderate Risk: >= 2 moderate AND <= 1 high
	// - High Risk: >= 2 high
	let overallRisk: PraRiskLevel = "low";
	let overallRiskLabelRu = "Низкий риск пародонтальной деструкции";
	let overallPrognosisRu = "Благоприятный долгосрочный прогноз. Высокая стабильность пародонта.";
	let recallMonths = 12;
	let recallDescriptionRu = "Поддерживающая пародонтальная терапия (SPT) 1 раз в 12 месяцев.";

	if (highCount >= 2) {
		overallRisk = "high";
		overallRiskLabelRu = "ВЫСОКИЙ ПАРОДОНТАЛЬНЫЙ РИСК";
		overallPrognosisRu = "Неблагоприятный прогноз без агрессивного лечения: высокий риск прогрессирования и потери зубов.";
		recallMonths = 3;
		recallDescriptionRu = "Интенсивная поддерживающая терапия (SPT) каждые 3–4 месяца со скейлингом и полировкой.";
	} else if (moderateCount >= 2 || highCount === 1) {
		overallRisk = "moderate";
		overallRiskLabelRu = "УМЕРЕННЫЙ ПАРОДОНТАЛЬНЫЙ РИСК";
		overallPrognosisRu = "Сомнительный прогноз: требуется активная пародонтологическая коррекция.";
		recallMonths = 6;
		recallDescriptionRu = "Поддерживающая пародонтальная терапия (SPT) каждые 6 месяцев с контролем гигиены.";
	}

	// SVG Radar Geometry calculations
	const centerX = 160;
	const centerY = 160;
	const maxRadius = 120;
	const minRadius = 18;

	const radarCoordinates: RadarPoint[] = allVectors.map((v, index) => {
		const angleRad = -Math.PI / 2 + (index * 2 * Math.PI) / 6;
		const radiusPx = minRadius + v.scoreNormalized * (maxRadius - minRadius);
		const x = Math.round(centerX + radiusPx * Math.cos(angleRad));
		const y = Math.round(centerY + radiusPx * Math.sin(angleRad));
		return { x, y, angleRad, radiusPx };
	});

	const radarPolygonPoints = radarCoordinates.map((c) => `${c.x},${c.y}`).join(" ");

	// Concentric zone ring boundaries
	const computeRingPoints = (normalizedRadius: number) => {
		const ringR = minRadius + normalizedRadius * (maxRadius - minRadius);
		return Array.from({ length: 6 }, (_, i) => {
			const a = -Math.PI / 2 + (i * 2 * Math.PI) / 6;
			const x = Math.round(centerX + ringR * Math.cos(a));
			const y = Math.round(centerY + ringR * Math.sin(a));
			return `${x},${y}`;
		}).join(" ");
	};

	const zonePolygonRings = {
		lowZonePoints: computeRingPoints(0.33),
		moderateZonePoints: computeRingPoints(0.66),
		highZonePoints: computeRingPoints(1.0),
	};

	return {
		overallRisk,
		overallRiskLabelRu,
		overallPrognosisRu,
		recommendedRecallIntervalMonths: recallMonths,
		recommendedRecallDescriptionRu: recallDescriptionRu,
		highRiskVectorsCount: highCount,
		moderateRiskVectorsCount: moderateCount,
		lowRiskVectorsCount: lowCount,
		calculatedBoneLossPercent: boneLoss,
		calculatedAgeYears: age,
		calculatedBlAgeRatio: blAgeRatio,
		vectors: {
			bop: vectorBop,
			deepPockets: vectorDeepPockets,
			toothLoss: vectorToothLoss,
			boneLossAgeRatio: vectorBlAge,
			systemicDiabetes: vectorDiabetes,
			environmentalSmoking: vectorSmoking,
		},
		radarPolygonPoints,
		radarCoordinates,
		zonePolygonRings,
	};
}

/**
 * Generates structured clinical text summarizing the PRA Spider Assessment.
 */
export function generatePraSummaryReport(
	pra: PraDetailedSpiderResult,
	patientName?: string,
): string {
	const lines: string[] = [];
	lines.push("════════════════════════════════════════════════════════════════");
	lines.push(" ОЦЕНКА ПАРОДОНТОЛОГИЧЕСКОГО ПРОФИЛЯ РИСКА (PRA LANG & TONETTI)");
	lines.push("════════════════════════════════════════════════════════════════");
	if (patientName) {
		lines.push(`Пациент: ${patientName}`);
	}
	lines.push(`Интегральный уровень риска: ${pra.overallRiskLabelRu.toUpperCase()}`);
	lines.push(`Клинический прогноз: ${pra.overallPrognosisRu}`);
	lines.push(`Рекомендуемый интервал SPT: ${pra.recommendedRecallDescriptionRu}`);
	lines.push("");
	lines.push("Шесть диагностических векторов риска:");
	lines.push(
		`1. Кровоточивость (BOP %): ${pra.vectors.bop.valueDisplay} — [${pra.vectors.bop.riskLevel.toUpperCase()}]`,
	);
	lines.push(`   Совет: ${pra.vectors.bop.clinicalAdviceRu}`);
	lines.push(
		`2. Глубокие карманы (≥ 5 мм): ${pra.vectors.deepPockets.valueDisplay} — [${pra.vectors.deepPockets.riskLevel.toUpperCase()}]`,
	);
	lines.push(`   Совет: ${pra.vectors.deepPockets.clinicalAdviceRu}`);
	lines.push(
		`3. Утрата зубов: ${pra.vectors.toothLoss.valueDisplay} — [${pra.vectors.toothLoss.riskLevel.toUpperCase()}]`,
	);
	lines.push(`   Совет: ${pra.vectors.toothLoss.clinicalAdviceRu}`);
	lines.push(
		`4. Резорбция кости / Возраст: ${pra.vectors.boneLossAgeRatio.valueDisplay} — [${pra.vectors.boneLossAgeRatio.riskLevel.toUpperCase()}]`,
	);
	lines.push(`   Совет: ${pra.vectors.boneLossAgeRatio.clinicalAdviceRu}`);
	lines.push(
		`5. Сахарный диабет (HbA1c): ${pra.vectors.systemicDiabetes.valueDisplay} — [${pra.vectors.systemicDiabetes.riskLevel.toUpperCase()}]`,
	);
	lines.push(`   Совет: ${pra.vectors.systemicDiabetes.clinicalAdviceRu}`);
	lines.push(
		`6. Курение: ${pra.vectors.environmentalSmoking.valueDisplay} — [${pra.vectors.environmentalSmoking.riskLevel.toUpperCase()}]`,
	);
	lines.push(`   Совет: ${pra.vectors.environmentalSmoking.clinicalAdviceRu}`);
	lines.push("");
	lines.push(
		`Баланс векторов: Высокий риск = ${pra.highRiskVectorsCount}, Средний = ${pra.moderateRiskVectorsCount}, Низкий = ${pra.lowRiskVectorsCount}`,
	);
	return lines.join("\n");
}
