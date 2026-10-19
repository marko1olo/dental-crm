/**
 * sterilizationBatchCycle.test.ts
 *
 * Спецификация 1-кликового регистратора цикла стерилизации и автосписания расходников (СанПиН).
 * Мандаты 8e (Автономия), 8n (Soft Negative Stock), 8b (<=120 строк).
 */

import { describe, expect, it } from "vitest";
import { executeSterilizationBatchCycle } from "../sterilizationCycle/sterilizationBatchCycleEngine.js";
import { DEFAULT_AUTOCLAVE_REGIME, DEFAULT_STERILIZATION_PACKAGES } from "../sterilizationCycle/types.js";

describe("Sterilization Batch Cycle Engine (SanPiN & Soft Negative Stock)", () => {
	it("успешно формирует запись цикла автоклава со стандартным режимом 134.5°C / 2.12 bar / 45 мин", () => {
		const result = executeSterilizationBatchCycle({
			organizationId: "org-test-1",
			packages: DEFAULT_STERILIZATION_PACKAGES,
			indicatorPassed: true,
			operatorName: "Иванова А. С.",
		});

		expect(result.success).toBe(true);
		expect(result.cycleRecord).toBeDefined();
		expect(result.cycleRecord.status).toBe("passed");
		expect(result.cycleRecord.temperatureCelsius).toBe(DEFAULT_AUTOCLAVE_REGIME.temperatureCelsius);
		expect(result.cycleRecord.pressureBar).toBe(DEFAULT_AUTOCLAVE_REGIME.pressureBar);
		expect(result.cycleRecord.durationMin).toBe(DEFAULT_AUTOCLAVE_REGIME.durationMin);
		expect(result.cycleRecord.indicatorType).toBe("class5_integrating");
		expect(result.cycleRecord.passedIndicator).toBe(true);
		expect(result.cycleRecord.itemsDescription).toContain("Терапевтические наборы");
		expect(result.cycleRecord.itemsDescription).toContain("5 шт");
		expect(result.cycleRecord.itemsDescription).toContain("Хирургические наборы");
		expect(result.cycleRecord.itemsDescription).toContain("2 шт");
	});

	it("Мандат 8n: при нулевом остатке на складе списание падает в мягкий минус без блокировки", () => {
		// Пустой склад без крафт-пакетов и индикаторов
		const result = executeSterilizationBatchCycle({
			organizationId: "org-test-1",
			packages: [
				{ id: "therapy_tray", name: "Терапевтический лоток", count: 5, pouchSize: "100x200 мм", craftPouchItemId: "pouch_100_200" },
			],
			warehouseItems: [],
		});

		expect(result.success).toBe(true);
		expect(result.isSoftOverdraft).toBe(true);
		expect(result.overdraftItems.length).toBeGreaterThan(0);
		// Крафт-пакеты и индикатор 5 класса ушли в минус
		const pouchDeduction = result.deductions.find((d) => d.id === "pouch_100_200");
		expect(pouchDeduction?.afterStock).toBe(-5);
		const indDeduction = result.deductions.find((d) => d.id === "chemical_indicator_class_5");
		expect(indDeduction?.afterStock).toBe(-1);
		// Баннер предупреждения для медсестры
		expect(result.nurseWarningBanner).toBeDefined();
		expect(result.nurseWarningBanner).toContain("⚠️ Требуется закупка");
		expect(result.nurseWarningBanner).toContain("-5 шт");
	});

	it("при достаточном остатке на складе списывает штатно без овердрафта", () => {
		const mockWarehouse = [
			{ id: "pouch_100_200", name: "Крафт-пакет 100x200 мм", stockQuantity: 20, criticalThreshold: 5, unitCostRub: 15 },
			{ id: "pouch_150_250", name: "Крафт-пакет 150x250 мм", stockQuantity: 10, criticalThreshold: 5, unitCostRub: 25 },
			{ id: "chemical_indicator_class_5", name: "Химический индикатор пара 5 класса", stockQuantity: 50, criticalThreshold: 10, unitCostRub: 8 },
		];

		const result = executeSterilizationBatchCycle({
			organizationId: "org-test-1",
			packages: [
				{ id: "therapy_tray", name: "Терапевтический лоток", count: 5, pouchSize: "100x200 мм", craftPouchItemId: "pouch_100_200" },
				{ id: "surgery_kit", name: "Хирургический набор", count: 2, pouchSize: "150x250 мм", craftPouchItemId: "pouch_150_250" },
			],
			warehouseItems: mockWarehouse,
		});

		expect(result.success).toBe(true);
		expect(result.isSoftOverdraft).toBe(false);
		expect(result.overdraftItems).toHaveLength(0);
		expect(result.nurseWarningBanner).toBeUndefined();

		const therapyPouch = result.deductions.find((d) => d.id === "pouch_100_200");
		expect(therapyPouch?.afterStock).toBe(15);
		const surgeryPouch = result.deductions.find((d) => d.id === "pouch_150_250");
		expect(surgeryPouch?.afterStock).toBe(8);
		const indicator = result.deductions.find((d) => d.id === "chemical_indicator_class_5");
		expect(indicator?.afterStock).toBe(49);
	});

	it("корректно обрабатывает пустые пакеты (0 шт)", () => {
		const result = executeSterilizationBatchCycle({
			organizationId: "org-test-1",
			packages: [
				{ id: "empty_tray", name: "Пустой набор", count: 0, pouchSize: "75x150 мм", craftPouchItemId: "pouch_75_150" },
			],
			warehouseItems: [],
		});

		expect(result.success).toBe(true);
		// Списывается только 1 индикатор
		expect(result.deductions).toHaveLength(1);
		expect(result.deductions[0]?.id).toBe("chemical_indicator_class_5");
	});
});
