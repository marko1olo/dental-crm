import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateDmsCoverage, type InsuranceCalculationItem } from "@dental/shared";

describe("DMS / Voluntary Health Insurance Coverage Calculation", () => {
	const sampleContract = {
		id: "11111111-1111-1111-1111-111111111111",
		companyName: "СОГАЗ Стоматология ДМС",
		coverageTherapyPct: 100,
		coverageSurgeryPct: 80,
		coverageOrthoPct: 50,
		coverageHygienePct: 100,
		annualLimitRub: 50000,
	};

	it("calculates 100% therapy, 80% surgery, and 50% ortho accurately without drift", () => {
		const items: InsuranceCalculationItem[] = [
			{
				serviceId: "srv-therapy-1",
				serviceName: "Лечение кариеса (терапия)",
				category: "therapy",
				priceRub: 4500,
				quantity: 1,
			},
			{
				serviceId: "srv-surgery-1",
				serviceName: "Удаление зуба сложное",
				category: "surgery",
				priceRub: 5000,
				quantity: 1,
			},
			{
				serviceId: "srv-ortho-1",
				serviceName: "Металлическая коронка",
				category: "prosthetics",
				priceRub: 12000,
				quantity: 1,
			},
		];

		const result = calculateDmsCoverage(sampleContract, items, 0);

		assert.equal(result.totalPriceRub, 21500);
		// Therapy: 4500 * 100% = 4500
		// Surgery: 5000 * 80% = 4000
		// Ortho: 12000 * 50% = 6000
		// Total covered: 4500 + 4000 + 6000 = 14500
		assert.equal(result.totalCoveredRub, 14500);
		// Co-pay: 0 + 1000 + 6000 = 7000
		assert.equal(result.totalPatientCoPayRub, 7000);
		assert.equal(result.remainingAnnualLimitRub, 35500); // 50000 - 14500
		assert.equal(result.totalCoveredRub + result.totalPatientCoPayRub, result.totalPriceRub);
	});

	it("caps insurance payout at remaining annual limit and overflows to patient co-pay", () => {
		const items: InsuranceCalculationItem[] = [
			{
				serviceId: "srv-1",
				category: "therapy",
				priceRub: 30000,
				quantity: 1,
			},
		];

		// Already used 40,000 of 50,000 annual limit -> available is only 10,000
		const result = calculateDmsCoverage(sampleContract, items, 40000);

		assert.equal(result.totalPriceRub, 30000);
		assert.equal(result.totalCoveredRub, 10000); // capped at 10,000
		assert.equal(result.totalPatientCoPayRub, 20000); // 30,000 - 10,000
		assert.equal(result.remainingAnnualLimitRub, 0);
		assert.equal(result.totalCoveredRub + result.totalPatientCoPayRub, result.totalPriceRub);
	});

	it("covers basic diagnostics (consultation, imaging) at 100% and non-medical at 0%", () => {
		const items: InsuranceCalculationItem[] = [
			{
				serviceId: "srv-diag",
				category: "consultation",
				priceRub: 1500,
				quantity: 1,
			},
			{
				serviceId: "srv-img",
				category: "imaging",
				priceRub: 2500,
				quantity: 1,
			},
			{
				serviceId: "srv-doc",
				category: "documents",
				priceRub: 500,
				quantity: 1,
			},
		];

		const result = calculateDmsCoverage(sampleContract, items, 0);

		assert.equal(result.totalPriceRub, 4500);
		assert.equal(result.totalCoveredRub, 4000); // 1500 + 2500
		assert.equal(result.totalPatientCoPayRub, 500); // 500 (documents not covered)
		assert.equal(result.totalCoveredRub + result.totalPatientCoPayRub, result.totalPriceRub);
	});
});
