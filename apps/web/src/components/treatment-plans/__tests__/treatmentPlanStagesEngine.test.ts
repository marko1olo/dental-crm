/**
 * treatmentPlanStagesEngine.test.ts — тестирование клинических этапов, 3 вариантов плана,
 * отвязки от хардкода цен (PROD/DEMO), клинического паттерн-матчинга (адентия, мосты, All-on-4/6,
 * депульпированные зубы), детской стоматологии, хронологии остеоинтеграции и финансовой математики.
 */

import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { parseKopecks } from "@dental/shared";
import type { ToothData } from "../../odontogram/ToothChart";
import {
	type CatalogServiceLookupItem,
	calculateLoyaltyBonusDeduction,
	calculateNdflDeduction,
	computeTierInstallments,
	generate3TierPlanComparison,
	generateTierPlanStages,
	generateTreatmentPlanStages,
	getAnatomicalRootCanalCount,
	isDeciduousTooth,
	isMolarOrPremolar,
	matchCatalogService,
	ORDER_804N_DICTIONARY,
	setDemoShowcaseMode,
} from "../treatmentPlanStagesEngine";

const MOCK_CLINIC_CATALOG: readonly CatalogServiceLookupItem[] = [
	{
		id: "cat-diag-ct",
		title: "Компьютерная томография КЛКТ 3D A06.07.004",
		category: "Диагностика",
		basePriceRub: 3500,
		order804nCode: "A06.07.004",
		active: true,
	},
	{
		id: "cat-hyg",
		title: "Профессиональная гигиена полости рта Air-Flow A16.07.050",
		category: "Гигиена",
		basePriceRub: 5000,
		order804nCode: "A16.07.050",
		active: true,
	},
	{
		id: "cat-caries",
		title: "Лечение кариеса нанокомпозитом Estelite A16.07.002.001",
		category: "Терапия",
		basePriceRub: 4800,
		order804nCode: "A16.07.002.001",
		active: true,
	},
	{
		id: "cat-implant",
		title: "Дентальная имплантация Osstem TS-III A16.07.054.001",
		category: "Хирургия",
		basePriceRub: 42000,
		order804nCode: "A16.07.054.001",
		active: true,
	},
	{
		id: "cat-crown",
		title: "Коронка из диоксида циркония Prettau A16.07.004.001",
		category: "Ортопедия",
		basePriceRub: 26000,
		order804nCode: "A16.07.004.001",
		active: true,
	},
];

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
			AllOn4SurgicalGuide: "A16.07.054",
			DentalImplantation: "A16.07.054.001",
			AllOn4Implantation: "A16.07.054.001",
			MultiUnitAbutment: "A16.07.006.002",
			IntraoralScanning3D: "A02.07.010",
			InlayOnlay: "A16.07.003",
			CrownZirconia: "A16.07.004.001",
			CrownEmaxCeramic: "A16.07.004.002",
			BridgeProsthesis: "A16.07.005",
			AllOn4Prosthesis: "A16.07.035",
			ImplantCrownProsthetics: "A16.07.006",
		};

		for (const [key, code] of Object.entries(expectedCodes)) {
			const def = ORDER_804N_DICTIONARY[key];
			assert.ok(def, "Определение для " + key + " должно существовать");
			assert.equal(def.code, code, "Код 804н для " + key + " должен быть " + code);
			assert.ok(def.title.length > 0, "Название для " + key + " не должно быть пустым");
			assert.ok(def.defaultPriceRub > 0, "Цена по умолчанию для " + key + " > 0");
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

	test("isMolarOrPremolar корректно определяет жевательную группу зубов", () => {
		assert.equal(isMolarOrPremolar(11), false);
		assert.equal(isMolarOrPremolar(12), false);
		assert.equal(isMolarOrPremolar(13), false);
		assert.equal(isMolarOrPremolar(14), true); // премоляр
		assert.equal(isMolarOrPremolar(16), true); // моляр
		assert.equal(isMolarOrPremolar(35), true); // премоляр
		assert.equal(isMolarOrPremolar(47), true); // моляр
		assert.equal(isMolarOrPremolar(54), false); // молочные зубы исключены
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

describe("treatmentPlanStagesEngine: Price Decoupling (PROD vs DEMO)", () => {
	test("В PROD-режиме без каталога позиции генерируются с priceRub: 0, isDraft: true, requiresManualPricing: true", () => {
		const teeth: ToothData[] = [{ toothNumber: 16, state: "Caries" }];

		const stages = generateTreatmentPlanStages(teeth, undefined, 0, { isDemoMode: false });
		const [stage1] = stages;

		assert.ok(stage1!.items.length > 0);
		const cariesItem = stage1!.items.find((i) => i.toothNumber === 16);
		assert.ok(cariesItem);
		assert.equal(cariesItem.priceRub, 0);
		assert.equal(cariesItem.unitPriceRub, 0);
		assert.equal(cariesItem.isDraft, true);
		assert.equal(cariesItem.requiresManualPricing, true);
		assert.equal(cariesItem.fromCatalog, false);
	});

	test("При наличии каталога клиники позиции берут реальную цену из каталога", () => {
		const teeth: ToothData[] = [{ toothNumber: 16, state: "Caries" }];

		const stages = generateTreatmentPlanStages(teeth, MOCK_CLINIC_CATALOG, 0, { isDemoMode: false });
		const [stage1] = stages;

		const cariesItem = stage1!.items.find((i) => i.toothNumber === 16);
		assert.ok(cariesItem);
		assert.equal(cariesItem.priceRub, 4800);
		assert.equal(cariesItem.unitPriceRub, 4800);
		assert.equal(cariesItem.isDraft, false);
		assert.equal(cariesItem.requiresManualPricing, false);
		assert.equal(cariesItem.fromCatalog, true);
		assert.equal(cariesItem.priceId, "cat-caries");
	});

	test("В DEMO-режиме ненайденные услуги берут демонстрационные справочные цены", () => {
		const teeth: ToothData[] = [{ toothNumber: 16, state: "Caries" }];

		const stages = generateTreatmentPlanStages(teeth, undefined, 0, { isDemoMode: true });
		const [stage1] = stages;

		const cariesItem = stage1!.items.find((i) => i.toothNumber === 16);
		assert.ok(cariesItem);
		assert.equal(cariesItem.priceRub, 4800);
		assert.equal(cariesItem.isDraft, false);
		assert.equal(cariesItem.requiresManualPricing, false);
	});
});

describe("treatmentPlanStagesEngine: Clinical Pattern Matching", () => {
	test("Паттерн 1 отсутствующий зуб: генерирует 1 имплантат в Этапе 2 и 1 коронку на имплантате в Этапе 3", () => {
		const teeth: ToothData[] = [{ toothNumber: 36, state: "Missing" }];

		const stages = generateTreatmentPlanStages(teeth, undefined, 0, { isDemoMode: true });
		const [, stage2, stage3] = stages;

		// Этап 2: Имплантация
		assert.ok(stage2!.items.some((i) => i.toothNumber === 36 && i.code804n === "A16.07.054.001"));
		assert.ok(stage2!.items.some((i) => i.toothNumber === 36 && i.code804n === "A16.07.054"));

		// Этап 3: Протезирование на имплантате
		assert.ok(stage3!.items.some((i) => i.toothNumber === 36 && i.code804n === "A16.07.006"));
	});

	test("Паттерн 3 отсутствующих зуба подряд (34, 35, 36): генерирует 2 имплантата на краях (34, 36) и мост 3 ед. в Этапе 3 (0 имплантатов на 35)", () => {
		const teeth: ToothData[] = [
			{ toothNumber: 34, state: "Missing" },
			{ toothNumber: 35, state: "Missing" },
			{ toothNumber: 36, state: "Missing" },
		];

		const stages = generateTreatmentPlanStages(teeth, undefined, 0, { isDemoMode: true });
		const [, stage2, stage3] = stages;

		// Этап 2: Имплантаты только на 34 и 36
		assert.ok(stage2!.items.some((i) => i.toothNumber === 34 && i.code804n === "A16.07.054.001"));
		assert.ok(stage2!.items.some((i) => i.toothNumber === 36 && i.code804n === "A16.07.054.001"));
		// На средний зуб 35 имплантат НЕ ставится!
		assert.equal(stage2!.items.some((i) => i.toothNumber === 35 && i.code804n === "A16.07.054.001"), false);

		// Этап 3: Мостовидный протез на 3 единицы с опорой на 2 имплантата
		const bridgeItem = stage3!.items.find((i) => i.code804n === "A16.07.005");
		assert.ok(bridgeItem);
		assert.deepEqual(bridgeItem.relatedToothNumbers, [34, 35, 36]);
	});

	test("Паттерн тотальной адентии (> 10 отсутствующих зубов): генерирует протокол All-on-4 / All-on-6", () => {
		// 14 отсутствующих зубов на верхней челюсти
		const teeth: ToothData[] = [
			17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27,
		].map((t) => ({ toothNumber: t, state: "Missing" as const }));

		const stages = generateTreatmentPlanStages(teeth, undefined, 0, { isDemoMode: true });
		const [, stage2, stage3] = stages;

		// Этап 2: Шаблон All-on-4 + Установка 4 имплантатов + 4 Мультиюнита
		assert.ok(stage2!.items.some((i) => i.code804n === "A16.07.054"));
		assert.ok(stage2!.items.some((i) => i.code804n === "A16.07.054.001"));
		const multiUnit = stage2!.items.find((i) => i.code804n === "A16.07.006.002");
		assert.ok(multiUnit);
		assert.equal(multiUnit.quantity, 4);

		// Этап 3: Несъемный армированный протез All-on-4
		assert.ok(stage3!.items.some((i) => i.code804n === "A16.07.035"));
	});

	test("Паттерн депульпированных моляров и премоляров: коффердам, обработка каналов, обтурация, билдап и коронка в Этап 3", () => {
		const teeth: ToothData[] = [
			{ toothNumber: 16, state: "Pulpitis" }, // верхний моляр: 4 канала
		];

		const stages = generateTreatmentPlanStages(teeth, undefined, 0, { isDemoMode: true });
		const [stage1, , stage3] = stages;

		// Этап 1: Коффердам (A16.07.093), обработка 4 каналов (A16.07.030.004), обтурация (A16.07.008.004), билдап (A16.07.003.001)
		assert.ok(stage1!.items.some((i) => i.toothNumber === 16 && i.code804n === "A16.07.093"));
		assert.ok(stage1!.items.some((i) => i.toothNumber === 16 && i.code804n === "A16.07.030.004"));
		assert.ok(stage1!.items.some((i) => i.toothNumber === 16 && i.code804n === "A16.07.008.004"));
		assert.ok(stage1!.items.some((i) => i.toothNumber === 16 && i.code804n === "A16.07.003.001"));

		// Этап 3: Ортопедическая защита коронкой из диоксида циркония (A16.07.004.001)
		assert.ok(stage3!.items.some((i) => i.toothNumber === 16 && i.code804n === "A16.07.004.001"));
	});

	test("Детская стоматология: кариес, пульпотомия с коронкой SSC и удаление молочного зуба", () => {
		const pedTeeth: ToothData[] = [
			{ toothNumber: 54, state: "Caries" },
			{ toothNumber: 65, state: "Pulpitis" },
			{ toothNumber: 74, state: "Periodontitis" },
		];

		const stages = generateTreatmentPlanStages(pedTeeth, undefined, 0, { isDemoMode: true });
		const [s1, s2, s3] = stages;

		// Кариес молочного зуба в этап 1 (A16.07.002.001)
		assert.ok(s1!.items.some((i) => i.toothNumber === 54 && i.category === "Детская терапия"));

		// Пульпотомия молочного моляра (A16.07.008.001) в этап 1 + защитная коронка SSC (A16.07.004.003) в этап 3
		assert.ok(s1!.items.some((i) => i.toothNumber === 65 && i.code804n === "A16.07.008.001"));
		assert.ok(s3!.items.some((i) => i.toothNumber === 65 && i.code804n === "A16.07.004.003"));

		// Удаление молочного зуба с периодонтитом в этап 2 (A16.07.001) без взрослого имплантата
		assert.ok(s2!.items.some((i) => i.toothNumber === 74 && i.code804n === "A16.07.001"));
		assert.equal(s2!.items.some((i) => i.toothNumber === 74 && i.code804n === "A16.07.054.001"), false);
	});
});

describe("treatmentPlanStagesEngine: Stage Linkage & Chronology", () => {
	test("Фиксирует хронологию этапов: Этап 1 (2 нед), Этап 2 (16 нед при имплантации), Этап 3 (4 нед с 3D-сканированием)", () => {
		const teeth: ToothData[] = [
			{ toothNumber: 16, state: "Caries" },
			{ toothNumber: 36, state: "Missing" },
		];

		const stages = generateTreatmentPlanStages(teeth, undefined, 0, { isDemoMode: true });
		const [s1, s2, s3] = stages;

		assert.equal(s1!.estimatedWeeks, 2);
		assert.equal(s2!.estimatedWeeks, 16); // 16 недель = 4 месяца (период остеоинтеграции)
		assert.equal(s3!.estimatedWeeks, 4);

		// В Этапе 3 первой позицией идет 3D-сканирование
		assert.equal(s3!.items[0]?.code804n, "A02.07.010");
	});
});

describe("treatmentPlanStagesEngine: 3-Option Comparison (Эконом, Стандарт, Оптимальный)", () => {
	test("Генерирует 3 варианта с корректной финансовой и клинической иерархией в DEMO-режиме", () => {
		const teeth: ToothData[] = [
			{ toothNumber: 16, state: "Caries" },
			{ toothNumber: 26, state: "Pulpitis" },
			{ toothNumber: 36, state: "Missing" },
		];

		const tiers = generate3TierPlanComparison(teeth, undefined, 0, 0, { isDemoMode: true });
		assert.equal(tiers.length, 3);

		const [econ, std, opt] = tiers;

		assert.equal(econ?.tierId, "economy");
		assert.equal(std?.tierId, "standard");
		assert.equal(opt?.tierId, "optimum");

		assert.equal(opt?.isRecommended, true);
		assert.equal(std?.isRecommended, false);
		assert.equal(econ?.isRecommended, false);

		// Ценовая иерархия: Эконом < Стандарт < Оптимальный
		assert.ok(
			econ!.totalRub < std!.totalRub,
			"Эконом (" + econ!.totalRub + ") должен быть < Стандарт (" + std!.totalRub + ")",
		);
		assert.ok(
			std!.totalRub < opt!.totalRub,
			"Стандарт (" + std!.totalRub + ") должен быть < Оптимальный (" + opt!.totalRub + ")",
		);

		assert.equal(econ?.warrantyYears, 1);
		assert.equal(std?.warrantyYears, 2);

		assert.ok(econ!.materialsList.length >= 3);
		assert.ok(std!.materialsList.length >= 3);
		assert.ok(opt!.materialsList.length >= 3);
		assert.ok(opt!.keyAdvantages.length >= 3);

		assert.ok(econ!.monthlyInstallment12Rub > 0);
		assert.ok(std!.monthlyInstallment12Rub > 0);
		assert.ok(opt!.monthlyInstallment12Rub > 0);

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
			assert.equal(sumParts, totalKopecks, "Сумма частей для " + months + " мес. должна быть в точности равна общей сумме");
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
		// Резцы и клыки: 1 канал
		assert.equal(getAnatomicalRootCanalCount(11), 1);
		assert.equal(getAnatomicalRootCanalCount(21), 1);
		assert.equal(getAnatomicalRootCanalCount(33), 1);
		assert.equal(getAnatomicalRootCanalCount(43), 1);

		// Верхние первые премоляры (14, 24): 2 канала
		assert.equal(getAnatomicalRootCanalCount(14), 2);
		assert.equal(getAnatomicalRootCanalCount(24), 2);

		// Верхние вторые премоляры (15, 25): 1 канал
		assert.equal(getAnatomicalRootCanalCount(15), 1);
		assert.equal(getAnatomicalRootCanalCount(25), 1);

		// Нижние моляры (36, 46): 3 канала
		assert.equal(getAnatomicalRootCanalCount(36), 3);
		assert.equal(getAnatomicalRootCanalCount(46), 3);

		// Верхние моляры (16, 26): 4 канала
		assert.equal(getAnatomicalRootCanalCount(16), 4);
		assert.equal(getAnatomicalRootCanalCount(26), 4);
	});

	test("Авто-генерация этапов назначает точные коды A16.07.008.001..004 в зависимости от зуба", () => {
		const teeth: ToothData[] = [
			{ toothNumber: 11, state: "Pulpitis" }, // 1 канал -> A16.07.008.001
			{ toothNumber: 24, state: "Pulpitis" }, // 2 канала -> A16.07.008.002
			{ toothNumber: 36, state: "Pulpitis" }, // 3 канала -> A16.07.008.003
			{ toothNumber: 16, state: "Pulpitis" }, // 4 канала -> A16.07.008.004
		];

		const stages = generateTreatmentPlanStages(teeth, undefined, 0, { isDemoMode: true });
		const stage1 = stages[0]!;

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

		const stages = generateTreatmentPlanStages(teeth, undefined, 0, { isDemoMode: true });
		const stage1 = stages[0]!;

		assert.ok(stage1.items.some((i) => i.toothNumber === 36 && i.code804n === "A16.07.008.004"));
	});
});

describe("treatmentPlanStagesEngine: Orthopedic Laboratory Work Order Extraction (Crowns, Bridges, Dentures)", () => {
	test("Извлекает ортопедические зубы для наряд-заказа в лабораторию при коронках и мостах", () => {
		const teeth: ToothData[] = [
			{ toothNumber: 11, state: "Crown" },
			{ toothNumber: 21, state: "Crown" },
			{ toothNumber: 36, state: "Missing" }, // Имплант + коронка
		];

		const stages = generateTreatmentPlanStages(teeth, undefined, 0, { isDemoMode: true });
		const stage3 = stages.find((s) => s.stageKind === "stage_3_orthopedics");

		assert.ok(stage3, "Ортопедический этап должен существовать");
		assert.equal(stage3?.stageNumber, 3);
		assert.ok(stage3!.items.length >= 2, "Должно быть как минимум 2 ортопедические процедуры");

		// Проверяем наличие коронки на 11 и 21, и коронки на имплантате на 36
		const stageTeeth = stage3!.items
			.map((it) => it.toothNumber)
			.filter((t): t is number => typeof t === "number" && t > 0);

		assert.ok(stageTeeth.includes(11), "Зуб 11 должен быть в ортопедическом этапе");
		assert.ok(stageTeeth.includes(21), "Зуб 21 должен быть в ортопедическом этапе");
		assert.ok(stageTeeth.includes(36), "Зуб 36 должен быть в ортопедическом этапе");
	});

	test("Определяет ортопедические номенклатурные коды Приказа 804н (коронки, мосты, вкладки, абатменты)", () => {
		const orthoCodes = [
			"A16.07.003", // Вкладка Inlay/Onlay
			"A16.07.004.001", // Коронка из диоксида циркония
			"A16.07.004.002", // Коронка/винир E.max
			"A16.07.004.003", // Детская коронка
			"A16.07.005", // Мостовидный протез
			"A16.07.006", // Коронка на имплантате с абатментом
		];

		for (const code of orthoCodes) {
			const matching = Object.values(ORDER_804N_DICTIONARY).find((d) => d.code === code);
			assert.ok(matching, "Процедура " + code + " должна присутствовать в словаре 804н");
			assert.equal(matching.stageKind, "stage_3_orthopedics");
			assert.equal(matching.stageNumber, 3);
		}
	});
});
