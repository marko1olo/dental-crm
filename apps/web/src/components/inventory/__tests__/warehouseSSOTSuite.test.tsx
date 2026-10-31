/**
 * warehouseSSOTSuite.test.tsx — Всеобъемлющий тестовый набор для SSOT Студии склада,
 * Soft Negative Stock модели, пакетного списания по техкартам и WarehouseStudioModal.
 * Мандаты: 8e (Автономия врача, 0 disabled кнопок), 8n (Соло-практика, мягкий овердрафт),
 * 8am (Ровно 1 Primary CTA кнопка #0d9488), 8b (Sweet Spot размеры), 8x (Чистый русский язык).
 */

import React from "react";
import fs from "node:fs";
import path from "node:path";
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
} from "../warehouseCatalogData.js";
import { WarehouseStudioModal } from "../WarehouseStudioModal.js";
import { DirectWarehouseLauncher } from "../DirectWarehouseLauncher.js";

const inventoryDir = path.resolve(__dirname, "..");

describe("1. Sweet Spot File Sizes & Architecture (Мандат 8b/8zi)", () => {
	it("проверяет размер warehouseCatalogData.ts (строго 300–350 строк)", () => {
		const filePath = path.join(inventoryDir, "warehouseCatalogData.ts");
		expect(fs.existsSync(filePath)).toBe(true);
		const lines = fs.readFileSync(filePath, "utf-8").split("\n").length;
		expect(lines).toBeGreaterThanOrEqual(300);
		expect(lines).toBeLessThanOrEqual(350);
	});

	it("проверяет размер WarehouseStudioModal.tsx (строго 380–480 строк, Sweet Spot)", () => {
		const filePath = path.join(inventoryDir, "WarehouseStudioModal.tsx");
		expect(fs.existsSync(filePath)).toBe(true);
		const lines = fs.readFileSync(filePath, "utf-8").split("\n").length;
		expect(lines).toBeGreaterThanOrEqual(380);
		expect(lines).toBeLessThanOrEqual(480);
	});

	it("проверяет размер DirectWarehouseLauncher.tsx (строго 70–90 строк)", () => {
		const filePath = path.join(inventoryDir, "DirectWarehouseLauncher.tsx");
		expect(fs.existsSync(filePath)).toBe(true);
		const lines = fs.readFileSync(filePath, "utf-8").split("\n").length;
		expect(lines).toBeGreaterThanOrEqual(70);
		expect(lines).toBeLessThanOrEqual(90);
	});

	it("проверяет физическое удаление мокапа в вакууме warehousePreviewEntry.tsx", () => {
		const filePath = path.resolve(inventoryDir, "../../warehousePreviewEntry.tsx");
		expect(fs.existsSync(filePath)).toBe(false);
	});
});

