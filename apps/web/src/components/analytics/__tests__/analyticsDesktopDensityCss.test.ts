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

test("pnlFooter.css enforces 36px desktop density with mobile touch >= 44px", () => {
	const cssPath = path.resolve(analyticsDir, "../finance/pnl/pnlStyles/pnlFooter.css");
	const content = fs.readFileSync(cssPath, "utf8");

	assert.ok(
		content.includes(".pnl-footer-btn-primary"),
		"pnlFooter.css must define .pnl-footer-btn-primary",
	);
	assert.ok(
		content.includes("height: 36px"),
		"pnlFooter.css must use 36px height on desktop",
	);
	assert.ok(
		content.includes("height: 44px"),
		"pnlFooter.css must maintain 44px touch target on mobile",
	);
});
