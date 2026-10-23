import assert from "node:assert/strict";
import { describe, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { WarehouseBatchTrackingModal } from "../WarehouseBatchTrackingModal.js";
import { WarehouseCatalogView } from "../WarehouseCatalogView.js";
import { ConsumablesDeductionModal } from "../ConsumablesDeductionModal.js";
import { AutoBomDeductionBanner } from "../AutoBomDeductionBanner.js";
import type { InventoryItem } from "../useInventoryLogic.js";

const SAMPLE_ITEMS: readonly InventoryItem[] = [
	{
		id: "wh-item-1",
		name: "Артикаин 1:100 000 карпула 1.7 мл",
		category: "Анестезия",
		stockQuantity: 120,
		criticalThreshold: 30,
		unitCostRub: "95.00",
		unit: "карп.",
		sku: "ART-100",
		lotNumber: "LOT-441",
		expirationDate: "2027-12-31",
		updatedAt: "2026-10-07T12:00:00Z",
	},
];

describe("Warehouse Suite: Components Rendering (Part 2)", () => {
	it("WarehouseBatchTrackingModal рендерит партии и серии", () => {
		const html = renderToStaticMarkup(
			<WarehouseBatchTrackingModal
				isOpen={true}
				onClose={() => {}}
				items={SAMPLE_ITEMS}
				onDeductBatch={() => {}}
				onReceiveBatch={() => {}}
				onWriteOffExpired={() => {}}
			/>,
		);
		assert.ok(html.includes("warehouse-batch-tracking-modal"));
		assert.ok(html.includes("Партионный учёт"));
	});

	it("WarehouseCatalogView рендерит каталог и тулбар в 1 строку", () => {
		const html = renderToStaticMarkup(
			<WarehouseCatalogView
				organizationId="test-org-1"
				items={SAMPLE_ITEMS}
			/>,
		);
		assert.ok(html.includes("warehouse-catalog-view"));
		assert.ok(html.includes("Позиций в клинике:"));
	});

	it("ConsumablesDeductionModal рендерит списание у кресла и мягкий овердрафт", () => {
		const html = renderToStaticMarkup(
			<ConsumablesDeductionModal
				isOpen={true}
				onClose={() => {}}
				procedureTitle="Лечение кариеса (пломба световая)"
				service804nCode="A16.07.002.011"
				currentStockMap={{ "it-art": 25, "it-fltk": -2 }}
			/>,
		);
		assert.ok(html.includes("consumables-deduction-modal"));
		assert.ok(html.includes("Расходные материалы приёма"));
	});

	it("AutoBomDeductionBanner рендерит статус расходников к услуге", () => {
		const html = renderToStaticMarkup(
			<AutoBomDeductionBanner
				procedureTitle="Пломбирование зуба световым композитом"
				onConfirmOneClick={() => {}}
			/>,
		);
		assert.ok(html.includes("auto-bom-deduction-banner"));
		assert.ok(html.includes("Автоматическое списание материалов по приёму:"));
	});
});
