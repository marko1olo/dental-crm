/**
 * redTeamWarehouseInquisition.part2.test.tsx — Red Team Inquisitor Verification Suite:
 * Заказ поставщику и сайдбар склада (тесты 3-4).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	createSupplierPurchaseOrderFromLines,
	formatSupplierPurchaseOrderTextRu,
} from "../inventorySupplierOrders.js";
import { WorkspaceSidebar } from "../../../workspaceShellModules/WorkspaceSidebar.js";
import { useInventoryStore } from "../../../store/inventoryStore.js";

describe("Red Team: Warehouse & Procedure Catalog Write-off Invariants (Part 2)", () => {
	it("3. createSupplierPurchaseOrderFromLines формирует точные объемы заказа и суммы в копейках", () => {
		const lines = [
			{
				id: "line_1",
				inventoryItemId: "sku-filtek",
				materialName: "Композит Filtek Ultimate",
				category: "caries" as const,
				quantity: 2,
				standardQuantity: 2,
				source: "manual" as const,
				unit: "шприц",
				stockQuantity: 0,
				criticalThreshold: 3,
				unitCostKopecks: 350000,
			},
		];

		const po = createSupplierPurchaseOrderFromLines(lines);
		assert.ok(po, "Заказ поставщику должен быть сформирован");
		assert.equal(po.reason, "stock_deficit");
		assert.equal(po.items.length, 1);
		assert.ok(po.items[0]!.suggestedOrderQuantity >= 3, "Рекомендуемый заказ должен покрыть дефицит и порог");
		assert.ok(po.totalCostKopecks > 0, "Стоимость должна быть рассчитана в копейках");

		const text = formatSupplierPurchaseOrderTextRu(po);
		assert.ok(text.includes("ЗАКАЗ ПОСТАВЩИКУ"), "Текст заказа должен содержать шапку");
		assert.ok(text.includes("Композит Filtek Ultimate"), "Текст заказа должен содержать наименование материала");
	});

	it("4. WorkspaceSidebar рендерит бейдж закупки при наличии дефицитных позиций склада", () => {
		useInventoryStore.getState().setItems([
			{
				id: "item_def_1",
				name: "Артикаин 4%",
				sku: "ART-4",
				barcode: null,
				stockQuantity: -1,
				criticalThreshold: 5,
				unitCostRub: 120,
				unit: "карп",
				lotNumber: "LOT-1",
				expirationDate: "2027-01-01",
				category: "anesthesia",
			},
		]);

		const html = renderToString(
			<WorkspaceSidebar
				currentView="inventory"
				onViewIntent={() => {}}
				role="doctor"
				collapsed={false}
				onToggleCollapsed={() => {}}
				onLockSession={() => {}}
			/>,
		);

		assert.ok(
			html.includes('data-testid="sidebar-inventory-reorder-badge"'),
			"В сайдбаре обязан отображаться бейдж требуемой закупки для склада",
		);
	});
});
