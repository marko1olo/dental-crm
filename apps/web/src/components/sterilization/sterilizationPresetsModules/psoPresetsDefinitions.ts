/**
 * apps/web/src/components/sterilization/sterilizationPresetsModules/psoPresetsDefinitions.ts
 *
 * Нормативные пресеты контроля предстерилизационной очистки (ПСО, азопирам).
 * Мандат 8b: строго <= 120 строк.
 */

import type { PsoQualityControlPreset, PsoQualityRecord } from "./types.js";

export function formatPsoAzopyramResult(
	result: "negative" | "positive",
): string {
	return result === "negative"
		? "Отрицательная — окрашивания нет"
		: "Положительная — сине-фиолетовое окрашивание";
}

export function formatPsoPhenolphthaleinResult(
	result: "negative" | "positive",
): string {
	return result === "negative"
		? "Отрицательная — окрашивания нет"
		: "Положительная — розовое окрашивание";
}

export function calculatePsoSamplingCount(
	batchItemCount: number,
	isSurgicalSet = false,
): number {
	const count = Math.max(1, Math.floor(batchItemCount) || 1);
	const minFloor = isSurgicalSet ? 5 : 3;
	const onePercent = Math.ceil(count * 0.01);
	return Math.max(minFloor, onePercent);
}

export const SANPIN_AZOPYRAM_TEST_PRESET: Omit<
	PsoQualityRecord,
	"id" | "timestamp"
> = {
	testType: "azopyram",
	instrumentName: "Терапевтический и хирургический инструментарий",
	batchItemCount: 120,
	testedSampleCount: 5,
	minSampleCountRequired: 3,
	samplingSatisfied: true,
	azopyramResult: "negative",
	azopyramResultDescriptionRu: "Отрицательная — окрашивания нет",
	phenolphthaleinResult: "negative",
	phenolphthaleinResultDescriptionRu: "Отрицательная — окрашивания нет",
	detergentBrand: "Оптимакс Про 1.5% + ферментный очиститель",
	isApproved: true,
	operatorName: "Смирнова А.В. (медсестра ЦСО)",
	sanpinClause: "Контроль качества предстерилизационной очистки",
	notes:
		"Азопирамовая проба отрицательная — окрашивания нет. Партия допущена к стерилизации.",
};

export const SANPIN_PHENOLPHTHALEIN_TEST_PRESET: Omit<
	PsoQualityRecord,
	"id" | "timestamp"
> = {
	testType: "phenolphthalein",
	instrumentName:
		"Смотровые лотки и наконечники после отмывки дистиллированной водой",
	batchItemCount: 120,
	testedSampleCount: 5,
	minSampleCountRequired: 3,
	samplingSatisfied: true,
	azopyramResult: "negative",
	azopyramResultDescriptionRu: "Отрицательная — окрашивания нет",
	phenolphthaleinResult: "negative",
	phenolphthaleinResultDescriptionRu: "Отрицательная — окрашивания нет",
	detergentBrand: "Биолот 0.5%",
	isApproved: true,
	operatorName: "Смирнова А.В. (медсестра ЦСО)",
	sanpinClause: "Контроль остатков моющих средств",
	notes:
		"Фенолфталеиновая проба отрицательная — щелочные компоненты полностью отмыты.",
};

export const PSO_QUALITY_CONTROL_PRESETS: readonly PsoQualityControlPreset[] = [
	{ id: "azopyram_standard", ...SANPIN_AZOPYRAM_TEST_PRESET },
	{ id: "phenolphthalein_standard", ...SANPIN_PHENOLPHTHALEIN_TEST_PRESET },
];
