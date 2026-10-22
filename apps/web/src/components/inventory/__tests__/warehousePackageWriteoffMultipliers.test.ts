import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { handleOneClickPackageWriteOff } from "../warehousePackageWriteOffEngine";
import type { InventoryItem } from "../useInventoryLogic";

describe("Wave 64 (Feature 253): Writeoff Multipliers & Strict Overdraft", () => {
	it("8. Строгий запрет овердрафта (allowSoftOverdraft: false) возвращает отказ при дефиците", async () => {
		const emptyStock: Record<string, number> = {};

		const result = await handleOneClickPackageWriteOff({
			packageId: "anesthesia",
			currentStockMap: emptyStock,
			allowSoftOverdraft: false,
		});

		assert.equal(result.success, false);
		assert.equal(result.isOverdraft, true);
		assert.equal(result.toastType, "error");
		assert.ok(result.toastMessage.includes("Списание заблокировано"));
	});

	it("9. Множитель процедур quantityMultiplier корректно увеличивает списание (2 приёма)", async () => {
		const availableStock: Record<string, number> = {
			art_100k_carpule: 10,
			dental_needle_30g: 10,
			cotton_rolls_sterile: 50,
			antiseptic_alcohol_wipe: 20,
		};

		const result = await handleOneClickPackageWriteOff({
			packageId: "anesthesia",
			quantityMultiplier: 2,
			currentStockMap: availableStock,
		});

		assert.equal(result.success, true);
		const carpule = result.deductedItems.find((i) => i.id === "art_100k_carpule")!;
		assert.equal(carpule.quantity, 2);
		const rolls = result.deductedItems.find((i) => i.id === "cotton_rolls_sterile")!;
		assert.equal(rolls.quantity, 8);
	});

	it("10. Интеграция с warehouseItems (сопоставление по sku, id или наименованию)", async () => {
		const sampleWarehouse: InventoryItem[] = [
			{
				id: "wh_art_100k",
				sku: "MED-ANES-01",
				name: "Анестетик артикаиновый 4% с эпинефрином 1:100 000 (1.7 мл)",
				stockQuantity: 15,
				criticalThreshold: 5,
				unitCostRub: "145.00",
				updatedAt: "2026-09-08",
			},
			{
				id: "wh_needle",
				sku: "MED-NEEDLE-30G",
				name: "Игла карпульная стоматологическая 30G евростандарт 25 мм",
				stockQuantity: 40,
				criticalThreshold: 10,
				unitCostRub: "25.00",
				updatedAt: "2026-09-08",
			},
		];

		const result = await handleOneClickPackageWriteOff({
			packageId: "anesthesia",
			warehouseItems: sampleWarehouse,
			allowSoftOverdraft: true,
		});

		assert.equal(result.success, true);
		assert.equal(result.isOverdraft, true);
		assert.equal(result.overdraftCount, 2);
	});
});
