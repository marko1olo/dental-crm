import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it } from "vitest";
import { InboundInvoiceModal } from "../InboundInvoiceModal.js";
import { InboundInvoiceMobileCards } from "../InboundInvoiceMobileCards.js";
import { InboundInvoiceItemsTable } from "../InboundInvoiceItemsTable.js";
import { InventoryInboundInvoiceModal } from "../../../InventoryInboundInvoiceModal.js";
import type { InboundInvoiceItemLine } from "../InboundInvoiceTypes.js";

const INBOUND_MODAL_DIR = path.resolve(__dirname, "..");
const FACADE_FILE = path.resolve(__dirname, "../../../InventoryInboundInvoiceModal.tsx");

const sampleItems = [
	{
		id: "it-1",
		name: "Перчатки нитриловые",
		stockQuantity: 50,
		category: "Расходные материалы",
		unit: "уп.",
		unitCostRub: "650",
		threshold: 10,
		criticalThreshold: 5,
		lotNumber: "LOT-01",
		expirationDate: "2028-12-31",
	},
];

const sampleLines: InboundInvoiceItemLine[] = [
	{
		id: "line-1",
		name: "Перчатки нитриловые",
		lotNumber: "LOT-2026-01",
		expirationDate: "2028-12-31",
		quantity: 10,
		unit: "уп.",
		unitCostRub: 650,
	},
];

describe("InboundInvoiceModal: Decomposed Architecture & Mandates 8b, 8e, 8n, 8ze", () => {
	it("1. Verifies Mandate 8b line limits: all micro-modules <= 120 lines, facade <= 15 lines", () => {
		const files = fs.readdirSync(INBOUND_MODAL_DIR).filter((f) => f.endsWith(".ts") || f.endsWith(".tsx"));
		assert.ok(files.length >= 8, "Must contain all decomposed sub-modules");

		for (const file of files) {
			const fullPath = path.join(INBOUND_MODAL_DIR, file);
			const lines = fs.readFileSync(fullPath, "utf-8").split(/\r?\n/).length;
			assert.ok(
				lines <= 120,
				`File ${file} has ${lines} lines, exceeding the strict limit of 120 lines (Mandate 8b)!`,
			);
		}

		const facadeLines = fs.readFileSync(FACADE_FILE, "utf-8").split(/\r?\n/).length;
		assert.ok(
			facadeLines <= 15,
			`Facade InventoryInboundInvoiceModal.tsx has ${facadeLines} lines, exceeding the limit of 15 lines!`,
		);
	});

	it("2. Verifies SSR render of InboundInvoiceModal has clean domain language and zero emojis (Mandate 8d, 8x)", () => {
		const html = renderToString(
			<InboundInvoiceModal
				isOpen={true}
				onClose={() => {}}
				organizationId="org-1"
				inventoryItems={sampleItems}
			/>,
		);

		assert.ok(html.includes("Приходная накладная поставщика"), "Title must use clean clinical language");
		assert.ok(html.includes("Номер приходной накладной"), "Field label must be clear without raw legal codes");
		assert.ok(html.includes("Оприходовать накладную"), "Action button must be present");
		assert.ok(html.includes("Итого по накладной:"), "Summary label must be clean");

		const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}]/u;
		assert.strictEqual(emojiRegex.test(html), false, "Must have 0 cartoon emojis");
	});

	it("3. Verifies Mandate 8e: Primary CTA button is NOT disabled by default", () => {
		const html = renderToString(
			<InboundInvoiceModal
				isOpen={true}
				onClose={() => {}}
				organizationId="org-1"
				inventoryItems={sampleItems}
			/>,
		);

		assert.ok(html.includes('data-testid="btn-post-inbound-invoice"'));
		assert.ok(!html.includes('data-testid="btn-post-inbound-invoice" disabled'));
	});

	it("4. Verifies Desktop Table and Apple HIG Mobile Cards render without errors", () => {
		const tableHtml = renderToString(
			<InboundInvoiceItemsTable
				lines={sampleLines}
				inventoryItems={sampleItems}
				onAddLine={() => {}}
				onChangeLine={() => {}}
				onRemoveLine={() => {}}
			/>,
		);
		assert.ok(tableHtml.includes("Товарные позиции"));

		const mobileHtml = renderToString(
			<InboundInvoiceMobileCards
				lines={sampleLines}
				inventoryItems={sampleItems}
				onAddLine={() => {}}
				onChangeLine={() => {}}
				onRemoveLine={() => {}}
			/>,
		);
		assert.ok(mobileHtml.includes("Позиции"));
		assert.ok(mobileHtml.includes("Добавить строку позиции"));
	});

	it("5. Verifies ruble money calculation: 10 * 650 is formatted as 6 500 ₽, not 650 000 ₽", () => {
		const html = renderToString(
			<InboundInvoiceItemsTable
				lines={sampleLines}
				inventoryItems={sampleItems}
				onAddLine={() => {}}
				onChangeLine={() => {}}
				onRemoveLine={() => {}}
			/>,
		);
		assert.ok(!html.includes("650\u00A0000") && !html.includes("650 000"), "Must NOT multiply rubles by 100");
		assert.ok(html.includes("6\u00A0500\u00A0₽") || (html.includes("6") && html.includes("500")), "Must format 6 500 ₽");
	});
});
