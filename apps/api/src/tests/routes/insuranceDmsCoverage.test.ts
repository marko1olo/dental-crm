import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateDmsCoverage,
	calculateDmsGuaranteeSplit,
	type DmsGuaranteeLetter,
	type InsuranceCalculationItem,
} from "@dental/shared";

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

describe("DMS Guarantee Letters (Гарантийные письма) & 804n Split Engine", () => {
	const sampleLetter: DmsGuaranteeLetter = {
		id: "gl-001",
		organizationId: "org-1",
		patientId: "pat-1",
		patientFullName: "Сидоров Алексей Петрович",
		policyNumber: "77-ДМС-123456",
		insurerName: "АО «СОГАЗ»",
		letterNumber: "ГП-2026/9001",
		issueDate: "2026-08-01",
		validFrom: "2026-08-01",
		validUntil: "2026-08-31",
		maxCoverageRub: 30000,
		usedAmountRub: 5000,
		franchisePct: 10, // 10% франшиза (пациент сооплачивает 10%)
		franchiseType: "percent" as const,
		franchiseFixedRub: 0,
		programExclusions: ["orthodontics", "whitening"],
		approvedServiceCodes: ["A16.07.002.001", "A16.07.030.001", "B01.003.004.001"],
		approvedTeethFdi: ["16", "17", "26", "46"],
		approvedDiagnosisCodes: ["K02.1", "K04.0"],
		status: "active" as const,
		notes: "",
	};

	it("accurately applies 804n code matching, tooth restriction, franchise, and guarantees kopeck balance", () => {
		const items = [
			// 1. Согласованная услуга 804н на согласованном зубе 16
			{
				serviceId: "s-1",
				serviceCode: "A16.07.002.001",
				serviceName: "Восстановление зуба пломбой (кариес)",
				category: "therapy" as const,
				toothNumber: 16,
				priceRub: 6000,
				discountRub: 0,
				quantity: 1,
			},
			// 2. Услуга 804н НЕ согласована письмом (A16.07.054 - имплантация)
			{
				serviceId: "s-2",
				serviceCode: "A16.07.054.001",
				serviceName: "Дентальная имплантация",
				category: "surgery" as const,
				toothNumber: 16,
				priceRub: 45000,
				discountRub: 0,
				quantity: 1,
			},
			// 3. Согласованная услуга, но на НЕ согласованном зубе (зуб 34)
			{
				serviceId: "s-3",
				serviceCode: "A16.07.002.001",
				serviceName: "Восстановление зуба пломбой",
				category: "therapy" as const,
				toothNumber: 34,
				priceRub: 5500,
				discountRub: 0,
				quantity: 1,
			},
		];

		const result = calculateDmsGuaranteeSplit(sampleLetter, items, {
			visitDate: "2026-08-15",
		});

		assert.equal(result.totalBillRub, 56500); // 6000 + 45000 + 5500
		// Line 1: 6000 - 10% франшиза (600) = 5400 покрыто ДМС, 600 доплата
		// Line 2: 0 покрыто ДМС (не в списке 804н), 45000 доплата
		// Line 3: 0 покрыто ДМС (зуб 34 не в ГП), 5500 доплата
		assert.equal(result.totalDmsCoveredRub, 5400);
		assert.equal(result.totalPatientCoPayRub, 51100);
		assert.equal(result.letterRemainingLimitRub, 19600); // 30000 - 5000 - 5400
		assert.equal(result.integrityInvariantHolds, true);
		assert.equal(result.hasUnapprovedServices, true);
		assert.equal(result.totalDmsCoveredRub + result.totalPatientCoPayRub, result.totalBillRub);
	});

	it("handles guarantee letter limit overflow deterministically", () => {
		const smallLimitLetter: DmsGuaranteeLetter = {
			...sampleLetter,
			maxCoverageRub: 10000,
			usedAmountRub: 8000, // remaining: 2000
			franchisePct: 0,
			notes: "",
		};

		const items = [
			{
				serviceId: "s-1",
				serviceCode: "A16.07.002.001",
				serviceName: "Лечение пульпита",
				category: "therapy" as const,
				toothNumber: 16,
				priceRub: 7500,
				discountRub: 0,
				quantity: 1,
			},
		];

		const result = calculateDmsGuaranteeSplit(smallLimitLetter, items, {
			visitDate: "2026-08-10",
		});

		assert.equal(result.totalBillRub, 7500);
		assert.equal(result.totalDmsCoveredRub, 2000); // capped by 2000 remaining limit
		assert.equal(result.totalPatientCoPayRub, 5500); // 7500 - 2000
		assert.equal(result.letterRemainingLimitRub, 0);
		assert.equal(result.integrityInvariantHolds, true);
	});

	it("rejects expired guarantee letters and routes 100% bill to patient co-pay", () => {
		const items = [
			{
				serviceId: "s-1",
				serviceCode: "A16.07.002.001",
				serviceName: "Лечение кариеса",
				category: "therapy" as const,
				toothNumber: 16,
				priceRub: 5000,
				discountRub: 0,
				quantity: 1,
			},
		];

		// Visit on 2026-09-05, but letter expired on 2026-08-31
		const result = calculateDmsGuaranteeSplit(sampleLetter, items, {
			visitDate: "2026-09-05",
		});

		assert.equal(result.totalBillRub, 5000);
		assert.equal(result.totalDmsCoveredRub, 0);
		assert.equal(result.totalPatientCoPayRub, 5000);
		assert.equal(result.hasUnapprovedServices, true);
		assert.equal(result.integrityInvariantHolds, true);
	});
});
