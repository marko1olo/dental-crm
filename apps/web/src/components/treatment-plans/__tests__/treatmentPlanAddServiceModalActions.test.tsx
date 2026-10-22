import assert from "node:assert/strict";
import { describe, it as test } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { TreatmentPlanAddServiceModal } from "../TreatmentPlanAddServiceModal";
import { MOCK_CATALOG, MOCK_STAGES } from "./helpers/addServiceModalTestHelpers";

describe("TreatmentPlanAddServiceModal — Actions & Default Catalog", () => {
	test("рендерит кнопку «Добавить в этап» с доступным data-testid", () => {
		const html = renderToString(
			<TreatmentPlanAddServiceModal
				isOpen={true}
				onClose={() => {}}
				stages={MOCK_STAGES}
				targetStage={MOCK_STAGES[0]!}
				catalog={MOCK_CATALOG}
				onAddService={() => {}}
			/>,
		);

		assert.ok(html.includes('data-testid="confirm-add-service-to-stage-btn"'));
		assert.ok(html.includes("Добавить в этап"));
		assert.ok(html.includes("Отмена"));
	});

	test("рендерит дефолтный словарь ORDER_804N_DICTIONARY, если каталог пустой или не передан", () => {
		const html = renderToString(
			<TreatmentPlanAddServiceModal
				isOpen={true}
				onClose={() => {}}
				stages={MOCK_STAGES}
				targetStage={MOCK_STAGES[0]!}
				catalog={undefined}
				onAddService={() => {}}
			/>,
		);

		assert.ok(html.includes("Каталог клинических услуг"));
		assert.ok(html.includes('data-testid="add-service-from-catalog-modal"'));
	});
});
