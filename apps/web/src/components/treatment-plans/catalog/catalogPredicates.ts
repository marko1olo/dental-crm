import type { Order804nProcedureDefinition } from "../types";
import type { ToothData } from "../../odontogram/ToothChart";

export function isDeciduousTooth(toothNumber: number): boolean {
	return (
		(toothNumber >= 51 && toothNumber <= 55) ||
		(toothNumber >= 61 && toothNumber <= 65) ||
		(toothNumber >= 71 && toothNumber <= 75) ||
		(toothNumber >= 81 && toothNumber <= 85)
	);
}

export function getAnatomicalRootCanalCount(toothNumber: number, clinicalCanalCount?: number): number {
	if (typeof clinicalCanalCount === "number" && Number.isFinite(clinicalCanalCount) && clinicalCanalCount > 0) {
		return Math.min(4, Math.max(1, Math.round(clinicalCanalCount)));
	}
	const isDeciduous = isDeciduousTooth(toothNumber);
	const quadrant = Math.floor(toothNumber / 10);
	const pos = toothNumber % 10;
	const isUpper = quadrant === 1 || quadrant === 2 || quadrant === 5 || quadrant === 6;

	if (isDeciduous) return pos <= 3 ? 1 : (isUpper ? 3 : 2);
	if (pos >= 1 && pos <= 3) return 1;
	if (pos === 4) return isUpper ? 2 : 1;
	if (pos === 5) return 1;
	if (pos >= 6 && pos <= 8) return isUpper ? 4 : 3;
	return 1;
}

export function extractCanalCount(tooth: ToothData): number {
	const clinicalData = tooth.clinicalData as { canals?: unknown[] } | undefined;
	const overrideCount = Array.isArray(clinicalData?.canals) ? clinicalData.canals.length : undefined;
	return getAnatomicalRootCanalCount(tooth.toothNumber, overrideCount);
}

export function getEndoPreparationProcedure(canalsCount: number): Order804nProcedureDefinition {
	const clamped = Math.min(4, Math.max(1, Math.round(canalsCount)));
	return {
		code: "A16.07.030.00" + clamped,
		title: "Инструментальная и медикаментозная обработка корневых каналов (" + clamped + "-канальный зуб)",
		category: "Эндодонтия",
		defaultPriceRub: 3500 + (clamped - 1) * 2000,
		stageKind: "stage_1_therapy",
		stageNumber: 1,
		keywords: ["обработка каналов", "инструментальная"],
		materialsDefault: "Никель-титановые ротационные файлы, NaOCl 3%, EDTA 17%",
		uetDoctor: 2.0 + clamped * 0.5,
		uetNurse: 1.5 + clamped * 0.5,
	};
}

export function getEndoObturationProcedure(canalsCount: number): Order804nProcedureDefinition {
	const clamped = Math.min(4, Math.max(1, Math.round(canalsCount)));
	return {
		code: "A16.07.008.00" + clamped,
		title: "Пломбирование корневых каналов зуба (" + clamped + "-канальный зуб)",
		category: "Эндодонтия",
		defaultPriceRub: 3000 + (clamped - 1) * 2000,
		stageKind: "stage_1_therapy",
		stageNumber: 1,
		keywords: ["пломбирование каналов", "обтурация"],
		materialsDefault: "Гуттаперчевые конусные штифты, биокерамический силер",
		uetDoctor: 2.0 + clamped * 0.5,
		uetNurse: 1.5 + clamped * 0.5,
	};
}

export function getEndodonticServicesPair(canalsCount: number) {
	const prep = getEndoPreparationProcedure(canalsCount);
	const obt = getEndoObturationProcedure(canalsCount);
	return {
		canalCount: Math.min(4, Math.max(1, Math.round(canalsCount))),
		instrumentation: prep,
		obturation: obt,
		combinedPriceRub: prep.defaultPriceRub + obt.defaultPriceRub,
	};
}

export const getEndodonticOrder804nPair = getEndodonticServicesPair;

export function isMolarOrPremolar(toothNumber: number): boolean {
	if (isDeciduousTooth(toothNumber)) return false;
	const pos = toothNumber % 10;
	return pos >= 4 && pos <= 8;
}

export const UPPER_ARCH_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28] as const;
export const LOWER_ARCH_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38] as const;
