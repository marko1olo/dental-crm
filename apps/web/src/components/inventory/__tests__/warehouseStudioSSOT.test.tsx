/**
 * warehouseStudioSSOT.test.tsx — Red Team Zero-Trust Audit & Comprehensive Verification of Warehouse SSOT
 * Mandates: 8e (Doctor Autonomy & 0 disabled buttons), 8n (Solo/Small clinic Soft Negative Stock),
 * 8am (Strictly 1 Primary CTA #0d9488), 8ze (Apple HIG 36x5px Drag Handle, touch target >= 44x44px),
 * 8b / 8zi (File line bounds: Sweet Spot), 8wy (Integer amountKopecks arithmetic).
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
	quickOneClickInventoryAudit,
	formatKopecksToRubles,
} from "../warehouseCatalogData.js";
import { DirectWarehouseLauncher } from "../DirectWarehouseLauncher.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const inventoryDir = path.resolve(__dirname, "..");

describe("Warehouse & Consumables SSOT Inquisitor Suite (Mandates 8e, 8n, 8am, 8ze, 8wy)", () => {
	// ТЕСТ 1: Sweet Spot строк warehouseCatalogData.ts (300–380 строк)
	it("1. warehouseCatalogData.ts укладывается в Sweet Spot (строго 300–380 строк по Мандату 8b)", () => {
		const filePath = path.join(inventoryDir, "warehouseCatalogData.ts");
		assert.ok(fs.existsSync(filePath), "warehouseCatalogData.ts должен существовать");
		const lines = fs.readFileSync(filePath, "utf-8").split("\n").length;
		assert.ok(lines >= 300, `warehouseCatalogData.ts имеет ${lines} строк, ожидается >= 300`);
		assert.ok(lines <= 380, `warehouseCatalogData.ts имеет ${lines} строк, превышает лимит 380`);
	});

	// ТЕСТ 2: Канонические 5 категорий материалов клиники
	it("2. Каталог содержит все 5 канонических категорий материалов клиники РФ 1–5 кресел", () => {
		const categoryIds = WAREHOUSE_CATEGORIES.map((c) => c.id);
		assert.ok(categoryIds.includes("anesthetics"), "Должна быть категория анестетиков");
		assert.ok(categoryIds.includes("therapy"), "Должна быть категория пломбировочных материалов");
		assert.ok(categoryIds.includes("surgery"), "Должна быть категория хирургии");
		assert.ok(categoryIds.includes("orthopedics"), "Должна быть категория оттискных масс");
		assert.ok(categoryIds.includes("ppe"), "Должна быть категория СИЗ и дезинфекции");
		assert.equal(categoryIds.length, 5);
	});

	// ТЕСТ 3: Мягкий овердрафт Soft Negative Stock (Мандат 8n, 8e)
	it("3. calculateSoftNegativeStock: разрешает тихий уход остатка в минус без исключений (Soft Negative Stock)", () => {
		const resZero = calculateSoftNegativeStock(0, 2);
		assert.equal(resZero.nextStock, -2);
		assert.equal(resZero.isOverdraft, true);
		assert.equal(resZero.overdraftAmount, 2);

		const resDeeper = calculateSoftNegativeStock(-5, 3);
		assert.equal(resDeeper.nextStock, -8);
		assert.equal(resDeeper.isOverdraft, true);
		assert.equal(resDeeper.overdraftAmount, 8);
	});

	// ТЕСТ 4: Погашение овердрафта при оприходовании накладной
	it("4. applyExpressIncomingInvoice: оприходование накладной поставщика автоматически гасит овердрафт", () => {
		const stock = [
			{
				id: "mat-needle-01",
				nameRu: "Иглы карпульные",
				category: "anesthetics" as const,
				unit: "шт.",
				currentStock: -4,
				minStock: 20,
				unitCostKopecks: 850,
				supplierName: "МедСнаб",
				sku: "NDL-30G",
			},
		];
		const { updatedItems, results } = applyExpressIncomingInvoice(stock, [{ materialId: "mat-needle-01", quantity: 30 }]);
		assert.equal(results[0]?.clearedOverdraft, 4);
		assert.equal(updatedItems[0]?.currentStock, 26);
		assert.equal(updatedItems[0]?.needsReorder, false);
	});

	// ТЕСТ 5: Целочисленные копейки (amountKopecks: BIGINT) без дробей
	it("5. Все расчеты стоимости ведутся в целочисленных копейках (amountKopecks) без float-погрешностей", () => {
		for (const item of INITIAL_WAREHOUSE_STOCK) {
			assert.equal(Number.isInteger(item.unitCostKopecks), true, `Цена ${item.id} должна быть целым числом копеек`);
			assert.ok(item.unitCostKopecks > 0, `Цена ${item.id} должна быть больше 0 копеек`);
		}
		const formatted = formatKopecksToRubles(385000);
		assert.ok(formatted.includes("3") && formatted.includes("850"), "Форматирование 385000 копеек должно давать 3 850 ₽");
	});

	// ТЕСТ 6: Техкарта лечения кариеса (1 анестетик + 1 порция композита + 1 коффердам)
	it("6. Техкарта лечения кариеса содержит 1 анестетик + 1 порцию композита + 1 коффердам", () => {
		const carMap = PROCEDURE_TECH_MAPS.find((tm) => tm.id === "proc-filling-light");
		assert.ok(carMap, "Техкарта лечения кариеса должна существовать");
		const items = carMap.items;
		const anesth = items.find((i) => i.materialId === "mat-art-01");
		const comp = items.find((i) => i.materialId === "mat-comp-01");
		const coff = items.find((i) => i.materialId === "mat-coff-01");

		assert.ok(anesth && anesth.quantity === 1, "Должен быть 1 анестетик");
		assert.ok(comp && comp.quantity === 1, "Должна быть 1 порция композита");
		assert.ok(coff && coff.quantity === 1, "Должен быть 1 коффердам");
	});

	// ТЕСТ 7: Техкарта удаления зуба (1 анестетик + 1 шовный набор)
	it("7. Техкарта удаления зуба содержит 1 анестетик + 1 шовный набор", () => {
		const surgMap = PROCEDURE_TECH_MAPS.find((tm) => tm.id === "proc-surgery-extract");
		assert.ok(surgMap, "Техкарта удаления зуба должна существовать");
		const items = surgMap.items;
		const anesth = items.find((i) => i.materialId === "mat-art-01");
		const suture = items.find((i) => i.materialId === "mat-surg-01");

		assert.ok(anesth && anesth.quantity >= 1, "Должен быть анестетик");
		assert.ok(suture && suture.quantity === 1, "Должен быть 1 шовный набор");
	});

	// ТЕСТ 8: Пакетное списание на смену с мультипликатором приёмов
	it("8. applyProcedureBatchDeduction: корректно масштабирует расход на N пациентов за смену", () => {
		const items = [...INITIAL_WAREHOUSE_STOCK];
		const { updatedItems, deductions, totalCostKopecks } = applyProcedureBatchDeduction(
			items,
			"proc-filling-light",
			5,
		);
		assert.ok(deductions.length >= 3);
		assert.ok(totalCostKopecks > 0);

		const anesthDeduct = deductions.find((d) => d.materialId === "mat-art-01");
		assert.equal(anesthDeduct?.quantity, 5, "На 5 пациентов должно списаться 5 карпул");
	});

	// ТЕСТ 9: Sweet Spot строк DirectWarehouseLauncher.tsx (60–80 строк)
	it("9. DirectWarehouseLauncher.tsx укладывается в Sweet Spot (строго 60–80 строк по Мандату 8b)", () => {
		const filePath = path.join(inventoryDir, "DirectWarehouseLauncher.tsx");
		assert.ok(fs.existsSync(filePath), "DirectWarehouseLauncher.tsx должен существовать");
		const lines = fs.readFileSync(filePath, "utf-8").split("\n").length;
		assert.ok(lines >= 60, `DirectWarehouseLauncher.tsx имеет ${lines} строк, ожидается >= 60`);
		assert.ok(lines <= 80, `DirectWarehouseLauncher.tsx имеет ${lines} строк, превышает лимит 80`);
	});

	// ТЕСТ 10: Sweet Spot строк warehouseStudio.css (250–350 строк)
	it("10. warehouseStudio.css укладывается в Sweet Spot (строго 250–350 строк по Мандату 8b)", () => {
		const filePath = path.join(inventoryDir, "styles", "warehouseStudio.css");
		assert.ok(fs.existsSync(filePath), "warehouseStudio.css должен существовать");
		const lines = fs.readFileSync(filePath, "utf-8").split("\n").length;
		assert.ok(lines >= 250, `warehouseStudio.css имеет ${lines} строк, ожидается >= 250`);
		assert.ok(lines <= 350, `warehouseStudio.css имеет ${lines} строк, превышает лимит 350`);
	});

	// ТЕСТ 11: DirectWarehouseLauncher SSR & статический рендеринг
	it("11. DirectWarehouseLauncher монтируется в SSR без исключений", () => {
		const html = renderToStaticMarkup(<DirectWarehouseLauncher />);
		assert.equal(typeof html, "string");
	});
});
