/**
 * DENTE Dental CRM — Periodontal Mathematics & PRA Engine
 *
 * Implements:
 * 1. Lang & Tonetti (2003) Periodontal Risk Assessment (PRA) Spider Diagram vectors:
 *    - BOP % (Bleeding on Probing)
 *    - Residual deep pockets (PPD >= 5mm count)
 *    - Tooth loss (Missing teeth count)
 *    - Bone Loss / Age ratio (BL/Age)
 *    - Systemic/Genetic factor (Diabetes HbA1c)
 *    - Environmental factor (Smoking / Cigarettes per day)
 * 2. Overall Periodontal Risk Classification (Low / Moderate / High)
 * 3. Spider/Radar polygon coordinate geometry calculation for SVG rendering
 * 4. Clinical Attachment Level (CAL) and 6-point probing classifications
 * 5. Complete Form 043/u periodontal protocol text generation
 */

import {
	calculateClinicalAttachmentLevel,
	calculatePerioIndices,
	calculatePsrSextants,
	type PerioChartSummary,
	type PerioToothRecord,
	type PsrSextantResult,
} from "@dental/shared";

export type PraRiskLevel = "low" | "moderate" | "high";

export type SmokingStatus = "non_smoker" | "light" | "heavy";
export type DiabetesStatus = "none" | "controlled" | "uncontrolled";

export interface PraInput {
	readonly teeth: readonly PerioToothRecord[];
	readonly summary?: PerioChartSummary | undefined;
	readonly patientAgeYears?: number | undefined;
	readonly radiographicBoneLossPercent?: number | undefined;
	readonly smokingStatus?: SmokingStatus | undefined;
	readonly diabetesStatus?: DiabetesStatus | undefined;
}

export interface PraVectorResult {
	readonly nameRu: string;
	readonly shortName: string;
	readonly valueDisplay: string;
	readonly numericValue: number;
	readonly riskLevel: PraRiskLevel;
	readonly thresholdDescriptionRu: string;
	readonly scoreNormalized: number; // 0.0 .. 1.0 for radar radius
}

export interface PraSpiderResult {
	readonly overallRisk: PraRiskLevel;
	readonly overallRiskLabelRu: string;
	readonly highRiskVectorsCount: number;
	readonly moderateRiskVectorsCount: number;
	readonly lowRiskVectorsCount: number;
	readonly vectors: {
		readonly bop: PraVectorResult;
		readonly deepPockets: PraVectorResult;
		readonly toothLoss: PraVectorResult;
		readonly boneLossAgeRatio: PraVectorResult;
		readonly systemicDiabetes: PraVectorResult;
		readonly environmentalSmoking: PraVectorResult;
	};
	readonly radarPolygonPoints: string;
	readonly radarPolygonCoordinates: ReadonlyArray<{ readonly x: number; readonly y: number }>;
}

export interface PeriodontalDiagnosisDetail {
	readonly icd10Code: string;
	readonly diagnosisNameRu: string;
	readonly stageDescriptionRu: string;
	readonly severity: "intact" | "gingivitis" | "mild" | "moderate" | "severe";
	readonly isGeneralized: boolean;
	readonly hasSuppuration: boolean;
}

/**
 * Calculates Bone Loss / Age ratio (BL/Age) according to AAP/EFP 2018 Grading criteria.
 * - Grade A (Slow): < 0.25 - 0.5
 * - Grade B (Moderate): 0.5 - 1.0
 * - Grade C (Rapid): > 1.0
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
 * Derives default radiographic bone loss percentage from worst CAL if not provided.
 * Standard anatomical root length assumed ~12-14mm, so 1mm CAL loss ~ 7-8% bone loss.
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
 * Computes Lang & Tonetti (2003) Periodontal Risk Assessment (PRA) Spider Diagram.
 */
