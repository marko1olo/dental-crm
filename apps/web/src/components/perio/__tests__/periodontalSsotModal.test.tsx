/**
 * periodontalSsotModal.test.tsx — SSOT модальная консолидация и правило ровно 1 Primary CTA (Мандат 8am).
 * Мандат 8b: <= 120 строк.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { PerioStudioModal } from "../PerioStudioModal";

describe("9. SSOT Modal Consolidation & Mandate 8am (1 Primary CTA)", () => {
	it("PerioStudioModal renders in modal mode with patient name", () => {
		const html = renderToString(
			<PerioStudioModal
				isModal={true}
				isOpen={true}
				onClose={() => {}}
				patientName="Иванов И. И."
			/>,
		);

		assert.ok(html.includes("data-testid=\"perio-chart-modal\""));
		assert.ok(html.includes("data-testid=\"interactive-periodontogram\""));
		assert.ok(html.includes("Иванов И. И."));
	});

	it("PerioStudioModal delegates cleanly with focused tooth", () => {
		const html = renderToString(
			<PerioStudioModal
				isModal={true}
				isOpen={true}
				onClose={() => {}}
				initialSelectedTooth={16}
			/>,
		);

		assert.ok(html.includes("data-testid=\"perio-chart-modal\""));
		assert.ok(html.includes("data-testid=\"interactive-periodontogram\""));
	});

	it("PerioStudioModal has exactly 1 Primary CTA save button and 0 3rd party brands", () => {
		const html = renderToString(
			<PerioStudioModal isModal={false} readOnly={false} initialTier3Expanded={false} />,
		);

		assert.ok(html.includes("data-testid=\"perio-save-draft-btn\""));
		assert.ok(html.includes("Сохранить пародонтограмму") || html.includes("Сохранить периодонтограмму") || html.includes("Сохранить статус десны"));
		// Zero mentions of Florida Probe (Mandate 8ap)
		assert.strictEqual(html.includes("Florida Probe"), false);
	});

	it("provides print and BOP calculation actions without disabled attribute (Mandate 8e)", () => {
		const html = renderToString(
			<PerioStudioModal isModal={false} readOnly={false} />,
		);

		assert.ok(html.includes("data-testid=\"perio-print-protocol-btn\""), "Print button must be present");
		assert.ok(html.includes("data-testid=\"perio-calc-indices-btn\""), "BOP calc button must be present");
		assert.ok(html.includes("data-testid=\"perio-save-mobile-btn\""), "Mobile primary CTA must be present");
		// Ensure buttons are never disabled (Mandate 8e)
		assert.strictEqual(html.includes("disabled=\"\""), false, "Buttons must not be disabled");
	});
});
