import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	calculateFefoStatus,
	reconcileOverdraftOnReceipt,
	calculateItemTotals,
	calculateWaybillTotals,
	createWaybillItem,
	sortWaybillItemsByFefo,
	validateAcceptanceWaybill,
	type AcceptanceWaybillItem,
} from "../warehouseAcceptance.js";

describe("warehouseAcceptance SSOT (Mandates 8e, 8k, 8n)", () => {
	it("reconciles soft overdraft correctly on arrival of goods", () => {
		// Scenario 1: Soft overdraft of -3 units (deficit during emergency dental shift)
		// Arrival of 10 units -> clears 3 units deficit, leaves 7 in stock, overdraftResolved = true
		const r1 = reconcileOverdraftOnReceipt(-3, 10);
		assert.equal(r1.previousStock, -3);
		assert.equal(r1.clearedDeficit, 3);
		assert.equal(r1.newStockQuantity, 7);
		assert.equal(r1.overdraftResolved, true);

		// Scenario 2: Severe overdraft of -15 units, arrival of only 5 units
		// Clears 5 units deficit, leaves -10 in stock, overdraftResolved = false
		const r2 = reconcileOverdraftOnReceipt(-15, 5);
		assert.equal(r2.previousStock, -15);
		assert.equal(r2.clearedDeficit, 5);
		assert.equal(r2.newStockQuantity, -10);
		assert.equal(r2.overdraftResolved, false);

		// Scenario 3: Normal stock (5 units), arrival of 10 units
		// Deficit cleared = 0, new stock = 15, overdraftResolved = true
		const r3 = reconcileOverdraftOnReceipt(5, 10);
		assert.equal(r3.previousStock, 5);
		assert.equal(r3.clearedDeficit, 0);
		assert.equal(r3.newStockQuantity, 15);
		assert.equal(r3.overdraftResolved, true);
	});

	it("evaluates FEFO status accurately based on expiration dates", () => {
		const now = new Date("2026-10-15T12:00:00Z");

		// Expired
		const expired = calculateFefoStatus("2026-10-10", now);
		assert.equal(expired.fefoStatus, "expired");
		assert.equal(expired.badgeLabelRu, "Просрочено");

		// Critical (<= 30 days)
		const critical = calculateFefoStatus("2026-10-25", now);
		assert.equal(critical.fefoStatus, "critical");
		assert.equal(critical.badgeLabelRu, "Критический срок (≤ 30 дн.)");

		// Warning (<= 90 days)
		const warning = calculateFefoStatus("2026-12-15", now);
		assert.equal(warning.fefoStatus, "warning");
		assert.equal(warning.badgeLabelRu, "Внимание (≤ 90 дн.)");

		// Fresh (> 90 days)
		const fresh = calculateFefoStatus("2027-10-15", now);
		assert.equal(fresh.fefoStatus, "fresh");
		assert.equal(fresh.badgeLabelRu, "Свежая партия");
	});

	it("calculates exact kopeck item and waybill totals without float drift", () => {
		// Item 1: 5 packs of Septanest at 2500.50 RUB = 250050 kopecks each, 0% VAT
		const item1Totals = calculateItemTotals(5, 250050, 0);
		assert.equal(item1Totals.lineSubtotalKopecks, 1250250);
		assert.equal(item1Totals.vatKopecks, 0);
		assert.equal(item1Totals.lineTotalKopecks, 1250250);

		// Item 2: 10 boxes of craft pouches at 1200.00 RUB = 120000 kopecks each, 20% VAT
		const item2Totals = calculateItemTotals(10, 120000, 20);
		assert.equal(item2Totals.lineSubtotalKopecks, 1200000);
		assert.equal(item2Totals.vatKopecks, 240000);
		assert.equal(item2Totals.lineTotalKopecks, 1440000);

		const items: AcceptanceWaybillItem[] = [
			{
				id: "i1",
				name: "Septanest 1:100 000",
				category: "Анестетики",
				unit: "уп",
				batchNumber: "B-2026-01",
				expirationDate: "2027-06-01",
				quantity: 5,
				unitPriceKopecks: 250050,
				vatRate: 0,
				lineSubtotalKopecks: item1Totals.lineSubtotalKopecks,
				vatKopecks: item1Totals.vatKopecks,
				lineTotalKopecks: item1Totals.lineTotalKopecks,
				fefoStatus: "fresh",
				daysUntilExpiration: 200,
			},
			{
				id: "i2",
				name: "Крафт-пакеты 100х200",
				category: "Стерилизация",
				unit: "уп",
				batchNumber: "KP-991",
				expirationDate: "2028-01-01",
				quantity: 10,
				unitPriceKopecks: 120000,
				vatRate: 20,
				lineSubtotalKopecks: item2Totals.lineSubtotalKopecks,
				vatKopecks: item2Totals.vatKopecks,
				lineTotalKopecks: item2Totals.lineTotalKopecks,
				fefoStatus: "fresh",
				daysUntilExpiration: 400,
			},
		];

		const waybillTotals = calculateWaybillTotals(items);
		assert.equal(waybillTotals.totalPositions, 2);
		assert.equal(waybillTotals.totalQuantity, 15);
		assert.equal(waybillTotals.subtotalKopecks, 2450250);
		assert.equal(waybillTotals.totalVatKopecks, 240000);
		assert.equal(waybillTotals.totalCostKopecks, 2690250);
		assert.equal(waybillTotals.totalCostRubles, 26902.5);
	});

	it("sorts items by FEFO (nearest expiration first)", () => {
		const itemA = { expirationDate: "2027-10-01" } as AcceptanceWaybillItem;
		const itemB = { expirationDate: "2026-11-01" } as AcceptanceWaybillItem;
		const itemC = { expirationDate: "2026-12-01" } as AcceptanceWaybillItem;

		const sorted = sortWaybillItemsByFefo([itemA, itemB, itemC]);
		assert.equal(sorted[0].expirationDate, "2026-11-01");
		assert.equal(sorted[1].expirationDate, "2026-12-01");
		assert.equal(sorted[2].expirationDate, "2027-10-01");
	});

	it("validates waybill integrity and catches empty or invalid inputs", () => {
		// Valid waybill
		const validRes = validateAcceptanceWaybill({
			waybillNumber: "ТОРГ-12 №401",
			supplierInn: "7701234567",
			items: [
				createWaybillItem({
					name: "Перчатки нитриловые",
					batchNumber: "GL-44",
					expirationDate: "2027-01-01",
					quantity: 5,
					unitPriceKopecks: 50000,
				}),
			],
		});
		assert.equal(validRes.isValid, true);
		assert.equal(validRes.errors.length, 0);

		// Invalid waybill missing supplier INN and items
		const invalidRes = validateAcceptanceWaybill({
			waybillNumber: "",
			supplierInn: "123", // invalid INN
			items: [],
		});
		assert.equal(invalidRes.isValid, false);
		assert.ok(invalidRes.errors.some((e) => e.includes("номер накладной")));
		assert.ok(invalidRes.errors.some((e) => e.includes("ИНН")));
		assert.ok(invalidRes.errors.some((e) => e.includes("хотя бы одна позиция")));
	});
});
