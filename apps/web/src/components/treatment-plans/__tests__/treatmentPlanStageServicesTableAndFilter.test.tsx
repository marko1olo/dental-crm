/**
 * treatmentPlanStageServicesTableAndFilter.test.tsx — таблица услуг этапа.
 * (Мандат 8b: строго <= 120 строк).
 */

import assert from "node:assert/strict";
import { describe, it as test } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { StageServicesTable } from "../stageEditor/StageServicesTable";
import { mockSplitStages } from "./helpers/splitCatalogTestHelpers";

describe("TreatmentPlanSplitView — Таблица услуг этапа", () => {
	test("правая колонка этапа StageServicesTable рендерит услуги со степперами и действиями", () => {
		const html = renderToString(
			<StageServicesTable
				stage={mockSplitStages[0]!}
				onUpdateItemQuantity={() => {}}
				onRemoveItem={() => {}}
				onStartStage={() => {}}
				onPayStage={() => {}}
			/>,
		);

		assert.ok(html.includes("data-testid=\"stage-services-table-header\""));
		assert.ok(html.includes("data-testid=\"stage-row-item-101\""));
		assert.ok(html.includes("title=\"Зуб 46\""));
		assert.ok(html.includes("data-testid=\"dec-qty-item-101\""));
		assert.ok(html.includes("data-testid=\"inc-qty-item-101\""));
		assert.ok(html.includes("data-testid=\"stage-remove-item-101\""));
		assert.ok(html.includes("data-testid=\"stage-services-table-footer\""));
		assert.ok(html.includes("data-testid=\"stage-footer-pay-btn\""));
		assert.ok(html.includes("stage-footer-total-sum"));
	});
});
