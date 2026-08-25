import {
	calculateAapEfpStagingAndGrading,
	type AapClassificationOptions,
} from "./grading.js";
import { calculatePerioIndices } from "./math.js";
import { calculatePeriodontalRiskAssessment, type PraSpiderResult } from "./pra.js";
import { calculatePsrSextants, formatPsrSextantsSummary } from "./psr.js";
import type {
	DiabetesStatus,
	PerioChartSummary,
	PerioToothRecord,
	PraRiskLevel,
	SmokingStatus,
} from "./types.js";

export interface GenerateProtocol043Options extends AapClassificationOptions {
	readonly doctorName?: string | undefined;
	readonly customNotes?: string | undefined;
	readonly praResult?: PraSpiderResult | undefined;
}

/**
 * Generates an exhaustive, structured clinical diary text for Form 043/u (Форма 043/у)
 * with complete Florida probe 6-point charting, PRA spider assessment, AAP/EFP 2018 staging/grading, and treatment plan.
 */
export function generateComprehensivePerio043Text(
	teeth: readonly PerioToothRecord[],
	summary?: PerioChartSummary,
	options?: GenerateProtocol043Options,
): string {
	const currentSummary = summary ?? calculatePerioIndices(teeth as PerioToothRecord[]);
	const psr = calculatePsrSextants(teeth as PerioToothRecord[]);
	const psrSummary = formatPsrSextantsSummary(psr);
	const diagnosis = calculateAapEfpStagingAndGrading(teeth, currentSummary, options);

	const pra =
		options?.praResult ??
		calculatePeriodontalRiskAssessment({
			teeth,
			summary: currentSummary,
			...(options?.patientAgeYears !== undefined ? { patientAgeYears: options.patientAgeYears } : {}),
			...(options?.smokingStatus !== undefined ? { smokingStatus: options.smokingStatus } : {}),
			...(options?.diabetesStatus !== undefined ? { diabetesStatus: options.diabetesStatus } : {}),
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
	lines.push("1. Скрининг пародонта PSR/CPITN (по 6 секстантам ВОЗ):");
	lines.push(`   ${psrSummary}`);
	lines.push("   (S1: 17-14, S2: 13-23, S3: 24-27, S4: 37-34, S5: 33-43, S6: 44-47; * — подвижность/фуркация)");
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
	lines.push("4. Клинический диагноз (МКБ-10 / Классификация AAP/EFP 2018):");
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
