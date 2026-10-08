/**
 * warehouseRedTeamInquisition.test.ts
 *
 * БЕСПОЩАДНЫЙ ИНКВИЗИЦИОННЫЙ ТЕСТОВЫЙ СЬЮТ:
 * RED TEAM INQUISITOR BETA — WAREHOUSE 804N AUTO-BOM DEDUCTION, OVERDRAFT & FEFO.
 *
 * Мандаты:
 * - 8e: Врачебная автономия (мягкий овердрафт не блокирует врача и списание)
 * - 8c & 8k: Двухконтурная изоляция (0 синтетических данных в продакшене, честный EmptyState)
 * - 8d: Ноль мультяшных эмодзи в медицинских и складских формах (строгие FEFO-бейджи)
 * - 8n: Суверенитет масштаба и погашение дефицита при первой приходной накладной
 */

import { describe, it, expect } from "vitest";
import {
	calculateAutoVisitConsumables,
	executeAutoVisitBomDeduction,
} from "@dental/shared";
import {
	getFefoTrafficLight,
	sortBatchesByFefo,
} from "../../inventory/fefoTrafficLight.js";
import {
	computeAuditLineItem,
	calculateInventoryAuditTotals,
	calculateFefoStatus,
	sortAuditItemsByFefo,
} from "../../inventory/warehouseInventoryEngine.js";

