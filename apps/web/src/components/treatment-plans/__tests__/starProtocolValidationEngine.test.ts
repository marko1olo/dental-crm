/**
 * starProtocolValidationEngine.test.ts — тестирование валидации соответствия протоколам СтАР и Номенклатуре 804н.
 */

import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	isValidOrder804nCodeFormat,
	validateTreatmentPlanStarProtocols,
	detectMutuallyExclusiveToothProcedures,
	isToothExtractionItem,
	isToothPreservationOrProstheticItem,
} from "../validation/starProtocolValidationEngine";
import { parseKopecks } from "@dental/shared";
import { generateTreatmentPlanStages } from "../treatmentPlanStagesEngine";
import type { ToothData } from "../../odontogram/ToothChart";
import type { TreatmentPlanItem, TreatmentPlanStage } from "../types";

describe("starProtocolValidationEngine: Order 804n & Star Protocols Compliance", () => {
	test("isValidOrder804nCodeFormat строго проверяет соответствие стандарту Приказа 804н", () => {
		// Валидные коды
		assert.equal(isValidOrder804nCodeFormat("A06.07.004"), true);
		assert.equal(isValidOrder804nCodeFormat("A16.07.002.001"), true);
		assert.equal(isValidOrder804nCodeFormat("A16.07.054.001"), true);
		assert.equal(isValidOrder804nCodeFormat("B01.003.004.005"), true);
		assert.equal(isValidOrder804nCodeFormat("a16.07.050"), true); // регистронезависимо

		// Невалидные коды
		assert.equal(isValidOrder804nCodeFormat("123"), false);
		assert.equal(isValidOrder804nCodeFormat("INVALID_CODE"), false);
		assert.equal(isValidOrder804nCodeFormat("A16-07-001"), false);
		assert.equal(isValidOrder804nCodeFormat(""), false);
	});

	test("Авто-сгенерированный план из одонтограммы проходит валидацию СтАР с высокой оценкой соответствия", () => {
		const teeth: ToothData[] = [
			{ toothNumber: 16, state: "Caries" },
			{ toothNumber: 24, state: "Pulpitis" },
			{ toothNumber: 36, state: "Missing" },
		];

		const stages = generateTreatmentPlanStages(teeth);
		const summary = validateTreatmentPlanStarProtocols(stages);

		assert.ok(summary.complianceScorePercent >= 85, `Оценка соответствия (${summary.complianceScorePercent}%) должна быть >= 85%`);
		assert.notEqual(summary.overallStatus, "NON_COMPLIANT_DEFECTS");
		assert.equal(summary.criticalDefects.length, 0, "Не должно быть критических блокирующих дефектов");
		assert.ok(summary.passedChecksCount > 0, "Должны быть успешно пройденные проверки СтАР");
	});

	test("Обнаруживает отсутствие КЛКТ при планировании дентальной имплантации", () => {
		// Формируем этап без КЛКТ диагностики A06.07.004
		const stageWithoutCT: TreatmentPlanStage = {
			stageNumber: 2,
			stageKind: "stage_2_surgery",
			title: "Хирургический этап",
			subtitle: "Имплантация",
			clinicalGoal: "Имплантация",
			items: [
				{
					id: "imp-36",
					toothNumber: 36,
					code804n: "A16.07.054.001",
					name: "Внутрикостная дентальная имплантация",
					category: "Хирургия",
					unitPriceRub: 42000,
					priceRub: 42000,
					discountRub: 0,
					quantity: 1,
					phase: 2,
					stageKind: "stage_2_surgery",
				},
			],
			totalRub: 42000,
			totalKopecks: 4200000 as any,
			estimatedVisits: 1,
			estimatedWeeks: 8,
			order804nCodes: ["A16.07.054.001"],
		};

		const summary = validateTreatmentPlanStarProtocols([stageWithoutCT]);
		assert.equal(summary.overallStatus, "COMPLIANT_WITH_RECOMMENDATIONS");
		assert.ok(summary.clinicalRecommendations.some((d) => d.ruleId === "star-implant-no-ct-36"));
	});

	test("Обнаруживает невалидный формат кода Номенклатуры 804н", () => {
		const stageWithBadCode: TreatmentPlanStage = {
			stageNumber: 1,
			stageKind: "stage_1_therapy",
			title: "Терапевтический этап",
			subtitle: "Лечение",
			clinicalGoal: "Лечение",
			items: [
				{
					id: "bad-item",
					toothNumber: 11,
					code804n: "НЕВАЛИДНЫЙ_КОД_999",
					name: "Нестандартная услуга",
					category: "Терапия",
					unitPriceRub: 5000,
					priceRub: 5000,
					discountRub: 0,
					quantity: 1,
					phase: 1,
					stageKind: "stage_1_therapy",
				},
			],
			totalRub: 5000,
			totalKopecks: 500000 as any,
			estimatedVisits: 1,
			estimatedWeeks: 1,
			order804nCodes: ["НЕВАЛИДНЫЙ_КОД_999"],
		};

		const summary = validateTreatmentPlanStarProtocols([stageWithBadCode]);
		assert.equal(summary.overallStatus, "COMPLIANT_WITH_RECOMMENDATIONS");
		assert.ok(summary.clinicalRecommendations.some((d) => d.ruleId === "804n-format-bad-item"));
	});

	test("isToothExtractionItem точно определяет удаление зуба и исключает гигиену/снятие коронок", () => {
		const extItem1: TreatmentPlanItem = {
			id: "ext-1",
			toothNumber: 18,
			code804n: "A16.07.001.002",
			name: "Удаление зуба сложное с разъединением корней",
			category: "Хирургия",
			unitPriceRub: 5500,
			priceRub: 5500,
			discountRub: 0,
			quantity: 1,
			phase: 2,
			stageKind: "stage_2_surgery",
		};
		const extItem2: TreatmentPlanItem = {
			id: "ext-2",
			toothNumber: 48,
			code804n: "A16.07.001",
			name: "Операция удаления ретинированного зуба",
			category: "Хирургия",
			unitPriceRub: 8000,
			priceRub: 8000,
			discountRub: 0,
			quantity: 1,
			phase: 2,
			stageKind: "stage_2_surgery",
		};
		// Ложные срабатывания (не удаление зуба!)
		const hygieneItem: TreatmentPlanItem = {
			id: "hyg-1",
			code804n: "A16.07.051",
			name: "Ультразвуковое удаление зубного камня наддесневого",
			category: "Гигиена",
			unitPriceRub: 3500,
			priceRub: 3500,
			discountRub: 0,
			quantity: 1,
			phase: 1,
			stageKind: "stage_1_therapy",
		};
		const crownRemovalItem: TreatmentPlanItem = {
			id: "cr-rem-1",
			toothNumber: 16,
			code804n: "A16.07.053",
			name: "Снятие (удаление) штампованной металлической коронки",
			category: "Ортопедия",
			unitPriceRub: 1200,
			priceRub: 1200,
			discountRub: 0,
			quantity: 1,
			phase: 1,
			stageKind: "stage_1_therapy",
		};

		assert.equal(isToothExtractionItem(extItem1), true);
		assert.equal(isToothExtractionItem(extItem2), true);
		assert.equal(isToothExtractionItem(hygieneItem), false, "Удаление зубного камня не является экстракцией зуба");
		assert.equal(isToothExtractionItem(crownRemovalItem), false, "Снятие/удаление коронки не является экстракцией зуба");
	});

	test("isToothPreservationOrProstheticItem определяет сохранение/коронки естественного зуба и исключает имплантаты", () => {
		const cariesItem: TreatmentPlanItem = {
			id: "c-1",
			toothNumber: 16,
			code804n: "A16.07.002.001",
			name: "Восстановление зуба пломбой (лечение кариеса)",
			category: "Терапия",
			unitPriceRub: 4500,
			priceRub: 4500,
			discountRub: 0,
			quantity: 1,
			phase: 1,
			stageKind: "stage_1_therapy",
		};
		const crownItem: TreatmentPlanItem = {
			id: "cr-1",
			toothNumber: 16,
			code804n: "A16.07.004.001",
			name: "Восстановление зуба коронкой из диоксида циркония",
			category: "Ортопедия",
			unitPriceRub: 25000,
			priceRub: 25000,
			discountRub: 0,
			quantity: 1,
			phase: 3,
			stageKind: "stage_3_orthopedics",
		};
		const implantCrownItem: TreatmentPlanItem = {
			id: "imp-cr-1",
			toothNumber: 36,
			code804n: "A16.07.006.002",
			name: "Протезирование зуба с использованием имплантата коронкой из диоксида циркония",
			category: "Ортопедия",
			unitPriceRub: 35000,
			priceRub: 35000,
			discountRub: 0,
			quantity: 1,
			phase: 3,
			stageKind: "stage_3_orthopedics",
		};

		assert.equal(isToothPreservationOrProstheticItem(cariesItem), true);
		assert.equal(isToothPreservationOrProstheticItem(crownItem), true);
		assert.equal(isToothPreservationOrProstheticItem(implantCrownItem), false, "Коронка на имплантате не протезирует естественный зуб");
	});

	test("detectMutuallyExclusiveToothProcedures выявляет одновременное удаление и коронку на одном FDI зубе", () => {
		const conflictingItems: TreatmentPlanItem[] = [
			{
				id: "ext-16",
				toothNumber: 16,
				code804n: "A16.07.001.001",
				name: "Удаление постоянного зуба сложное",
				category: "Хирургия",
				unitPriceRub: 4500,
				priceRub: 4500,
				discountRub: 0,
				quantity: 1,
				stageKind: "stage_2_surgery",
			},
			{
				id: "crown-16",
				toothNumber: 16,
				code804n: "A16.07.004.001",
				name: "Восстановление зуба коронкой цельнокерамической",
				category: "Ортопедия",
				unitPriceRub: 28000,
				priceRub: 28000,
				discountRub: 0,
				quantity: 1,
				stageKind: "stage_3_orthopedics",
			},
			{
				id: "ext-38",
				toothNumber: 38,
				code804n: "A16.07.001.001",
				name: "Удаление ретинированного зуба мудрости",
				category: "Хирургия",
				unitPriceRub: 6000,
				priceRub: 6000,
				discountRub: 0,
				quantity: 1,
				stageKind: "stage_2_surgery",
			},
			{
				id: "endo-46",
				toothNumber: 46,
				code804n: "A16.07.030.003",
				name: "Инструментальная обработка 3 корневых каналов",
				category: "Терапия",
				unitPriceRub: 9000,
				priceRub: 9000,
				discountRub: 0,
				quantity: 1,
				stageKind: "stage_1_therapy",
			},
		];

		const conflicts = detectMutuallyExclusiveToothProcedures(conflictingItems);
		assert.equal(conflicts.length, 1, "Должен быть обнаружен ровно 1 клинический конфликт");
		assert.equal(conflicts[0]!.toothNumber, 16);
		assert.equal(conflicts[0]!.conflictType, "EXTRACTION_VS_PROSTHETICS");
		assert.ok(conflicts[0]!.descriptionRu.includes("Удаление постоянного зуба сложное"));
		assert.ok(conflicts[0]!.descriptionRu.includes("Восстановление зуба коронкой"));
	});

	test("detectMutuallyExclusiveToothProcedures выявляет одновременное удаление и лечение кариеса", () => {
		const conflictingItems: TreatmentPlanItem[] = [
			{
				id: "ext-24",
				toothNumber: 24,
				code804n: "A16.07.001",
				name: "Удаление зуба простое",
				category: "Хирургия",
				unitPriceRub: 3500,
				priceRub: 3500,
				discountRub: 0,
				quantity: 1,
				stageKind: "stage_2_surgery",
			},
			{
				id: "caries-24",
				toothNumber: 24,
				code804n: "A16.07.002.001",
				name: "Восстановление зуба пломбой светового отверждения",
				category: "Терапия",
				unitPriceRub: 5000,
				priceRub: 5000,
				discountRub: 0,
				quantity: 1,
				stageKind: "stage_1_therapy",
			},
		];

		const conflicts = detectMutuallyExclusiveToothProcedures(conflictingItems);
		assert.equal(conflicts.length, 1);
		assert.equal(conflicts[0]!.toothNumber, 24);
		assert.equal(conflicts[0]!.conflictType, "EXTRACTION_VS_PRESERVATION");
	});

	test("validateTreatmentPlanStarProtocols переводит план с взаимоисключающими процедурами в NON_COMPLIANT_DEFECTS", () => {
		const stageWithConflict: TreatmentPlanStage = {
			stageNumber: 1,
			stageKind: "stage_1_therapy",
			title: "Комплексный этап",
			subtitle: "Конфликтные манипуляции",
			clinicalGoal: "Проверка валидатора",
			items: [
				{
					id: "ext-16",
					toothNumber: 16,
					code804n: "A16.07.001.001",
					name: "Удаление зуба сложное",
					category: "Хирургия",
					unitPriceRub: 4500,
					priceRub: 4500,
					discountRub: 0,
					quantity: 1,
					stageKind: "stage_1_therapy",
				},
				{
					id: "rest-16",
					toothNumber: 16,
					code804n: "A16.07.004.001",
					name: "Восстановление зуба коронкой цельнокерамической",
					category: "Ортопедия",
					unitPriceRub: 28000,
					priceRub: 28000,
					discountRub: 0,
					quantity: 1,
					stageKind: "stage_1_therapy",
				},
			],
			totalRub: 32500,
			totalKopecks: 3250000 as any,
			estimatedVisits: 2,
			estimatedWeeks: 2,
			order804nCodes: ["A16.07.001.001", "A16.07.004.001"],
		};

		const summary = validateTreatmentPlanStarProtocols([stageWithConflict]);
		assert.equal(summary.overallStatus, "NON_COMPLIANT_DEFECTS", "План должен быть забракован как критически не соответствующий");
		assert.ok(summary.errorsCount >= 1, "Должна быть как минимум 1 критическая ошибка");
		assert.ok(
			summary.criticalDefects.some((d) => d.toothNumber === 16 && d.ruleId.startsWith("star-conflict-exclusive-16")),
			"Критический дефект конфликта на зубе 16 должен присутствовать в отчете",
		);
	});

	test("Пересчет количества и цен в кресле врача сохраняет копеечную точность без float drift", () => {
		const unitPriceRub = 3333.33;
		const discountPercent = 10;
		const qty = 3;

		// Расчет по формуле kopeck-exact из TreatmentPlanModule:
		const unitKop = parseKopecks(unitPriceRub);
		assert.equal(unitKop, 333333, "3333.33 рубля должно быть ровно 333333 копейки");

		const unitDiscountKop = Math.round((unitKop * discountPercent) / 100);
		assert.equal(unitDiscountKop, 33333, "10% скидка на единицу должна составлять 33333 копеек");

		const finalUnitKop = unitKop - unitDiscountKop;
		assert.equal(finalUnitKop, 300000, "Итоговая цена единицы = 300000 копеек (3000.00 ₽)");

		const totalLineKop = finalUnitKop * qty;
		assert.equal(totalLineKop, 900000, "3 единицы по 3000.00 ₽ = ровно 900000 копеек (9000.00 ₽)");

		const totalDiscountKop = unitDiscountKop * qty;
		assert.equal(totalDiscountKop, 99999, "Суммарная скидка = ровно 99999 копеек (999.99 ₽)");

		const lineItemPriceRub = totalLineKop / 100;
		const lineItemDiscountRub = totalDiscountKop / 100;

		assert.equal(lineItemPriceRub, 9000);
		assert.equal(lineItemDiscountRub, 999.99);

		// Суммирование в этапе
		const stageTotalKopecks = Math.round(lineItemPriceRub * 100);
		assert.equal(stageTotalKopecks, 900000);
		assert.equal(stageTotalKopecks / 100, 9000);
	});
});

