/**
 * packages/shared/src/perio/hygieneProtocols.ts
 *
 * Clinical protocol generators for 1-click norm and pro-hygiene.
 * Mandate 8b: File <= 120 lines. Mandates 8x, 8ap: Clean clinical wording.
 */

import type { HygieneToothAssessment } from "./hygieneConfig.js";
import { calculateKpiScore, type KpiResult } from "./hygieneKpi.js";
import { calculateOhiSScore, type OhiSResult } from "./hygieneOhis.js";
import { calculatePmaScore, type PmaResult } from "./hygienePma.js";

export interface CombinedHygieneReport {
	readonly ohiS: OhiSResult;
	readonly pma: PmaResult;
	readonly kpi: KpiResult;
	readonly assessedTeeth: Record<number, HygieneToothAssessment>;
	readonly summaryText043: string;
}

export function calculateCombinedHygieneReport(
	assessments: Record<number, HygieneToothAssessment> | readonly HygieneToothAssessment[],
): CombinedHygieneReport {
	const teethList = Array.isArray(assessments) ? assessments : Object.values(assessments);
	const ohiS = calculateOhiSScore(teethList);
	const pma = calculatePmaScore(teethList);
	const kpi = calculateKpiScore(teethList);

	const assessmentsMap: Record<number, HygieneToothAssessment> = {};
	for (const a of teethList) assessmentsMap[a.toothNumber] = a;

	const lines: string[] = [
		`КЛИНИЧЕСКИЕ ИНДЕКСЫ ГИГИЕНЫ И СОСТОЯНИЯ ПАРОДОНТА:`,
		`• Индекс гигиены Грина-Вермиллиона: ${ohiS.ratingText} (налет DI-S: ${ohiS.debrisScore}, камень CI-S: ${ohiS.calculusScore}).`,
		`• Индекс воспаления десны PMA (Парма): ${pma.ratingText}.`,
		`• Комплексный периодонтальный индекс (КПИ Леуса): ${kpi.ratingText}.`,
	];

	if (ohiS.totalScore <= 0.6 && pma.pmaPercent === 0 && kpi.kpiScore === 0) {
		lines.push(`Заключение: Гигиеническое состояние полости рта оптимальное, ткани пародонта интактны.`);
	} else {
		lines.push(`Рекомендовано: Проведение контролируемой индивидуальной гигиены, обучение технике чистки зубов Bass/Stillman, курс противовоспалительной терапии.`);
	}

	return {
		ohiS, pma, kpi, assessedTeeth: assessmentsMap, summaryText043: lines.join("\n"),
	};
}

export const CLINICAL_PERIO_NORM_SUMMARY_RU =
	"Соматически здоров / глубина карманов 1-2 мм / кровоточивость 0 / зубной камень отсутствует / индекс PSR 0 / норма";

export const CLINICAL_PRO_HYGIENE_SUMMARY_RU =
	"Комплексная профессиональная гигиена: ультразвуковой скейлинг над- и поддесневых отложений + Air-Flow глицином + полировка пастой Kerr Cleanic + ремотерапия/фторирование эмали Fluocal";

export function createClinicalPerioNormProtocolText(): string {
	return [
		"ПРОТОКОЛ ОСМОТРА ПАРОДОНТА И ГИГИЕНЫ ПОЛОСТИ РТА (Медицинская карта приёма / Форма 043/у):",
		`• Статус пародонта: ${CLINICAL_PERIO_NORM_SUMMARY_RU}.`,
		"• Жалобы: Отсутствуют.",
		"• Status localis: Десна бледно-розового цвета, плотная, плотно прилежит к шейкам зубов, фестончатость сохранена. Десневые сосочки не гипертрофированы, не отечны. Кровоточивость при зондировании отсутствует (BOP 0%). Глубина клинических карманов во всех секстантах 1-2 мм (физиологическая борозда). Патологическая подвижность зубов отсутствует. Назубные отложения (мягкий налет, над- и поддесневой зубной камень) не определяются. Скрининг пародонта PSR во всех секстантах = 0.",
		"• Клинические индексы: OHI-S = 0.0 (Отличный), PMA = 0% (Воспаление отсутствует), КПИ Леуса = 0.0 (Здоровый периодонт).",
		"• Диагноз по МКБ-10: Z01.2 Стоматологическое обследование / Ткани пародонта интактны.",
		"• Назначения и рекомендации: Индивидуальная контролируемая гигиена полости рта 2 раза в день. Профилактический осмотр через 6 месяцев.",
	].join("\n");
}

export function createClinicalProHygieneProtocolText(): string {
	return [
		"ПРОТОКОЛ КОМПЛЕКСНОЙ ПРОФЕССИОНАЛЬНОЙ ГИГИЕНЫ ПОЛОСТИ РТА (Медицинская карта приёма / Форма 043/у):",
		`• Процедура: ${CLINICAL_PRO_HYGIENE_SUMMARY_RU}.`,
		"• Протокол вмешательства:",
		"1. Антисептическая обработка полости рта 0.05% раствором хлоргексидина биглюконата.",
		"2. Индикация зубных отложений (Mira-2-Ton / Curaprox), обучение контролируемой индивидуальной гигиене.",
		"3. Ультразвуковой над- и поддесневой скейлинг piezo-наконечником (EMS Piezon) с обильным водяным охлаждением, удаление минерализованного зубного камня со всех поверхностей зубов.",
		"4. Воздушно-абразивная обработка Air-Flow мелкодисперсным порошком на основе глицина (размер частиц <25 мкм, безопасный для эмали и десны), удаление пигментированного мягкого налета, налета курильщика и биопленки.",
		"5. Циркулярная финишная полировка всех поверхностей зубов мягкими чашечками и щеточками с микроабразивной пастой Kerr Cleanic с переменной зернистостью. Полировка контактных пунктов абразивными штрипсами.",
		"6. Местная глубокая ремотерапия и фторирование эмали: аппликация фторсодержащего лака Fluocal на высушенные поверхности зубов.",
		"• Status localis после гигиены: Зубные отложения удалены полностью, эмаль гладкая блестящая, десна бледно-розовая плотная, кровоточивости нет (BOP 0%).",
		"• Клинические индексы после гигиены: OHI-S 0.0 (отличная), PMA 0% (воспаления нет), КПИ 0.0 (интактный периодонт).",
		"• Рекомендации пациенту: Соблюдение «белой диеты» в течение 48 часов. Смена зубной щетки на новую. Профилактический осмотр и повторная гигиена через 6 месяцев.",
	].join("\n");
}
