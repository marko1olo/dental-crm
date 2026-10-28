import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { InventoryStockTable, type WarehouseStockItem } from "../InventoryStockTable.js";

describe("FEFO Smart Anesthesia & Expiry Traffic Light: Table Rendering", () => {
	const testItems: readonly WarehouseStockItem[] = [
		{
			id: "item-green",
			name: "Артикаин 1:100 000 (Ультракаин Д-С Форте)",
			stockQuantity: 120,
			criticalThreshold: 20,
			unitCostRub: "95.00",
			unit: "карп.",
			sku: "ART-100K",
			lotNumber: "LOT-GREEN-2028",
			expirationDate: "2028-12-31",
			updatedAt: "2026-09-24T12:00:00.000Z",
		},
		{
			id: "item-amber",
			name: "Септанест 1:100 000",
			stockQuantity: 15,
			criticalThreshold: 10,
			unitCostRub: "92.00",
			unit: "карп.",
			sku: "SEPT-100K",
			lotNumber: "LOT-SOON-OCT",
			expirationDate: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
			updatedAt: "2026-09-24T12:00:00.000Z",
		},
		{
			id: "item-red",
			name: "Мепивакаин (Скандонест 3% чистый)",
			stockQuantity: 8,
			criticalThreshold: 5,
			unitCostRub: "115.00",
			unit: "карп.",
			sku: "SCAND-EXP",
			lotNumber: "LOT-EXPIRED-AUG",
			expirationDate: "2026-08-01",
			updatedAt: "2026-09-24T12:00:00.000Z",
		},
		{
			id: "item-overdraft",
			name: "Игла карпульная 30G 0.3x21мм",
			stockQuantity: 0,
			criticalThreshold: 50,
			unitCostRub: "12.00",
			unit: "шт.",
			sku: "NDL-30G",
			lotNumber: "LOT-NDL",
			expirationDate: "2028-06-30",
			updatedAt: "2026-09-24T12:00:00.000Z",
		},
	];

	it("renders table with traffic light badges for each shelf life state", () => {
		const html = renderToString(<InventoryStockTable items={testItems} />);

		assert.ok(html.includes("stock-row-item-green"), "Must render green item row");
		assert.ok(html.includes("stock-row-item-amber"), "Must render amber item row");
		assert.ok(html.includes("stock-row-item-red"), "Must render red item row");
		assert.ok(html.includes("stock-row-item-overdraft"), "Must render overdraft item row");

		assert.ok(
			html.includes("Срок в норме (&gt; 6 мес)") || html.includes("Срок в норме (> 6 мес)"),
			"Green badge text must be present",
		);
		assert.ok(
			html.includes("Истекает скоро — первоочередной отпуск") ||
				html.includes("Истекает скоро (FEFO)"),
			"Amber badge text must be present",
		);
		assert.ok(html.includes("Просрочено — отпуск заблокирован"), "Red badge text must be present");
	});

	it("renders 1-click SanPiN disposal act button on expired item", () => {
		const html = renderToString(<InventoryStockTable items={testItems} />);

		assert.ok(
			html.includes('data-testid="btn-sanpin-disposal-act-item-red"'),
			"Must render SanPiN disposal act button for expired item",
		);
		assert.ok(
			html.includes("Акт утилизации СанПиН 3.3686-21") || html.includes("Акт утилизации"),
			"Button must display SanPiN disposal text",
		);
	});

	it("displays soft overdraft badge and allows deduction without error (Mandate 8n)", () => {
		const html = renderToString(<InventoryStockTable items={testItems} />);

		assert.ok(
			html.includes('data-testid="soft-overdraft-badge-item-overdraft"'),
			"Must display soft overdraft badge for zero stock item",
		);
		assert.ok(
			html.includes("Мягкий учет расхода (дефицит)") ||
				html.includes("Овердрафт (0-блокировка)") ||
				html.includes("Ожидается поставка (мягкий овердрафт)"),
			"Must display non-blocking deficit label",
		);
		assert.ok(
			html.includes("Списать (с дефицитом)") ||
				html.includes("Списать (Овердрафт)"),
			"Deduction button must allow deficit deduction",
		);
	});
});
