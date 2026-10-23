/**
 * insuranceMathCurrency.test.ts — Модульные тесты финансово-математического ядра ДМС,
 * копеечной точности, франшиз и распределения стоимости (DMS vs Patient).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateServiceDmsDistribution,
	formatRubKopecks,
	kopecksToRub,
	rubToKopecks,
} from "./insuranceMath";

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
		const result = calculateServiceDmsDistribution({
			priceRub: 4500,
			quantity: 1,
			isExcluded: false,
		});

		assert.equal(result.lineTotalRub, 4500);
		assert.equal(result.dmsCoveredRub, 4500);
		assert.equal(result.patientPaidRub, 0);
		assert.equal(result.effectiveCoveragePct, 100);
		assert.equal(result.lineTotalRub, result.dmsCoveredRub + result.patientPaidRub);
	});

	it("Услуга из списка исключений (100% оплата пациентом)", () => {
		const result = calculateServiceDmsDistribution({
			priceRub: 35000,
			quantity: 1,
			isExcluded: true,
			isExplicitlyApproved: false,
		});

		assert.equal(result.lineTotalRub, 35000);
		assert.equal(result.dmsCoveredRub, 0);
		assert.equal(result.patientPaidRub, 35000);
		assert.equal(result.effectiveCoveragePct, 0);
		assert.equal(result.lineTotalRub, result.dmsCoveredRub + result.patientPaidRub);
	});

	it("Расчет с процентной франшизой (софинансирование 20% пациентом)", () => {
		const result = calculateServiceDmsDistribution({
			priceRub: 6700,
			quantity: 1,
			franchisePct: 20,
		});

		assert.equal(result.lineTotalRub, 6700);
		assert.equal(result.dmsCoveredRub, 5360);
		assert.equal(result.patientPaidRub, 1340);
		assert.equal(result.effectiveCoveragePct, 80);
		assert.equal(result.lineTotalRub, result.dmsCoveredRub + result.patientPaidRub);
	});

	it("Расчет с фиксированной франшизой (1000 руб за прием)", () => {
		const result = calculateServiceDmsDistribution({
			priceRub: 4500,
			quantity: 1,
			franchiseFixedRub: 1000,
		});

		assert.equal(result.lineTotalRub, 4500);
		assert.equal(result.dmsCoveredRub, 3500);
		assert.equal(result.patientPaidRub, 1000);
		assert.equal(result.lineTotalRub, result.dmsCoveredRub + result.patientPaidRub);
	});

	it("Ограничение остатком гарантийного письма (Letter Limit Capping)", () => {
		const result = calculateServiceDmsDistribution({
			priceRub: 8200,
			quantity: 1,
			remainingLetterLimitRub: 5000,
		});

		assert.equal(result.lineTotalRub, 8200);
		assert.equal(result.dmsCoveredRub, 5000);
		assert.equal(result.patientPaidRub, 3200);
		assert.equal(result.lineTotalRub, result.dmsCoveredRub + result.patientPaidRub);
		assert.ok(result.reason.includes("ограничено остатком гарантийного письма"));
	});
});
