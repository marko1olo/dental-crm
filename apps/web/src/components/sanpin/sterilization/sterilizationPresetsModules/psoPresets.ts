/**
 * apps/web/src/components/sterilization/sterilizationPresetsModules/psoPresets.ts
 *
 * Нормативные пресеты предстерилизационной очистки (ПСО) и контроля качества.
 * Азопирамовая и фенолфталеиновая пробы: 100% норма в 1 клик, честные API вызовы.
 */

import { denteAdminSecretRequestHeaders } from "../../../../lib/denteRequestHeaders.js";
import type { PsoQualityControlPreset, PsoQualityRecord } from "./types.js";

const DEFAULT_OPERATOR = "Смирнова А.В. (медсестра ЦСО)";

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
	operatorName: DEFAULT_OPERATOR,
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
	operatorName: DEFAULT_OPERATOR,
	sanpinClause: "Контроль остатков моющих средств",
	notes:
		"Фенолфталеиновая проба отрицательная — щелочные компоненты полностью отмыты.",
};

export const PSO_QUALITY_CONTROL_PRESETS: readonly PsoQualityControlPreset[] = [
	{ id: "azopyram_standard", ...SANPIN_AZOPYRAM_TEST_PRESET },
	{ id: "phenolphthalein_standard", ...SANPIN_PHENOLPHTHALEIN_TEST_PRESET },
];

export function createQuickAzopyramRecord(
	operatorName = DEFAULT_OPERATOR,
): PsoQualityRecord {
	return {
		id: `pso-azo-${Date.now()}`,
		...SANPIN_AZOPYRAM_TEST_PRESET,
		operatorName,
		timestamp: new Date().toISOString(),
	};
}

export function createQuickPhenolphthaleinRecord(
	operatorName = DEFAULT_OPERATOR,
): PsoQualityRecord {
	return {
		id: `pso-ph-${Date.now()}`,
		...SANPIN_PHENOLPHTHALEIN_TEST_PRESET,
		operatorName,
		timestamp: new Date().toISOString(),
	};
}

export function createQuickCombinedPsoRecord(
	operatorName = DEFAULT_OPERATOR,
	instrumentName = "Терапевтический и хирургический инструментарий смены",
): PsoQualityRecord {
	return {
		id: `pso-both-${Date.now()}`,
		testType: "both",
		instrumentName,
		batchItemCount: 150,
		testedSampleCount: 5,
		azopyramResult: "negative",
		phenolphthaleinResult: "negative",
		detergentBrand: "Оптимакс Про 1.5%",
		isApproved: true,
		operatorName,
		timestamp: new Date().toISOString(),
		sanpinClause: "Контроль качества ПСО",
		notes:
			"1-кликовая фиксация проб ПСО: азопирам (кровь) — отрицательно, фенолфталеин (щелочь) — отрицательно. Партия допущена к стерилизации.",
	};
}

export function createQuickDailyShiftPsoRecords(
	operatorName = DEFAULT_OPERATOR,
): readonly PsoQualityRecord[] {
	const now = Date.now();
	return [
		{
			id: `pso-shift-1-${now}`,
			testType: "both",
			instrumentName:
				"Терапевтические смотровые лотки (зеркала, зонды, пинцеты)",
			batchItemCount: 120,
			testedSampleCount: 5,
			azopyramResult: "negative",
			phenolphthaleinResult: "negative",
			detergentBrand: "Оптимакс Про 1.5%",
			isApproved: true,
			operatorName,
			timestamp: new Date(now - 5 * 3600 * 1000).toISOString(),
			sanpinClause: "Контроль качества ПСО",
			notes:
				"Азопирамовая и фенолфталеиновая пробы отрицательны. Скрытая кровь и остатки СМС отсутствуют.",
		},
		{
			id: `pso-shift-2-${now}`,
			testType: "both",
			instrumentName: "Хирургический инструментарий (щипцы, элеваторы, кюреты)",
			batchItemCount: 45,
			testedSampleCount: 3,
			azopyramResult: "negative",
			phenolphthaleinResult: "negative",
			detergentBrand: "Оптимакс Про 1.5%",
			isApproved: true,
			operatorName,
			timestamp: new Date(now - 2 * 3600 * 1000).toISOString(),
			sanpinClause: "Контроль качества ПСО",
			notes: "Замковые щечки и рабочие поверхности чистые. Пробы отрицательны.",
		},
	];
}

export async function saveQuickPsoRecordToApi(
	pso: PsoQualityRecord,
): Promise<{ ok: boolean; id?: string; error?: string }> {
	try {
		const payload = {
			instrumentName: pso.instrumentName,
			batchItemCount: pso.batchItemCount,
			testedSampleCount: pso.testedSampleCount,
			detergentBrand: pso.detergentBrand,
			azopyramPassed: pso.azopyramResult === "negative",
			phenolphthaleinPassed: pso.phenolphthaleinResult === "negative",
			notes: `${pso.notes || ""} • [ПСО: ${pso.operatorName}]`.trim(),
		};

		const res = await fetch("/api/registers/pso", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...denteAdminSecretRequestHeaders(),
			},
			body: JSON.stringify(payload),
		});

		if (!res.ok) {
			const errBody = await res.json().catch(() => null);
			return {
				ok: false,
				error:
					errBody?.message || `Ошибка сохранения пробы ПСО (${res.status})`,
			};
		}

		const data = await res.json();
		return { ok: true, id: data?.id };
	} catch (err: unknown) {
		const msg =
			err instanceof Error
				? err.message
				: "Сетевой сбой при сохранении пробы ПСО";
		return { ok: false, error: msg };
	}
}

export async function fetchPsoLogsFromApi(): Promise<
	Record<string, unknown>[]
> {
	try {
		const res = await fetch("/api/registers/pso", {
			headers: {
				"Content-Type": "application/json",
				...denteAdminSecretRequestHeaders(),
			},
		});
		if (!res.ok) return [];
		const data = await res.json();
		return Array.isArray(data) ? data : [];
	} catch {
		return [];
	}
}
