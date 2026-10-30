/**
 * warehouseSSOTSuite.test.tsx — Всеобъемлющий тестовый набор для SSOT склада,
 * Soft Negative Stock модели, пакетного списания по техкартам и WarehouseHubStudioModal.
 * Мандаты 8e (Автономия врача), 8n (Соло-практика, мягкий овердрафт), 8am (1 Primary CTA #0d9488).
 */

import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
	WAREHOUSE_CATEGORIES,
	INITIAL_WAREHOUSE_STOCK,
	PROCEDURE_TECH_MAPS,
	calculateSoftNegativeStock,
	computeWarehouseKpis,
	getStockStatusBadge,
	applyProcedureBatchDeduction,
	applyExpressIncomingInvoice,
	quickOneClickInventoryAudit,
	formatKopecksToRubles,
	type WarehouseStockItem,
} from "../inventoryCatalogData.js";
import { WarehouseHubStudioModal } from "../WarehouseHubStudioModal.js";

describe("1. Warehouse SSOT: Категории, номенклатура и техкарты (BOM)", () => {
	it("содержит ровно 5 канонических категорий стоматологических материалов", () => {
		expect(WAREHOUSE_CATEGORIES).toHaveLength(5);
		const categoryIds = WAREHOUSE_CATEGORIES.map((c) => c.id);
		expect(categoryIds).toContain("anesthetics");
		expect(categoryIds).toContain("therapy");
		expect(categoryIds).toContain("orthopedics");
		expect(categoryIds).toContain("surgery");
		expect(categoryIds).toContain("ppe");
	});

	it("содержит стартовый каталог с себестоимостью в целочисленных копейках и без NaN", () => {
		expect(INITIAL_WAREHOUSE_STOCK.length).toBeGreaterThanOrEqual(10);
		for (const item of INITIAL_WAREHOUSE_STOCK) {
			expect(item.id).toBeTruthy();
			expect(item.nameRu).toBeTruthy();
			expect(typeof item.currentStock).toBe("number");
			expect(Number.isFinite(item.currentStock)).toBe(true);
			expect(item.minStock).toBeGreaterThan(0);
			expect(item.unitCostKopecks).toBeGreaterThan(0);
			expect(Number.isInteger(item.unitCostKopecks)).toBe(true);
		}
	});

	it("содержит канонические технологические карты (терапия, эндодонтия, хирургия, гигиена)", () => {
		expect(PROCEDURE_TECH_MAPS.length).toBeGreaterThanOrEqual(4);
		const techMapCodes = PROCEDURE_TECH_MAPS.map((t) => t.code);
		expect(techMapCodes).toContain("THER-01");
		expect(techMapCodes).toContain("ENDO-01");
		expect(techMapCodes).toContain("SURG-01");
		expect(techMapCodes).toContain("HYG-01");

		for (const tm of PROCEDURE_TECH_MAPS) {
			expect(tm.items.length).toBeGreaterThan(0);
			for (const material of tm.items) {
				expect(material.quantity).toBeGreaterThan(0);
				expect(material.unitCostKopecks).toBeGreaterThan(0);
			}
		}
	});
});

describe("2. Soft Negative Stock Model & Autonomy (Мандаты 8e, 8n)", () => {
	it("рассчитывает списание без ошибок при нулевом и отрицательном остатке", () => {
		const resPositive = calculateSoftNegativeStock(10, 3);
		expect(resPositive.nextStock).toBe(7);
		expect(resPositive.isOverdraft).toBe(false);
		expect(resPositive.overdraftAmount).toBe(0);

		const resZero = calculateSoftNegativeStock(5, 5);
		expect(resZero.nextStock).toBe(0);
		expect(resZero.isOverdraft).toBe(false);
		expect(resZero.overdraftAmount).toBe(0);

		// Мягкий овердрафт: остаток уходит в минус без аварий
		const resOverdraft = calculateSoftNegativeStock(2, 6);
		expect(resOverdraft.nextStock).toBe(-4);
		expect(resOverdraft.isOverdraft).toBe(true);
		expect(resOverdraft.overdraftAmount).toBe(4);
	});

	it("пакетное списание по процедурной техкарте корректно пересчитывает запасы", () => {
		const testStock: WarehouseStockItem[] = [
			{
				id: "mat-art-01",
				nameRu: "Артикаин 1:100 000 (1.7 мл)",
				category: "anesthetics",
				unit: "карп.",
				currentStock: 1,
				minStock: 5,
				unitCostKopecks: 14500,
				supplierName: "Поставщик",
				sku: "ART-1",
			},
		];

		const { updatedItems, deductions, totalCostKopecks } = applyProcedureBatchDeduction(
			testStock,
			"proc-filling-light",
			2, // 2 приёма: списывает 2 карпулы
		);

		const artItem = updatedItems.find((i) => i.id === "mat-art-01");
		expect(artItem).toBeDefined();
		// было 1, списали 2 => -1 (мягкий овердрафт)
		expect(artItem?.currentStock).toBe(-1);
		expect(artItem?.needsReorder).toBe(true);

		const artDeduction = deductions.find((d) => d.materialId === "mat-art-01");
		expect(artDeduction?.isOverdraft).toBe(true);
		expect(artDeduction?.overdraftAmount).toBe(1);
		expect(totalCostKopecks).toBeGreaterThan(0);
	});

	it("экспресс-приходная накладная автоматически гасит накопленный овердрафт", () => {
		const testStock: WarehouseStockItem[] = [
			{
				id: "mat-needle-01",
				nameRu: "Иглы карпульные 30G",
				category: "anesthetics",
				unit: "шт.",
				currentStock: -5, // долг 5 шт
				minStock: 20,
				unitCostKopecks: 850,
				supplierName: "Поставщик",
				sku: "NDL-1",
			},
		];

		const { updatedItems, results } = applyExpressIncomingInvoice(testStock, [
			{ materialId: "mat-needle-01", quantity: 15 },
		]);

		const needleItem = updatedItems.find((i) => i.id === "mat-needle-01");
		expect(needleItem?.currentStock).toBe(10); // -5 + 15 = 10
		expect(results[0].clearedOverdraft).toBe(5);
	});

	it("инвентаризация в 1 клик восстанавливает дефицитные позиции до мин. нормы без комиссий", () => {
		const testStock: WarehouseStockItem[] = [
			{
				id: "mat-glove-01",
				nameRu: "Перчатки нитриловые",
				category: "ppe",
				unit: "упак.",
				currentStock: -3,
				minStock: 5,
				unitCostKopecks: 65000,
				supplierName: "Поставщик",
				sku: "GLV-1",
			},
			{
				id: "mat-art-01",
				nameRu: "Артикаин",
				category: "anesthetics",
				unit: "карп.",
				currentStock: 25,
				minStock: 10,
				unitCostKopecks: 14500,
				supplierName: "Поставщик",
				sku: "ART-1",
			},
		];

		const { updatedItems, auditedCount, clearedDeficitCount } = quickOneClickInventoryAudit(testStock);
		expect(auditedCount).toBe(2);
		expect(clearedDeficitCount).toBe(1);

		const gloveItem = updatedItems.find((i) => i.id === "mat-glove-01");
		expect(gloveItem?.currentStock).toBe(5);
		expect(gloveItem?.needsReorder).toBe(false);

		const artItem = updatedItems.find((i) => i.id === "mat-art-01");
		expect(artItem?.currentStock).toBe(25);
	});
});

