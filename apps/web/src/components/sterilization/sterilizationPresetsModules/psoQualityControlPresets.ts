/**
 * ============================================================================
 * SANPIN 3.3686-21 PSO QUALITY CONTROL PRESETS & AUDIT ENGINE (LAYER 1)
 * Журналы контроля качества предстерилизационной очистки (ПСО, форма № 366/у):
 * азопирамовая проба на скрытую кровь, фенолфталеиновая проба на щелочные
 * компоненты СМС, расчет репрезентативной выборки (1% от партии) и Fastify API.
 * ============================================================================
 */

import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders.js";
import type { PsoQualityControlPreset, PsoQualityRecord } from "./types.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. ФОРМАТИРОВАНИЕ РЕЗУЛЬТАТОВ И РАСЧЕТ ВЫБОРКИ (САНПИН 3.3686-21 П. 3584)
// ─────────────────────────────────────────────────────────────────────────────

export function formatPsoAzopyramResult(result: "negative" | "positive"): string {
	return result === "negative"
		? "Отрицательная — окрашивания нет"
		: "Положительная — сине-фиолетовое окрашивание";
}

export function formatPsoPhenolphthaleinResult(result: "negative" | "positive"): string {
	return result === "negative"
		? "Отрицательная — окрашивания нет"
		: "Положительная — розовое окрашивание";
}

/**
 * Расчет минимального объема выборки для контроля качества ПСО:
 * 1% от партии каждого наименования изделий, но не менее 3-5 единиц (СанПиН 3.3686-21 п. 3584).
 */
export function calculatePsoSamplingCount(
	batchItemCount: number,
	isSurgicalSet = false,
): number {
	const count = Math.max(1, Math.floor(batchItemCount) || 1);
	const minFloor = isSurgicalSet ? 5 : 3;
	const onePercent = Math.ceil(count * 0.01);
	return Math.max(minFloor, onePercent);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. БАЗОВЫЕ НОРМАТИВНЫЕ ПРЕСЕТЫ ПРОБ ПСО (ФОРМА № 366/У)
// ─────────────────────────────────────────────────────────────────────────────

export const SANPIN_AZOPYRAM_TEST_PRESET: Omit<PsoQualityRecord, "id" | "timestamp"> = {
	testType: "azopyram",
	instrumentName:
		"Терапевтический и хирургический инструментарий (зеркала, зонды, пинцеты, щипцы)",
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
	sanpinClause: "СанПиН 3.3686-21 п. 3584, форма № 366/у",
	notes:
		"Азопирамовая проба (1% обработанной партии): Отрицательная — окрашивания нет в течение 1 мин (скрытая кровь отсутствует). Партия допущена к стерилизации по СанПиН 3.3686-21.",
};

export const SANPIN_PHENOLPHTHALEIN_TEST_PRESET: Omit<PsoQualityRecord, "id" | "timestamp"> = {
	testType: "phenolphthalein",
	instrumentName:
		"Смотровые лотки и наконечники после проточной отмывки дистиллированной водой",
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
	sanpinClause: "СанПиН 3.3686-21 п. 3585",
	notes:
		"Фенолфталеиновая проба (1% обработанной партии): Отрицательная — окрашивания нет (розовое окрашивание отсутствует, щелочные компоненты моющего средства полностью отмыты).",
};

/**
 * Сводный реестр пресетов контроля качества ПСО (Форма № 366/у)
 */
export const PSO_QUALITY_CONTROL_PRESETS: readonly PsoQualityControlPreset[] = [
	{ id: "azopyram_standard", ...SANPIN_AZOPYRAM_TEST_PRESET },
	{ id: "phenolphthalein_standard", ...SANPIN_PHENOLPHTHALEIN_TEST_PRESET },
];

// ─────────────────────────────────────────────────────────────────────────────
// 3. ФАБРИКИ БЫСТРЫХ ЗАПИСЕЙ ПСО В 1 КЛИК
// ─────────────────────────────────────────────────────────────────────────────

export function createQuickAzopyramRecord(
	operatorName = "Смирнова А.В. (медсестра ЦСО)",
): PsoQualityRecord {
	return {
		id: `pso-azo-${Date.now()}`,
		...SANPIN_AZOPYRAM_TEST_PRESET,
		operatorName,
		timestamp: new Date().toISOString(),
	};
}

export function createQuickPhenolphthaleinRecord(
	operatorName = "Смирнова А.В. (медсестра ЦСО)",
): PsoQualityRecord {
	return {
		id: `pso-ph-${Date.now()}`,
		...SANPIN_PHENOLPHTHALEIN_TEST_PRESET,
		operatorName,
		timestamp: new Date().toISOString(),
	};
}

export function createQuickCombinedPsoRecord(
	operatorName = "Смирнова А.В. (медсестра ЦСО)",
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
		sanpinClause: "СанПиН 3.3686-21 пп. 3584-3585, форма № 366/у",
		notes:
			"1-кликовая фиксация проб ПСО: азопирам (кровь) — отрицательно, фенолфталеин (щелочь) — отрицательно. Партия допущена к стерилизации.",
	};
}

export function createQuickDailyShiftPsoRecords(
	operatorName = "Смирнова А.В. (медсестра ЦСО)",
): readonly PsoQualityRecord[] {
	const now = Date.now();
	return [
		{
			id: `pso-shift-1-${now}`,
			testType: "both",
			instrumentName: "Терапевтические смотровые лотки (зеркала, зонды, пинцеты)",
			batchItemCount: 120,
			testedSampleCount: 5,
			azopyramResult: "negative",
			phenolphthaleinResult: "negative",
			detergentBrand: "Оптимакс Про 1.5%",
			isApproved: true,
			operatorName,
			timestamp: new Date(now - 5 * 3600 * 1000).toISOString(),
			sanpinClause: "СанПиН 3.3686-21 пп. 3584-3585, форма № 366/у",
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
			sanpinClause: "СанПиН 3.3686-21 пп. 3584-3585, форма № 366/у",
			notes: "Замковые щечки и рабочие поверхности чистые. Пробы отрицательны.",
		},
	];
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. API ИНТЕГРАЦИЯ FASTIFY & POSTGRESQL 18 (ZERO MOCKS MANDATE 8C)
// ─────────────────────────────────────────────────────────────────────────────

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
			notes: `${pso.notes || ""} • [СанПиН 3.3686-21: ${pso.operatorName}]`.trim(),
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
				error: errBody?.message || `Ошибка сохранения пробы ПСО (${res.status})`,
			};
		}

		const data = await res.json();
		return { ok: true, id: data?.id };
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : "Сетевой сбой при сохранении пробы ПСО";
		return { ok: false, error: msg };
	}
}

export async function fetchPsoLogsFromApi(): Promise<any[]> {
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
