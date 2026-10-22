/**
 * apps/web/src/components/analytics/__tests__/executiveDashboardVisualStructure.test.tsx
 * Mandate 8b: File <= 120 lines. Visual structure: Anti-Matryoshka CSS & Pragmatic KPI tiles.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webSrcRoot = path.resolve(__dirname, "../../..");

test("ExecutiveDashboard CSS: Anti-Matryoshka flattening removes nested card borders", () => {
	const cssPath = path.join(webSrcRoot, "components/analytics/executiveDashboard.css");
	const css = readFileSync(cssPath, "utf8");

	assert.ok(
		!css.includes(".executive-funnel-step-card {\n\tdisplay: flex;\n\tflex-direction: column;\n\tpadding: 1rem 1.25rem;\n\tbackground: var(--paper, #f8fafc);\n\tborder: 1px solid var(--line, #e2e8f0);\n\tborder-radius: 8px;"),
		"Funnel step card must NOT have nested card border and background",
	);
	assert.ok(
		css.includes(".executive-funnel-step-card {\n\tdisplay: flex;\n\tflex-direction: column;\n\tpadding: 0.875rem 0.5rem;\n\tbackground: transparent;\n\tborder: none;\n\tborder-top: 1px solid var(--line, #e2e8f0);"),
		"Funnel step card must use clean top divider with transparent background",
	);
	assert.ok(
		!css.includes(".executive-dept-card {\n\tdisplay: flex;\n\tflex-direction: column;\n\tpadding: 1rem 1.25rem;\n\tbackground: var(--paper, #f8fafc);\n\tborder: 1px solid var(--line, #e2e8f0);\n\tborder-radius: 8px;"),
		"Department card must NOT have nested card border and background",
	);
	assert.ok(
		css.includes(".executive-dept-card {\n\tdisplay: flex;\n\tflex-direction: column;\n\tpadding: 0.875rem 0.5rem;\n\tbackground: transparent;\n\tborder: none;\n\tborder-top: 1px solid var(--line, #e2e8f0);"),
		"Department card must use clean top divider with transparent background",
	);
});

test("ExecutiveDashboard: Pragmatic KPI tiles eliminate concentric Apple Fitness rings", () => {
	const chartPath = path.join(webSrcRoot, "components/analytics/executiveModules/ExecutiveChairUtilizationChart.tsx");
	const chartCode = readFileSync(chartPath, "utf8");

	assert.ok(!chartCode.includes('className="mobile-exec-rings-svg"'), "Concentric rings SVG removed");
	assert.ok(!chartCode.includes("ring-track-sanitation"), "Sanitation ring track removed");
	assert.ok(chartCode.includes('data-testid="tile-revenue"'), "Revenue plan/fact tile exists");
	assert.ok(chartCode.includes('data-testid="tile-occupancy"'), "Occupancy tile exists");
	assert.ok(chartCode.includes('data-testid="tile-avg-check"'), "Average check tile exists");
	assert.ok(chartCode.includes('data-testid="tile-net-profit"'), "Net profit tile exists");
	assert.ok(chartCode.includes('data-testid="tile-primary-patients"'), "Primary patients tile exists");
	assert.ok(chartCode.includes('data-testid="tile-repeat-patients"'), "Repeat patients tile exists");
	assert.ok(chartCode.includes('data-testid="tile-payment-methods"'), "Payment breakdown card exists");
});
