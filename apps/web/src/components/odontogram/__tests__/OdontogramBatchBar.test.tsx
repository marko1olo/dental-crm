/**
 * apps/web/src/components/odontogram/__tests__/OdontogramBatchBar.test.tsx
 *
 * Unit tests for OdontogramBatchBar (Canonical Macro-Batch Selection & 1-Click Status Application).
 * Mandates 8ar, 8ba, 8e.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { OdontogramBatchBar } from "../OdontogramBatchBar";

describe("OdontogramBatchBar SSOT Suite (Mandates 8ar, 8ba, 8e)", () => {
	it("1. Renders macro-selection buttons (ВЧ, НЧ, Фронт, Все) when no teeth selected", () => {
		const html = renderToString(
			<OdontogramBatchBar
				selectedTeeth={[]}
				isPediatric={false}
			/>,
		);

		assert.ok(html.includes('data-testid="odontogram-batch-bar"'));
		assert.ok(html.includes('data-testid="batch-select-upper-jaw-btn"'));
		assert.ok(html.includes("ВЧ (16)"));
		assert.ok(html.includes('data-testid="batch-select-lower-jaw-btn"'));
		assert.ok(html.includes("НЧ (16)"));
		assert.ok(html.includes('data-testid="batch-select-front-sector-btn"'));
		assert.ok(html.includes("Фронт (12)"));
		assert.ok(html.includes('data-testid="batch-select-all-teeth-btn"'));
		assert.ok(html.includes("Все (32)"));
		assert.ok(html.includes("8-ки (4)"));
	});

	it("2. Pediatric mode macro buttons reflect 20 primary teeth", () => {
		const html = renderToString(
			<OdontogramBatchBar
				selectedTeeth={[]}
				isPediatric={true}
			/>,
		);

		assert.ok(html.includes("ВЧ (10)"));
		assert.ok(html.includes("НЧ (10)"));
		assert.ok(html.includes("Фронт (12)"));
		assert.ok(html.includes("Все (20)"));
		// Wisdom teeth button must NOT be present in pediatric mode
		assert.ok(!html.includes("8-ки (4)"));
	});

	it("3. When teeth are selected, displays selection counter, clear, invert and 8 action buttons", () => {
		const html = renderToString(
			<OdontogramBatchBar
				selectedTeeth={[16, 26, 36, 46]}
				onClearSelection={() => {}}
				onInvertSelection={() => {}}
			/>,
		);

		assert.ok(html.includes('data-testid="batch-selected-count-badge"'));
		assert.ok(html.includes("Выбрано: 4"));
		assert.ok(html.includes('data-testid="batch-clear-selection-btn"'));
		assert.ok(html.includes('data-testid="batch-invert-selection-btn"'));

		// All 8 batch status buttons
		assert.ok(html.includes('data-testid="batch-apply-healthy-btn"'));
		assert.ok(html.includes('data-testid="batch-apply-caries-btn"'));
		assert.ok(html.includes('data-testid="batch-apply-filled-btn"'));
		assert.ok(html.includes('data-testid="batch-apply-missing-btn"'));
		assert.ok(html.includes('data-testid="batch-apply-pulpitis-btn"'));
		assert.ok(html.includes('data-testid="batch-apply-periodontitis-btn"'));
		assert.ok(html.includes('data-testid="batch-apply-crown-btn"'));
		assert.ok(html.includes('data-testid="batch-apply-implant-btn"'));
	});

	it("4. Zero cartoon emojis in rendered batch bar HTML", () => {
		const html = renderToString(
			<OdontogramBatchBar
				selectedTeeth={[16, 26]}
				onClearSelection={() => {}}
				onInvertSelection={() => {}}
				onQuickStateChange={() => {}}
			/>,
		);

		const emojiRegex = /[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		assert.equal(emojiRegex.test(html), false, "Must not contain cartoon emojis");
	});
});