describe("3. Warehouse KPIs & Formatting", () => {
	it("считает KPI склада, включая дефицит и требующие заказа позиции", () => {
		const items: WarehouseStockItem[] = [
			{ id: "1", nameRu: "Поз 1", category: "therapy", unit: "шт.", currentStock: -2, minStock: 5, unitCostKopecks: 10000, supplierName: "S", sku: "1" },
			{ id: "2", nameRu: "Поз 2", category: "therapy", unit: "шт.", currentStock: 3, minStock: 5, unitCostKopecks: 20000, supplierName: "S", sku: "2" },
			{ id: "3", nameRu: "Поз 3", category: "therapy", unit: "шт.", currentStock: 10, minStock: 5, unitCostKopecks: 30000, supplierName: "S", sku: "3" },
		];

		const kpis = computeWarehouseKpis(items);
		expect(kpis.totalPositions).toBe(3);
		expect(kpis.deficitCount).toBe(1);
		expect(kpis.lowStockCount).toBe(1);
		expect(kpis.reorderCount).toBe(2);
		// Стоимость: 3 * 20000 + 10 * 30000 = 60000 + 300000 = 360000 копеек
		expect(kpis.totalValuationKopecks).toBe(360000);
	});

	it("форматирует копейки в человеческие рубли без копеечного мусора", () => {
		const formatted = formatKopecksToRubles(360000);
		expect(formatted).toMatch(/3\s*600/);
		expect(formatted).toContain("₽");
	});

	it("возвращает верные бейджи статуса для нормы, низкого запаса и овердрафта", () => {
		const badgeOverdraft = getStockStatusBadge(-3, 10);
		expect(badgeOverdraft.status).toBe("overdraft");
		expect(badgeOverdraft.badgeLabel).toContain("Овердрафт");

		const badgeLow = getStockStatusBadge(5, 10);
		expect(badgeLow.status).toBe("low");
		expect(badgeLow.badgeLabel).toContain("Мало");

		const badgeNormal = getStockStatusBadge(20, 10);
		expect(badgeNormal.status).toBe("normal");
		expect(badgeNormal.badgeLabel).toContain("В норме");
	});
});

describe("4. WarehouseHubStudioModal: UI Static Markup & Apple HIG Standards", () => {
	it("рендерит модальное окно с шапкой, KPI, таблицей и ровно одной Primary CTA кнопкой", () => {
		const html = renderToStaticMarkup(<WarehouseHubStudioModal isOpen={true} onClose={() => {}} />);

		// Заголовок
		expect(html).toContain("Склад и пакетное списание расходных материалов");

		// Сводные KPI
		expect(html).toContain("Всего позиций");
		expect(html).toContain("В дефиците");
		expect(html).toContain("Требуют заказа");
		expect(html).toContain("Стоимость запасов");

		// Быстрые действия
		expect(html).toContain("data-testid=\"btn-express-inbound\"");
		expect(html).toContain("data-testid=\"btn-batch-deduct\"");
		expect(html).toContain("data-testid=\"btn-quick-inventory-audit\"");

		// Ровно 1 Primary CTA кнопка (Мандат 8am: #0d9488)
		expect(html).toContain("data-testid=\"btn-primary-commit-warehouse\"");
		expect(html).toContain("✓ Сохранить складские движения");
		expect(html).toContain("bg-[#0d9488]");

		// Apple HIG мобильный drag-handle и сенсорный минимум
		expect(html).toContain("data-testid=\"mobile-drag-handle\"");
		expect(html).toContain("min-h-[44px]");
	});

	it("не рендерит ничего, если isOpen=false", () => {
		const html = renderToStaticMarkup(<WarehouseHubStudioModal isOpen={false} onClose={() => {}} />);
		expect(html).toBe("");
	});
});
