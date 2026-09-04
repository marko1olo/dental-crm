/**
 * treatmentPlanBundlesEngine.test.ts — тестирование клинико-финансового движка пакетов «под ключ».
 * (Мандат 8e: Запрет на палки в колёса врачам и персоналу / Пакеты под ключ вместо номенклатурного ада).
 */

import assert from "node:assert/strict";

import { describe, it as test } from "node:test";
import { parseKopecks, sumKopecks } from "@dental/shared";
import {
	CLINICAL_BUNDLES,
	type ClinicalBundleId,
	applyClinicalBundleToStages,
	applyClinicalBundleToTier,
	createBundlePlanItems,
	getClinicalBundleById,
} from "../treatmentPlanBundlesEngine";
import type { TreatmentPlanStage, TreatmentPlanTier } from "../types";

describe("treatmentPlanBundlesEngine — 8 эталонных клинических пакетов «под ключ»", () => {
	test("реестр содержит ровно 8 канонических пакетов", () => {
		assert.equal(CLINICAL_BUNDLES.length, 8);
		const bundleIds = CLINICAL_BUNDLES.map((b) => b.id);
		const expectedIds: ClinicalBundleId[] = [
			"caries_turnkey",
			"endo_1canal_turnkey",
			"endo_3canal_turnkey",
			"hygiene_turnkey",
			"extraction_turnkey",
			"implant_turnkey",
			"crown_metalloceramic_turnkey",
			"crown_zirconia_turnkey",
		];
		assert.deepEqual(bundleIds, expectedIds);
	});

	test("математическая сумма позиций каждого пакета строго равна заявленной стоимости в рублях и копейках", () => {
		for (const bundle of CLINICAL_BUNDLES) {
			const itemSumRub = bundle.items.reduce((acc, it) => acc + it.defaultPriceRub, 0);
			assert.equal(
				itemSumRub,
				bundle.totalPriceRub,
				`Пакет ${bundle.id}: сумма позиций (${itemSumRub}) не совпадает с totalPriceRub (${bundle.totalPriceRub})`,
			);
			assert.equal(
				bundle.totalPriceKopecks,
				parseKopecks(bundle.totalPriceRub),
				`Пакет ${bundle.id}: totalPriceKopecks не совпадает с parseKopecks(totalPriceRub)`,
			);
		}
	});

	test("все позиции пакетов имеют валидный код Приказа Минздрава РФ № 804н, материалы и клиническое обоснование", () => {
		for (const bundle of CLINICAL_BUNDLES) {
			assert.ok(bundle.items.length > 0, `Пакет ${bundle.id} должен содержать элементы`);
			for (const item of bundle.items) {
				assert.match(
					item.code804n,
					/^[AB]\d{2}\.\d{2}\.\d{3}(\.\d{3})?$/,
					`Некорректный код 804н у "${item.name}" в пакете ${bundle.id}: ${item.code804n}`,
				);
				assert.ok(
					item.materials.length > 5,
					`Отсутствует описание материалов у "${item.name}" в пакете ${bundle.id}`,
				);
				assert.ok(
					item.clinicalRationale.length > 10,
					`Отсутствует клиническое обоснование у "${item.name}" в пакете ${bundle.id}`,
				);
				assert.ok(
					item.defaultPriceRub > 0,
					`Цена позиции "${item.name}" в пакете ${bundle.id} должна быть > 0`,
				);
			}
		}
	});

	test("пакеты корректно распределены по клиническим этапам", () => {
		const caries = getClinicalBundleById("caries_turnkey")!;
		assert.equal(caries.stageNumber, 1);
		assert.equal(caries.stageKind, "stage_1_therapy");

		const endo1 = getClinicalBundleById("endo_1canal_turnkey")!;
		assert.equal(endo1.stageNumber, 1);
		assert.equal(endo1.stageKind, "stage_1_therapy");

		const endo3 = getClinicalBundleById("endo_3canal_turnkey")!;
		assert.equal(endo3.stageNumber, 1);
		assert.equal(endo3.stageKind, "stage_1_therapy");

		const hyg = getClinicalBundleById("hygiene_turnkey")!;
		assert.equal(hyg.stageNumber, 1);
		assert.equal(hyg.stageKind, "stage_1_therapy");
		assert.equal(hyg.requiresTooth, false);

		const ext = getClinicalBundleById("extraction_turnkey")!;
		assert.equal(ext.stageNumber, 2);
		assert.equal(ext.stageKind, "stage_2_surgery");

		const imp = getClinicalBundleById("implant_turnkey")!;
		assert.equal(imp.stageNumber, 2);
		assert.equal(imp.stageKind, "stage_2_surgery");

		const mc = getClinicalBundleById("crown_metalloceramic_turnkey")!;
		assert.equal(mc.stageNumber, 3);
		assert.equal(mc.stageKind, "stage_3_orthopedics");

		const zr = getClinicalBundleById("crown_zirconia_turnkey")!;
		assert.equal(zr.stageNumber, 3);
		assert.equal(zr.stageKind, "stage_3_orthopedics");
	});
});

