import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";

import {
	InventoryView,
	WarehouseView,
	InventoryBatchFefoPanel,
	InventoryOperationsMenu,
	ConsumablesBatchWriteoffModal,
} from "../../InventoryView.js";

describe("Wave 317 / Mandate 8b: Inventory Functional Render & Re-Export Integrity (Part 1)", () => {
	it("1. Verifies InventoryView facade re-exports renderable WarehouseView alias", () => {
		assert.equal(WarehouseView, InventoryView);
		const html = renderToString(
			<WarehouseView
				organizationId="org-test-1"
				getHeaders={() => ({})}
			/>,
		);
		assert.ok(html.length > 0, "WarehouseView must render non-empty markup");
	});

	it("2. Verifies InventoryOperationsMenu renders operations trigger and menu items cleanly", () => {
		const html = renderToString(
			<InventoryOperationsMenu
				isOpen={true}
				onToggle={() => {}}
				onClose={() => {}}
				onOpenAcceptanceWaybills={() => {}}
				onOpenWarehouseManager={() => {}}
				onOpenMdlpScanning={() => {}}
				onOpenClinicalWriteoff={() => {}}
				onOpenInventoryAudit={() => {}}
				onOpenMdlpDisposal={() => {}}
				onOpenShiftDeductionModal={() => {}}
				onOpenSterilizationCycleModal={() => {}}
				onQuickWriteoffStandardKit={() => {}}
				onQuickWriteoffSterilizationKit={() => {}}
				onQuickWriteoffVisitBundle={() => {}}
				onQuickWriteoffShiftBundle={() => {}}
			/>,
		);

		assert.ok(html.includes("Операции"), "Operations menu trigger must render");
		assert.ok(html.includes("btn-warehouse-ops-menu"), "Operations button testid must exist");
	});

	it("3. Verifies InventoryBatchFefoPanel renders FEFO batches and traffic lights", () => {
		const html = renderToString(
			<InventoryBatchFefoPanel
				organizationId="org-test-1"
				items={[
					{
						id: "item-1",
						name: "Септанест с адреналином 1:100 000",
						category: "Анестезия",
						stockQuantity: 10,
						criticalThreshold: 5,
						unitCostRub: "450",
						unit: "карп.",
						lotNumber: "LOT-2027-A",
						expirationDate: "2028-12-31",
						sku: "SKU-1",
						updatedAt: "2026-09-01T10:00:00.000Z",
					},
				]}
				isLoading={false}
			/>,
		);

		assert.ok(html.includes("FEFO"), "FEFO panel must render FEFO header/indicators");
		assert.ok(html.includes("Септанест"), "FEFO panel must render item name");
	});

	it("4. Verifies ConsumablesBatchWriteoffModal avoids zIndex 100000 and hardcoded dev jargon", () => {
		const html = renderToString(
			<ConsumablesBatchWriteoffModal
				isOpen={true}
				onClose={() => {}}
				organizationId="org-test-1"
			/>,
		);

		assert.ok(html.includes("consumables-batch-writeoff-modal"), "Writeoff modal must render");
		assert.equal(html.includes("100000"), false, "Must not inline zIndex 100000");
		assert.equal(html.includes("1 клик"), false, "Must not contain '1 клик' jargon");
	});
});
