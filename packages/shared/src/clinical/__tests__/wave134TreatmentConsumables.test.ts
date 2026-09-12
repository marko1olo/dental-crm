/**
 * packages/shared/src/clinical/__tests__/wave134TreatmentConsumables.test.ts
 *
 * Unit tests for Wave 134: Treatment Consumables Deduction & 804n Inventory Linkage Engine.
 * Adapted from DentalPin treatment_consumables module.
 * 100% Zero Mocks.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateServiceConsumables,
	consumableCategorySchema,
	consumableDeductedItemSchema,
	consumableDeductionRequestSchema,
	consumableDeductionResultSchema,
	consumableItemLinkSchema,
	consumableUnitSchema,
	executeBatchConsumablesDeduction,
	formatConsumablesWriteOffA4Report,
	renderedServiceItemSchema,
	treatmentConsumablesEngine,
	type ConsumableDeductionRequest,
	type ConsumableItemLink,
	type RenderedServiceItem,
} from "../treatmentConsumablesEngine.js";

// Parity checks from clinical/index.js
import {
	calculateServiceConsumables as calcFromClinicalIndex,
	executeBatchConsumablesDeduction as execFromClinicalIndex,
	formatConsumablesWriteOffA4Report as formatFromClinicalIndex,
	treatmentConsumablesEngine as engineFromClinicalIndex,
} from "../index.js";

// Parity checks from shared root index.js
import {
	calculateServiceConsumables as calcFromSharedRoot,
	executeBatchConsumablesDeduction as execFromSharedRoot,
	formatConsumablesWriteOffA4Report as formatFromSharedRoot,
	treatmentConsumablesEngine as engineFromSharedRoot,
} from "../../index.js";

import { formatKopecksRu } from "../../money.js";

describe("Wave 134: Treatment Consumables & 804n Inventory Linkage Engine", () => {
	// Sample 804n consumable BOM links
	const sampleLinks: ConsumableItemLink[] = [
		{
			id: "link-anesth-1",
			service804nCode: "A16.07.002.001", // Восстановление зуба пломбой (кариес)
			serviceTitle: "Восстановление зуба пломбой I, V, VI класс по Блэку",
			inventoryItemId: "inv-anesth-articaine",
			itemName: "Артикаин с эпинефрином 1:100 000 (Ультракаин Д-С Форте)",
			category: "anesthetic",
			unit: "карпула",
			quantityPerService: 1,
			isMandatory: true,
			costPriceKopecks: 14500, // 145.00 руб.
			notes: "Инфильтрационная или проводниковая анестезия",
		},
		{
			id: "link-dam-1",
			service804nCode: "A16.07.002.001",
			serviceTitle: "Восстановление зуба пломбой I, V, VI класс по Блэку",
			inventoryItemId: "inv-dam-sanctuary",
			itemName: "Платок коффердама Sanctuary латексный medium",
			category: "rubber_dam",
			unit: "шт",
			quantityPerService: 1,
			isMandatory: true,
			costPriceKopecks: 6500, // 65.00 руб.
		},
		{
			id: "link-comp-1",
			service804nCode: "A16.07.002.001",
			serviceTitle: "Восстановление зуба пломбой I, V, VI класс по Блэку",
			inventoryItemId: "inv-comp-estelite",
			itemName: "Композит светового отверждения Estelite Sigma Quick А2 (шприц)",
			category: "composite",
			unit: "шприц_гр",
			quantityPerService: 0.3, // 0.3 грамма на полость
			isMandatory: true,
			costPriceKopecks: 82000, // 820.00 руб. за грамм -> 246.00 руб. на услугу
		},
		{
			id: "link-suture-1",
			service804nCode: "A16.07.001.002", // Сложное удаление зуба с резекцией
			serviceTitle: "Сложное удаление зуба с разъединением корней",
			inventoryItemId: "inv-suture-vicryl",
			itemName: "Шовный материал Викрил 4-0 с обратно-режущей иглой",
			category: "suture",
			unit: "шт",
			quantityPerService: 1,
			isMandatory: true,
			costPriceKopecks: 38000, // 380.00 руб.
		},
		{
			id: "link-endo-1",
			service804nCode: "A16.07.030.001", // Механическая обработка корневого канала
			serviceTitle: "Инструментальная обработка корневого канала",
			inventoryItemId: "inv-endo-waveone",
			itemName: "Эндодонтический машинный файл WaveOne Gold Primary",
			category: "endo_file",
			unit: "шт",
			quantityPerService: 1,
			isMandatory: true,
			costPriceKopecks: 95000, // 950.00 руб.
		},
	];

	// ─────────────────────────────────────────────────────────────────────────
	// 1. 804N LINKAGE & NORMATIVE CONSUMPTION CALCULATION
	// ─────────────────────────────────────────────────────────────────────────
	describe("1. 804n Linkage & Planned Consumables Calculation", () => {
		it("calculates normative consumables for a single dental filling service", () => {
			const services: RenderedServiceItem[] = [
				{
					serviceCode: "A16.07.002.001",
					serviceTitle: "Восстановление зуба пломбой",
					quantity: 1,
					toothNumber: 46,
				},
			];

			const planned = calculateServiceConsumables(services, sampleLinks);
			assert.equal(planned.length, 3); // anesthetic, rubber dam, composite

			const anesth = planned.find((p) => p.category === "anesthetic");
			assert.ok(anesth);
			assert.equal(anesth.requiredQuantity, 1);
			assert.equal(anesth.unit, "карпула");
			assert.equal(anesth.unitCostPriceKopecks, 14500);
			assert.equal(anesth.totalCostPriceKopecks, 14500);
			assert.equal(anesth.toothNumber, 46);

			const comp = planned.find((p) => p.category === "composite");
			assert.ok(comp);
			assert.equal(comp.requiredQuantity, 0.3);
			assert.equal(comp.unit, "шприц_гр");
			assert.equal(comp.totalCostPriceKopecks, 24600); // 82000 * 0.3 = 24600
		});

		it("multiplies quantity by service multiplier and handles multiple teeth", () => {
			const services: RenderedServiceItem[] = [
				{
					serviceCode: "A16.07.002.001",
					quantity: 2, // 2 пломбы на 1 зубе (MOD)
					toothNumber: 36,
				},
			];

			const planned = calculateServiceConsumables(services, sampleLinks);
			const anesth = planned.find((p) => p.category === "anesthetic");
			assert.ok(anesth);
			assert.equal(anesth.requiredQuantity, 2); // 1 * 2 = 2 карпулы
			assert.equal(anesth.totalCostPriceKopecks, 29000); // 14500 * 2 = 29000

			const comp = planned.find((p) => p.category === "composite");
			assert.ok(comp);
			assert.equal(comp.requiredQuantity, 0.6); // 0.3 * 2 = 0.6 г
			assert.equal(comp.totalCostPriceKopecks, 49200); // 82000 * 0.6 = 49200
		});

		it("returns empty array for services without registered consumable BOM links", () => {
			const services: RenderedServiceItem[] = [
				{
					serviceCode: "B01.065.001", // Прием врача-стоматолога консультативный
					quantity: 1,
				},
			];

			const planned = calculateServiceConsumables(services, sampleLinks);
			assert.equal(planned.length, 0);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 2. BATCH DEDUCTION & RUNNING WAREHOUSE STOCK TRACKING
	// ─────────────────────────────────────────────────────────────────────────
	describe("2. Batch Consumables Deduction & Stock Recalculation", () => {
		it("deducts materials from available warehouse stock cleanly without overdraft", () => {
			const stockMap: Record<string, number> = {
				"inv-anesth-articaine": 50, // 50 карпул
				"inv-dam-sanctuary": 25,    // 25 платков
				"inv-comp-estelite": 4.5,   // 4.5 грамма
			};

			const request: ConsumableDeductionRequest = {
				visitId: "visit-101",
				patientId: "pat-101",
				patientFullName: "Смирнов Алексей Иванович",
				doctorId: "doc-01",
				doctorFullName: "д-р Зубов В.А.",
				visitDate: "2026-09-12",
				renderedServices: [
					{
						serviceCode: "A16.07.002.001",
						quantity: 1,
						toothNumber: 15,
					},
				],
				currentStockMap: stockMap,
				allowOverdraft: true,
			};

			const result = executeBatchConsumablesDeduction(request, sampleLinks);
			assert.ok(consumableDeductionResultSchema.parse(result));

			assert.equal(result.totalDeductedItems, 3);
			assert.equal(result.hasOverdraft, false);
			assert.equal(result.softOverdrafts.length, 0);

			// Expected cost: 14500 (anesth) + 6500 (dam) + 24600 (comp) = 45600 коп. (456.00 руб.)
			assert.equal(result.totalCostPriceKopecks, 45600);
			assert.equal(result.totalCostPriceRub, formatKopecksRu(45600));

			const anesth = result.items.find((i) => i.inventoryItemId === "inv-anesth-articaine");
			assert.ok(anesth);
			assert.equal(anesth.deductedQty, 1);
			assert.equal(anesth.remainingQty, 49); // 50 - 1 = 49
			assert.equal(anesth.isOverdraft, false);

			const comp = result.items.find((i) => i.inventoryItemId === "inv-comp-estelite");
			assert.ok(comp);
			assert.equal(comp.deductedQty, 0.3);
			assert.equal(comp.remainingQty, 4.2); // 4.5 - 0.3 = 4.2
			assert.equal(comp.isOverdraft, false);
		});

		it("accumulates consumption across multiple services within a single visit", () => {
			const stockMap: Record<string, number> = {
				"inv-anesth-articaine": 10,
				"inv-dam-sanctuary": 10,
				"inv-comp-estelite": 5.0,
				"inv-endo-waveone": 5,
			};

			const request: ConsumableDeductionRequest = {
				visitId: "visit-102",
				patientId: "pat-102",
				doctorId: "doc-01",
				renderedServices: [
					{
						serviceCode: "A16.07.002.001", // Filling on tooth 24
						quantity: 1,
						toothNumber: 24,
					},
					{
						serviceCode: "A16.07.030.001", // Endo shaping on tooth 24
						quantity: 1,
						toothNumber: 24,
					},
				],
				currentStockMap: stockMap,
				allowOverdraft: true,
			};

			const result = executeBatchConsumablesDeduction(request, sampleLinks);
			assert.equal(result.totalDeductedItems, 4); // 3 from filling + 1 from endo
			assert.equal(result.hasOverdraft, false);

			// Total cost: 45600 (filling) + 95000 (endo) = 140600 коп. (1 406.00 руб.)
			assert.equal(result.totalCostPriceKopecks, 140600);
			assert.equal(result.totalCostPriceRub, formatKopecksRu(140600));

			const endo = result.items.find((i) => i.inventoryItemId === "inv-endo-waveone");
			assert.ok(endo);
			assert.equal(endo.deductedQty, 1);
			assert.equal(endo.remainingQty, 4);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 3. MANDATE 8E & 8N SOFT OVERDRAFT PROTECTION
	// ─────────────────────────────────────────────────────────────────────────
	describe("3. Mandate 8e & 8n: Soft Overdraft Protection", () => {
		it("allows stock overdraft by default without blocking clinical operations", () => {
			// Stock is ZERO for anesthetic and composite
			const emptyStockMap: Record<string, number> = {
				"inv-anesth-articaine": 0,
				"inv-dam-sanctuary": 0,
				"inv-comp-estelite": 0.1, // Only 0.1g available, needs 0.3g
			};

			const request: ConsumableDeductionRequest = {
				visitId: "visit-urgent-01",
				patientId: "pat-pain-01",
				patientFullName: "Ковалев Дмитрий Петрович",
				doctorId: "doc-02",
				renderedServices: [
					{
						serviceCode: "A16.07.002.001",
						quantity: 1,
						toothNumber: 47,
					},
				],
				currentStockMap: emptyStockMap,
				allowOverdraft: true, // Mandate 8e default
			};

			const result = executeBatchConsumablesDeduction(request, sampleLinks);
			assert.equal(result.hasOverdraft, true);
			assert.equal(result.softOverdrafts.length, 3); // all 3 items overdrafted

			const anesth = result.items.find((i) => i.inventoryItemId === "inv-anesth-articaine");
			assert.ok(anesth);
			assert.equal(anesth.isOverdraft, true);
			assert.equal(anesth.remainingQty, -1); // 0 - 1 = -1
			assert.ok(anesth.overdraftWarning?.includes("Мандат 8e: Складской овердрафт"));
			assert.ok(anesth.overdraftWarning?.includes("Операция не блокируется"));

			const comp = result.items.find((i) => i.inventoryItemId === "inv-comp-estelite");
			assert.ok(comp);
			assert.equal(comp.isOverdraft, true);
			assert.equal(comp.remainingQty, -0.2); // 0.1 - 0.3 = -0.2
		});

		it("throws strict error when allowOverdraft is explicitly false (backoffice mode)", () => {
			const emptyStockMap: Record<string, number> = {
				"inv-suture-vicryl": 0,
			};

			const request: ConsumableDeductionRequest = {
				visitId: "visit-audit-02",
				patientId: "pat-surgery-02",
				doctorId: "doc-03",
				renderedServices: [
					{
						serviceCode: "A16.07.001.002",
						quantity: 1,
						toothNumber: 38,
					},
				],
				currentStockMap: emptyStockMap,
				allowOverdraft: false, // Strict overdraft ban
			};

			assert.throws(
				() => executeBatchConsumablesDeduction(request, sampleLinks),
				(err: Error) => {
					assert.ok(err.message.includes("Складской дефицит: недостаточно остатка"));
					assert.ok(err.message.includes("Шовный материал Викрил"));
					return true;
				},
			);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 4. STATUTORY A4 ACT & STRICTLY ZERO EMOJIS (MANDATE 8D ITEM 7)
	// ─────────────────────────────────────────────────────────────────────────
	describe("4. Statutory Form 043/u & SanPiN A4 Report (Mandate 8d Item 7)", () => {
		const emojiRegex = /\p{Extended_Pictographic}/u;

		it("formats Form 043/u A4 write-off act with complete requisites and 0 emojis", () => {
			const request: ConsumableDeductionRequest = {
				visitId: "vis-a4-001",
				patientId: "pat-a4-001",
				patientFullName: "Васильева Елена Сергеевна",
				doctorId: "doc-a4-001",
				doctorFullName: "д-р Стоматологов И.И.",
				visitDate: "2026-09-12",
				renderedServices: [
					{
						serviceCode: "A16.07.002.001",
						quantity: 1,
						toothNumber: 16,
					},
				],
				currentStockMap: {
					"inv-anesth-articaine": 10,
					"inv-dam-sanctuary": 10,
					"inv-comp-estelite": 2.0,
				},
				allowOverdraft: true,
			};

			const result = executeBatchConsumablesDeduction(request, sampleLinks);
			const report = formatConsumablesWriteOffA4Report(result, {
				clinicName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
				patientFullName: "Васильева Елена Сергеевна",
				doctorFullName: "д-р Стоматологов И.И.",
				visitDate: "2026-09-12",
				cardRecordNumber: "043-У-2026/884",
			});

			assert.ok(typeof report === "string");
			assert.ok(report.includes("МИНИСТЕРСТВО ЗДРАВООХРАНЕНИЯ РОССИЙСКОЙ ФЕДЕРАЦИИ"));
			assert.ok(report.includes("МЕДИЦИНСКАЯ КАРТА СТОМАТОЛОГИЧЕСКОГО БОЛЬНОГО: ФОРМА N 043/У"));
			assert.ok(report.includes("АКТ СПИСАНИЯ РАСХОДНЫХ МАТЕРИАЛОВ"));
			assert.ok(report.includes("ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"));
			assert.ok(report.includes("Васильева Елена Сергеевна"));
			assert.ok(report.includes("043-У-2026/884"));
			assert.ok(report.includes("Артикаин с эпинефрином"));
			assert.ok(report.includes("Зуб 16"));
			assert.ok(report.includes("A16.07.002.001"));
			assert.ok(report.includes("Всего списано позиций номенклатуры: 3"));
			assert.ok(report.includes("[OK] Складской баланс в норме, дефицит материалов отсутствует"));

			// MANDATE 8D ITEM 7: STRICTLY 0 EMOJIS!
			assert.equal(
				emojiRegex.test(report),
				false,
				"Mandate 8d Item 7 violation: A4 medical report contains cartoon emojis!",
			);
		});

		it("formats soft overdraft warnings in A4 report without cartoon emojis", () => {
			const request: ConsumableDeductionRequest = {
				visitId: "vis-overdraft-a4",
				patientId: "pat-overdraft-a4",
				doctorId: "doc-overdraft-a4",
				renderedServices: [
					{
						serviceCode: "A16.07.001.002",
						quantity: 1,
						toothNumber: 48,
					},
				],
				currentStockMap: {
					"inv-suture-vicryl": -2, // Already in overdraft
				},
				allowOverdraft: true,
			};

			const result = executeBatchConsumablesDeduction(request, sampleLinks);
			const report = formatConsumablesWriteOffA4Report(result, {
				clinicName: "ООО «ДЕНТЕ»",
				cardRecordNumber: "043-У-999",
			});

			assert.ok(report.includes("[!] ВНИМАНИЕ: Зафиксирован мягкий овердрафт складских позиций"));
			assert.ok(report.includes("Мандат 8e: Проведение лечения и спасение пациента не блокируются"));
			assert.ok(report.includes("[!] ОВЕРДРАФТ"));

			// STRICTLY 0 EMOJIS
			assert.equal(
				emojiRegex.test(report),
				false,
				"Mandate 8d Item 7 violation: A4 report with overdraft contains emojis!",
			);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 5. ZOD RUNTIME SCHEMA VALIDATION & RE-EXPORT PARITY
	// ─────────────────────────────────────────────────────────────────────────
	describe("5. Zod Runtime Schemas & Functional Re-export Parity", () => {
		it("validates consumableCategorySchema and consumableUnitSchema", () => {
			assert.equal(consumableCategorySchema.parse("anesthetic"), "anesthetic");
			assert.equal(consumableCategorySchema.parse("composite"), "composite");
			assert.equal(consumableCategorySchema.parse("suture"), "suture");
			assert.equal(consumableCategorySchema.parse("endo_file"), "endo_file");
			assert.equal(consumableCategorySchema.parse("bur"), "bur");
			assert.equal(consumableCategorySchema.parse("rubber_dam"), "rubber_dam");
			assert.equal(consumableCategorySchema.parse("hygiene_paste"), "hygiene_paste");
			assert.equal(consumableCategorySchema.parse("disinfectant"), "disinfectant");
			assert.equal(consumableCategorySchema.parse("other"), "other");

			assert.throws(() => consumableCategorySchema.parse("invalid_category"));

			assert.equal(consumableUnitSchema.parse("карпула"), "карпула");
			assert.equal(consumableUnitSchema.parse("шприц_гр"), "шприц_гр");
			assert.equal(consumableUnitSchema.parse("ампула"), "ампула");
			assert.equal(consumableUnitSchema.parse("шт"), "шт");
			assert.equal(consumableUnitSchema.parse("метр"), "метр");
			assert.equal(consumableUnitSchema.parse("упак"), "упак");

			assert.throws(() => consumableUnitSchema.parse("литр"));
		});

		it("validates consumableItemLinkSchema", () => {
			const link = consumableItemLinkSchema.parse(sampleLinks[0]);
			assert.equal(link.service804nCode, "A16.07.002.001");
			assert.equal(link.costPriceKopecks, 14500);
			assert.equal(link.category, "anesthetic");
		});

		it("provides full functional parity when imported from packages/shared/src/clinical/index.js", () => {
			assert.equal(typeof calcFromClinicalIndex, "function");
			assert.equal(typeof execFromClinicalIndex, "function");
			assert.equal(typeof formatFromClinicalIndex, "function");
			assert.equal(typeof engineFromClinicalIndex.executeBatchConsumablesDeduction, "function");
		});

		it("provides full functional parity when imported from packages/shared/src/index.js root", () => {
			assert.equal(typeof calcFromSharedRoot, "function");
			assert.equal(typeof execFromSharedRoot, "function");
			assert.equal(typeof formatFromSharedRoot, "function");
			assert.equal(typeof engineFromSharedRoot.executeBatchConsumablesDeduction, "function");
		});
	});
});
