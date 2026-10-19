/**
 * sterilizationBatchCycleEngine.ts — 1-кликовый движок цикла стерилизации и автосписания расходников.
 * Мандаты 8e (Автономия), 8n (Soft Negative Stock), 8s (Anti-Bloat). Строго <= 120 строк.
 */

import type { SterilizationLogRecord } from "@dental/shared";
import {
	DEFAULT_AUTOCLAVE_REGIME,
	type SterilizationBatchCycleInput,
	type SterilizationBatchCycleResult,
	type StockDeductionSummaryItem,
} from "./types.js";

export function executeSterilizationBatchCycle(
	input: SterilizationBatchCycleInput,
): SterilizationBatchCycleResult {
	const totalPouches = input.packages.reduce((sum, pkg) => sum + pkg.count, 0);
	const warehouseItems = input.warehouseItems || [];
	const deductions: StockDeductionSummaryItem[] = [];
	const overdraftItems: StockDeductionSummaryItem[] = [];

	// 1. Формируем список списаний крафт-пакетов
	for (const pkg of input.packages) {
		if (pkg.count <= 0) continue;
		const whItem = warehouseItems.find(
			(it) => it.id === pkg.craftPouchItemId || it.name.includes(pkg.pouchSize),
		);
		const currentStock = whItem ? whItem.stockQuantity : 0;
		const afterStock = currentStock - pkg.count;
		const isOverdraft = afterStock < 0;

		const deduction: StockDeductionSummaryItem = {
			id: whItem?.id || pkg.craftPouchItemId,
			name: whItem?.name || `Крафт-пакет ${pkg.pouchSize}`,
			quantity: pkg.count,
			currentStock,
			afterStock,
			isOverdraft,
		};
		deductions.push(deduction);
		if (isOverdraft) overdraftItems.push(deduction);
	}

	// 2. Списание химического индикатора 5 класса (1 шт на цикл)
	const indItem = warehouseItems.find(
		(it) =>
			it.id === "chemical_indicator_class_5" ||
			it.name.includes("Индикатор 5 класса"),
	);
	const indStock = indItem ? indItem.stockQuantity : 0;
	const indAfter = indStock - 1;
	const indOverdraft = indAfter < 0;
	const indDeduction: StockDeductionSummaryItem = {
		id: indItem?.id || "chemical_indicator_class_5",
		name: indItem?.name || "Химический индикатор пара 5 класса",
		quantity: 1,
		currentStock: indStock,
		afterStock: indAfter,
		isOverdraft: indOverdraft,
	};
	deductions.push(indDeduction);
	if (indOverdraft) overdraftItems.push(indDeduction);

	const isSoftOverdraft = overdraftItems.length > 0;
	const nurseWarningBanner = isSoftOverdraft
		? `⚠️ Требуется закупка: расходники списаны в мягкий минус (${overdraftItems.map((o) => `${o.name}: ${o.afterStock} шт`).join(", ")})`
		: undefined;

	const nowIso = new Date().toISOString();
	const descParts = input.packages
		.map((p) => `${p.name}: ${p.count} шт`)
		.join("; ");
	const fullDesc = `Пакетная стерилизация смены: ${descParts}; индикатор 5 класса: 1 шт.`;

	const cycleRecord: SterilizationLogRecord = {
		id: `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, "0")}`,
		organizationId: input.organizationId,
		deviceName: input.autoclaveDeviceName || "Автоклав Melag Vacuklav 23 B+",
		sterilizerType: "autoclave_steam",
		autoclaveId: "autoclave_melag_vacuklav_23b",
		serialNumber: "SN-MELAG-23B-01",
		cycleNumber: input.cycleNumber || 1,
		itemsDescription: fullDesc,
		packagingType: "kraft_heat_sealed",
		temperatureCelsius: DEFAULT_AUTOCLAVE_REGIME.temperatureCelsius,
		pressureBar: DEFAULT_AUTOCLAVE_REGIME.pressureBar,
		durationMin: DEFAULT_AUTOCLAVE_REGIME.durationMin,
		indicatorType: "class5_integrating",
		passedIndicator: input.indicatorPassed !== false,
		biologicalTestResult: "not_conducted",
		status: "passed",
		barcode: `STERIL-${Date.now().toString().slice(-8)}`,
		expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
		operatorId: null,
		operatorName: input.operatorName || "Медсестра ЦСО",
		notes: `1-кликовый цикл СанПиН. Упаковок: ${totalPouches}. Списание со склада: ${deductions.length} позиций.${isSoftOverdraft ? " [МЯГКИЙ ОВЕРДРАФТ]" : ""}`,
		timestamp: nowIso,
		createdAt: nowIso,
	};

	return {
		success: true,
		cycleRecord,
		deductions,
		overdraftItems,
		isSoftOverdraft,
		nurseWarningBanner,
	};
}
