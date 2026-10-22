/**
 * treatmentPlanStageServicesTableAndFilter.test.tsx — таблица услуг этапа и фильтр специализаций.
 * (Мандат 8b: строго <= 120 строк).
 */

import assert from "node:assert/strict";
import { describe, it as test } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { StageServicesTable } from "../stageEditor/StageServicesTable";
import { TreatmentPlanSpecialtyFilterBar } from "../TreatmentPlanSpecialtyFilterBar";
import { mockSplitStages } from "./helpers/splitCatalogTestHelpers";

describe("TreatmentPlanSplitView — Таблица услуг и переключатель режимов", () => {
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

	test("TreatmentPlanSpecialtyFilterBar рендерит тумблер переключения режимов «Сплит-каталог» / «Карточки»", () => {
		const html = renderToString(
			<TreatmentPlanSpecialtyFilterBar
				stages={mockSplitStages}
				visibleStages={mockSplitStages}
				specialtyFilter="all"
				onSetSpecialtyFilter={() => {}}
				onOpenAddCatalogService={() => {}}
				onOpenCreateStageModal={() => {}}
				isSplitMode={true}
				onToggleSplitMode={() => {}}
			/>,
		);

		assert.ok(html.includes("data-testid=\"tp-split-mode-btn\""));
		assert.ok(html.includes("data-testid=\"tp-cards-mode-btn\""));
		assert.ok(html.includes("Сплит-каталог"));
	});
});