describe("2. Warehouse SSOT: Категории, номенклатура и техкарты (Мандат 8n)", () => {
	it("содержит ровно 5 канонических категорий стоматологических материалов", () => {
		expect(WAREHOUSE_CATEGORIES).toHaveLength(5);
		const categoryIds = WAREHOUSE_CATEGORIES.map((c) => c.id);
		expect(categoryIds).toContain("anesthetics");
		expect(categoryIds).toContain("therapy");
		expect(categoryIds).toContain("surgery");
		expect(categoryIds).toContain("orthopedics");
		expect(categoryIds).toContain("ppe");
	});

	it("содержит стартовый каталог с себестоимостью в целочисленных копейках amountKopecks", () => {
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

	it("содержит канонические техкарты для 1-клик автосписания (кариес, удаление, имплантация, гигиена)", () => {
		expect(PROCEDURE_TECH_MAPS.length).toBeGreaterThanOrEqual(4);
		const codes = PROCEDURE_TECH_MAPS.map((t) => t.code);
		expect(codes).toContain("THER-01"); // Кариес
		expect(codes).toContain("SURG-01"); // Удаление
		expect(codes).toContain("IMPL-01"); // Имплантация
		expect(codes).toContain("HYG-01");  // Гигиена

		for (const tm of PROCEDURE_TECH_MAPS) {
			expect(tm.items.length).toBeGreaterThan(0);
			for (const mat of tm.items) {
				expect(mat.quantity).toBeGreaterThan(0);
				expect(mat.unitCostKopecks).toBeGreaterThan(0);
			}
		}
	});
});

describe("3. Soft Negative Stock Model & Autonomy (Мандаты 8e, 8n)", () => {
	it("рассчитывает списание без ошибок при нулевом и отрицательном остатке (Soft Negative Stock)", () => {
		const resPos = calculateSoftNegativeStock(10, 3);
		expect(resPos.nextStock).toBe(7);
		expect(resPos.isOverdraft).toBe(false);

		const resZero = calculateSoftNegativeStock(5, 5);
		expect(resZero.nextStock).toBe(0);
		expect(resZero.isOverdraft).toBe(false);

		// Мягкий овердрафт: остаток уходит в минус без блокировки приема врача
		const resNeg = calculateSoftNegativeStock(2, 6);
		expect(resNeg.nextStock).toBe(-4);
		expect(resNeg.isOverdraft).toBe(true);
		expect(resNeg.overdraftAmount).toBe(4);
	});

	it("пакетное списание по процедурной техкарте корректно рассчитывает расход и суммы в копейках", () => {
		const testStock: WarehouseStockItem[] = [
			{
				id: "mat-art-01",
				nameRu: "Артикаин 1:100 000 (1.7 мл)",
				category: "anesthetics",
				unit: "карп.",
				currentStock: 1,
				minStock: 5,
				unitCostKopecks: 14500,
				supplierName: "Дентал-Маркет",
				sku: "ART-1",
			},
		];

		const { updatedItems, deductions, totalCostKopecks } = applyProcedureBatchDeduction(
			testStock,
			"proc-filling-light",
			2, // 2 приёма: списание 2 карпул
		);

		const artItem = updatedItems.find((i) => i.id === "mat-art-01");
		expect(artItem?.currentStock).toBe(-1); // 1 - 2 = -1 (мягкий овердрафт)
		expect(artItem?.needsReorder).toBe(true);

		const artDeduction = deductions.find((d) => d.materialId === "mat-art-01");
		expect(artDeduction?.isOverdraft).toBe(true);
		expect(artDeduction?.overdraftAmount).toBe(1);
		expect(totalCostKopecks).toBe(29000); // 2 * 14500
	});

	it("экспресс-приход накладной поставщика автоматически гасит накопленный овердрафт", () => {
		const testStock: WarehouseStockItem[] = [
			{
				id: "mat-needle-01",
				nameRu: "Иглы карпульные 30G",
				category: "anesthetics",
				unit: "шт.",
				currentStock: -5,
				minStock: 20,
				unitCostKopecks: 850,
				supplierName: "МедСнаб Трейд",
				sku: "NDL-1",
			},
		];

		const { updatedItems, results, totalIncomingKopecks } = applyExpressIncomingInvoice(testStock, [
			{ materialId: "mat-needle-01", quantity: 15 },
		]);

		const needleItem = updatedItems.find((i) => i.id === "mat-needle-01");
		expect(needleItem?.currentStock).toBe(10); // -5 + 15 = 10
		expect(results[0].clearedOverdraft).toBe(5);
		expect(totalIncomingKopecks).toBe(15 * 850);
	});

	it("инвентаризация в 1 клик восстанавливает дефицитные позиции до нормы без комиссий", () => {
		const testStock: WarehouseStockItem[] = [
			{
				id: "mat-glove-01",
				nameRu: "Перчатки нитриловые",
				category: "ppe",
				unit: "упак.",
				currentStock: -2,
				minStock: 5,
				unitCostKopecks: 65000,
				supplierName: "СтомТорг",
				sku: "GLV-1",
			},
		];

		const { updatedItems, clearedDeficitCount } = quickOneClickInventoryAudit(testStock);
		expect(clearedDeficitCount).toBe(1);
		expect(updatedItems[0].currentStock).toBe(5);
		expect(updatedItems[0].needsReorder).toBe(false);
	});
});

describe("4. Warehouse KPIs, Badges & Currency Formatting", () => {
	it("считает сводные KPI склада, включая дефицит, мало и переоценку в копейках", () => {
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
		expect(kpis.totalValuationKopecks).toBe(360000); // 3*20000 + 10*30000
	});

	it("форматирует целочисленные копейки в человеческие рубли", () => {
		const formatted = formatKopecksToRubles(360000);
		expect(formatted).toMatch(/3\s*600/);
		expect(formatted).toContain("₽");
	});

	it("возвращает верные статусные бейджи для овердрафта, низкого запаса и нормы", () => {
		const badgeOverdraft = getStockStatusBadge(-4, 10);
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

describe("5. WarehouseStudioModal: UI Static Markup & Apple HIG Mandates", () => {
	it("рендерит модальное окно с шапкой, KPI, вкладками и таблицей", () => {
		const html = renderToStaticMarkup(<WarehouseStudioModal isOpen={true} onClose={() => {}} />);
		expect(html).toContain("Склад и пакетное списание расходных материалов");
		expect(html).toContain("Всего позиций");
		expect(html).toContain("В дефиците");
		expect(html).toContain("Требуют заказа");
		expect(html).toContain("Стоимость запасов");
		expect(html).toContain("Остатки на складе");
		expect(html).toContain("Пакетное списание смены");
		expect(html).toContain("Приходная накладная");
	});

	it("содержит ровно 1 Primary CTA кнопку цвета #0d9488 (Мандат 8am)", () => {
		const html = renderToStaticMarkup(<WarehouseStudioModal isOpen={true} onClose={() => {}} />);
		expect(html).toContain("data-testid=\"btn-primary-commit-warehouse\"");
		expect(html).toContain("bg-[#0d9488]");

		// Проверяем, что в разметке ровно ОДНА кнопка с testid Primary CTA
		const matches = html.match(/data-testid="btn-primary-commit-warehouse"/g);
		expect(matches?.length).toBe(1);
	});

	it("содержит 0 заблокированных disabled кнопок (Мандат 8e: Автономия врача)", () => {
		const html = renderToStaticMarkup(<WarehouseStudioModal isOpen={true} onClose={() => {}} />);
		// Ни одна кнопка не имеет атрибута disabled
		expect(html).not.toMatch(/<button[^>]*disabled/i);
	});

	it("содержит Apple HIG сенсорные элементы: drag handle 36x5px и touch target >= 44x44px", () => {
		const html = renderToStaticMarkup(<WarehouseStudioModal isOpen={true} onClose={() => {}} />);
		expect(html).toContain("data-testid=\"mobile-drag-handle\"");
		expect(html).toContain("min-h-[44px]");
	});

	it("содержит живой русский клинический язык без советских приказов (Мандат 8x)", () => {
		const html = renderToStaticMarkup(<WarehouseStudioModal isOpen={true} onClose={() => {}} />);
		expect(html).not.toContain("804н");
		expect(html).not.toContain("043/у");
		expect(html).not.toContain("54-ФЗ");
		expect(html).not.toContain("ФФД 1.2");
	});

	it("не рендерит ничего при isOpen=false", () => {
		const html = renderToStaticMarkup(<WarehouseStudioModal isOpen={false} onClose={() => {}} />);
		expect(html).toBe("");
	});
});

describe("6. DirectWarehouseLauncher Integration", () => {
	it("компонент DirectWarehouseLauncher корректно экспортирован и монтируется без крашей", () => {
		expect(typeof DirectWarehouseLauncher).toBe("function");
		const html = renderToStaticMarkup(<DirectWarehouseLauncher />);
		// В SSR без hash/query возвращает null
		expect(html).toBe("");
	});
});