describe("treatmentPlanBundlesEngine — создание позиций createBundlePlanItems", () => {
	test("создает массив TreatmentPlanItem с префиксом зуба для зубозависимых пакетов", () => {
		const items = createBundlePlanItems("caries_turnkey", 26);
		assert.equal(items.length, 4);

		for (const it of items) {
			assert.equal(it.toothNumber, 26);
			assert.ok(it.name.startsWith("[Зуб 26] "));
			assert.equal(it.isDraft, false);
			assert.equal(it.fromCatalog, true);
			assert.equal(it.quantity, 1);
			assert.equal(it.discountRub, 0);
			assert.equal(it.priceRub, it.unitPriceRub);
			assert.ok(it.materials && it.materials.length > 0);
			assert.ok(it.clinicalRationale && it.clinicalRationale.length > 0);
		}
	});

	test("использует defaultTooth, если номер зуба не передан для зубозависимого пакета", () => {
		const bundle = getClinicalBundleById("implant_turnkey")!;
		const items = createBundlePlanItems("implant_turnkey");
		assert.equal(items.length, bundle.items.length);
		for (const it of items) {
			assert.equal(it.toothNumber, bundle.defaultTooth);
			assert.ok(it.name.startsWith(`[Зуб ${bundle.defaultTooth}] `));
		}
	});

	test("для профгигиены (hygiene_turnkey) номер зуба не добавляется", () => {
		const items = createBundlePlanItems("hygiene_turnkey");
		assert.equal(items.length, 4);
		for (const it of items) {
			assert.equal(it.toothNumber, undefined);
			assert.ok(!it.name.startsWith("[Зуб "));
		}
	});

	test("выбрасывает ошибку при запросе несуществующего пакета", () => {
		assert.throws(() => {
			createBundlePlanItems("non_existing_bundle" as ClinicalBundleId);
		}, /Неизвестный пакет/);
	});
});

describe("treatmentPlanBundlesEngine — применение пакета к этапам applyClinicalBundleToStages", () => {
	test("создает новый этап, если в плане еще нет этапа нужного типа", () => {
		const initialStages: TreatmentPlanStage[] = [];
		const updatedStages = applyClinicalBundleToStages(initialStages, "caries_turnkey", 36);

		assert.equal(updatedStages.length, 1);
		const stage = updatedStages[0]!;
		assert.equal(stage.stageNumber, 1);
		assert.equal(stage.stageKind, "stage_1_therapy");
		assert.equal(stage.items.length, 4);
		assert.equal(stage.totalRub, 7500);
		assert.equal(stage.totalKopecks, parseKopecks(7500));
		assert.equal(stage.order804nCodes.length, 4);
	});

	test("добавляет позиции в существующий этап и корректно суммирует рубли и копейки", () => {
		const initialStages: TreatmentPlanStage[] = [
			{
				stageNumber: 1,
				stageKind: "stage_1_therapy",
				title: "Этап 1: Терапия",
				subtitle: "Санация",
				clinicalGoal: "Лечение",
				items: [
					{
						id: "existing-1",
						code804n: "A16.07.050",
						name: "Осмотр",
						category: "Терапия",
						priceRub: 1000,
						unitPriceRub: 1000,
						discountRub: 0,
						quantity: 1,
						phase: 1,
						stageKind: "stage_1_therapy",
						isAuto: false,
						fromCatalog: true,
						isDraft: false,
						requiresManualPricing: false,
					},
				],
				totalRub: 1000,
				totalKopecks: parseKopecks(1000),
				estimatedVisits: 1,
				estimatedWeeks: 1,
				order804nCodes: ["A16.07.050"],
			},
		];

		const updatedStages = applyClinicalBundleToStages(initialStages, "caries_turnkey", 11);

		assert.equal(updatedStages.length, 1);
		const stage = updatedStages[0]!;
		assert.equal(stage.items.length, 5);
		assert.equal(stage.totalRub, 1000 + 7500);
		assert.equal(stage.totalKopecks, parseKopecks(8500));
		assert.ok(stage.order804nCodes.includes("A16.07.002.001"));
		assert.ok(stage.order804nCodes.includes("A16.07.050"));
	});

	test("корректно сортирует этапы по stageNumber при добавлении ортопедии к существующей хирургии", () => {
		const initialStages: TreatmentPlanStage[] = [
			{
				stageNumber: 2,
				stageKind: "stage_2_surgery",
				title: "Этап 2: Хирургия",
				subtitle: "Удаление",
				clinicalGoal: "Удаление",
				items: [],
				totalRub: 0,
				totalKopecks: parseKopecks(0),
				estimatedVisits: 1,
				estimatedWeeks: 2,
				order804nCodes: [],
			},
		];

		const updated = applyClinicalBundleToStages(initialStages, "crown_zirconia_turnkey", 16);
		assert.equal(updated.length, 2);
		const stage0 = updated[0]!;
		const stage1 = updated[1]!;
		assert.equal(stage0.stageNumber, 2);
		assert.equal(stage1.stageNumber, 3);
		assert.equal(stage1.stageKind, "stage_3_orthopedics");
		assert.equal(stage1.totalRub, 30500);
	});
});

