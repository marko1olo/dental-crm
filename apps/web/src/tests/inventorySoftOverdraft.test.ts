/**
 * inventorySoftOverdraft.test.ts — Тесты устойчивости к отрицательным остаткам без блокировок врача (Мандаты 8b, 8e, 8n).
 * Копеечный расчет себестоимости, мягкий овердрафт, заказы поставщикам при дефиците.
 */

import "../../testCssStub.mjs";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	type DeductionLineItem,
	ProcedureMaterialDeductionModal,
	calculateDeductionSummary,
	calculateLineCostKopecks,
	calculateTotalDeductionCostKopecks,
	canSafelyDeductLinesWithoutDeficit,
	createSupplierPurchaseOrderFromLines,
	evaluateStockStatus,
	formatSupplierPurchaseOrderTextRu,
} from "../components/inventory/index.js";

describe("Kopeck-Exact Inventory Math & Cost Calculation", () => {
	it("calculateLineCostKopecks считает точную стоимость целых и дробных количеств", () => {
		// 2 пары перчаток по 35.00 руб = 70.00 руб (7000 коп)
		const glovesCost = calculateLineCostKopecks(3500, 2);
		assert.equal(glovesCost, 7000);

		// 0.4 г композита по 1300.00 руб/г = 520.00 руб (52000 коп)
		const compositeCost = calculateLineCostKopecks(130000, 0.4);
		assert.equal(compositeCost, 52000);

		// 0.1 мл адгезива по 1800.00 руб/мл = 180.00 руб (18000 коп)
		const adhesiveCost = calculateLineCostKopecks(180000, 0.1);
		assert.equal(adhesiveCost, 18000);

		// 25 г порошка Air-Flow по 18.00 руб/г = 450.00 руб (45000 коп)
		const airFlowCost = calculateLineCostKopecks(1800, 25);
		assert.equal(airFlowCost, 45000);

		// 0 или отрицательное количество дает 0 копеек
		assert.equal(calculateLineCostKopecks(5000, 0), 0);
		assert.equal(calculateLineCostKopecks(5000, -1), 0);
	});

	it("calculateTotalDeductionCostKopecks суммирует все позиции без погрешностей", () => {
		const testLines = [
			{ unitCostKopecks: 3500, quantity: 2 }, // 70.00 ₽
			{ unitCostKopecks: 1500, quantity: 2 }, // 30.00 ₽
			{ unitCostKopecks: 1250, quantity: 1 }, // 12.50 ₽
			{ unitCostKopecks: 52000, quantity: 1 }, // 520.00 ₽
		];
		// Итого: 70.00 + 30.00 + 12.50 + 520.00 = 632.50 ₽ = 63250 коп
		const total = calculateTotalDeductionCostKopecks(testLines);
		assert.equal(total, 63250);
	});

	it("calculateDeductionSummary строит разбивку по категориям и форматирует рубли", () => {
		const sampleLines: DeductionLineItem[] = [
			{
				id: "1",
				materialName: "Перчатки",
				category: "ppe",
				unit: "пары",
				quantity: 2,
				standardQuantity: 2,
				unitCostKopecks: 3500,
				stockQuantity: 50,
				criticalThreshold: 10,
				source: "tech_map",
			},
			{
				id: "2",
				materialName: "Артикаин",
				category: "anesthesia",
				unit: "карп.",
				quantity: 1,
				standardQuantity: 1,
				unitCostKopecks: 22000,
				stockQuantity: 20,
				criticalThreshold: 5,
				source: "tech_map",
			},
		];

		const summary = calculateDeductionSummary(sampleLines);
		assert.equal(summary.totalLines, 2);
		assert.equal(summary.totalQuantity, 3);
		// 70.00 + 220.00 = 290.00 ₽ = 29000 коп
		assert.equal(summary.totalCostKopecks, 29000);
		assert.equal(summary.hasDeficit, false);
		assert.equal(summary.criticalCount, 0);
		assert.ok(summary.totalCostFormatted.includes("290,00"));
		assert.equal(summary.categoryBreakdown.ppe.count, 1);
		assert.equal(summary.categoryBreakdown.anesthesia.count, 1);
	});
});

