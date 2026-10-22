import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	calculateWaybillTotals,
	createWaybillItem,
	formatRubCurrency,
	kopecksToRubles,
	rublesToKopecks,
} from "../acceptanceWaybillsEngine.js";

describe("AcceptanceWaybills: Integer Kopecks & Financial Calculations", () => {
	it("безупречно конвертирует рубли в копейки и обратно без погрешностей float", () => {
		assert.equal(rublesToKopecks(0.01), 1);
		assert.equal(rublesToKopecks(1), 100);
		assert.equal(rublesToKopecks(19.99), 1999);
		assert.equal(rublesToKopecks(5420.5), 542050);
		assert.equal(rublesToKopecks(0), 0);

		assert.equal(kopecksToRubles(1), 0.01);
		assert.equal(kopecksToRubles(1999), 19.99);
		assert.equal(kopecksToRubles(542050), 5420.5);
	});

	it("форматирует валюту в рублях с разделителями", () => {
		const formatted = formatRubCurrency(1250050);
		assert.ok(formatted.includes("12") && formatted.includes("500") && formatted.includes("50"));
	});

	it("создает позицию накладной с точным расчетом НДС и итоговых копеек", () => {
		const item = createWaybillItem({
			name: "Перчатки нитриловые",
			category: "СИЗ",
			unit: "уп",
			quantity: 5,
			unitPriceKopecks: 120000,
			vatRate: 20,
			batchNumber: "LOT-GLV-01",
			expirationDate: "2027-12-31",
		});

		assert.equal(item.quantity, 5);
		assert.equal(item.unitPriceKopecks, 120000);
		assert.equal(item.lineSubtotalKopecks, 600000);
		assert.equal(item.vatKopecks, 120000);
		assert.equal(item.lineTotalKopecks, 720000);
	});

	it("рассчитывает медицинские изделия без НДС (0%)", () => {
		const item = createWaybillItem({
			name: "Септанест с адреналином 1:100 000",
			category: "Анестетики",
			unit: "уп (50 карпул)",
			quantity: 2,
			unitPriceKopecks: 580000,
			vatRate: 0,
			batchNumber: "B2409-SEP",
			expirationDate: "2027-06-30",
		});

		assert.equal(item.vatKopecks, 0);
		assert.equal(item.lineSubtotalKopecks, 1160000);
		assert.equal(item.lineTotalKopecks, 1160000);
	});

	it("рассчитывает итоговые суммы по всей накладной со смешанными ставками НДС", () => {
		const itemVat0 = createWaybillItem({
			name: "Септанест",
			category: "Анестетики",
			unit: "уп",
			quantity: 1,
			unitPriceKopecks: 500000,
			vatRate: 0,
			batchNumber: "B1",
			expirationDate: "2027-01-01",
		});

		const itemVat20 = createWaybillItem({
			name: "Перчатки",
			category: "СИЗ",
			unit: "уп",
			quantity: 2,
			unitPriceKopecks: 100000,
			vatRate: 20,
			batchNumber: "B2",
			expirationDate: "2027-01-01",
		});

		const totals = calculateWaybillTotals([itemVat0, itemVat20]);
		assert.equal(totals.totalQuantity, 3);
		assert.equal(totals.subtotalKopecks, 700000);
		assert.equal(totals.totalVatKopecks, 40000);
		assert.equal(totals.totalCostKopecks, 740000);
		assert.equal(totals.subtotalRubles, 7000);
		assert.equal(totals.totalVatRubles, 400);
		assert.equal(totals.totalCostRubles, 7400);
	});
});
