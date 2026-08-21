/**
 * treatmentPlanStagesEngine.test.ts — тестирование клинических этапов, 3 вариантов плана и финансовой математики.
 */

import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { parseKopecks } from "@dental/shared";
import type { ToothData } from "../../odontogram/ToothChart";
import {
	calculateLoyaltyBonusDeduction,
	calculateNdflDeduction,
	computeTierInstallments,
	generate3TierPlanComparison,
	generateTreatmentPlanStages,
	matchCatalogService,
	ORDER_804N_DICTIONARY,
} from "../treatmentPlanStagesEngine";

describe("treatmentPlanStagesEngine: Order 804n Nomenclature & Clinical Stages", () => {
	test("Все процедуры Номенклатуры 804н имеют валидный код, категорию, этап и материалы", () => {
		const expectedCodes: Record<string, string> = {
			DiagnosticsCT: "A06.07.004",
			HygieneComplex: "A16.07.051",
			CariesTherapy: "A16.07.002.001",
			PulpitisEndo: "A16.07.008.002",
			PeriodontitisTherapy: "A16.07.009.001",
			SimpleExtraction: "A16.07.001.001",
			ComplexExtraction: "A16.07.001.002",
			BoneGraftingSinusLift: "A16.07.041",
			SurgicalNavigationGuide: "A16.07.054",
			DentalImplantation: "A16.07.054.001",
			InlayOnlay: "A16.07.003",
			CrownZirconia: "A16.07.004.001",
			CrownEmaxCeramic: "A16.07.004.002",
			BridgeProsthesis: "A16.07.005",
			ImplantCrownProsthetics: "A16.07.006",
		};

		for (const [key, code] of Object.entries(expectedCodes)) {
			const def = ORDER_804N_DICTIONARY[key];
			assert.ok(def, `Определение для ${key} должно существовать`);
			assert.equal(def.code, code, `Код 804н для ${key} должен быть ${code}`);
			assert.ok(def.title.length > 0, `Название для ${key} не должно быть пустым`);
			assert.ok(def.defaultPriceRub > 0, `Цена по умолчанию для ${key} > 0`);
			assert.ok(def.stageNumber >= 1 && def.stageNumber <= 3, "Номер этапа должен быть 1, 2 или 3");
			assert.ok(def.materialsDefault.length > 0, "Материалы по умолчанию должны быть указаны");
		}
	});

	test("1-Click генерация 3 клинических этапов разделяет терапию, хирургию и ортопедию", () => {
		const teeth: ToothData[] = [
			{ toothNumber: 16, state: "Caries" },
			{ toothNumber: 24, state: "Pulpitis" },
			{ toothNumber: 26, state: "Crown" },
			{ toothNumber: 36, state: "Missing" },
		];

		const stages = generateTreatmentPlanStages(teeth);
		assert.equal(stages.length, 3, "Должно быть ровно 3 этапа");

		const [stage1, stage2, stage3] = stages;

		// Этап 1: Терапия
		assert.equal(stage1?.stageNumber, 1);
		assert.equal(stage1?.stageKind, "stage_1_therapy");
		assert.ok(stage1?.items.some((i) => i.toothNumber === 16 && i.code804n === "A16.07.002.001"));
		assert.ok(stage1?.items.some((i) => i.toothNumber === 24 && i.code804n === "A16.07.008.002"));
		// Диагностика и гигиена добавлены
		assert.ok(stage1?.items.some((i) => i.code804n === "A06.07.004"));
		assert.ok(stage1?.items.some((i) => i.code804n === "A16.07.051"));

		// Этап 2: Хирургия (для зуба 36: удаление + 3D-шаблон + имплантация)
		assert.equal(stage2?.stageNumber, 2);
		assert.equal(stage2?.stageKind, "stage_2_surgery");
		assert.ok(stage2?.items.some((i) => i.toothNumber === 36 && i.code804n === "A16.07.001.001"));
		assert.ok(stage2?.items.some((i) => i.toothNumber === 36 && i.code804n === "A16.07.054"));
		assert.ok(stage2?.items.some((i) => i.toothNumber === 36 && i.code804n === "A16.07.054.001"));

		// Этап 3: Ортопедия (коронка на 26 + коронка на имплантате 36)
		assert.equal(stage3?.stageNumber, 3);
		assert.equal(stage3?.stageKind, "stage_3_orthopedics");
		assert.ok(stage3?.items.some((i) => i.toothNumber === 26 && i.code804n === "A16.07.004.001"));
		assert.ok(stage3?.items.some((i) => i.toothNumber === 36 && i.code804n === "A16.07.006"));

		// Суммы этапов положительные
		assert.ok(stage1!.totalRub > 0);
		assert.ok(stage2!.totalRub > 0);
		assert.ok(stage3!.totalRub > 0);
	});

	test("Интактные зубы (Healthy/Filled) генерируют пустые этапы", () => {
		const healthyTeeth: ToothData[] = [
			{ toothNumber: 11, state: "Healthy" },
			{ toothNumber: 21, state: "Filled" },
		];

		const stages = generateTreatmentPlanStages(healthyTeeth);
		assert.equal(stages.length, 3);
		assert.equal(stages[0]?.items.length, 0);
		assert.equal(stages[1]?.items.length, 0);
		assert.equal(stages[2]?.items.length, 0);
		assert.equal(stages[0]?.totalRub, 0);
	});
});

