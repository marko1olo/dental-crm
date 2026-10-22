import assert from "node:assert/strict";
import { describe, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { WarehouseStockAlertsBar } from "../WarehouseStockAlertsBar.js";
import { WarehouseOverviewTab } from "../WarehouseOverviewTab.js";
import { WarehouseWaybillsTab } from "../WarehouseWaybillsTab.js";
import { WarehouseInventoryTab } from "../WarehouseInventoryTab.js";
import type { InventoryItem } from "../useInventoryLogic.js";

const SAMPLE_ITEMS: readonly InventoryItem[] = [
	{ id: "wh-item-1", name: "Артикаин 1:100 000 карпула 1.7 мл", category: "Анестезия", stockQuantity: 120, criticalThreshold: 30, unitCostRub: "95.00", unit: "карп.", sku: "ART-100", lotNumber: "LOT-441", expirationDate: "2027-12-31", updatedAt: "2026-10-07T12:00:00Z" },
	{ id: "wh-item-2", name: "Скандонест 3% карпула 1.7 мл", category: "Анестезия", stockQuantity: -5, criticalThreshold: 20, unitCostRub: "110.00", unit: "карп.", sku: "SCAND-3", lotNumber: "LOT-201", expirationDate: "2026-11-05", updatedAt: "2026-10-07T12:00:00Z" },
	{ id: "wh-item-3", name: "Перчатки нитриловые M", category: "СИЗ", stockQuantity: 4, criticalThreshold: 10, unitCostRub: "35.00", unit: "пар", sku: "GLV-M", lotNumber: "LOT-GLV-01", expirationDate: "2029-01-01", updatedAt: "2026-10-07T12:00:00Z" },
	{ id: "wh-item-4", name: "Просроченный препарат тестовый", category: "Терапия", stockQuantity: 2, criticalThreshold: 5, unitCostRub: "500.00", unit: "шт.", sku: "EXP-01", lotNumber: "LOT-OLD-99", expirationDate: "2025-01-01", updatedAt: "2026-10-07T12:00:00Z" },
];

describe("Warehouse Suite: Components Rendering (Part 1)", () => {
	it("WarehouseStockAlertsBar рендерит бейджи предупреждений без падений", () => {
		const html = renderToStaticMarkup(
			<WarehouseStockAlertsBar
				items={SAMPLE_ITEMS}
				onOpenWaybills={() => {}}
				onOpenBatchTracking={() => {}}
				onOpenInventoryAudit={() => {}}
			/>,
		);
		assert.ok(html.includes("warehouse-stock-alerts-bar"));
		assert.ok(html.includes("Заканчивается: 2 поз."));
		assert.ok(html.includes("Просрочено: 1 поз."));
	});

	it("WarehouseOverviewTab рендерит таблицу ТМЦ и KPI карточки", () => {
		const html = renderToStaticMarkup(
			<WarehouseOverviewTab
				organizationId="test-org-1"
				items={SAMPLE_ITEMS}
				onRefresh={() => {}}
				onSelectItem={() => {}}
				onDeductItem={() => {}}
				onReceiveItem={() => {}}
				onOpenWaybills={() => {}}
				onOpenBatchTracking={() => {}}
				onOpenInventoryAudit={() => {}}
				onQuickWriteoffCarpules={() => {}}
			/>,
		);
		assert.ok(html.includes("warehouse-overview-tab"));
		assert.ok(html.includes("Всего позиций"));
		assert.ok(html.includes("Артикаин"));
	});

	it("WarehouseWaybillsTab рендерит приходные накладные", () => {
		const html = renderToStaticMarkup(
			<WarehouseWaybillsTab
				organizationId="test-org-1"
				inventoryItems={SAMPLE_ITEMS}
				onWaybillPosted={() => {}}
				onRefreshStock={() => {}}
			/>,
		);
		assert.ok(html.includes("warehouse-waybills-tab"));
		assert.ok(html.includes("Поступление партий"));
		assert.ok(html.includes("Оприходовать накладную"));
	});

	it("WarehouseInventoryTab рендерит сличительную ведомость", () => {
		const html = renderToStaticMarkup(
			<WarehouseInventoryTab
				organizationId="test-org-1"
				items={SAMPLE_ITEMS}
				onApplyAudit={() => {}}
				onRefresh={() => {}}
			/>,
		);
		assert.ok(html.includes("warehouse-inventory-tab"));
		assert.ok(html.includes("Сличительная ведомость"));
	});
});
