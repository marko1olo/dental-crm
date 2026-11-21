/**
 * insuranceMathCurrency.test.ts — Модульные тесты финансово-математического ядра ДМС,
 * копеечной точности, франшиз и распределения стоимости (DMS vs Patient).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateDmsGuaranteeSplit,
	formatRubKopecks,
	kopecksToRub,
	rubToKopecks,
} from "@dental/shared";

describe("insuranceMath — Копеечная финансовая арифметика ДМС", () => {
	it("rubToKopecks и kopecksToRub должны переводить рубли в копейки без двоичных погрешностей", () => {
		assert.equal(rubToKopecks(0), 0);
		assert.equal(rubToKopecks(1250.5), 125050);
		assert.equal(rubToKopecks(99.99), 9999);
		assert.equal(rubToKopecks(100.005), 10001);

		assert.equal(kopecksToRub(0), 0);
		assert.equal(kopecksToRub(125050), 1250.5);
		assert.equal(kopecksToRub(9999), 99.99);
	});

	it("formatRubKopecks должен форматировать денежные суммы с двумя знаками после запятой", () => {
		const formatted = formatRubKopecks(15000.5);
		assert.ok(formatted.includes("15") && (formatted.includes("50") || formatted.includes(",50")));
		assert.ok(formatted.includes("₽"));
	});
});

describe("insuranceMath — Распределение стоимости (DMS Covered vs Patient Copay)", () => {
	it("Базовое 100% покрытие услуги полисом ДМС", () => {
		const result = calculateDmsGuaranteeSplit(
			{
				id: "letter-1",
				letterNumber: "ГП-1",
				patientFullName: "Тест",
				companyName: "СОГАЗ",
				policyNumber: "П-1",
				maxCoverageRub: 100000,
				usedAmountRub: 0,
				status: "active",
			},
			[{ serviceId: "s-1", category: "therapy", priceRub: 4500, quantity: 1, isExcluded: false }],
		);

		const line = result.lineItems[0];
		assert.ok(line);
		assert.equal(line.totalPriceRub, 4500);
		assert.equal(line.dmsCoveredRub, 4500);
		assert.equal(line.patientCoPayRub, 0);
		assert.equal(line.effectiveCoveragePct, 100);
		assert.equal(line.totalPriceRub, line.dmsCoveredRub + line.patientCoPayRub);
		assert.equal(result.integrityInvariantHolds, true);
	});

	it("Услуга из списка исключений (100% оплата пациентом)", () => {
		const result = calculateDmsGuaranteeSplit(
			{
				id: "letter-1",
				letterNumber: "ГП-1",
				patientFullName: "Тест",
				companyName: "СОГАЗ",
				policyNumber: "П-1",
				maxCoverageRub: 100000,
				usedAmountRub: 0,
				status: "active",
			},
			[{ serviceId: "s-1", category: "therapy", priceRub: 35000, quantity: 1, isExcluded: true, isExplicitlyApproved: false }],
		);

		const line = result.lineItems[0];
		assert.ok(line);
		assert.equal(line.totalPriceRub, 35000);
		assert.equal(line.dmsCoveredRub, 0);
		assert.equal(line.patientCoPayRub, 35000);
		assert.equal(line.effectiveCoveragePct, 0);
		assert.equal(line.totalPriceRub, line.dmsCoveredRub + line.patientCoPayRub);
		assert.equal(result.integrityInvariantHolds, true);
	});

	it("Расчет с процентной франшизой (софинансирование 20% пациентом)", () => {
		const result = calculateDmsGuaranteeSplit(
			{
				id: "letter-1",
				letterNumber: "ГП-1",
				patientFullName: "Тест",
				companyName: "СОГАЗ",
				policyNumber: "П-1",
				maxCoverageRub: 100000,
				usedAmountRub: 0,
				status: "active",
				franchisePct: 20,
				franchiseType: "percent",
			},
			[{ serviceId: "s-1", category: "therapy", priceRub: 6700, quantity: 1 }],
		);

		const line = result.lineItems[0];
		assert.ok(line);
		assert.equal(line.totalPriceRub, 6700);
		assert.equal(line.dmsCoveredRub, 5360);
		assert.equal(line.patientCoPayRub, 1340);
		assert.equal(line.effectiveCoveragePct, 80);
		assert.equal(line.totalPriceRub, line.dmsCoveredRub + line.patientCoPayRub);
		assert.equal(result.integrityInvariantHolds, true);
	});

	it("Расчет с фиксированной франшизой (1000 руб за прием)", () => {
		const result = calculateDmsGuaranteeSplit(
			{
				id: "letter-1",
				letterNumber: "ГП-1",
				patientFullName: "Тест",
				companyName: "СОГАЗ",
				policyNumber: "П-1",
				maxCoverageRub: 100000,
				usedAmountRub: 0,
				status: "active",
				franchiseFixedRub: 1000,
				franchiseType: "fixed_rub",
			},
			[{ serviceId: "s-1", category: "therapy", priceRub: 4500, quantity: 1 }],
		);

		const line = result.lineItems[0];
		assert.ok(line);
		assert.equal(line.totalPriceRub, 4500);
		assert.equal(line.dmsCoveredRub, 3500);
		assert.equal(line.patientCoPayRub, 1000);
		assert.equal(line.totalPriceRub, line.dmsCoveredRub + line.patientCoPayRub);
		assert.equal(result.integrityInvariantHolds, true);
	});

	it("Ограничение остатком гарантийного письма (Letter Limit Capping)", () => {
		const result = calculateDmsGuaranteeSplit(
			{
				id: "letter-1",
				letterNumber: "ГП-1",
				patientFullName: "Тест",
				companyName: "СОГАЗ",
				policyNumber: "П-1",
				maxCoverageRub: 5000,
				usedAmountRub: 0,
				status: "active",
			},
			[{ serviceId: "s-1", category: "therapy", priceRub: 8200, quantity: 1 }],
		);

		const line = result.lineItems[0];
		assert.ok(line);
		assert.equal(line.totalPriceRub, 8200);
		assert.equal(line.dmsCoveredRub, 5000);
		assert.equal(line.patientCoPayRub, 3200);
		assert.equal(line.totalPriceRub, line.dmsCoveredRub + line.patientCoPayRub);
		assert.equal(result.integrityInvariantHolds, true);
		assert.ok(line.splitReason.includes("Превышен остаток лимита ГП"));
	});
});
