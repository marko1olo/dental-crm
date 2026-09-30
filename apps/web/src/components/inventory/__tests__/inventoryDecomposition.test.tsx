import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";

import { InventoryStockTable } from "../../InventoryStockTable.js";
import { InventoryBatchFefoPanel } from "../../InventoryBatchFefoPanel.js";
import { InventoryInboundInvoiceModal } from "../../InventoryInboundInvoiceModal.js";
import { InventoryServiceUsagePanel } from "../../InventoryServiceUsagePanel.js";
import * as InventoryViewExports from "../../InventoryView.js";

const WEB_SRC = fs.existsSync(path.resolve(process.cwd(), "apps/web/src"))
	? path.resolve(process.cwd(), "apps/web/src")
	: path.resolve(process.cwd(), "src");

describe("Wave 317 / Mandate 8b: Inventory Monolith Decomposition Audit", () => {
	const testItems = [
		{
			id: "item-1",
			name: "Анестетик Артикаин с эпинефрином",
			category: "Анестезия",
			stockQuantity: 45,
			threshold: 10,
			unitCostRub: "120",
			unit: "карп.",
			lotNumber: "LOT-2026-A1",
			expirationDate: "2028-06-30",
			sku: "SKU-001",
		},
		{
			id: "item-2",
			name: "Композит Filtek Ultimate А2",
			category: "Композиты",
			stockQuantity: -2,
			threshold: 5,
			unitCostRub: "3500",
			unit: "шприц",
			lotNumber: "LOT-2025-C2",
			expirationDate: "2026-10-15",
			sku: "SKU-002",
		},
		{
			id: "item-3",
			name: "Перчатки смотровые нитриловые",
			category: "Расходники",
			stockQuantity: 100,
			threshold: 20,
			unitCostRub: "650",
			unit: "уп.",
			lotNumber: "LOT-2024-EX",
			expirationDate: "2025-01-01",
			sku: "SKU-003",
		},
	];

	it("1. Verifies Mandate 8b line count invariant (EVERY file <= 800 lines)", () => {
		const filesToCheck = [
			path.join(WEB_SRC, "components/InventoryView.tsx"),
			path.join(WEB_SRC, "components/InventoryStockTable.tsx"),
			path.join(WEB_SRC, "components/InventoryBatchFefoPanel.tsx"),
			path.join(WEB_SRC, "components/InventoryInboundInvoiceModal.tsx"),
			path.join(WEB_SRC, "components/InventoryServiceUsagePanel.tsx"),
			path.join(WEB_SRC, "components/inventory/InventoryOperationsMenu.tsx"),
			path.join(WEB_SRC, "components/inventory/InventoryItemFormModal.tsx"),
			path.join(WEB_SRC, "components/inventory/InventoryStockAdjustModal.tsx"),
			path.join(WEB_SRC, "components/inventory/InventoryExternalModals.tsx"),
		];

		for (const file of filesToCheck) {
			assert.ok(fs.existsSync(file), `File ${file} must physically exist on disk`);
			const content = fs.readFileSync(file, "utf8");
			const lineCount = content.split(/\r?\n/).length;
			assert.ok(
				lineCount <= 800,
				`File ${path.basename(file)} has ${lineCount} lines, which strictly exceeds Mandate 8b limit of 800 lines!`,
			);
		}
	});

	it("2. Verifies 100% transparent re-exports from InventoryView.tsx", () => {
		assert.ok(InventoryViewExports.InventoryView, "InventoryView must be exported");
		assert.ok(InventoryViewExports.InventoryStockTable, "InventoryStockTable must be re-exported");
		assert.ok(InventoryViewExports.InventoryBatchFefoPanel, "InventoryBatchFefoPanel must be re-exported");
		assert.ok(InventoryViewExports.InventoryInboundInvoiceModal, "InventoryInboundInvoiceModal must be re-exported");
		assert.ok(InventoryViewExports.InventoryServiceUsagePanel, "InventoryServiceUsagePanel must be re-exported");
		assert.ok(InventoryViewExports.InventoryOperationsMenu, "InventoryOperationsMenu must be re-exported");
	});

	it("3. Verifies InventoryBatchFefoPanel renders FEFO batches and traffic lights", () => {
		const html = renderToString(
			<InventoryBatchFefoPanel
				items={testItems}
				isLoading={false}
				onDeductItem={() => {}}
				onReceiveItem={() => {}}
				onSelectItem={() => {}}
			/>,
		);

		assert.ok(html.includes("Анестетик Артикаин"), "Must render anesthesia item");
		assert.ok(html.includes("LOT-2026-A1"), "Must render batch lot number");
		assert.ok(html.includes("Все партии:"), "Must render all batches KPI");
		assert.ok(html.includes("Просрочено (СанПиН):"), "Must render expired KPI");
		assert.ok(html.includes("FEFO отпуск"), "Must render FEFO priority KPI");
		assert.ok(html.includes("Овердрафт"), "Must highlight soft overdraft badge");
	});

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

		// Mandate 8d zero cartoon emojis
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

		assert.ok(html.includes("Технологические карты услуг"), "Must render BOM title");
		assert.ok(html.includes("Приказ 804н"), "Must reference Order 804n");
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