describe("Stock Status & Low-Stock / Negative-Stock Alerts", () => {
	it("Определяет статус 'ok' при достаточном запасе", () => {
		const status = evaluateStockStatus(20, 2, 5, "шт.");
		assert.equal(status.severity, "ok");
		assert.equal(status.remainingStock, 18);
		assert.equal(status.deficit, 0);
	});

	it("Определяет статус 'warning' при остатке на уровне или ниже критического порога", () => {
		const status = evaluateStockStatus(6, 2, 5, "шт.");
		assert.equal(status.severity, "warning");
		assert.equal(status.remainingStock, 4);
		assert.equal(status.deficit, 0);
		assert.ok(status.message.includes("Низкий остаток"));
	});

	it("Определяет статус 'critical' при отрицательном остатке (дефицит)", () => {
		const status = evaluateStockStatus(1, 3, 5, "шт.");
		assert.equal(status.severity, "critical");
		assert.equal(status.remainingStock, -2);
		assert.equal(status.deficit, 2);
		assert.ok(status.message.includes("Дефицит на складе"));
		assert.ok(status.message.includes("нехватка: 2"));
	});

	it("Определяет статус 'critical' при нулевом наличии на складе", () => {
		const status = evaluateStockStatus(0, 1, 5, "карп.");
		assert.equal(status.severity, "critical");
		assert.equal(status.remainingStock, -1);
		assert.equal(status.deficit, 1);
	});
});

describe("Supplier Purchase Order & Negative Stock Guard", () => {
	it("canSafelyDeductLinesWithoutDeficit проверяет наличие дефицитных позиций", () => {
		const safeLines: DeductionLineItem[] = [
			{
				id: "l-1",
				materialName: "Перчатки нитриловые",
				category: "ppe",
				unit: "пары",
				quantity: 2,
				standardQuantity: 2,
				unitCostKopecks: 3500,
				stockQuantity: 10,
				criticalThreshold: 2,
				source: "tech_map",
			},
		];
		assert.equal(canSafelyDeductLinesWithoutDeficit(safeLines), true);

		const deficitLines: DeductionLineItem[] = [
			...safeLines,
			{
				id: "l-2",
				materialName: "Имплантат Straumann",
				category: "surgery",
				unit: "шт.",
				quantity: 2,
				standardQuantity: 2,
				unitCostKopecks: 1450000,
				stockQuantity: 1, // Only 1 in stock, deficit = 1
				criticalThreshold: 3,
				source: "tech_map",
			},
		];
		assert.equal(canSafelyDeductLinesWithoutDeficit(deficitLines), false);
	});

	it("createSupplierPurchaseOrderFromLines формирует корректный заказ поставщику при дефиците", () => {
		const lines: DeductionLineItem[] = [
			{
				id: "l-1",
				materialName: "Артикаин 4% карпулы",
				category: "anesthesia",
				unit: "карп.",
				quantity: 3,
				standardQuantity: 1,
				unitCostKopecks: 22000, // 220.00 ₽
				stockQuantity: 1, // deficit = 2
				criticalThreshold: 5,
				source: "tech_map",
			},
		];

		const po = createSupplierPurchaseOrderFromLines(lines, "DENTE Семейная");
		assert.ok(po);
		assert.equal(po.clinicNameRu, "DENTE Семейная");
		assert.equal(po.reason, "stock_deficit");
		assert.equal(po.items.length, 1);
		assert.equal(po.items[0]?.materialName, "Артикаин 4% карпулы");
		assert.equal(po.items[0]?.shortfall, 2);
		assert.ok(po.items[0]!.suggestedOrderQuantity >= 7);
		assert.ok(po.totalCostKopecks > 0);

		const text = formatSupplierPurchaseOrderTextRu(po);
		assert.ok(text.includes("ЗАКАЗ ПОСТАВЩИКУ"));
		assert.ok(text.includes("Артикаин 4% карпулы"));
	});
});

