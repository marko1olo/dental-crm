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

import { formatInitialsOnly, maskRussianPhone } from "@dental/shared";

test("Analytics domain enforces patient initials only, masked phone, and medical secrecy (152-ФЗ)", () => {
	assert.equal(typeof formatInitialsOnly, "function");
	assert.equal(typeof maskRussianPhone, "function");

	const initials = formatInitialsOnly("Иванов Иван Иванович");
	assert.equal(initials, "Иванов И. И.");

	const maskedPhone = maskRussianPhone("+79998887766");
	assert.ok(maskedPhone.includes("•••") || maskedPhone.includes("***"), "Phone must be masked for patient privacy");
});

test("FinancialAnalyticsModal enforces medical privacy notice and strictly impersonal accounting aggregates", () => {
	const filePath = path.join(analyticsDir, "FinancialAnalyticsModal.tsx");
	const content = fs.readFileSync(filePath, "utf8");

	assert.ok(
		content.includes('data-testid="financial-privacy-note"'),
		"FinancialAnalyticsModal must display medical secrecy compliance notice",
	);
	assert.ok(
		content.includes("врачебной тайны"),
		"Must explicitly mention medical secrecy / privacy protection",
	);
	assert.ok(
		content.includes("агрегированными кассовыми суммами"),
		"Must explicitly state that accounting operates strictly on aggregated financial figures",
	);
});
