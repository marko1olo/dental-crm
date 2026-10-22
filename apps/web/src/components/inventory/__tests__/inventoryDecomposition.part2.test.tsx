import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";

import { InventoryStockTable } from "../InventoryStockTable.js";
import { InventoryInboundInvoiceModal } from "../../InventoryInboundInvoiceModal.js";
import { InventoryServiceUsagePanel } from "../../InventoryServiceUsagePanel.js";

describe("Wave 317 / Mandate 8b: Inventory Monolith Decomposition Audit (Part 2)", () => {
	const testItems = [
		{
			id: "item-1",
			name: "Анестетик Артикаин с эпинефрином",
			category: "Анестезия",
			stockQuantity: 45,
			threshold: 10,
			criticalThreshold: 10,
			unitCostRub: "120",
			unit: "карп.",
			lotNumber: "LOT-2026-A1",
			expirationDate: "2028-06-30",
			sku: "SKU-001",
			updatedAt: "2026-09-01T10:00:00.000Z",
		},
		{
			id: "item-2",
			name: "Композит Filtek Ultimate А2",
			category: "Композиты",
			stockQuantity: -2,
			threshold: 5,
			criticalThreshold: 5,
			unitCostRub: "3500",
			unit: "шприц",
			lotNumber: "LOT-2025-C2",
			expirationDate: "2026-10-15",
			sku: "SKU-002",
			updatedAt: "2026-09-01T10:00:00.000Z",
		},
		{
			id: "item-3",
			name: "Перчатки смотровые нитриловые",
			category: "Расходники",
			stockQuantity: 100,
			threshold: 20,
			criticalThreshold: 20,
			unitCostRub: "650",
			unit: "уп.",
			lotNumber: "LOT-2024-EX",
			expirationDate: "2025-01-01",
			sku: "SKU-003",
			updatedAt: "2026-09-01T10:00:00.000Z",
		},
	];

	it("4. Verifies InventoryInboundInvoiceModal renders clean TORG-12 without emojis (Mandate 8d)", () => {
		const html = renderToString(
			<InventoryInboundInvoiceModal
				isOpen={true}
				onClose={() => {}}
				organizationId="org-test-1"
				inventoryItems={testItems}
			/>,
		);

		assert.ok(html.includes("Приходная накладная поставщика"), "Must render invoice title");
		assert.ok(html.includes("ТОРГ-12"), "Must render TORG-12 designation");
		assert.ok(html.includes("Оприходовать накладную"), "Must render post button");

		const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}]/u;
		assert.strictEqual(
			emojiRegex.test(html),
			false,
			"InventoryInboundInvoiceModal must have 0 cartoon emojis in statutory forms (Mandate 8d)",
		);
	});

	it("5. Verifies InventoryServiceUsagePanel renders BOM specifications and cost simulation", () => {
		const html = renderToString(
			<InventoryServiceUsagePanel
				organizationId="org-test-1"
				inventoryItems={testItems}
			/>,
		);

		assert.ok(html.includes("Расход материалов по услугам") || html.includes("Технологические карты"), "Must render BOM title");
		assert.ok(html.includes("Справочник техкарт"), "Must render BOM editor tab");
		assert.ok(html.includes("Симулятор списания визита"), "Must render simulator tab");
	});

	it("6. Verifies InventoryStockTable facade delegates properly", () => {
		const html = renderToString(
			<InventoryStockTable
				items={testItems}
				isLoading={false}
			/>,
		);

		assert.ok(html.includes("Анестетик Артикаин"), "Stock table must render anesthesia item");
		assert.ok(html.includes("table"), "Stock table must render HTML table element");
	});
});
