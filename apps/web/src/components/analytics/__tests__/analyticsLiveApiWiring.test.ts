/**
 * apps/web/src/components/analytics/__tests__/analyticsLiveApiWiring.test.ts
 * Mandate 8b: File <= 120 lines. Zero mocks & live API endpoints wiring.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const analyticsDir = path.resolve(__dirname, "..");
const leadsDir = path.resolve(__dirname, "../../leads");

test("MarketingRoiModal fetches real /api/marketing/attribution", () => {
	const filePath = path.join(analyticsDir, "MarketingRoiModal.tsx");
	const content = fs.readFileSync(filePath, "utf8");

	assert.ok(
		content.includes("/api/marketing/attribution"),
		"MarketingRoiModal must fetch from /api/marketing/attribution",
	);
	assert.ok(
		content.includes("denteAdminSecretRequestHeaders"),
		"Must pass denteAdminSecretRequestHeaders",
	);
});

test("LeadsFunnelAnalyticsModal fetches live marketing spends from /api/marketing/attribution", () => {
	const filePath = path.join(leadsDir, "LeadsFunnelAnalyticsModal.tsx");
	const content = fs.readFileSync(filePath, "utf8");

	assert.ok(
		content.includes("/api/marketing/attribution"),
		"LeadsFunnelAnalyticsModal must fetch from /api/marketing/attribution",
	);
	assert.ok(
		content.includes("denteAdminSecretRequestHeaders"),
		"Must pass denteAdminSecretRequestHeaders",
	);
});

test("FinancialAnalyticsModal connects to /api/analytics/executive, /api/cash/cash-box, and /api/cash/expense-reasons", () => {
	const filePath = path.join(analyticsDir, "FinancialAnalyticsModal.tsx");
	const content = fs.readFileSync(filePath, "utf8");

	assert.ok(
		content.includes("/api/analytics/executive"),
		"FinancialAnalyticsModal must query /api/analytics/executive",
	);
	assert.ok(
		content.includes("/api/cash/cash-box"),
		"FinancialAnalyticsModal must query /api/cash/cash-box",
	);
	assert.ok(
		content.includes("/api/cash/expense-reasons"),
		"FinancialAnalyticsModal must query /api/cash/expense-reasons",
	);
});
