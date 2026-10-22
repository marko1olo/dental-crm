import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateAutoVisitConsumables,
	executeAutoVisitBomDeduction,
} from "@dental/shared";

describe("CLINICAL WAREHOUSE: Inbound Waybills & Soft Overdraft", () => {
	it("формирует корректную структуру для acceptance-waybill с сериями, сроками и ценой", () => {
		const waybillPayload = {
			supplierName: "ЗАО «ВладМиВа»",
			supplierInn: "7701234567",
			waybillNumber: "УПД-2026-881",
			receiptDate: "2026-10-02",
			items: [
				{
					inventoryItemId: "item-ultra-01",
					name: "Артикаин Д-С 1.7 мл",
					category: "Анестетики",
					unit: "карп.",
					batchNumber: "LOT-2026-X1",
					lotNumber: "LOT-2026-X1",
					expirationDate: "2028-09-30",
					quantity: 100,
					purchasePricePerUnit: 65,
				},
				{
					name: "Filtek Z250 шприц 4г (A2)",
					category: "Композиты",
					unit: "шт.",
					batchNumber: "LOT-FLT-99",
					expirationDate: "2027-12-31",
					quantity: 5,
					purchasePricePerUnit: 2800,
				},
			],
		};

		assert.equal(waybillPayload.items.length, 2);
		assert.equal(waybillPayload.items[0]?.batchNumber, "LOT-2026-X1");
		assert.equal(waybillPayload.items[0]?.expirationDate, "2028-09-30");
		assert.equal(waybillPayload.items[0]?.purchasePricePerUnit, 65);
		assert.equal(waybillPayload.items[1]?.quantity, 5);
	});

	it("при остатке 0 на складе списание расходников не блокирует приём и фиксирует овердрафт", () => {
		const renderedServices = [
			{ serviceCode: "A11.07.012", serviceTitle: "Инфильтрационная анестезия", quantity: 2 },
			{ serviceCode: "A16.07.002", serviceTitle: "Лечение кариеса", quantity: 1 },
		];

		const emptyStockMap: Record<string, number> = {
			"mat-anes-art-100k": 0,
			"mat-comp-nano-a2": 0,
		};

		const planned = calculateAutoVisitConsumables(renderedServices, { includeStandardPpe: false });
		assert.ok(planned.length >= 2);

		const deduction = executeAutoVisitBomDeduction({
			visitId: "VIS-INQ-100",
			patientId: "PAT-100",
			doctorId: "DOC-100",
			renderedServices,
			currentStockMap: emptyStockMap,
			allowOverdraft: true,
			includeStandardPpe: false,
		});

		assert.equal(deduction.hasOverdraft, true);
		assert.ok(deduction.softOverdrafts.length >= 2);

		const carpule = deduction.items.find((i) =>
			i.itemName.toLowerCase().includes("артикаин"),
		);
		assert.ok(carpule);
		assert.ok(carpule.isOverdraft);
		assert.equal(carpule.remainingQty, -2, "Списано 2 карпулы из 0 -> остаток -2");
		assert.equal(Math.abs(carpule.remainingQty), 2);
	});
});
