/**
 * apps/web/src/components/analytics/__tests__/executiveDashboardDeterminism.test.tsx
 * Mandate 8b: File <= 120 lines. Zero-mock determinism: React keys, UUIDs, RFC 4180 CSV.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webSrcRoot = path.resolve(__dirname, "../../..");

test("ClinicalRulePanel: React key is stable and deterministic without Math.random()", () => {
	const rulePanelPath = path.join(webSrcRoot, "ClinicalRulePanel.tsx");
	const code = readFileSync(rulePanelPath, "utf8");

	assert.ok(!code.includes("Math.random()"), "ClinicalRulePanel.tsx must NOT contain Math.random()");
	assert.ok(code.includes("key={evaluation?.id || `eval-${evaluation?.ruleId || idx}`}"));
});

test("EGISZ REMD and CDA R2: Document UUIDs do NOT use Math.random()", () => {
	const remdPath = path.join(webSrcRoot, "components/egisz/egiszRemdEngine.ts");
	const cdaPath = path.join(webSrcRoot, "components/egisz/cdaR2XmlBuilder.ts");

	const remdCode = readFileSync(remdPath, "utf8");
	const cdaCode = readFileSync(cdaPath, "utf8");

	assert.ok(!remdCode.includes("Math.random()"), "egiszRemdEngine.ts must NOT contain Math.random()");
	assert.ok(!cdaCode.includes("Math.random()"), "cdaR2XmlBuilder.ts must NOT contain Math.random()");
});

test("Prescription 107-1/u and Booking: Series and booking numbers are deterministic/crypto", () => {
	const emrPath = path.resolve(webSrcRoot, "../../../packages/shared/src/emr/emrProtocolEngine.ts");
	const bookingPath = path.join(webSrcRoot, "components/booking/PublicOnlineBookingWidget.tsx");
	const loyaltyPath = path.join(webSrcRoot, "components/loyalty/program/loyaltyEngine.ts");

	const emrCode = readFileSync(emrPath, "utf8");
	const bookingCode = readFileSync(bookingPath, "utf8");
	const loyaltyCode = readFileSync(loyaltyPath, "utf8");

	assert.ok(!emrCode.includes("Math.random()"), "emrProtocolEngine.ts must NOT contain Math.random()");
	assert.ok(!bookingCode.includes("Math.random()"), "PublicOnlineBookingWidget.tsx must NOT contain Math.random()");
	assert.ok(!loyaltyCode.includes("Math.random()"), "loyaltyEngine.ts must NOT contain Math.random()");
});

test("Executive CSV export: RFC 4180 compliance with UTF-8 BOM, CRLF, and payment breakdown", async () => {
	const { buildRfc4180Csv } = await import("../../reports/reportsCsvExport.js");

	const sampleRows = [
		["Показатель", "Значение", "Период"],
		["Выручка факт", "1 250 000 ₽", "month"],
		["Оплата наличными (касса)", "350 000 ₽ (28%)", "month"],
		["Оплата картой / ДМС", "675 000 ₽ (54%)", "month"],
		["Оплата СБП QR", "225 000 ₽ (18%)", "month"],
	];

	const csv = buildRfc4180Csv(sampleRows);

	assert.ok(csv.startsWith("\uFEFF"), "CSV must start with UTF-8 BOM (\\uFEFF)");
	assert.ok(csv.includes("\r\n"), "CSV must use CRLF line endings");
	assert.ok(csv.includes("Оплата наличными (касса)"));
	assert.ok(csv.includes("Оплата картой / ДМС"));
	assert.ok(csv.includes("Оплата СБП QR"));
});
