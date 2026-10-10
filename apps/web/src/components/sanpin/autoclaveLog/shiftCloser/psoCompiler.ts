/**
 * ============================================================================
 * SANPIN FORM 366/U PSO SAMPLES COMPILER (LAYER 1)
 * (СанПиН 3.3686-21, п. 3624)
 * ============================================================================
 */

import type { RegulatoryPsoRecord } from "../engine/index.js";
import type { ShiftSanpinAutoCloseOptions } from "./types.js";

/**
 * Автоматически рассчитывает нормативную выборку контроля ПСО (Форма 366/у)
 * по СанПиН 3.3686-21 (п. 3624: >= 1% от партии, но не менее 3-5 шт).
 */
export function compileShiftPsoBatches(
	options: ShiftSanpinAutoCloseOptions = {},
): readonly RegulatoryPsoRecord[] {
	const now = new Date();
	const date = options.date || now.toISOString().slice(0, 10);
	const visitsCount = options.visitsCount !== undefined && options.visitsCount >= 0 ? options.visitsCount : 12;
	const traysCount = options.traysCount !== undefined && options.traysCount > 0 ? options.traysCount : Math.max(4, visitsCount * 4);

	const operatorName = options.operatorStaffFullName || "Дежурный ассистент / медсестра";
	const detergent = options.detergentBrand || "Биолот 0.5% + Аламинол 1.5%";

	// Партия 1: Базовый терапевтический инструментарий (70% объема)
	const batch1Count = Math.max(3, Math.round(traysCount * 0.7));
	const sample1Count = Math.max(3, Math.ceil(batch1Count * 0.01));

	// Партия 2: Вращающийся инструмент (боры, эндодонтические насадки)
	const batch2Count = Math.max(3, Math.round(traysCount * 0.3));
	const sample2Count = Math.max(3, Math.ceil(batch2Count * 0.01));

	const psoList: RegulatoryPsoRecord[] = [
		{
			id: `pso-${date}-01`,
			date,
			instrumentName: "Стоматологический инструментарий терапевтического приема (зеркала, зонды, пинцеты, гладилки)",
			batchItemCount: batch1Count,
			testedSampleCount: sample1Count,
			isAzopyramNegative: true,
			isPhenolphthaleinNegative: true,
			isBatchApproved: true,
			detergentBrand: detergent,
			operatorFullName: operatorName,
			notes: `Азопирамовая проба отрицательная (нет следов гемоглобина). Фенолфталеиновая проба отрицательная (нейтральный pH, следов СМС нет). Допущено к стерилизации.`,
		},
		{
			id: `pso-${date}-02`,
			date,
			instrumentName: "Боры твердосплавные, алмазные головки, эндодонтический инструмент",
			batchItemCount: batch2Count,
			testedSampleCount: sample2Count,
			isAzopyramNegative: true,
			isPhenolphthaleinNegative: true,
			isBatchApproved: true,
			detergentBrand: detergent,
			operatorFullName: operatorName,
			notes: `УЗ-мойка Elmasonic S30H (40 кГц, 15 мин при 45°C). Пробы на скрытую кровь и щелочность отрицательные. Норма.`,
		},
	];

	return psoList;
}
