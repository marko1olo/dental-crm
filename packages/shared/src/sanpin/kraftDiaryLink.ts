/**
 * packages/shared/src/sanpin/kraftDiaryLink.ts
 *
 * Привязка стерилизационных данных к медицинской карте приёма.
 * Мандат 8b: строго <= 120 строк.
 * Мандат 8e: ноль блокировок врача, чистое внесение регламента.
 * Мандат 8x, 8ap: чистый русский язык без советского канцелярита.
 */

import type { ParsedKraftBarcode } from "./kraftBarcodeParser.js";

export interface FormatSterilizationRecordParams {
	readonly autoclaveId: string;
	readonly cycleNumber: number;
	readonly packDateIso: string;
	readonly expDateIso: string;
	readonly barcode: string;
	readonly operatorName: string;
	readonly indicatorClassRu?: string | undefined;
	readonly toolSetNameRu?: string | undefined;
	readonly isExpired?: boolean | undefined;
}

export function formatSterilizationDiaryRecord(params: FormatSterilizationRecordParams): string {
	const indicatorText = params.indicatorClassRu || "Химический интегратор 5 класса (пар 134°C, 5 мин)";
	const toolText = params.toolSetNameRu ? ` [${params.toolSetNameRu}]` : "";

	if (params.isExpired) {
		return `[ВНИМАНИЕ: СРОК СТЕРИЛИЗАЦИИ ИСТЁК] Стерилизация инструментария: Автоклав ${params.autoclaveId} (цикл №${params.cycleNumber} от ${params.packDateIso}), пакет ${params.barcode} истёк ${params.expDateIso}. Ответственная медсестра: ${params.operatorName}.`;
	}

	return `Стерилизация инструментария: Автоклав ${params.autoclaveId} (цикл №${params.cycleNumber} от ${params.packDateIso}), ${indicatorText}, крафт-пакет ${params.barcode}${toolText} годен до ${params.expDateIso}. Ответственная медсестра ЦСО: ${params.operatorName}. Целостность упаковки сохранена.`;
}

export const formatSterilizationRecord = formatSterilizationDiaryRecord;
export const format043SterilizationRecord = formatSterilizationDiaryRecord;

export function attachKraftPackageToDiary(diaryOrText: string, parsedKraft: ParsedKraftBarcode): string;
export function attachKraftPackageToDiary<T extends { appliedMaterials?: string | null; treatmentDescription?: string | null }>(
	diaryOrText: T,
	parsedKraft: ParsedKraftBarcode,
): T;
export function attachKraftPackageToDiary(
	diaryOrText: { appliedMaterials?: string | null; treatmentDescription?: string | null } | string,
	parsedKraft: ParsedKraftBarcode,
): { appliedMaterials?: string | null; treatmentDescription?: string | null } | string {
	const sterRecord = parsedKraft.formattedSterilizationDiaryRecord || parsedKraft.formattedProtocolRecord043;

	if (typeof diaryOrText === "string") {
		const curText = diaryOrText.trim();
		if (
			curText.includes(parsedKraft.rawInput) ||
			(parsedKraft.cycleNumber && curText.includes(`цикл №${parsedKraft.cycleNumber}`) && curText.includes(parsedKraft.autoclaveId))
		) {
			return diaryOrText;
		}
		return curText ? `${curText}\n\n${sterRecord}` : sterRecord;
	}

	const curMaterials = (diaryOrText.appliedMaterials || "").trim();
	if (
		curMaterials.includes(parsedKraft.rawInput) ||
		(parsedKraft.cycleNumber && curMaterials.includes(`цикл №${parsedKraft.cycleNumber}`) && curMaterials.includes(parsedKraft.autoclaveId))
	) {
		return diaryOrText;
	}

	return {
		...diaryOrText,
		appliedMaterials: curMaterials ? `${curMaterials}\n\n${sterRecord}` : sterRecord,
	};
}

export const attachKraftPackageTo043Diary = attachKraftPackageToDiary;
