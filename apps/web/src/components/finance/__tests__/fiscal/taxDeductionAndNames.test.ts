/**
 * taxDeductionAndNames.test.ts — Tax deduction categories and clean fiscal naming.
 * Mandate 8b: <= 120 lines.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatFiscalItemName, resolveTaxDeductionCategory } from "../../fiscalReceiptEngine.js";

describe("Fiscal Receipt Engine — Tax Deduction & Formatting", () => {
	it("resolves tax deduction category: Code 02 for implants/bone graft, Code 01 for standard therapy/orthopedics", () => {
		assert.equal(resolveTaxDeductionCategory("A16.07.054.001"), "2"); // Имплантация -> Дорогостоящее
		assert.equal(resolveTaxDeductionCategory("A16.07.041"), "2"); // Костная пластика -> Дорогостоящее
		assert.equal(resolveTaxDeductionCategory("A16.07.041.002"), "2"); // Синус-лифтинг -> Дорогостоящее
		assert.equal(resolveTaxDeductionCategory(undefined, "Операция синус-лифтинга закрытый"), "2");
		assert.equal(resolveTaxDeductionCategory(undefined, "Установка дентального имплантата Straumann"), "2");
		assert.equal(resolveTaxDeductionCategory("A16.07.002.001"), "1"); // Кариес -> Стандартное
		assert.equal(resolveTaxDeductionCategory("A16.07.004.001"), "1"); // Коронка -> Стандартное
		assert.equal(resolveTaxDeductionCategory(undefined, "Профессиональная гигиена полости рта"), "1");
	});

	it("formats fiscal item name with tooth number and code within 128 chars limit", () => {
		const name = formatFiscalItemName("Лечение кариеса", "A16.07.002.001", 16);
		assert.equal(name, "Лечение кариеса (зуб №16) [A16.07.002.001]");

		const longName = "A".repeat(150);
		const truncated = formatFiscalItemName(longName, "A16.07.002.001", 16);
		assert.ok(truncated.length <= 128);
		assert.ok(truncated.endsWith("..."));
	});
});