describe("treatmentPlanStagesEngine: 3-Option Comparison (Эконом, Стандарт, Оптимальный)", () => {
	test("Генерирует 3 варианта с корректной финансовой и клинической иерархией", () => {
		const teeth: ToothData[] = [
			{ toothNumber: 16, state: "Caries" },
			{ toothNumber: 26, state: "Pulpitis" },
			{ toothNumber: 36, state: "Missing" },
		];

		const tiers = generate3TierPlanComparison(teeth);
		assert.equal(tiers.length, 3);

		const [econ, std, opt] = tiers;

		// Проверяем идентификаторы и порядок
		assert.equal(econ?.tierId, "economy");
		assert.equal(std?.tierId, "standard");
		assert.equal(opt?.tierId, "optimum");

		// Оптимальный план рекомендован по умолчанию
		assert.equal(opt?.isRecommended, true);
		assert.equal(std?.isRecommended, false);
		assert.equal(econ?.isRecommended, false);

		// Ценовая иерархия: Эконом < Стандарт < Оптимальный
		assert.ok(
			econ!.totalRub < std!.totalRub,
			`Эконом (${econ!.totalRub}) должен быть < Стандарт (${std!.totalRub})`,
		);
		assert.ok(
			std!.totalRub < opt!.totalRub,
			`Стандарт (${std!.totalRub}) должен быть < Оптимальный (${opt!.totalRub})`,
		);

		// Гарантийные обязательства
		assert.equal(econ?.warrantyYears, 1);
		assert.equal(std?.warrantyYears, 2);

		// Наличие материалов и преимуществ
		assert.ok(econ!.materialsList.length >= 3);
		assert.ok(std!.materialsList.length >= 3);
		assert.ok(opt!.materialsList.length >= 3);
		assert.ok(opt!.keyAdvantages.length >= 3);

		// Рассрочка 12 месяцев рассчитана
		assert.ok(econ!.monthlyInstallment12Rub > 0);
		assert.ok(std!.monthlyInstallment12Rub > 0);
		assert.ok(opt!.monthlyInstallment12Rub > 0);
	});
});

