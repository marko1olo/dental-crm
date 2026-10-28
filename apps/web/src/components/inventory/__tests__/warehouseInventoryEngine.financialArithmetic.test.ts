import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	computeAuditLineItem,
	formatKopecksToRublesPlain,
	formatRubCurrency,
	kopecksToRubles,
	numberToRussianWordsKopecks,
	rublesToKopecks,
} from "../warehouseInventoryEngine.js";

describe("Kopeck-Exact Financial Arithmetic & Russian Word Numerals", () => {
	it("Корректно переводит копейки в рубли и рубли в копейки без потери точности", () => {
		assert.equal(kopecksToRubles(100), 1.0);
		assert.equal(kopecksToRubles(125045), 1250.45);
		assert.equal(rublesToKopecks(1250.45), 125045);
		assert.equal(formatKopecksToRublesPlain(650050), "6500.50");
	});

	it("Форматирует суммы в российском денежном формате", () => {
		const formatted = formatRubCurrency(1500.5, false);
		assert.ok(formatted.includes("1") && formatted.includes("500"));
	});

	it("Формирует корректную пропись сумм в рублях и копейках для актов", () => {
		assert.equal(numberToRussianWordsKopecks(0), "Ноль рублей 00 копеек");
		assert.equal(numberToRussianWordsKopecks(100), "Один рубль 00 копеек");
		assert.equal(numberToRussianWordsKopecks(250), "Два рубля 50 копеек");
		assert.equal(numberToRussianWordsKopecks(500), "Пять рублей 00 копеек");
		assert.equal(
			numberToRussianWordsKopecks(1254315),
			"Двенадцать тысяч пятьсот сорок три рубля 15 копеек",
		);
		assert.equal(
			numberToRussianWordsKopecks(100000000),
			"Один миллион рублей 00 копеек",
		);
	});
});

describe("Audit Line Calculations: Match, Surplus & Shortage", () => {
	const refDate = "2026-08-28";

	it("Вычисляет совпадение учетного и фактического наличия (match)", () => {
		const line = computeAuditLineItem(
			{
				itemId: "test_1",
				sku: "SKU-01",
				nameRu: "Тестовый товар 1",
				unitRu: "шт",
				okeiCode: "796",
				batchNumber: "LOT-1",
				expiryDate: "2027-01-01",
				bookQuantity: 10,
				actualQuantity: 10,
				unitCostKopecks: 50000,
			},
			refDate,
		);

		assert.equal(line.discrepancyType, "match");
		assert.equal(line.discrepancyQuantity, 0);
		assert.equal(line.bookTotalKopecks, 500000);
		assert.equal(line.actualTotalKopecks, 500000);
		assert.equal(line.discrepancyCostKopecks, 0);
	});

	it("Вычисляет излишек ТМЦ (surplus)", () => {
		const line = computeAuditLineItem(
			{
				itemId: "test_2",
				sku: "SKU-02",
				nameRu: "Тестовый товар 2",
				unitRu: "шт",
				okeiCode: "796",
				batchNumber: "LOT-2",
				expiryDate: "2027-01-01",
				bookQuantity: 10,
				actualQuantity: 13,
				unitCostKopecks: 20000,
			},
			refDate,
		);

		assert.equal(line.discrepancyType, "surplus");
		assert.equal(line.discrepancyQuantity, 3);
		assert.equal(line.bookTotalKopecks, 200000);
		assert.equal(line.actualTotalKopecks, 260000);
		assert.equal(line.discrepancyCostKopecks, 60000);
	});

	it("Вычисляет недостачу ТМЦ (shortage)", () => {
		const line = computeAuditLineItem(
			{
				itemId: "test_3",
				sku: "SKU-03",
				nameRu: "Тестовый товар 3",
				unitRu: "шт",
				okeiCode: "796",
				batchNumber: "LOT-3",
				expiryDate: "2027-01-01",
				bookQuantity: 10,
				actualQuantity: 7,
				unitCostKopecks: 30000,
			},
			refDate,
		);

		assert.equal(line.discrepancyType, "shortage");
		assert.equal(line.discrepancyQuantity, -3);
		assert.equal(line.bookTotalKopecks, 300000);
		assert.equal(line.actualTotalKopecks, 210000);
		assert.equal(line.discrepancyCostKopecks, -90000);
	});
});
