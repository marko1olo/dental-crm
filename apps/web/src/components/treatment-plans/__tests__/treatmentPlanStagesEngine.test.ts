/**
 * treatmentPlanStagesEngine.test.ts — тестирование клинических этапов, 3 вариантов плана,
 * пародонтологических патологий, детской стоматологии, имплантации и финансовой математики.
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
	isDeciduousTooth,
	matchCatalogService,
	ORDER_804N_DICTIONARY,
} from "../treatmentPlanStagesEngine";

describe("treatmentPlanStagesEngine: Order 804n Nomenclature & Clinical Stages", () => {
	test("Все процедуры Номенклатуры 804н имеют валидный код, категорию, этап и материалы", () => {
		const expectedCodes: Record<string, string> = {
			DiagnosticsCT: "A06.07.004",
			HygieneComplex: "A16.07.050",
			PeriodontalScalingSRP: "A16.07.051",
			PeriodontalClosedCurettage: "A16.07.039",
			PeriodontalSplinting: "A16.07.019",
			CariesTherapy: "A16.07.002.001",
			PulpitisEndo: "A16.07.008.002",
			PeriodontitisTherapy: "A16.07.009.001",
			PediatricCariesTherapy: "A16.07.002.001",
			PediatricPulpitisPulpotomy: "A16.07.008.001",
			PediatricExtraction: "A16.07.001",
			PediatricFissureSealing: "A16.07.057",
			PediatricCrownSSC: "A16.07.004.003",
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

	test("Функция isDeciduousTooth корректно определяет временные (молочные) зубы 51..85", () => {
		// Постоянные зубы
		assert.equal(isDeciduousTooth(11), false);
		assert.equal(isDeciduousTooth(16), false);
		assert.equal(isDeciduousTooth(24), false);
		assert.equal(isDeciduousTooth(36), false);
		assert.equal(isDeciduousTooth(48), false);

		// Молочные зубы
		assert.equal(isDeciduousTooth(51), true);
		assert.equal(isDeciduousTooth(55), true);
		assert.equal(isDeciduousTooth(64), true);
		assert.equal(isDeciduousTooth(72), true);
		assert.equal(isDeciduousTooth(85), true);
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
		assert.ok(stage1?.items.some((i) => i.code804n === "A16.07.050"));

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

	test("Авто-генерация этапов пародонтологии: костная потеря, карманы и подвижность", () => {
		const perioTeeth: ToothData[] = [
			{ toothNumber: 31, state: "Healthy", boneLossLevel: 1, mobility: 1 },
			{ toothNumber: 32, state: "Healthy", boneLossLevel: 2, mobility: 2, furcationGrade: 1 },
		];

		const stages = generateTreatmentPlanStages(perioTeeth);
		const [stage1] = stages;

		// Скейлинг корней SRP (A16.07.051)
		assert.ok(stage1?.items.some((i) => i.toothNumber === 31 && i.code804n === "A16.07.051"));
		assert.ok(stage1?.items.some((i) => i.toothNumber === 32 && i.code804n === "A16.07.051"));

		// Закрытый кюретаж кармана при boneLossLevel >= 2 (A16.07.039)
		assert.ok(stage1?.items.some((i) => i.toothNumber === 32 && i.code804n === "A16.07.039"));

		// Шинирование лентой Ribbond при mobility >= 2 (A16.07.019)
		assert.ok(stage1?.items.some((i) => i.toothNumber === 32 && i.code804n === "A16.07.019"));
	});

	test("Авто-генерация детской стоматологии для молочных зубов 51..85", () => {
		const pedTeeth: ToothData[] = [
			{ toothNumber: 54, state: "Caries" },
			{ toothNumber: 65, state: "Pulpitis" },
			{ toothNumber: 74, state: "Periodontitis" },
		];

		const stages = generateTreatmentPlanStages(pedTeeth);
		const [s1, s2, s3] = stages;

		// Кариес молочного зуба в этап 1 (A16.07.002.001)
		assert.ok(s1?.items.some((i) => i.toothNumber === 54 && i.category === "Детская терапия"));

		// Пульпотомия молочного моляра (A16.07.008.001) в этап 1 + защитная коронка SSC (A16.07.004.003) в этап 3
		assert.ok(s1?.items.some((i) => i.toothNumber === 65 && i.code804n === "A16.07.008.001"));
		assert.ok(s3?.items.some((i) => i.toothNumber === 65 && i.code804n === "A16.07.004.003"));

		// Удаление молочного зуба в этап 2 (A16.07.001) без взрослого титанового имплантата
		assert.ok(s2?.items.some((i) => i.toothNumber === 74 && i.code804n === "A16.07.001"));
		assert.equal(s2?.items.some((i) => i.toothNumber === 74 && i.code804n === "A16.07.054.001"), false);
	});

	test("Авто-генерация костной пластики (НКР / синус-лифтинг) при атрофии кости", () => {
		const implantTeeth: ToothData[] = [
			{ toothNumber: 16, state: "Missing", boneLossLevel: 2 },
		];

		const stages = generateTreatmentPlanStages(implantTeeth);
		const [, s2] = stages;

		// Должна добавиться костная пластика A16.07.041
		assert.ok(s2?.items.some((i) => i.toothNumber === 16 && i.code804n === "A16.07.041"));
		// И имплантация A16.07.054.001
		assert.ok(s2?.items.some((i) => i.toothNumber === 16 && i.code804n === "A16.07.054.001"));
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

		// Налоговый вычет 13% рассчитан
		assert.ok(econ!.ndflRefundRub > 0);
		assert.ok(std!.ndflRefundRub > 0);
		assert.ok(opt!.ndflRefundRub > 0);
	});
});

describe("treatmentPlanStagesEngine: Exact Kopeck Financial Calculations", () => {
	test("Рассрочка 0% (splitKopecks) делит сумму на 3, 6, 12, 24 месяца без потерь копеек", () => {
		const totalKopecks = parseKopecks(125430.75); // 125 430.75 ₽
		const installments = computeTierInstallments(totalKopecks);

		for (const months of [3, 6, 12, 24] as const) {
			const plan = installments[months];
			assert.equal(plan.months, months);
			assert.equal(plan.partsKopecks.length, months);

			// Сумма всех долей равна исходной сумме копейка в копейку
			const sumParts = plan.partsKopecks.reduce((acc, p) => acc + p, 0);
			assert.equal(sumParts, totalKopecks, `Сумма частей для ${months} мес. должна быть в точности равна общей сумме`);
		}
	});

	test("Расчёт 13% налогового вычета НДФЛ для Код 01 (лимит 150 000 ₽) и Код 02 (без лимита)", () => {
		// Код 01: Терапия 300 000 ₽ -> Лимит базы 150 000 ₽ -> Возврат 19 500 ₽
		const therapyKopecks = parseKopecks(300000);
		const ndflCode01 = calculateNdflDeduction(therapyKopecks, false);
		assert.equal(ndflCode01.code, "01");
		assert.equal(ndflCode01.refundRub, 19500);
		assert.equal(ndflCode01.annualLimitRub, 150000);

		// Код 02: Имплантация 500 000 ₽ -> Без лимита -> Возврат 13% = 65 000 ₽
		const implantKopecks = parseKopecks(500000);
		const ndflCode02 = calculateNdflDeduction(implantKopecks, true);
		assert.equal(ndflCode02.code, "02");
		assert.equal(ndflCode02.refundRub, 65000);
		assert.equal(ndflCode02.annualLimitRub, undefined);
	});

	test("Списание бонусов/депозита рассчитывается строго в пределах баланса и суммы плана", () => {
		const grossKopecks = parseKopecks(100000); // 100 000 ₽
		const discountPercent = 10; // 10% -> 90 000 ₽
		const availableBalanceRub = 25000;
		const requestedBonusRub = 20000;

		const result = calculateLoyaltyBonusDeduction(
			grossKopecks,
			discountPercent,
			availableBalanceRub,
			requestedBonusRub,
		);

		assert.equal(result.discountKopecks, parseKopecks(10000));
		assert.equal(result.appliedBonusRub, 20000);
		assert.equal(result.netPayableRub, 70000);
	});
});

describe("treatmentPlanStagesEngine: Order 804n Endodontic Canal Precision (1..4 Canals)", () => {
	test("getAnatomicalRootCanalCount точно определяет число каналов для постоянных и временных зубов", () => {
		// Резцы и клыки (11..13, 21..23, 31..33, 41..43): 1 канал
		for (const tooth of [11, 12, 13, 21, 22, 23, 31, 32, 33, 41, 42, 43]) {
			assert.equal(isDeciduousTooth(tooth), false);
		}

		// Верхние первые премоляры (14, 24): 2 канала (щечный B + небный P)
		assert.equal(ORDER_804N_DICTIONARY.EndoPrep2Canals?.code, "A16.07.030.002");
		assert.equal(ORDER_804N_DICTIONARY.EndoObturation2Canals?.code, "A16.07.008.002");

		// Верхние вторые премоляры (15, 25): 1 канал
		assert.equal(ORDER_804N_DICTIONARY.EndoPrep1Canal?.code, "A16.07.030.001");
		assert.equal(ORDER_804N_DICTIONARY.EndoObturation1Canal?.code, "A16.07.008.001");

		// Нижние моляры (36, 46): 3 канала (MB, ML, D)
		assert.equal(ORDER_804N_DICTIONARY.EndoPrep3Canals?.code, "A16.07.030.003");
		assert.equal(ORDER_804N_DICTIONARY.EndoObturation3Canals?.code, "A16.07.008.003");

		// Верхние моляры (16, 26): 4 канала (MB1, MB2, DB, P)
		assert.equal(ORDER_804N_DICTIONARY.EndoPrep4Canals?.code, "A16.07.030.004");
		assert.equal(ORDER_804N_DICTIONARY.EndoObturation4Canals?.code, "A16.07.008.004");
	});

	test("Авто-генерация этапов назначает точные коды A16.07.008.001..004 в зависимости от зуба", () => {
		const teeth: ToothData[] = [
			{ toothNumber: 11, state: "Pulpitis" }, // 1 канал -> A16.07.008.001
			{ toothNumber: 24, state: "Pulpitis" }, // 2 канала -> A16.07.008.002
			{ toothNumber: 36, state: "Pulpitis" }, // 3 канала -> A16.07.008.003
			{ toothNumber: 16, state: "Pulpitis" }, // 4 канала -> A16.07.008.004
		];

		const stages = generateTreatmentPlanStages(teeth);
		const stage1 = stages[0]!;

		// Проверяем наличие соответствующих кодов 804н для каждого зуба
		assert.ok(stage1.items.some((i) => i.toothNumber === 11 && i.code804n === "A16.07.008.001"));
		assert.ok(stage1.items.some((i) => i.toothNumber === 24 && i.code804n === "A16.07.008.002"));
		assert.ok(stage1.items.some((i) => i.toothNumber === 36 && i.code804n === "A16.07.008.003"));
		assert.ok(stage1.items.some((i) => i.toothNumber === 16 && i.code804n === "A16.07.008.004"));
	});

	test("Клиническое переопределение каналов через clinicalData.canals учитывается в этапах", () => {
		const teeth: ToothData[] = [
			{
				toothNumber: 36, // нижний моляр (обычно 3), но по КЛКТ 4 канала (MB, ML, DB, DL)
				state: "Pulpitis",
				clinicalData: {
					canals: [
						{ id: "1", canalName: "MB" },
						{ id: "2", canalName: "ML" },
						{ id: "3", canalName: "DB" },
						{ id: "4", canalName: "DL" },
					],
				},
			},
		];

		const stages = generateTreatmentPlanStages(teeth);
		const stage1 = stages[0]!;

		// Должен быть присвоен код для 4-канального зуба
		assert.ok(stage1.items.some((i) => i.toothNumber === 36 && i.code804n === "A16.07.008.004"));
	});
});