export function calculatePeriodontalRiskAssessment(input: PraInput): PraSpiderResult {
	const currentSummary = input.summary ?? calculatePerioIndices(input.teeth as PerioToothRecord[]);
	const missingTeethCount = input.teeth.filter((t) => t.isMissing).length;

	const age = input.patientAgeYears ?? 45;
	const boneLoss =
		input.radiographicBoneLossPercent ??
		estimateBoneLossPercentFromTeeth(input.teeth, currentSummary.maxCalMm);
	const blAgeRatio = calculateBoneLossAgeRatio(boneLoss, age);

	const smoking: SmokingStatus = input.smokingStatus ?? "non_smoker";
	const diabetes: DiabetesStatus = input.diabetesStatus ?? "none";

	// 1. Vector: BOP % (Bleeding on Probing)
	// Low: <= 9% (score ~0.25)
	// Moderate: 10% - 25% (score ~0.60)
	// High: > 25% (score ~0.95)
	const bopVal = currentSummary.fmbsPercent;
	let bopRisk: PraRiskLevel = "low";
	let bopScore = 0.25;
	if (bopVal > 25) {
		bopRisk = "high";
		bopScore = Math.min(1.0, 0.65 + (bopVal / 100) * 0.35);
	} else if (bopVal >= 10) {
		bopRisk = "moderate";
		bopScore = 0.35 + ((bopVal - 10) / 15) * 0.3;
	} else {
		bopScore = Math.max(0.1, (bopVal / 10) * 0.3);
	}

	const vectorBop: PraVectorResult = {
		nameRu: "Кровоточивость (BOP %)",
		shortName: "BOP %",
		valueDisplay: `${bopVal}%`,
		numericValue: bopVal,
		riskLevel: bopRisk,
		thresholdDescriptionRu: "Норма: ≤ 9% | Умеренно: 10-25% | Высокий: > 25%",
		scoreNormalized: bopScore,
	};

	// 2. Vector: Residual Pockets with PPD >= 5mm count
	// Low: <= 4 sites (score ~0.25)
	// Moderate: 5 - 8 sites (score ~0.60)
	// High: >= 9 sites (score ~0.95)
	const deepPocketsCount = currentSummary.deepPocketsCount;
	let pocketsRisk: PraRiskLevel = "low";
	let pocketsScore = 0.2;
	if (deepPocketsCount >= 9) {
		pocketsRisk = "high";
		pocketsScore = Math.min(1.0, 0.65 + Math.min(1, deepPocketsCount / 20) * 0.35);
	} else if (deepPocketsCount >= 5) {
		pocketsRisk = "moderate";
		pocketsScore = 0.35 + ((deepPocketsCount - 4) / 4) * 0.3;
	} else {
		pocketsScore = Math.max(0.1, (deepPocketsCount / 4) * 0.3);
	}

	const vectorDeepPockets: PraVectorResult = {
		nameRu: "Карманы PPD ≥ 5 мм",
		shortName: "PPD ≥ 5мм",
		valueDisplay: `${deepPocketsCount} уч.`,
		numericValue: deepPocketsCount,
		riskLevel: pocketsRisk,
		thresholdDescriptionRu: "Низкий: ≤ 4 | Средний: 5-8 | Высокий: ≥ 9 участков",
		scoreNormalized: pocketsScore,
	};

	// 3. Vector: Tooth Loss (Missing teeth count out of 28/32)
	// Low: <= 4 missing
	// Moderate: 5 - 8 missing
	// High: > 8 missing
	let toothLossRisk: PraRiskLevel = "low";
	let toothLossScore = 0.2;
	if (missingTeethCount > 8) {
		toothLossRisk = "high";
		toothLossScore = Math.min(1.0, 0.65 + Math.min(1, missingTeethCount / 16) * 0.35);
	} else if (missingTeethCount >= 5) {
		toothLossRisk = "moderate";
		toothLossScore = 0.35 + ((missingTeethCount - 4) / 4) * 0.3;
	} else {
		toothLossScore = Math.max(0.1, (missingTeethCount / 4) * 0.3);
	}

	const vectorToothLoss: PraVectorResult = {
		nameRu: "Потеря зубов (Missing)",
		shortName: "Потеря зубов",
		valueDisplay: `${missingTeethCount} шт.`,
		numericValue: missingTeethCount,
		riskLevel: toothLossRisk,
		thresholdDescriptionRu: "Низкий: ≤ 4 | Средний: 5-8 | Высокий: > 8 зубов",
		scoreNormalized: toothLossScore,
	};

	// 4. Vector: Bone Loss / Age ratio (BL/Age)
	// Low: < 0.5 (Grade A)
	// Moderate: 0.5 - 1.0 (Grade B)
	// High: > 1.0 (Grade C)
	let blAgeRisk: PraRiskLevel = "low";
	let blAgeScore = 0.2;
	if (blAgeRatio > 1.0) {
		blAgeRisk = "high";
		blAgeScore = Math.min(1.0, 0.65 + Math.min(1, (blAgeRatio - 1.0) / 1.0) * 0.35);
	} else if (blAgeRatio >= 0.5) {
		blAgeRisk = "moderate";
		blAgeScore = 0.35 + ((blAgeRatio - 0.5) / 0.5) * 0.3;
	} else {
		blAgeScore = Math.max(0.1, (blAgeRatio / 0.5) * 0.3);
	}

	const vectorBlAge: PraVectorResult = {
		nameRu: "Костная потеря / Возраст (BL/Age)",
		shortName: "BL / Возраст",
		valueDisplay: `${blAgeRatio} (${boneLoss}% / ${age}л)`,
		numericValue: blAgeRatio,
		riskLevel: blAgeRisk,
		thresholdDescriptionRu: "Низкий: < 0.5 | Средний: 0.5-1.0 | Высокий: > 1.0 (AAP 2018)",
		scoreNormalized: blAgeScore,
	};

	// 5. Vector: Systemic / Genetic factor (Diabetes HbA1c)
	let diabetesRisk: PraRiskLevel = "low";
	let diabetesScore = 0.2;
	let diabetesDisplay = "Нет (норма)";
	if (diabetes === "uncontrolled") {
		diabetesRisk = "high";
		diabetesScore = 0.9;
		diabetesDisplay = "СД декомпенс. (>7%)";
	} else if (diabetes === "controlled") {
		diabetesRisk = "moderate";
		diabetesScore = 0.55;
		diabetesDisplay = "СД компенс. (6-7%)";
	}

	const vectorDiabetes: PraVectorResult = {
		nameRu: "Системный фактор (Сахарный диабет)",
		shortName: "Диабет (HbA1c)",
		valueDisplay: diabetesDisplay,
		numericValue: diabetes === "uncontrolled" ? 2 : diabetes === "controlled" ? 1 : 0,
		riskLevel: diabetesRisk,
		thresholdDescriptionRu: "Низкий: Нет | Средний: HbA1c 6.0-7.0% | Высокий: HbA1c > 7.0%",
		scoreNormalized: diabetesScore,
	};

	// 6. Vector: Environmental factor (Smoking / Cigarettes per day)
	let smokingRisk: PraRiskLevel = "low";
	let smokingScore = 0.2;
	let smokingDisplay = "Не курит";
	if (smoking === "heavy") {
		smokingRisk = "high";
		smokingScore = 0.9;
		smokingDisplay = "> 10 сигарет/день";
	} else if (smoking === "light") {
		smokingRisk = "moderate";
		smokingScore = 0.55;
		smokingDisplay = "≤ 10 сигарет/день";
	}

	const vectorSmoking: PraVectorResult = {
		nameRu: "Фактор среды (Табакокурение)",
		shortName: "Курение",
		valueDisplay: smokingDisplay,
		numericValue: smoking === "heavy" ? 2 : smoking === "light" ? 1 : 0,
		riskLevel: smokingRisk,
		thresholdDescriptionRu: "Низкий: Не курит | Средний: ≤ 10 сигарет/день | Высокий: > 10 сигарет/день",
		scoreNormalized: smokingScore,
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

	let overallRisk: PraRiskLevel = "low";
	let overallRiskLabelRu = "Низкий риск (благоприятный прогноз)";

	if (highCount >= 2) {
		overallRisk = "high";
		overallRiskLabelRu = "ВЫСОКИЙ РИСК (прогрессирование пародонтита и потеря зубов)";
	} else if (moderateCount >= 2 || highCount === 1) {
		overallRisk = "moderate";
		overallRiskLabelRu = "СРЕДНИЙ РИСК (требуется активная пародонтальная терапия)";
	}

	// Calculate 6-axis Radar Polygon Coordinates
	const centerX = 150;
	const centerY = 150;
	const maxRadius = 115;
	const minRadius = 15;

	const coords = allVectors.map((v, i) => {
		const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 6;
		const r = minRadius + v.scoreNormalized * (maxRadius - minRadius);
		const x = Math.round(centerX + r * Math.cos(angle));
		const y = Math.round(centerY + r * Math.sin(angle));
		return { x, y };
	});

	const radarPolygonPoints = coords.map((c) => `${c.x},${c.y}`).join(" ");

	return {
		overallRisk,
		overallRiskLabelRu,
		highRiskVectorsCount: highCount,
		moderateRiskVectorsCount: moderateCount,
		lowRiskVectorsCount: lowCount,
		vectors: {
			bop: vectorBop,
			deepPockets: vectorDeepPockets,
			toothLoss: vectorToothLoss,
			boneLossAgeRatio: vectorBlAge,
			systemicDiabetes: vectorDiabetes,
			environmentalSmoking: vectorSmoking,
		},
		radarPolygonPoints,
		radarPolygonCoordinates: coords,
	};
}

/**
 * Derives exact ICD-10 periodontal diagnosis according to AAP/EFP 2018 World Workshop criteria.
 */
export function derivePeriodontalDiagnosis(
	teeth: readonly PerioToothRecord[],
	summary?: PerioChartSummary,
): PeriodontalDiagnosisDetail {
	const currentSummary = summary ?? calculatePerioIndices(teeth as PerioToothRecord[]);
	const activeTeeth = teeth.filter((t) => !t.isMissing);
	const examinedTeethCount = activeTeeth.length;

	let teethWithAttachmentLoss = 0;
	let teethWithSevereLoss = 0;
	let teethWithModerateLoss = 0;

	for (const tooth of activeTeeth) {
		let maxToothCal = 0;
		let maxToothPd = 0;
		let hasLoss = false;

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
			if (cal > maxToothCal) maxToothCal = cal;
			if (s.probingDepthMm > maxToothPd) maxToothPd = s.probingDepthMm;
			if (s.probingDepthMm >= 4 || s.gingivalMarginMm > 0) {
				hasLoss = true;
			}
		}

		if (hasLoss || (tooth.furcation && tooth.furcation > 0) || (tooth.mobility && tooth.mobility > 0)) {
			teethWithAttachmentLoss++;
		}
		if (maxToothCal >= 5 || maxToothPd >= 7 || (tooth.furcation && tooth.furcation >= 2)) {
			teethWithSevereLoss++;
		} else if (maxToothCal >= 3 || maxToothPd >= 5 || (tooth.furcation && tooth.furcation === 1)) {
			teethWithModerateLoss++;
		}
	}

	const isGeneralized = examinedTeethCount > 0
		? (teethWithAttachmentLoss / examinedTeethCount) > 0.3
		: false;

	const hasSuppuration = currentSummary.sitesWithSuppurationCount > 0;

	if (teethWithAttachmentLoss === 0 && currentSummary.maxPocketDepthMm <= 3) {
		if (currentSummary.fmbsPercent > 10) {
			return {
				icd10Code: "K05.1",
				diagnosisNameRu: "Хронический простой (катаральный) гингивит, индуцированный биопленкой",
				stageDescriptionRu: "Гингивит без потери прикрепления (BOP > 10%, глубина карманов в пределах нормы <= 3 мм)",
				severity: "gingivitis",
				isGeneralized,
				hasSuppuration,
			};
		}
		return {
			icd10Code: "Z01.2",
			diagnosisNameRu: "Клинически здоровый интактный пародонт",
			stageDescriptionRu: "Пародонт в норме (BOP <= 10%, глубина зондирования <= 3 мм, CAL = 0 мм)",
			severity: "intact",
			isGeneralized: false,
			hasSuppuration: false,
		};
	}

	if (
		currentSummary.maxPocketDepthMm >= 7 ||
		teethWithSevereLoss >= 2 ||
		currentSummary.teethWithFurcationCount >= 2 ||
		currentSummary.teethWithMobilityCount >= 3
	) {
		const extentLabel = isGeneralized ? "генерализованный" : "локализованный";
		const acuteNote = hasSuppuration ? " в фазе обострения (гноетечение)" : "";
		return {
			icd10Code: "K05.33",
			diagnosisNameRu: `Хронический ${extentLabel} пародонтит тяжелой степени (Стадия III/IV)${acuteNote}`,
			stageDescriptionRu: `Тяжелая деструкция пародонта: CAL макс = ${currentSummary.maxCalMm} мм, PD макс = ${currentSummary.maxPocketDepthMm} мм${hasSuppuration ? `, участков нагноения: ${currentSummary.sitesWithSuppurationCount}` : ""}`,
			severity: "severe",
			isGeneralized,
			hasSuppuration,
		};
	}

	if (
		currentSummary.maxCalMm >= 3 ||
		currentSummary.maxPocketDepthMm >= 5 ||
		currentSummary.teethWithFurcationCount >= 1 ||
		currentSummary.teethWithMobilityCount >= 1
	) {
		const extentLabel = isGeneralized ? "генерализованный" : "локализованный";
		const acuteNote = hasSuppuration ? " в фазе обострения (гноетечение)" : "";
		return {
			icd10Code: "K05.32",
			diagnosisNameRu: `Хронический ${extentLabel} пародонтит средней степени тяжести (Стадия II)${acuteNote}`,
			stageDescriptionRu: `Умеренная потеря прикрепления: CAL макс = ${currentSummary.maxCalMm} мм, PD макс = ${currentSummary.maxPocketDepthMm} мм`,
			severity: "moderate",
			isGeneralized,
			hasSuppuration,
		};
	}

	const extentLabel = isGeneralized ? "генерализованный" : "локализованный";
	const icd = isGeneralized ? "K05.31" : "K05.30";
	return {
		icd10Code: icd,
		diagnosisNameRu: `Хронический ${extentLabel} пародонтит легкой степени (Стадия I)`,
		stageDescriptionRu: `Начальная потеря прикрепления: CAL макс = ${currentSummary.maxCalMm} мм, PD макс = ${currentSummary.maxPocketDepthMm} мм`,
		severity: "mild",
		isGeneralized,
		hasSuppuration,
	};
}

