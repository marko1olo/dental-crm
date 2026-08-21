/**
 * DENTE Dental CRM — Periodontal Protocol 043/u Generator
 *
 * Provides automatic PSR/CPITN sextant analysis, ICD-10 periodontal
 * diagnosis derivation (AAP/EFP 2018 & МКБ-10), and structured
 * clinical protocol generation for Form 043/u (Форма 043/у).
 */

import {
	calculateClinicalAttachmentLevel,
	calculatePerioIndices,
	calculatePsrSextants,
	type PerioChartSummary,
	type PerioToothRecord,
	type PsrSextantResult,
} from "@dental/shared";
import {
	FURCATION_GRADES,
	MOBILITY_GRADES,
	PERIO_LOWER_ARCH_TEETH,
	PERIO_UPPER_ARCH_TEETH,
} from "./perioTypes";

export interface PeriodontalDiagnosisResult {
	readonly icd10Code: string;
	readonly diagnosisNameRu: string;
	readonly stageDescriptionRu: string;
	readonly severity: "intact" | "gingivitis" | "mild" | "moderate" | "severe";
	readonly isGeneralized: boolean;
	readonly hasSuppuration: boolean;
}

/**
 * Derives exact ICD-10 periodontal diagnosis according to AAP/EFP 2018 World Workshop criteria.
 */
export function derivePeriodontalDiagnosis(
	teeth: readonly PerioToothRecord[],
	summary?: PerioChartSummary,
): PeriodontalDiagnosisResult {
	const currentSummary = summary ?? calculatePerioIndices(teeth as PerioToothRecord[]);
	const activeTeeth = teeth.filter((t) => !t.isMissing);
	const examinedTeethCount = activeTeeth.length;

	// Count teeth with true clinical attachment loss (PD >= 4mm or GM > 0mm)
	let teethWithAttachmentLoss = 0;
	let teethWithSevereLoss = 0; // CAL >= 5mm or PD >= 7mm
	let teethWithModerateLoss = 0; // CAL 3-4mm or PD 5-6mm

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

	// 1. Intact Periodontium vs Plaque-Induced Gingivitis (No deep pockets PD <= 3mm and No recession GM <= 0)
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

	// 2. Severe Periodontitis (Stage III / IV) - CAL >= 5mm, PD >= 7mm, Furcation II-IV, Mobility II-III
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

	// 3. Moderate Periodontitis (Stage II) - CAL 3-4mm, PD 5-6mm
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

	// 4. Mild Periodontitis (Stage I) - CAL 1-2mm, PD 4mm
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

/**
 * Generates a complete, ready-to-use clinical diary text for Form 043/u (Форма 043/у).
 */
export function generatePerio043DiaryText(
	teeth: readonly PerioToothRecord[],
	summary?: PerioChartSummary,
	options?: { readonly doctorName?: string; readonly customNotes?: string },
): string {
	const currentSummary = summary ?? calculatePerioIndices(teeth as PerioToothRecord[]);
	const psr = calculatePsrSextants(teeth as PerioToothRecord[]);
	const psrSummary = formatPsrSextantsSummary(psr);
	const diagnosis = derivePeriodontalDiagnosis(teeth, currentSummary);

	const riskLabels: Record<string, string> = {
		low: "Низкий (благоприятный прогноз)",
		moderate: "Средний (требуется активная терапия)",
		high: "Высокий (риск прогрессирования и потери зубов)",
	};

	const lines: string[] = [];

	lines.push("ПРОТОКОЛ ПАРОДОНТОЛОГИЧЕСКОГО ОБСЛЕДОВАНИЯ (ФОРМА 043/у)");
	lines.push("────────────────────────────────────────────────────────────");
	lines.push(`1. Скрининг пародонта PSR/CPITN (по 6 секстантам ВОЗ):`);
	lines.push(`   ${psrSummary}`);
	lines.push(`   (S1: 17-14, S2: 13-23, S3: 24-27, S4: 37-34, S5: 33-43, S6: 44-47; * — подвижность/фуркация)`);
	lines.push("");
	lines.push("2. Клинические индексы и данные 6-точечного зондирования:");
	lines.push(`   • Индекс кровоточивости десны FMBS (BOP): ${currentSummary.fmbsPercent}% (норма: <= 10%)`);
	lines.push(`   • Индекс зубного налёта FMPS (Plaque): ${currentSummary.fmpsPercent}% (норма: <= 20%)`);
	lines.push(`   • Максимальная глубина карманов (PD): ${currentSummary.maxPocketDepthMm} мм (средняя: ${currentSummary.meanPocketDepthMm} мм)`);
	lines.push(`   • Максимальная клиническая потеря прикрепления (CAL): ${currentSummary.maxCalMm} мм (средняя: ${currentSummary.meanCalMm} мм)`);
	lines.push(`   • Глубокие пародонтальные карманы (>= 5 мм): ${currentSummary.deepPocketsCount} участков`);
	if (currentSummary.sitesWithSuppurationCount > 0) {
		lines.push(`   • Нагноение из карманов (Suppuration): ${currentSummary.sitesWithSuppurationCount} участков (активная фаза)`);
	}
	if (currentSummary.teethWithFurcationCount > 0) {
		lines.push(`   • Зубы с вовлечением фуркации корней: ${currentSummary.teethWithFurcationCount} шт.`);
	}
	if (currentSummary.teethWithMobilityCount > 0) {
		lines.push(`   • Зубы с патологической подвижностью: ${currentSummary.teethWithMobilityCount} шт.`);
	}
	lines.push(`   • Пародонтальный риск (AAP/EFP): ${riskLabels[currentSummary.riskCategory] || currentSummary.riskCategory}`);
	lines.push("");
	lines.push("3. Клинический диагноз (МКБ-10):");
	lines.push(`   ${diagnosis.icd10Code} — ${diagnosis.diagnosisNameRu}`);
	lines.push(`   Характеристика: ${diagnosis.stageDescriptionRu}`);
	lines.push("");
	lines.push("4. Рекомендованный план лечения и пародонтальной терапии:");
	lines.push("   • Профессиональная гигиена полости рта (ультразвуковой скейлинг + AirFlow).");
	if (currentSummary.deepPocketsCount > 0 || currentSummary.maxPocketDepthMm >= 4) {
		lines.push("   • Поддесневой скейлинг и полировка корней (Scaling & Root Planing / SRP) по секстантам.");
		lines.push("   • Вектор-терапия / антисептическая обработка пародонтальных карманов.");
	}
	if (currentSummary.sitesWithSuppurationCount > 0) {
		lines.push("   • Местная и системная антимикробная терапия по показаниям.");
	}
	lines.push("   • Обучение контролируемой индивидуальной гигиене полости рта, подбор ершиков и ирригатора.");
	lines.push("   • Повторный пародонтологический осмотр и ре-оценка (Re-evaluation) через 6-8 недель.");

	if (options?.customNotes) {
		lines.push("");
		lines.push(`Особые отметки врача: ${options.customNotes}`);
	}

	return lines.join("\n");
}
