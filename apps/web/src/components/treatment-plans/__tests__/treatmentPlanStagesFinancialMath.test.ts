/**
 * treatmentPlanStagesFinancialMath.test.ts — Тестирование финансовой математики
 * (рассрочка 0% без потерь копеек, вычет НДФЛ 13%, бонусы) и ортопедо-эндодонтической точности.
 */

import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { parseKopecks } from "@dental/shared";
import type { ToothData } from "../../odontogram/ToothChart";
import {
	calculateLoyaltyBonusDeduction,
	calculateNdflDeduction,
	computeTierInstallments,
	generateTreatmentPlanStages,
	getAnatomicalRootCanalCount,
	SERVICES_CATALOG_DICTIONARY,
} from "../treatmentPlanStagesEngine";

describe("treatmentPlanStagesEngine: Exact Kopeck Financial Calculations", () => {
	test("Рассрочка 0% (splitKopecks) делит сумму на 3, 6, 12, 24 месяца без потерь копеек", () => {
		const totalKopecks = parseKopecks(125430.75);
		const installments = computeTierInstallments(totalKopecks);

		for (const months of [3, 6, 12, 24] as const) {
			const plan = installments[months];
			assert.equal(plan.months, months);
			assert.equal(plan.partsKopecks.length, months);
			const sumParts = plan.partsKopecks.reduce((acc, p) => acc + p, 0);
			assert.equal(sumParts, totalKopecks, "Сумма частей должна быть равна общей сумме");
		}
	});

	test("Расчёт 13% налогового вычета НДФЛ для Код 01 (лимит 150 000 ₽) и Код 02 (без лимита)", () => {
		const therapyKopecks = parseKopecks(300000);
		const ndflCode01 = calculateNdflDeduction(therapyKopecks, false);
		assert.equal(ndflCode01.code, "01");
		assert.equal(ndflCode01.refundRub, 19500);
		assert.equal(ndflCode01.annualLimitRub, 150000);

		const implantKopecks = parseKopecks(500000);
		const ndflCode02 = calculateNdflDeduction(implantKopecks, true);
		assert.equal(ndflCode02.code, "02");
		assert.equal(ndflCode02.refundRub, 65000);
		assert.equal(ndflCode02.annualLimitRub, undefined);
	});

	test("Списание бонусов/депозита рассчитывается строго в пределах баланса и суммы плана", () => {
		const grossKopecks = parseKopecks(100000);
		const result = calculateLoyaltyBonusDeduction(grossKopecks, 10, 25000, 20000);
		assert.equal(result.discountKopecks, parseKopecks(10000));
		assert.equal(result.appliedBonusRub, 20000);
		assert.equal(result.netPayableRub, 70000);
	});
});

describe("treatmentPlanStagesEngine: Endodontic & Orthopedic Laboratory Precision", () => {
	test("getAnatomicalRootCanalCount точно определяет число каналов", () => {
		assert.equal(getAnatomicalRootCanalCount(11), 1);
		assert.equal(getAnatomicalRootCanalCount(14), 2);
		assert.equal(getAnatomicalRootCanalCount(15), 1);
		assert.equal(getAnatomicalRootCanalCount(36), 3);
		assert.equal(getAnatomicalRootCanalCount(16), 4);
	});

	test("Авто-генерация этапов назначает точные коды A16.07.008.001..004", () => {
		const teeth: ToothData[] = [
			{ toothNumber: 11, state: "Pulpitis" },
			{ toothNumber: 24, state: "Pulpitis" },
			{ toothNumber: 36, state: "Pulpitis" },
			{ toothNumber: 16, state: "Pulpitis" },
		];

		const stages = generateTreatmentPlanStages(teeth, undefined, 0, { isDemoMode: true });
		const stage1 = stages[0]!;

		assert.ok(stage1.items.some((i) => i.toothNumber === 11 && i.code804n === "A16.07.008.001"));
		assert.ok(stage1.items.some((i) => i.toothNumber === 24 && i.code804n === "A16.07.008.002"));
		assert.ok(stage1.items.some((i) => i.toothNumber === 36 && i.code804n === "A16.07.008.003"));
		assert.ok(stage1.items.some((i) => i.toothNumber === 16 && i.code804n === "A16.07.008.004"));
	});

	test("Извлекает ортопедические зубы для наряд-заказа в лабораторию при коронках и мостах", () => {
		const teeth: ToothData[] = [
			{ toothNumber: 11, state: "Crown" },
			{ toothNumber: 21, state: "Crown" },
			{ toothNumber: 36, state: "Missing" },
		];

		const stages = generateTreatmentPlanStages(teeth, undefined, 0, { isDemoMode: true });
		const stage3 = stages.find((s) => s.stageKind === "stage_3_orthopedics");

		assert.ok(stage3, "Ортопедический этап должен существовать");
		const stageTeeth = stage3!.items.map((it) => it.toothNumber).filter((t): t is number => typeof t === "number" && t > 0);
		assert.ok(stageTeeth.includes(11) && stageTeeth.includes(21) && stageTeeth.includes(36));
	});

	test("Определяет ортопедические процедуры семантического каталога услуг", () => {
		for (const code of ["A16.07.003", "A16.07.004.001", "A16.07.004.002", "A16.07.005", "A16.07.006"]) {
			const matching = Object.values(SERVICES_CATALOG_DICTIONARY).find((d) => d.code === code);
			assert.ok(matching, "Процедура " + code + " должна быть в каталоге");
			assert.equal(matching.stageKind, "stage_3_orthopedics");
		}
	});
});
