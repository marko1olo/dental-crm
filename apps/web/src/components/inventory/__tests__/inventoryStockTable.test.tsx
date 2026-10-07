import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	getExpiryTrafficLight,
	InventoryStockTable,
} from "../InventoryStockTable.js";
import type { InventoryItem } from "../useInventoryLogic.js";

describe("FEFO Smart Anesthesia & Expiry Traffic Light (Mandates 8e, 8n, 8v)", () => {
	const refDate = new Date("2026-09-24T00:00:00Z");

	describe("1. Expiry Date Traffic Light Logic (getExpiryTrafficLight)", () => {
		it("returns green status for expiration date > 6 months (> 180 days)", () => {
			// 2027-05-01 is ~219 days ahead (> 180)
			const result = getExpiryTrafficLight("2027-05-01", refDate);
			assert.equal(result.status, "good");
			assert.equal(result.color, "emerald");
			assert.equal(result.isBlocked, false);
			assert.equal(result.badgeTextRu, "Срок в норме (> 6 мес)");
		});

		it("returns amber warning for expiration date < 30 days (FEFO priority)", () => {
			// 2026-10-10 is 16 days ahead (< 30)
			const result = getExpiryTrafficLight("2026-10-10", refDate);
			assert.equal(result.status, "warning_soon");
			assert.equal(result.color, "amber");
			assert.equal(result.isBlocked, false);
			assert.equal(result.badgeTextRu, "Истекает скоро — первоочередной отпуск");
			assert.ok(result.labelRu.includes("16 дн."));
		});

		it("returns red blocked status for expired batch (daysLeft <= 0)", () => {
			// 2026-08-01 was 54 days ago
			const result = getExpiryTrafficLight("2026-08-01", refDate);
			assert.equal(result.status, "expired");
			assert.equal(result.color, "rose");
			assert.equal(result.isBlocked, true);
			assert.equal(result.badgeTextRu, "Просрочено — отпуск заблокирован");
			assert.ok(result.labelRu.includes("Просрочено"));
		});

		it("correctly handles Russian date format DD.MM.YYYY", () => {
			const resultGreen = getExpiryTrafficLight("31.12.2028", refDate);
			assert.equal(resultGreen.status, "good");
			assert.equal(resultGreen.color, "emerald");

			const resultSoon = getExpiryTrafficLight("15.10.2026", refDate);
			assert.equal(resultSoon.status, "warning_soon");
		});

		it("handles null or empty date gracefully without throwing", () => {
			const resultNull = getExpiryTrafficLight(null, refDate);
			assert.equal(resultNull.status, "unknown");
			assert.equal(resultNull.isBlocked, false);
		});
	});

	describe("2. InventoryStockTable Rendering & Mandates 8e, 8n, 8v", () => {
		const testItems: readonly InventoryItem[] = [
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
				expirationDate: "2026-10-10",
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
				expirationDate: "2026-08-01", // Просрочено
				updatedAt: "2026-09-24T12:00:00.000Z",
			},
			{
				id: "item-overdraft",
				name: "Игла карпульная 30G 0.3x21мм",
				stockQuantity: 0, // Дефицит / нулевой остаток
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

			// Проверяем наличие всех строк
			assert.ok(html.includes("stock-row-item-green"), "Must render green item row");
			assert.ok(html.includes("stock-row-item-amber"), "Must render amber item row");
			assert.ok(html.includes("stock-row-item-red"), "Must render red item row");
			assert.ok(html.includes("stock-row-item-overdraft"), "Must render overdraft item row");

			// Проверяем тексты светофора
			assert.ok(
				html.includes("Срок в норме (&gt; 6 мес)") || html.includes("Срок в норме (> 6 мес)"),
				"Green badge text must be present",
			);
			assert.ok(html.includes("Истекает скоро — первоочередной отпуск"), "Amber badge text must be present");
			assert.ok(html.includes("Просрочено — отпуск заблокирован"), "Red badge text must be present");
		});

		it("renders 1-click SanPiN 3.3686-21 disposal act button on expired item", () => {
			const html = renderToString(<InventoryStockTable items={testItems} />);

			// Красная позиция: обычное списание заблокировано, есть кнопка утилизации
			assert.ok(
				html.includes('data-testid="btn-sanpin-disposal-act-item-red"'),
				"Must render SanPiN disposal act button for expired item",
			);
			assert.ok(
				html.includes("Акт утилизации СанПиН 3.3686-21"),
				"Button must display SanPiN 3.3686-21 text",
			);
		});

		it("displays soft overdraft badge and allows deduction without error (Mandate 8n)", () => {
			const html = renderToString(<InventoryStockTable items={testItems} />);

			// Нулевой остаток: отображается овердрафт без блокировки
			assert.ok(
				html.includes('data-testid="soft-overdraft-badge-item-overdraft"'),
				"Must display soft overdraft badge for zero stock item",
			);
			assert.ok(
				html.includes("Мягкий учет расхода (дефицит)") ||
					html.includes("Овердрафт (0-блокировка)"),
				"Must display non-blocking deficit label",
			);
			assert.ok(
				html.includes("Списать (с дефицитом)") ||
					html.includes("Списать (Овердрафт)"),
				"Deduction button must allow deficit deduction",
			);
		});
	});
});
