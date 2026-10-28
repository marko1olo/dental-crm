/**
 * apps/web/src/components/sanpin/waste/wasteWeightCalculators.ts
 *
 * Упрощенный расчет массы медицинских отходов партии/смены (СанПиН 2.1.3684-21).
 * Мандат 8b: строго 30-40 строк. Отказ от микро-симуляции граммов тары.
 */

import { getMedicalWastePackaging, type MedicalWastePackagingTypeId } from "./medicalWastePresets.js";

export function calculateWasteNetWeight(grossKg: number, tareKg = 0): number {
	const g = Math.max(0, Number(grossKg) || 0);
	const t = Math.max(0, Number(tareKg) || 0);
	const net = Math.max(0, g - t);
	return Math.round(net * 100) / 100;
}

export function calculateWasteWeights(
	grossKg: number,
	packagingType: MedicalWastePackagingTypeId,
	customTareKg?: number | undefined,
): { grossKg: number; tareKg: number; netKg: number } {
	const packaging = getMedicalWastePackaging(packagingType);
	const tareKg = customTareKg !== undefined && customTareKg >= 0
		? customTareKg
		: packaging.defaultTareWeightKg;

	const g = Math.round(Math.max(0, Number(grossKg) || 0) * 100) / 100;
	const t = Math.round(tareKg * 100) / 100;
	const netKg = calculateWasteNetWeight(g, t);

	return { grossKg: g, tareKg: t, netKg };
}

export function calculateWasteWeightsFromGrams(
	grossGrams: number,
	packagingType: MedicalWastePackagingTypeId,
	customTareGrams?: number | undefined,
): {
	grossGrams: number;
	tareGrams: number;
	netGrams: number;
	grossKg: number;
	tareKg: number;
	netKg: number;
} {
	const packaging = getMedicalWastePackaging(packagingType);
	const defaultTareGrams = Math.round(packaging.defaultTareWeightKg * 1000);
	const tareG = customTareGrams !== undefined && customTareGrams >= 0
		? Math.round(customTareGrams)
		: defaultTareGrams;

	const grossG = Math.max(0, Math.round(Number(grossGrams) || 0));
	const netG = Math.max(0, grossG - tareG);

	return {
		grossGrams: grossG,
		tareGrams: tareG,
		netGrams: netG,
		grossKg: Math.round((grossG / 1000) * 100) / 100,
		tareKg: Math.round((tareG / 1000) * 100) / 100,
		netKg: Math.round((netG / 1000) * 100) / 100,
	};
}
