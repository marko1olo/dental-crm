/**
 * treatmentPlanSplitViewAndPanel.test.tsx — двухколоночный сплит-режим и панель каталога.
 * (Мандат 8b: строго <= 120 строк).
 */

import assert from "node:assert/strict";
import { describe, it as test } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { TreatmentPlanSplitView } from "../splitCatalog/TreatmentPlanSplitView";
import { SplitCatalogPanel } from "../splitCatalog/SplitCatalogPanel";
import { mockSplitCatalog, mockSplitStages } from "./helpers/splitCatalogTestHelpers";

describe("TreatmentPlanSplitView — Сплит-режим «Каталог + Этапы»", () => {
	test("рендерит двухколоночный контейнер со сплит-панелью каталога и таблицей этапа", () => {
		const html = renderToString(
			<TreatmentPlanSplitView
				stages={mockSplitStages}
				catalog={mockSplitCatalog}
				onQuickAddService={() => {}}
				onOpenCreateStageModal={() => {}}
			/>,
		);

		assert.ok(html.includes("treatment-plan-split-view"));
		assert.ok(html.includes("split-catalog-panel"));
		assert.ok(html.includes("Каталог услуг клиники"));
		assert.ok(html.includes("split-stages-header-bar"));
		assert.ok(html.includes("stage-services-table-1"));
	});

	test("левая панель каталога рендерит поиск, выбор зуба FDI и быстрые пакеты", () => {
		const html = renderToString(
			<SplitCatalogPanel
				catalog={mockSplitCatalog}
				activeStageNumber={1}
				activeStageTitle="Терапевтическая санация"
				selectedTooth={46}
				onSelectTooth={() => {}}
				onAddServiceToStage={() => {}}
				onApplyBundle={() => {}}
			/>,
		);

		assert.ok(html.includes("data-testid=\"split-catalog-search-input\""));
		assert.ok(html.includes("data-testid=\"split-catalog-tooth-bar\""));
		assert.ok(html.includes("Целевой зуб (FDI):"));
		assert.ok(html.includes("data-testid=\"tooth-chip-46\""));
		assert.ok(html.includes("data-testid=\"bundle-quick-hygiene\""));
		assert.ok(html.includes("data-testid=\"bundle-quick-caries\""));
		assert.ok(html.includes("Восстановление зуба светоотверждаемым композитом"));
		assert.ok(html.includes("split-service-price"));
		assert.ok(html.includes("data-testid=\"quick-add-A16.07.002.001\""));
	});
});
