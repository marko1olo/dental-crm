import assert from "node:assert/strict";
import { describe, it as test } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { TreatmentPlanAddServiceModal } from "../TreatmentPlanAddServiceModal";
import { MOCK_CATALOG, MOCK_STAGES } from "./helpers/addServiceModalTestHelpers";

describe("TreatmentPlanAddServiceModal — Render & Titles", () => {
	test("не рендерит разметку, если isOpen === false", () => {
		const html = renderToString(
			<TreatmentPlanAddServiceModal
				isOpen={false}
				onClose={() => {}}
				stages={MOCK_STAGES}
				targetStage={MOCK_STAGES[0]!}
				catalog={MOCK_CATALOG}
				onAddService={() => {}}
			/>,
		);
		assert.equal(html, "");
	});

	test("рендерит чистый заголовок «Каталог клинических услуг» и подзаголовок без птичьего языка при isOpen === true", () => {
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

		assert.ok(html.includes("Каталог клинических услуг"));
		assert.ok(html.includes("Прейскурант и клинические позиции для плана лечения"));
		assert.ok(html.includes('data-testid="add-service-from-catalog-modal"'));
		assert.ok(html.includes('data-testid="catalog-service-search-input"'));
	});

	test("рендерит позиции каталога с кодами, ценами и без обрезки названий", () => {
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

		for (const item of MOCK_CATALOG) {
			assert.ok(html.includes(item.title));
			assert.ok(html.includes(item.code!));
			assert.ok(html.includes(`data-testid="catalog-item-${item.id}"`));
		}
	});
});