describe("Soft Overdraft & Doctor Autonomy (Mandates 8e, 8n)", () => {
	it("ProcedureMaterialDeductionModal отображает предупреждение о дефиците и активную кнопку списания (Soft Warning)", () => {
		const html = renderToStaticMarkup(
			createElement(ProcedureMaterialDeductionModal, {
				isOpen: true,
				onClose: () => {},
				initialTechMapCodes: ["A16.07.054"], // Имплантация
				serviceName: "Установка дентального имплантата",
				warehouseItems: [
					{
						id: "wh-imp-1",
						name: "Дентальный имплантат титановый SLA стерильный (Straumann/Osstem/Dentium)",
						stockQuantity: 0, // Дефицит
						criticalThreshold: 2,
						unitCostRub: "14500.00",
						updatedAt: "2026-08-27",
					},
				],
			}),
		);

		assert.ok(html.includes("мягкий овердрафт") || html.includes("дефицит") || html.includes("Ожидается поставка"));
		assert.ok(html.includes("Списать"));
		// Проверка ликвидации паразитных кнопок +1 и +2
		assert.ok(!html.includes(">+1<"));
		assert.ok(!html.includes(">+2<"));
	});

	it("Канонический SSOT materialsAutoDeductionSsot рассчитывает техкарты 804н и мягкий овердрафт без блокировок", async () => {
		const {
			getCanonicalProcedureRecipe,
			resolveProcedureDeductionItems,
			calculateProcedureDeductionSummary,
			generateSanpinClassBWasteRecords,
		} = await import("@dental/shared");

		// 1. Поиск рецепта по коду услуги 804н
		const cariesRecipe = getCanonicalProcedureRecipe("A16.07.002.011");
		assert.ok(cariesRecipe, "Рецепт пломбирования A16.07.002.011 должен существовать");
		assert.ok(cariesRecipe.items.length >= 3, "Рецепт должен содержать не менее 3 материалов");

		// 2. Резолв позиций
		const resolvedItems = resolveProcedureDeductionItems("A16.07.002.011", { surfaceCount: 2 });
		assert.ok(resolvedItems.length > 0);
		const compositeItem = resolvedItems.find((i) => i.inventoryItemId === "mat-composite-filtek");
		assert.ok(compositeItem);
		assert.equal(compositeItem.standardQuantity, 0.4); // 0.2 * 2 поверхности

		// 3. Мягкий овердрафт при дефиците склада (Мандат 8e, 8n)
		const summary = calculateProcedureDeductionSummary([
			{
				inventoryItemId: "mat-composite-filtek",
				nameRu: "Композит Filtek",
				standardQuantity: 0.4,
				deductedQuantity: 0.4,
				currentStock: 0, // нулевой остаток!
				unitCostKopecks: 38000,
			},
		]);

		assert.equal(summary.hasOverdraft, true);
		assert.equal(summary.overdraftItemCount, 1);
		assert.ok(summary.softWarningMessageRu?.includes("мягкий овердрафт склада"));
		assert.equal(summary.totalCostKopecks, 15200);

		// 4. СанПиН отходы Класса Б
		const wasteRecords = generateSanpinClassBWasteRecords(
			[
				{
					inventoryItemId: "mat-anes-needle-30g",
					nameRu: "Игла карпульная",
					deductedQuantity: 1,
					isClassBWaste: true,
					classBWasteType: "sharp",
				},
			],
			{
				procedureCode804n: "A11.07.012",
				procedureTitleRu: "Анестезия",
				doctorName: "Кузнецов А.В.",
				visitId: "test-visit-1",
			},
		);

		assert.equal(wasteRecords.length, 1);
		const rec0 = wasteRecords[0];
		assert.ok(rec0);
		assert.equal(rec0.wasteCategory, "sharp");
		assert.ok(rec0.containerTypeRu.toLowerCase().includes("желтый"));
	});

	it("ConsumablesDeductionModal рендерится с кнопкой списания, не заблокированной при дефиците склада (Мандат 8e)", async () => {
		const { ConsumablesDeductionModal } = await import(
			"../components/inventory/ConsumablesDeductionModal.js"
		);

		const html = renderToStaticMarkup(
			createElement(ConsumablesDeductionModal, {
				isOpen: true,
				onClose: () => {},
				procedureTitle: "Лечение кариеса дентина",
				service804nCode: "A16.07.002.011",
				currentStockMap: { "mat-composite-filtek": 0 }, // Дефицит!
			}),
		);

		assert.ok(html.includes("data-testid=\"consumables-deduction-modal\""));
		assert.ok(html.includes("Расходные материалы приёма"));
		assert.ok(html.includes("data-testid=\"btn-confirm-deduction\""));
		// Кнопка подтверждения CTA НЕ заблокирована:
		assert.ok(
			!html.includes('data-testid="btn-confirm-deduction" disabled'),
			"Кнопка списания не должна быть заблокирована при нулевом остатке",
		);
	});
});
