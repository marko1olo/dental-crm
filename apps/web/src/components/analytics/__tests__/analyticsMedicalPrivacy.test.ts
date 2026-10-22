/**
 * apps/web/src/components/analytics/__tests__/analyticsMedicalPrivacy.test.ts
 * Mandate 8b: File <= 120 lines. Medical secrecy & patient privacy enforcement.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const analyticsDir = path.resolve(__dirname, "..");

test("MarketingRoiModal enforces patient initials only, masked phone, and neutral treatment plan titles", () => {
	const filePath = path.join(analyticsDir, "MarketingRoiModal.tsx");
	const content = fs.readFileSync(filePath, "utf8");

	assert.ok(
		content.includes('data-testid="marketing-roi-privacy-banner"'),
		"MarketingRoiModal must display privacy banner in UTM tab",
	);
	assert.ok(
		content.includes("formatInitialsOnly"),
		"MarketingRoiModal must use formatInitialsOnly for patient names",
	);
	assert.ok(
		content.includes("maskRussianPhone"),
		"MarketingRoiModal must use maskRussianPhone for telephone numbers",
	);
	assert.ok(
		content.includes("sanitizedPlanTitle"),
		"MarketingRoiModal must sanitize clinical diagnoses from plan titles",
	);
});

test("FinancialAnalyticsModal enforces medical privacy notice and strictly impersonal accounting aggregates", () => {
	const filePath = path.join(analyticsDir, "FinancialAnalyticsModal.tsx");
	const content = fs.readFileSync(filePath, "utf8");

	assert.ok(
		content.includes('data-testid="financial-privacy-note"'),
		"FinancialAnalyticsModal must display medical secrecy compliance notice",
	);
	assert.ok(
		content.includes("врачебной тайны (152-ФЗ и ст. 13 323-ФЗ)"),
		"Must explicitly cite medical privacy regulations",
	);
});
