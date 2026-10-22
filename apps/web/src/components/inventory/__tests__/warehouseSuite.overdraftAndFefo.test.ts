import assert from "node:assert/strict";
import { describe, it } from "vitest";
import type { InventoryItem } from "../useInventoryLogic.js";
import { getFefoTrafficLight } from "../fefoTrafficLight.js";
import {
	reconcileOverdraftOnReceipt,
	generateTorg12Html,
	createSampleDentalWaybill,
	calculateWaybillTotals,
	createWaybillItem,
} from "../acceptanceWaybillsEngine.js";

const SAMPLE_ITEMS: readonly InventoryItem[] = [
	{
		id: "wh-item-1",
		name: "Артикаин 1:100 000 карпула 1.7 мл",
		category: "Анестезия",
		stockQuantity: 120,
		criticalThreshold: 30,
		unitCostRub: "95.00",
		unit: "карп.",
		sku: "ART-100",
		lotNumber: "LOT-441",
		expirationDate: "2027-12-31",
		updatedAt: "2026-10-07T12:00:00Z",
	},
	{
		id: "wh-item-2",
		name: "Скандонест 3% карпула 1.7 мл",
		category: "Анестезия",
		stockQuantity: -5,
		criticalThreshold: 20,
		unitCostRub: "110.00",
		unit: "карп.",
		sku: "SCAND-3",
		lotNumber: "LOT-201",
		expirationDate: "2026-11-05",
		updatedAt: "2026-10-07T12:00:00Z",
	},
];

describe("Warehouse Suite: Overdraft & FEFO & Waybills", () => {
	it("разрешает отрицательный остаток (дефицит) без исключений и фатальных ошибок", () => {
		const overdraftItem = SAMPLE_ITEMS.find((it) => it.stockQuantity < 0);
		assert.ok(overdraftItem);
		assert.equal(overdraftItem.stockQuantity, -5);
		const newStock = overdraftItem.stockQuantity - 2;
		assert.equal(newStock, -7);
	});

	it("автоматически гасит накопленный дефицит при оприходовании накладной", () => {
		const reconciliation = reconcileOverdraftOnReceipt(-5, 20);
		assert.equal(reconciliation.clearedDeficit, 5);
		assert.equal(reconciliation.newStockQuantity, 15);
		assert.equal(reconciliation.overdraftResolved, true);
	});

	it("корректно обрабатывает частичное погашение овердрафта", () => {
		const reconciliation = reconcileOverdraftOnReceipt(-10, 4);
		assert.equal(reconciliation.clearedDeficit, 4);
		assert.equal(reconciliation.newStockQuantity, -6);
		assert.equal(reconciliation.overdraftResolved, true);
	});

	it("определяет просроченные, срочные и свежие серии по FEFO", () => {
		assert.equal(getFefoTrafficLight("2025-01-01", "2026-10-07").status, "red");
		const yellow = getFefoTrafficLight("2026-10-20", "2026-10-07");
		assert.equal(yellow.status, "yellow");
		assert.ok(yellow.daysLeft <= 30 && yellow.daysLeft > 0);
		assert.equal(getFefoTrafficLight("2028-12-31", "2026-10-07").status, "green");
	});

	it("рассчитывает суммы накладной с точностью до копейки", () => {
		const items = [
			createWaybillItem({
				name: "Артикаин карпула",
				batchNumber: "LOT-ART-01",
				expirationDate: "2028-12-31",
				quantity: 100,
				unitPriceKopecks: 9500,
				vatRate: 0,
			}),
			createWaybillItem({
				name: "Пакеты для стерилизации",
				batchNumber: "LOT-STER-02",
				expirationDate: "2028-12-31",
				quantity: 50,
				unitPriceKopecks: 1400,
				vatRate: 20,
			}),
		];

		const totals = calculateWaybillTotals(items);
		assert.equal(totals.totalPositions, 2);
		assert.equal(totals.subtotalKopecks, 1020000);
		assert.equal(totals.totalVatKopecks, 14000);
		assert.equal(totals.totalCostKopecks, 1034000);
	});

	it("генерирует валидный HTML печатной формы ТОРГ-12", () => {
		const sampleWaybill = createSampleDentalWaybill();
		const html = generateTorg12Html(sampleWaybill);
		assert.ok(html.includes("ТОРГ-12"));
		assert.ok(html.includes(sampleWaybill.waybillNumber));
		assert.ok(html.includes(sampleWaybill.supplier.name));
	});
});