/**
 * Formats PSR sextants into standard clinical string:
 * S1: 4* | S2: 1 | S3: 3 | S4: 2 | S5: 1 | S6: 4*
 */
export function formatPsrSextantsSummary(psr: Record<string, PsrSextantResult>): string {
	const order = ["S1", "S2", "S3", "S4", "S5", "S6"] as const;
	return order
		.map((sKey) => {
			const res = psr[sKey];
			if (!res || res.teethCount === 0) return `${sKey}: —`;
			return `${sKey}: ${res.code}${res.asterisk ? "*" : ""}`;
		})
		.join(" | ");
}

export interface GenerateProtocol043Options {
	readonly doctorName?: string | undefined;
	readonly customNotes?: string | undefined;
	readonly praResult?: PraSpiderResult | undefined;
	readonly patientAgeYears?: number | undefined;
	readonly smokingStatus?: SmokingStatus | undefined;
	readonly diabetesStatus?: DiabetesStatus | undefined;
}

/**
 * Generates an exhaustive, structured clinical diary text for Form 043/u (Форма 043/у)
 * with complete Florida probe 6-point charting, PRA spider assessment, and treatment plan.
 */
export function generateComprehensivePerio043Text(
	teeth: readonly PerioToothRecord[],
	summary?: PerioChartSummary,
	options?: GenerateProtocol043Options,
): string {
	const currentSummary = summary ?? calculatePerioIndices(teeth as PerioToothRecord[]);
	const psr = calculatePsrSextants(teeth as PerioToothRecord[]);
	const psrSummary = formatPsrSextantsSummary(psr);
	const diagnosis = derivePeriodontalDiagnosis(teeth, currentSummary);

	const pra =
		options?.praResult ??
		calculatePeriodontalRiskAssessment({
			teeth,
			summary: currentSummary,
			patientAgeYears: options?.patientAgeYears,
			smokingStatus: options?.smokingStatus,
			diabetesStatus: options?.diabetesStatus,
		});

	const riskLabels: Record<PraRiskLevel, string> = {
		low: "Низкий (благоприятный прогноз)",
		moderate: "Средний (требуется активная пародонтальная терапия)",
		high: "Высокий (высокий риск рецидива и потери зубов)",
	};

	const lines: string[] = [];

	lines.push("ПРОТОКОЛ ПАРОДОНТОЛОГИЧЕСКОГО ОБСЛЕДОВАНИЯ (ФОРМА 043/у)");
	lines.push("────────────────────────────────────────────────────────────");
	if (options?.doctorName) {
		lines.push(`Лечащий врач: ${options.doctorName}`);
	}
	lines.push(`1. Скрининг пародонта PSR/CPITN (по 6 секстантам ВОЗ):`);
	lines.push(`   ${psrSummary}`);
	lines.push(`   (S1: 17-14, S2: 13-23, S3: 24-27, S4: 37-34, S5: 33-43, S6: 44-47; * — подвижность/фуркация)`);
	lines.push("");
	lines.push("2. Клинические индексы и данные 6-точечного зондирования (Florida Probe):");
	lines.push(`   • Индекс кровоточивости десны FMBS (BOP): ${currentSummary.fmbsPercent}% (норма: ≤ 10%)`);
	lines.push(`   • Индекс зубного налёта FMPS (Plaque): ${currentSummary.fmpsPercent}% (норма: ≤ 20%)`);
	lines.push(`   • Максимальная глубина карманов (PD): ${currentSummary.maxPocketDepthMm} мм (средняя: ${currentSummary.meanPocketDepthMm} мм)`);
	lines.push(`   • Максимальная клиническая потеря прикрепления (CAL): ${currentSummary.maxCalMm} мм (средняя: ${currentSummary.meanCalMm} мм)`);
	lines.push(`   • Пародонтальные карманы ≥ 5 мм: ${currentSummary.deepPocketsCount} участков`);
	if (currentSummary.sitesWithSuppurationCount > 0) {
		lines.push(`   • Нагноение из карманов (Suppuration): ${currentSummary.sitesWithSuppurationCount} участков (активная экссудация)`);
	}
	if (currentSummary.teethWithFurcationCount > 0) {
		lines.push(`   • Зубы с вовлечением фуркации корней (I-IV класс): ${currentSummary.teethWithFurcationCount} шт.`);
	}
	if (currentSummary.teethWithMobilityCount > 0) {
		lines.push(`   • Зубы с патологической подвижностью (I-III степень): ${currentSummary.teethWithMobilityCount} шт.`);
	}
	lines.push("");
	lines.push("3. Оценка пародонтального риска (PRA Spider Diagram по Lang & Tonetti / ВОЗ):");
	lines.push(`   • Интегральный риск: ${riskLabels[pra.overallRisk]}`);
	lines.push(`   • BOP-вектор: ${pra.vectors.bop.valueDisplay} (${pra.vectors.bop.riskLevel.toUpperCase()})`);
	lines.push(`   • Карманы PPD ≥ 5 мм: ${pra.vectors.deepPockets.valueDisplay} (${pra.vectors.deepPockets.riskLevel.toUpperCase()})`);
	lines.push(`   • Утрата зубов: ${pra.vectors.toothLoss.valueDisplay} (${pra.vectors.toothLoss.riskLevel.toUpperCase()})`);
	lines.push(`   • Костная потеря/Возраст (BL/Age): ${pra.vectors.boneLossAgeRatio.valueDisplay} (${pra.vectors.boneLossAgeRatio.riskLevel.toUpperCase()})`);
	lines.push(`   • Системный статус (Диабет): ${pra.vectors.systemicDiabetes.valueDisplay}`);
	lines.push(`   • Фактор среды (Курение): ${pra.vectors.environmentalSmoking.valueDisplay}`);
	lines.push("");
	lines.push("4. Клинический диагноз (МКБ-10 / AAP 2018):");
	lines.push(`   ${diagnosis.icd10Code} — ${diagnosis.diagnosisNameRu}`);
	lines.push(`   Характеристика: ${diagnosis.stageDescriptionRu}`);
	lines.push("");
	lines.push("5. Рекомендованный план лечения и пародонтальной терапии:");
	lines.push("   • Профессиональная гигиена полости рта (ультразвуковой скейлинг + полировка AirFlow).");
	if (currentSummary.deepPocketsCount > 0 || currentSummary.maxPocketDepthMm >= 4) {
		lines.push("   • Поддесневой скейлинг и сглаживание корней (Scaling & Root Planing / SRP) по секстантам под инфильтрационной анестезией.");
		lines.push("   • Вектор-терапия / ультразвуковая антисептическая обработка пародонтальных карманов.");
	}
	if (currentSummary.sitesWithSuppurationCount > 0) {
		lines.push("   • Местное медикаментозное орошение и системная антибактериальная терапия по показаниям.");
	}
	if (currentSummary.teethWithMobilityCount > 0) {
		lines.push("   • Шинирование подвижных зубов стекловолоконной лентой (Ribbond / GrandTEC).");
	}
	lines.push("   • Обучение контролируемой индивидуальной гигиене полости рта (межзубные ёршики, монопучковая щетка, ирригатор).");
	lines.push("   • Диспансерный пародонтологический ре-осмотр и ре-оценка (Re-evaluation) через 6-8 недель.");

	if (options?.customNotes) {
		lines.push("");
		lines.push(`Особые отметки врача: ${options.customNotes}`);
	}

	return lines.join("\n");
}
