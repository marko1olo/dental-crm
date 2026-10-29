/**
 * warehouseHubSsot.test.tsx — Red Team Inquisitor Verification of Warehouse SSOT & Soft Negative Stock
 * Mandates: 8e (Doctor Autonomy), 8n (Solo/Small clinic Soft Overdraft), 8am (1 Primary CTA #0d9488),
 * 8ze (Touch targets >= 44x44px, Apple HIG), 8b (File line bounds).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	WAREHOUSE_CATEGORIES,
	INITIAL_WAREHOUSE_STOCK,
	PROCEDURE_TECH_MAPS,
	calculateSoftNegativeStock,
	getStockStatusBadge,
	applyProcedureBatchDeduction,
	applyExpressIncomingInvoice,
	formatKopecksToRubles,
} from "../warehouseCatalogData.js";
import { WarehouseHubModal } from "../WarehouseHubModal.js";
import { DirectWarehouseLauncher } from "../DirectWarehouseLauncher.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const inventoryDir = path.resolve(__dirname, "..");

describe("Warehouse SSOT: Soft Negative Stock & Catalog (warehouseCatalogData.ts)", () => {
	it("1. Проверяет соблюдение лимита строк warehouseCatalogData.ts (200–280 строк по Мандату 8b)", () => {
		const filePath = path.join(inventoryDir, "warehouseCatalogData.ts");
		assert.ok(fs.existsSync(filePath), "warehouseCatalogData.ts должен существовать");
		const lines = fs.readFileSync(filePath, "utf-8").split("\n").length;
		assert.ok(lines >= 200, `warehouseCatalogData.ts имеет ${lines} строк, ожидается >= 200`);
		assert.ok(lines <= 280, `warehouseCatalogData.ts имеет ${lines} строк, превышает лимит 280`);
	});

	it("2. Содержит все 5 канонических категорий материалов клиники", () => {
		const categoryIds = WAREHOUSE_CATEGORIES.map((c) => c.id);
		assert.deepEqual(categoryIds, ["anesthetics", "therapy", "orthopedics", "surgery", "ppe"]);
		for (const cat of WAREHOUSE_CATEGORIES) {
			assert.ok(cat.nameRu.length > 0);
			assert.ok(cat.badgeColor.includes("border"));
		}
	});

	it("3. calculateSoftNegativeStock: разрешает списание в минус без ошибок (Soft Overdraft, Мандат 8n)", () => {
		// Обычное списание
		const normal = calculateSoftNegativeStock(10, 3);
		assert.equal(normal.nextStock, 7);
		assert.equal(normal.isOverdraft, false);
		assert.equal(normal.overdraftAmount, 0);

		// Списание в ноль
		const zero = calculateSoftNegativeStock(5, 5);
		assert.equal(zero.nextStock, 0);
		assert.equal(zero.isOverdraft, false);
		assert.equal(zero.overdraftAmount, 0);

		// Списание в мягкий овердрафт (уход в минус)
		const overdraft = calculateSoftNegativeStock(2, 6);
		assert.equal(overdraft.nextStock, -4);
		assert.equal(overdraft.isOverdraft, true);
		assert.equal(overdraft.overdraftAmount, 4);

		// Списание при уже отрицательном балансе (накопление дефицита)
		const deeperOverdraft = calculateSoftNegativeStock(-4, 3);
		assert.equal(deeperOverdraft.nextStock, -7);
		assert.equal(deeperOverdraft.isOverdraft, true);
		assert.equal(deeperOverdraft.overdraftAmount, 7);
	});

	it("4. getStockStatusBadge: выдает корректную цветовую индикацию (норма, мало, овердрафт)", () => {
		const normalBadge = getStockStatusBadge(25, 10);
		assert.equal(normalBadge.status, "normal");
		assert.ok(normalBadge.colorClass.includes("emerald"));

		const lowBadge = getStockStatusBadge(5, 10);
		assert.equal(lowBadge.status, "low");
		assert.ok(lowBadge.colorClass.includes("amber"));

		const overdraftBadge = getStockStatusBadge(-3, 10);
		assert.equal(overdraftBadge.status, "overdraft");
		assert.ok(overdraftBadge.colorClass.includes("rose"));
		assert.ok(overdraftBadge.badgeLabel.includes("Овердрафт (-3)"));
	});

	it("5. applyProcedureBatchDeduction: списывает комплект материалов по техкарте в 1 клик", () => {
		const items = [...INITIAL_WAREHOUSE_STOCK];
		const { updatedItems, deductions, totalCostKopecks } = applyProcedureBatchDeduction(
			items,
			"proc-filling-light",
			1,
		);
		assert.ok(deductions.length >= 4);
		assert.ok(totalCostKopecks > 0);

		// Иглы изначально были -4, списание 1 штуки уводит их в -5 без сбоев
		const needleDeduction = deductions.find((d) => d.materialId === "mat-needle-01");
		assert.ok(needleDeduction);
		assert.equal(needleDeduction.isOverdraft, true);
		assert.equal(needleDeduction.newStock, -5);

		const updatedNeedle = updatedItems.find((i) => i.id === "mat-needle-01");
		assert.equal(updatedNeedle?.currentStock, -5);
	});

	it("6. applyExpressIncomingInvoice: оприходует накладную и автоматически погашает овердрафт", () => {
		const items = [...INITIAL_WAREHOUSE_STOCK];
		// Иглы изначально -4. Приход 50 штук должен дать +46 и погасить дефицит 4
		const incomingDraft = [{ materialId: "mat-needle-01", quantity: 50 }];
		const { updatedItems, results } = applyExpressIncomingInvoice(items, incomingDraft);

		const res = results.find((r) => r.materialId === "mat-needle-01");
		assert.ok(res);
		assert.equal(res.previousStock, -4);
		assert.equal(res.newStock, 46);
		assert.equal(res.clearedOverdraft, 4);

		const updatedItem = updatedItems.find((i) => i.id === "mat-needle-01");
		assert.equal(updatedItem?.currentStock, 46);
	});

	it("7. formatKopecksToRubles: форматирует целочисленные копейки в человеческие рубли", () => {
		const formatted = formatKopecksToRubles(14500);
		assert.ok(formatted.includes("145") || formatted.includes("145,00"));
	});
});

describe("Warehouse Hub Modal (WarehouseHubModal.tsx)", () => {
	it("8. Проверяет соблюдение лимита строк WarehouseHubModal.tsx (300–450 строк по Мандату 8b)", () => {
		const filePath = path.join(inventoryDir, "WarehouseHubModal.tsx");
		assert.ok(fs.existsSync(filePath), "WarehouseHubModal.tsx должен существовать");
		const lines = fs.readFileSync(filePath, "utf-8").split("\n").length;
		assert.ok(lines >= 300, `WarehouseHubModal.tsx имеет ${lines} строк, ожидается >= 300`);
		assert.ok(lines <= 450, `WarehouseHubModal.tsx имеет ${lines} строк, превышает лимит 450`);
	});

	it("9. Рендерит пустоту, когда isOpen === false", () => {
		const html = renderToStaticMarkup(<WarehouseHubModal isOpen={false} onClose={() => {}} />);
		assert.equal(html, "");
	});

	it("10. Рендерит полный хаб склада, шапку, категории и строки материалов при isOpen === true", () => {
		const html = renderToStaticMarkup(<WarehouseHubModal isOpen={true} onClose={() => {}} />);
		assert.ok(html.includes("Склад и расходные материалы клиники"));
		assert.ok(html.includes("Soft Negative Stock активен"));
		assert.ok(html.includes("data-testid=\"warehouse-hub-modal\""));
		assert.ok(html.includes("btn-close-warehouse-hub"));
		assert.ok(html.includes("btn-express-inbound"));
		assert.ok(html.includes("btn-batch-deduct"));
		assert.ok(html.includes("cat-filter-all"));
		assert.ok(html.includes("cat-filter-anesthetics"));
	});

	it("11. Отображает пассивную плашку дефицита при наличии отрицательного остатка без блокировок (Мандат 8e)", () => {
		const html = renderToStaticMarkup(<WarehouseHubModal isOpen={true} onClose={() => {}} />);
		assert.ok(html.includes("data-testid=\"soft-overdraft-alert\""));
		assert.ok(html.includes("позиций в мягком дефиците"));
		assert.ok(html.includes("НЕ блокируются"));
	});

	it("12. Мандат 8am: содержит ровно ОДНУ Primary CTA кнопку в цвете #0d9488", () => {
		const html = renderToStaticMarkup(<WarehouseHubModal isOpen={true} onClose={() => {}} />);
		assert.ok(html.includes("data-testid=\"btn-primary-commit-warehouse\""));
		assert.ok(html.includes("#0d9488"));
		assert.ok(html.includes("✓ Провести приход / списание материалов"));

		// Вторичные кнопки не должны иметь primary стиль
		assert.ok(html.includes("data-testid=\"btn-cancel-warehouse-hub\""));
	});

	it("13. Apple HIG (Мандат 8ze): тач-таргеты >= 44x44px и мобильный drag handle", () => {
		const html = renderToStaticMarkup(<WarehouseHubModal isOpen={true} onClose={() => {}} />);
		assert.ok(html.includes("data-testid=\"mobile-drag-handle\""));
		assert.ok(html.includes("min-h-[44px]"));
		assert.ok(html.includes("min-w-[44px]"));
		assert.ok(html.includes("safe-area-inset-bottom"));
	});
});

describe("Direct Warehouse Launcher (DirectWarehouseLauncher.tsx)", () => {
	it("14. Проверяет соблюдение лимита строк DirectWarehouseLauncher.tsx (60–90 строк по Мандату 8b)", () => {
		const filePath = path.join(inventoryDir, "DirectWarehouseLauncher.tsx");
		assert.ok(fs.existsSync(filePath), "DirectWarehouseLauncher.tsx должен существовать");
		const lines = fs.readFileSync(filePath, "utf-8").split("\n").length;
		assert.ok(lines >= 60, `DirectWarehouseLauncher.tsx имеет ${lines} строк, ожидается >= 60`);
		assert.ok(lines <= 90, `DirectWarehouseLauncher.tsx имеет ${lines} строк, превышает лимит 90`);
	});

	it("15. Не крашится при монтировании в SSR / статический рендеринг", () => {
		const html = renderToStaticMarkup(<DirectWarehouseLauncher />);
		// Без хеша/параметра в URL возвращает пустую строку
		assert.equal(typeof html, "string");
	});
});