describe("treatmentPlanStagesEngine: NDFL Tax Refund & Installments", () => {
	test("Код 01 ограничивает базу 150 000 руб. (максимальный вычет 19 500 руб.)", () => {
		// 100 000 ₽ -> 13 000 ₽
		const k100k = parseKopecks(100000);
		const res1 = calculateNdflDeduction(k100k, false);
		assert.equal(res1.refundRub, 13000);
		assert.equal(res1.finalPriceWithRefundRub, 87000);
		assert.equal(res1.code, "01");

		// 300 000 ₽ -> 19 500 ₽
		const k300k = parseKopecks(300000);
		const res2 = calculateNdflDeduction(k300k, false);
		assert.equal(res2.refundRub, 19500);
		assert.equal(res2.finalPriceWithRefundRub, 280500);
		assert.equal(res2.code, "01");
	});

	test("Код 02 рассчитывает 13% от полной суммы без ограничений", () => {
		const k300k = parseKopecks(300000);
		const res = calculateNdflDeduction(k300k, true);
		assert.equal(res.refundRub, 39000);
		assert.equal(res.finalPriceWithRefundRub, 261000);
		assert.equal(res.code, "02");
	});

	test("computeTierInstallments рассчитывает рассрочку 0% на 3, 6, 12 и 24 месяца с копеечной точностью", () => {
		const totalKopecks = parseKopecks(120000); // 120 000.00 ₽
		const installments = computeTierInstallments(totalKopecks);

		// 3 мес: 40 000 ₽/мес
		assert.equal(installments[3].months, 3);
		assert.equal(installments[3].monthlyPaymentRub, 40000);
		assert.equal(installments[3].partsKopecks.length, 3);

		// 6 мес: 20 000 ₽/мес
		assert.equal(installments[6].months, 6);
		assert.equal(installments[6].monthlyPaymentRub, 20000);
		assert.equal(installments[6].partsKopecks.length, 6);

		// 12 мес: 10 000 ₽/мес
		assert.equal(installments[12].months, 12);
		assert.equal(installments[12].monthlyPaymentRub, 10000);
		assert.equal(installments[12].partsKopecks.length, 12);

		// 24 мес: 5 000 ₽/мес
		assert.equal(installments[24].months, 24);
		assert.equal(installments[24].monthlyPaymentRub, 5000);
		assert.equal(installments[24].partsKopecks.length, 24);
	});

	test("calculateLoyaltyBonusDeduction корректно списывает бонусы пациента и считает итоговую сумму", () => {
		const grossKopecks = parseKopecks(50000); // 50 000 ₽
		const discountPercent = 10; // 10% скидка = 5 000 ₽
		const patientBalanceRub = 10000; // на счету 10 000 бонусов
		const requestedBonusRub = 3000; // списать 3 000 бонусов

		const result = calculateLoyaltyBonusDeduction(
			grossKopecks,
			discountPercent,
			patientBalanceRub,
			requestedBonusRub,
		);

		// 50 000 - 5 000 (скидка) - 3 000 (бонусы) = 42 000 ₽
		assert.equal(result.appliedBonusRub, 3000);
		assert.equal(result.netPayableRub, 42000);
		assert.equal(result.netPayableKopecks, parseKopecks(42000));
	});

	test("calculateLoyaltyBonusDeduction не позволяет списать больше доступного баланса или суммы счета", () => {
		const grossKopecks = parseKopecks(10000);
		const discountPercent = 0;
		const patientBalanceRub = 2500;
		const requestedBonusRub = 100000; // запрошено больше, чем есть

		const result = calculateLoyaltyBonusDeduction(
			grossKopecks,
			discountPercent,
			patientBalanceRub,
			requestedBonusRub,
		);

		// Ограничивается доступным балансом 2500 ₽ -> к оплате 7500 ₽
		assert.equal(result.appliedBonusRub, 2500);
		assert.equal(result.netPayableRub, 7500);
	});

	test("matchCatalogService корректно находит активные услуги из прейскуранта", () => {
		const catalog = [
			{
				id: "srv_1",
				title: "Лечение кариеса Estelite нанокомпозит",
				category: "therapy",
				basePriceRub: 6200,
				active: true,
			},
			{
				id: "srv_2",
				title: "Имплантация Straumann SLActive",
				category: "surgery",
				basePriceRub: 68000,
				active: true,
			},
		];

		const res = matchCatalogService(catalog, "therapy", ["кариес"], 4500);
		assert.equal(res.fromCatalog, true);
		assert.equal(res.priceRub, 6200);
		assert.equal(res.priceId, "srv_1");
	});
});
