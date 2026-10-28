/**
 * packages/shared/src/perio/clinicalProtocol.ts
 *
 * Генерация клинического протокола пародонтологического обследования
 * для дневника визита и медицинской карты приёма.
 * Mandate 8b: File <= 120 lines. Mandate 8x & 8ap: No raw order numbers in prod.
 */

import {
	calculateAapEfpStagingAndGrading,
	type AapClassificationOptions,
} from "./grading.js";
import { calculatePerioIndices } from "./math.js";
import { calculatePsrSextants, formatPsrSextantsSummary } from "./psr.js";
import type {
	PerioChartSummary,
	PerioToothRecord,
	PraRiskLevel,
} from "./types.js";

export interface GenerateClinicalPerioProtocolOptions extends AapClassificationOptions {
	readonly doctorName?: string | undefined;
	readonly customNotes?: string | undefined;
}

export type GenerateProtocol043Options = GenerateClinicalPerioProtocolOptions;

export function generateComprehensivePerioProtocolText(
	teeth: readonly PerioToothRecord[],
	summary?: PerioChartSummary,
	options?: GenerateClinicalPerioProtocolOptions,
): string {
	const currentSummary = summary ?? calculatePerioIndices(teeth as PerioToothRecord[]);
	const psr = calculatePsrSextants(teeth as PerioToothRecord[]);
	const psrSummary = formatPsrSextantsSummary(psr);
	const diagnosis = calculateAapEfpStagingAndGrading(teeth, currentSummary, options);

	let overallRisk: PraRiskLevel = "low";
	if (currentSummary.fmbsPercent > 30 || currentSummary.deepPocketsCount >= 4) {
		overallRisk = "high";
	} else if (currentSummary.fmbsPercent > 10 || currentSummary.moderatePocketsCount > 0) {
		overallRisk = "moderate";
	}

	const riskLabels: Record<PraRiskLevel, string> = {
		low: "Низкий (благоприятный прогноз, поддерживающая терапия)",
		moderate: "Умеренный (требуется активная пародонтальная терапия SRP)",
		high: "Высокий (высокий риск прогрессирования и потери зубов)",
	};

	const lines: string[] = [];

	lines.push("ПРОТОКОЛ ПАРОДОНТОЛОГИЧЕСКОГО ОБСЛЕДОВАНИЯ (МЕДИЦИНСКАЯ КАРТА ПРИЁМА)");
	lines.push("────────────────────────────────────────────────────────────");
	if (options?.doctorName) {
		lines.push(`Лечащий врач: ${options.doctorName}`);
	}
	lines.push("1. Скрининг пародонта PSR/CPITN (по 6 секстантам ВОЗ):");
	lines.push(`   ${psrSummary}`);
	lines.push("   (S1: 17-14, S2: 13-23, S3: 24-27, S4: 37-34, S5: 33-43, S6: 44-47; * — подвижность/фуркация)");
	lines.push("");
	lines.push("2. Клинические индексы и данные 6-точечного зондирования — Медицинская карта приёма:");
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
	lines.push("3. Оценка риска пародонтита:");
	lines.push(`   • Интегральный статус риска: ${riskLabels[overallRisk]}`);
	lines.push(`   • Риск-профиль: BOP ${currentSummary.fmbsPercent}% | Глубокие карманы ≥5мм: ${currentSummary.deepPocketsCount}`);
	lines.push("");
	lines.push("4. Клинический диагноз (МКБ-10 / Классификация AAP/EFP 2018):");
	lines.push(`   ${diagnosis.icd10Code} — ${diagnosis.diagnosisNameRu}`);
	lines.push(`   Характеристика: ${diagnosis.stageDescriptionRu}`);
	lines.push("");
	lines.push("5. Рекомендованный план лечения и пародонтальной терапии:");
	lines.push("   • Профессиональная гигиена полости рта (ультразвуковой скейлинг + Air-Flow + полировка + фторирование эмали).");
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
	lines.push("   • Контрольный пародонтологический осмотр и переоценка (Re-evaluation) через 6-8 недель.");

	if (options?.customNotes) {
		lines.push("");
		lines.push(`Особые отметки врача: ${options.customNotes}`);
	}

	return lines.join("\n");
}

export const generateComprehensivePerio043Text = generateComprehensivePerioProtocolText;
