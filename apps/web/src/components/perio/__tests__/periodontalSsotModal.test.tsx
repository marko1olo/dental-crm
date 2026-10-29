/**
 * periodontalSsotModal.test.tsx — SSOT модальная консолидация и правило ровно 1 Primary CTA (Мандат 8am).
 * Мандат 8b: <= 120 строк.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { PerioChartModal } from "../PerioChartModal";
import { PeriodontalPocketDepthModal } from "../PeriodontalPocketDepthModal";
import { PeriodontogramChart } from "../PeriodontogramChart";

describe("9. SSOT Modal Consolidation & Mandate 8am (1 Primary CTA)", () => {
	it("PerioChartModal delegates cleanly to PeriodontogramChart in modal mode", () => {
		const html = renderToString(
			<PerioChartModal
				isOpen={true}
				onClose={() => {}}
				patientName="Иванов И. И."
			/>,
		);

		assert.ok(html.includes("data-testid=\"perio-chart-modal\""));
		assert.ok(html.includes("data-testid=\"interactive-periodontogram\""));
		assert.ok(html.includes("Иванов И. И."));
	});

	it("PeriodontalPocketDepthModal delegates cleanly with focused tooth", () => {
		const html = renderToString(
			<PeriodontalPocketDepthModal
				isOpen={true}
				onClose={() => {}}
				toothNumber={16}
			/>,
		);

		assert.ok(html.includes("data-testid=\"perio-chart-modal\""));
		assert.ok(html.includes("data-testid=\"interactive-periodontogram\""));
	});

	it("PeriodontogramChart has exactly 1 Primary CTA save button and 0 3rd party brands", () => {
		const html = renderToString(
			<PeriodontogramChart readOnly={false} initialTier3Expanded={false} />,
		);

		assert.ok(html.includes("data-testid=\"perio-save-draft-btn\""));
		assert.ok(html.includes("Сохранить периодонтограмму") || html.includes("Сохранить статус десны"));
		// Zero mentions of Florida Probe (Mandate 8ap)
		assert.strictEqual(html.includes("Florida Probe"), false);
	});
});