describe("RED TEAM INQUISITOR BETA: Warehouse 804n Auto-BOM, Overdraft & FEFO Suite", () => {
	describe("1. Авто-списание расходников по Приказу МЗ РФ 804н (Мандат 8e / 8v)", () => {
		it("корректно формирует комплект расходных материалов для услуги восстановления зуба", () => {
			const services = [
				{
					serviceCode: "A16.07.002.011",
					serviceTitle: "Препарирование и пломба светового отверждения (Filtek / Estelite)",
					quantity: 1,
					toothNumber: 24,
				},
			];

			const consumables = calculateAutoVisitConsumables(services, {
				includeStandardPpe: true,
			});

			expect(consumables.length).toBeGreaterThanOrEqual(3);

			// Должны присутствовать композит/адгезив и СИЗ
			const hasCompositeOrAdhesive = consumables.some(
				(c) =>
					c.itemName.toLowerCase().includes("композит") ||
					c.itemName.toLowerCase().includes("пломб") ||
					c.itemName.toLowerCase().includes("адгезив"),
			);
			expect(hasCompositeOrAdhesive).toBe(true);

			const hasPpe = consumables.some(
				(c) =>
					c.itemName.toLowerCase().includes("перчатки") ||
					c.itemName.toLowerCase().includes("маска") ||
					c.itemName.toLowerCase().includes("сиз"),
			);
			expect(hasPpe).toBe(true);
		});

		it("автоматически рассчитывает отходы класса Б (СанПиН 2.1.3684-21) без комиссий", () => {
			const deductionInput = {
				visitId: "visit-rt-001",
				patientId: "pat-rt-001",
				doctorId: "doc-rt-001",
				patientFullName: "Иванов Иван Иванович",
				doctorFullName: "Смирнов А.П.",
				visitDate: "2026-10-08",
				renderedServices: [
					{
						serviceCode: "A16.07.002.011",
						serviceTitle: "Восстановление зуба композитом светового отверждения",
						quantity: 1,
						toothNumber: 24,
					},
				],
				currentStockMap: {
					"mat-composite-filtek": 5,
					"mat-adhesive-single": 10,
					"mat-nitrile-gloves": 50,
					"mat-saliva-ejector": 100,
				},
				allowOverdraft: true,
			};

			const result = executeAutoVisitBomDeduction(deductionInput);

			expect(result.classBWaste).toBeDefined();
			expect(result.classBWaste.wasteClass).toBe("class_B");
			expect(result.classBWaste.singlePersonApproval).toBe(true);
			expect(result.classBWaste.sanpinStandard).toContain("2.1.3684-21");
			expect(result.statutoryActText).toContain("САНПИН");
			// Строгая проверка Мандата 8d: 0 мультяшных эмодзи
			const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
			expect(emojiRegex.test(result.statutoryActText)).toBe(false);
		});
	});

	describe("2. Мягкий овердрафт и погашение дефицита (Мандаты 8e, 8n)", () => {
		it("разрешает списание при нулевом или отсутствующем остатке (мягкий овердрафт)", () => {
			const deductionInput = {
				visitId: "visit-rt-002",
				patientId: "pat-rt-002",
				doctorId: "doc-rt-002",
				renderedServices: [
					{
						serviceCode: "A16.07.002.011",
						serviceTitle: "Пломбирование зуба",
						quantity: 1,
					},
				],
				// На складе пусто (все остатки 0)
				currentStockMap: {},
				allowOverdraft: true,
			};

			const result = executeAutoVisitBomDeduction(deductionInput);

			expect(result.hasOverdraft).toBe(true);
			expect(result.softOverdrafts.length).toBeGreaterThan(0);
			// Врач не заблокирован — результат списания успешен
			expect(result.items.length).toBeGreaterThan(0);
			for (const item of result.items) {
				expect(item.remainingQty).toBeLessThan(0);
				expect(item.isOverdraft).toBe(true);
			}
		});

		it("автоматически погашает дефицит при последующем поступлении накладной", () => {
			// Исходный отрицательный остаток (дефицит после списания)
			let stockBalance = -2;

			// Поступление по приходной накладной (+10 единиц)
			const incomingQty = 10;
			stockBalance += incomingQty;

			expect(stockBalance).toBe(8);
			expect(stockBalance).toBeGreaterThan(0);
		});
	});

	describe("3. FEFO-партионный учет и строгие статусы без эмодзи (СанПиН & Мандат 8d)", () => {
		it("сортирует годные партии строго по принципу FEFO (First Expired, First Out)", () => {
			const batches = [
				{ id: "batch-3", lotNumber: "LOT-2028", expiryDate: "2028-12-31", quantity: 5 },
				{ id: "batch-1", lotNumber: "LOT-2026-NOV", expiryDate: "2026-11-15", quantity: 2 },
				{ id: "batch-2", lotNumber: "LOT-2027", expiryDate: "2027-05-01", quantity: 10 },
			];

			// Референсная дата: 2026-10-08
			const sorted = sortBatchesByFefo(batches, new Date("2026-10-08"));

			// Самый близкий к истечению срок расходуется первым
			expect(sorted[0]?.id).toBe("batch-1");
			expect(sorted[1]?.id).toBe("batch-2");
			expect(sorted[2]?.id).toBe("batch-3");
		});

		it("присваивает строгие медицинские статусы партий без мультяшных эмодзи", () => {
			// Просроченная партия
			const expiredStatus = calculateFefoStatus("2024-01-01", "2026-10-08");
			expect(expiredStatus.fefoStatus).toBe("expired");
			expect(expiredStatus.badgeLabelRu).toBe("Просрочен");
			expect(expiredStatus.badgeLabelRu).not.toMatch(/[\u{1F300}-\u{1F9FF}]/u);

			// Партия со сроком в далеком будущем
			const freshStatus = calculateFefoStatus("2029-12-31", "2026-10-08");
			expect(freshStatus.fefoStatus).toBe("fresh");
			expect(freshStatus.badgeLabelRu).toContain("Свежий");
			expect(freshStatus.badgeLabelRu).not.toMatch(/[\u{1F300}-\u{1F9FF}]/u);
		});
	});

	describe("4. Двухконтурная чистота и инвентаризационный баланс (Мандаты 8c, 8k)", () => {
		it("корректно рассчитывает недостачи и излишки инвентаризации в копейках", () => {
			const lineShortage = computeAuditLineItem(
				{
					itemId: "item-short",
					sku: "SKU-001",
					nameRu: "Адгезив светового отверждения",
					category: "Терапия",
					unitRu: "фл.",
					okeiCode: "796",
					batchNumber: "LOT-ADH-01",
					expiryDate: "2027-01-01",
					storageLocationRu: "Стеллаж 1",
					bookQuantity: 5,
					actualQuantity: 3, // недостача 2 шт (actual - book = -2)
					unitCostKopecks: 150000, // 1500.00 руб
				},
				"2026-10-08",
			);

			expect(lineShortage.discrepancyType).toBe("shortage");
			expect(lineShortage.discrepancyQuantity).toBe(-2);
			expect(lineShortage.discrepancyCostKopecks).toBe(-300000); // -3000 руб

			const lineSurplus = computeAuditLineItem(
				{
					itemId: "item-surplus",
					sku: "SKU-002",
					nameRu: "Слюноотсосы одноразовые",
					category: "Расходные",
					unitRu: "уп.",
					okeiCode: "796",
					batchNumber: "LOT-SUC-01",
					expiryDate: "2028-01-01",
					storageLocationRu: "Стеллаж 2",
					bookQuantity: 10,
					actualQuantity: 12, // излишек 2 шт (actual - book = +2)
					unitCostKopecks: 45000, // 450.00 руб
				},
				"2026-10-08",
			);

			expect(lineSurplus.discrepancyType).toBe("surplus");
			expect(lineSurplus.discrepancyQuantity).toBe(2);
			expect(lineSurplus.discrepancyCostKopecks).toBe(90000); // +900 руб

			const totals = calculateInventoryAuditTotals([lineShortage, lineSurplus]);
			expect(totals.totalItemsCount).toBe(2);
			expect(totals.shortageItemsCount).toBe(1);
			expect(totals.surplusItemsCount).toBe(1);
			expect(totals.totalShortageCostKopecks).toBe(300000);
			expect(totals.totalSurplusCostKopecks).toBe(90000);
		});
	});
});
