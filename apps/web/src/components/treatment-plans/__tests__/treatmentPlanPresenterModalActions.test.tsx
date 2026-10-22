import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { TreatmentPlanPresenterModal } from "../TreatmentPlanPresenterModal";
import { sampleTiers } from "./helpers/presenterModalTestHelpers";

describe("TreatmentPlanPresenterModal — Actions, Controls & Autonomy", () => {
	it("renders dynamic patient choice fixation button and print trigger", () => {
		const html = renderToString(
			<TreatmentPlanPresenterModal
				isOpen={true}
				onClose={() => {}}
				tiers={sampleTiers}
				initialSelectedTierId="standard"
				patientName="Смирнова Екатерина Васильевна"
			/>,
		);

		assert.ok(html.includes("confirm-patient-choice-btn"));
		assert.ok(html.includes("Пациент выбрал Вариант Б: Оптимум"));
		assert.ok(html.includes("Печать сметы плана"));
	});

	it("renders touch-first Segmented Control, 1-click NDFL calculation, and instant tariff apply buttons", () => {
		const html = renderToString(
			<TreatmentPlanPresenterModal
				isOpen={true}
				onClose={() => {}}
				tiers={sampleTiers}
				initialSelectedTierId="standard"
				patientName="Смирнова Екатерина Васильевна"
			/>,
		);

		assert.ok(html.includes("treatment-mobile-tier-bar"));
		assert.ok(html.includes("mobile-tier-btn-economy"));
		assert.ok(html.includes("mobile-tier-btn-standard"));
		assert.ok(html.includes("mobile-tier-btn-optimum"));
		assert.ok(html.includes("Оптимум"));

		assert.ok(html.includes("calc-ndfl-btn-standard"));
		assert.ok(html.includes("Вычет 13% НДФЛ:"));
		assert.ok(html.includes("Итого с вычетом:"));

		assert.ok(html.includes("apply-tier-btn-standard"));
		assert.ok(html.includes("Применить"));
	});

	it("guarantees AI copilot send button is NOT disabled when input is empty and has >= 36px touch target", () => {
		const html = renderToString(
			<TreatmentPlanPresenterModal isOpen={true} onClose={() => {}} tiers={sampleTiers} />,
		);

		assert.ok(html.includes("presenter-copilot-send-btn"));
		assert.ok(!html.includes('disabled="" data-testid="presenter-copilot-send-btn"'));
		assert.ok(html.includes("min-h-[36px]"));
		assert.ok(html.includes("min-w-[36px]"));
	});
});
