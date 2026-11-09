/**
 * apps/web/src/components/analytics/__tests__/analyticsDesktopDensityCss.test.ts
 * Mandate 8b: File <= 120 lines. Desktop density (32-36px) & touch targets (>= 44px).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const analyticsDir = path.resolve(__dirname, "..");

test("execToolbar.css enforces 36px toolbar and button heights on desktop", () => {
	const cssPath = path.join(analyticsDir, "executiveStyles", "execToolbar.css");
	const content = fs.readFileSync(cssPath, "utf8");

	assert.ok(
		content.includes(".executive-canonical-toolbar"),
		"execToolbar.css must define .executive-canonical-toolbar",
	);
	assert.ok(
		content.includes("height: 36px"),
		"execToolbar.css must use 36px height for canonical toolbar",
	);
	assert.ok(
		content.includes("--line"),
		"Must use design tokens --line",
	);
});

test("financialAnalytics.css enforces 32-36px desktop density with mobile touch >= 44px", () => {
	const cssPath = path.join(analyticsDir, "financialAnalytics.css");
	const content = fs.readFileSync(cssPath, "utf8");

	assert.ok(
		content.includes(".fin-analytics-tab-btn"),
		"financialAnalytics.css must define .fin-analytics-tab-btn",
	);
	assert.ok(
		content.includes("height: 32px"),
		"financialAnalytics.css must use 32px height for desktop tabs",
	);
	assert.ok(
		content.includes(".fin-analytics-close-btn"),
		"financialAnalytics.css must define .fin-analytics-close-btn",
	);
	assert.ok(
		content.includes("min-width: 44px;"),
		"Close button must maintain 44px hit target",
	);
});