describe("treatmentPlanBundlesEngine — применение пакета к тарифу applyClinicalBundleToTier", () => {
	test("пересчитывает общие суммы тарифа, вычет НДФЛ 13% и рассрочку 0%", () => {
		const initialTier: TreatmentPlanTier = {
			tierId: "optimum",
			title: "Оптимум",
			subtitle: "Оптимальный клинический баланс",
			badge: "Популярный",
			badgeClass: "badge-blue",
			borderClass: "border-blue",
			isRecommended: true,
			totalRub: 0,
			totalKopecks: parseKopecks(0),
			durationWeeks: 4,
			durationVisits: 3,
			warrantyYears: 2,
			materialsHeadline: "Премиум композиты",
			materialsList: ["Estelite", "Osstem"],
			keyAdvantages: ["Надежность"],
			stages: [],
			itemsCount: 0,
			ndflRefundRub: 0,
			priceWithNdflRefundRub: 0,
			monthlyInstallment12Rub: 0,
			installments: {
				3: { months: 3, monthlyPaymentKopecks: parseKopecks(0), monthlyPaymentRub: 0, partsKopecks: [parseKopecks(0), parseKopecks(0), parseKopecks(0)], remainderKopecks: parseKopecks(0) },
				6: { months: 6, monthlyPaymentKopecks: parseKopecks(0), monthlyPaymentRub: 0, partsKopecks: Array(6).fill(parseKopecks(0)), remainderKopecks: parseKopecks(0) },
				12: { months: 12, monthlyPaymentKopecks: parseKopecks(0), monthlyPaymentRub: 0, partsKopecks: Array(12).fill(parseKopecks(0)), remainderKopecks: parseKopecks(0) },
				24: { months: 24, monthlyPaymentKopecks: parseKopecks(0), monthlyPaymentRub: 0, partsKopecks: Array(24).fill(parseKopecks(0)), remainderKopecks: parseKopecks(0) },
			},
			ndflDetails: {
				code: "01",
				codeDescription: "",
				isHighCostCode02: false,
				baseKopecks: parseKopecks(0),
				refundKopecks: parseKopecks(0),
				refundRub: 0,
				finalPriceWithRefundRub: 0,
			},
		};

		const updatedTier = applyClinicalBundleToTier(initialTier, "implant_turnkey", 36);

		assert.equal(updatedTier.totalRub, 41500);
		assert.equal(updatedTier.totalKopecks, parseKopecks(41500));
		assert.equal(updatedTier.itemsCount, 4);

		// Имплантация — дорогостоящее лечение (Код 02) по НК РФ
		assert.ok(updatedTier.ndflDetails);
		assert.equal(updatedTier.ndflDetails.code, "02");
		assert.equal(updatedTier.ndflDetails.isHighCostCode02, true);
		const expectedRefund13 = Math.round(41500 * 0.13);
		assert.equal(updatedTier.ndflRefundRub, expectedRefund13);
		assert.equal(updatedTier.priceWithNdflRefundRub, 41500 - expectedRefund13);

		// Проверяем 0% рассрочку
		assert.ok(updatedTier.monthlyInstallment12Rub > 0);
		assert.equal(
			updatedTier.installments[12].monthlyPaymentRub,
			Math.round(41500 / 12),
		);
		const sumParts12 = updatedTier.installments[12].partsKopecks.reduce((acc, p) => acc + p, 0);
		assert.equal(sumParts12, updatedTier.totalKopecks);

		// Проверяем график платежей 30/40/30 (StagedPaymentScheduleBreakdown)
		const sched = updatedTier.stagedSchedule!;
		assert.ok(sched);
		assert.equal(sched.isBalanced, true);
		const sumKopecksSched =
			sched.stage1AdvanceTherapyKopecks +
			sched.stage2SurgeryImplantKopecks +
			sched.stage3OrthopedicsKopecks;
		assert.equal(sumKopecksSched, updatedTier.totalKopecks);
		assert.equal(sched.totalKopecks, updatedTier.totalKopecks);
	});
});
