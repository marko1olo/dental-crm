/**
 * chairsidePhotoProtocolConstants.ts — Константы и типы фотопротокола кресла и шкалы VITA
 */

export const VITA_SHADES = [
	"A1", "A2", "A3", "A3.5", "A4",
	"B1", "B2", "B3", "B4",
	"C1", "C2", "C3", "C4",
	"D2", "D3", "D4",
	"BL1", "BL2", "BL3", "BL4",
] as const;

export type VitaShadeType = (typeof VITA_SHADES)[number];

export type PhotoProtocolStage = "before" | "in_progress" | "after" | "followup";

export function formatChairsidePhotoProtocolDiaryRu(
	filledCount: number,
	presetName: string,
	teeth: readonly number[],
	shade: string,
): string {
	const teethStr = teeth.length > 0 ? teeth.join(", ") : "все сегменты";
	return `[ФОТОПРОТОКОЛ КРЕСЛА AACD/DSD]: Выполнено ${filledCount} снимков по протоколу «${presetName}». Фиксация До/После. Зубы: ${teethStr}. Оттенок VITA: ${shade}. Прикреплено к карте.`;
}

export function calculateComparisonClipPath(sliderPositionPercent: number): string {
	const clamped = Math.min(100, Math.max(0, sliderPositionPercent));
	return `inset(0 ${100 - clamped}% 0 0)`;
}
