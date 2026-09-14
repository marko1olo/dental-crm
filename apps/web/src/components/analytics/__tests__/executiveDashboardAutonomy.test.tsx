/**
 * executiveDashboardAutonomy.test.tsx
 *
 * Wave 102 Verification Suite:
 * 1. Mandate 8d (Anti-Matryoshka Law): Executive funnel and department P&L items are flattened list rows, not cards inside cards.
 * 2. Mandate 8b & 8c (Zero Mocks / Determinism): Absolute elimination of Math.random() in clinical rules, EGISZ REMD XML, CDA R2, prescription form 107-1/u, and loyalty gift certificates.
 * 3. Mandate 8e & 8p: Zero UI flickering from volatile React keys in clinical rule evaluation panels.
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

	// 1. Funnel step items must NOT have nested card borders or background
	assert.ok(
		!css.includes(".executive-funnel-step-card {\n\tdisplay: flex;\n\tflex-direction: column;\n\tpadding: 1rem 1.25rem;\n\tbackground: var(--paper, #f8fafc);\n\tborder: 1px solid var(--line, #e2e8f0);\n\tborder-radius: 8px;"),
		"Funnel step card must NOT have nested card border and background",
	);
	assert.ok(
		css.includes(".executive-funnel-step-card {\n\tdisplay: flex;\n\tflex-direction: column;\n\tpadding: 0.875rem 0.5rem;\n\tbackground: transparent;\n\tborder: none;\n\tborder-top: 1px solid var(--line, #e2e8f0);"),
		"Funnel step card must use clean top divider with transparent background",
	);

	// 2. Department P&L items must NOT have nested card borders or background
	assert.ok(
		!css.includes(".executive-dept-card {\n\tdisplay: flex;\n\tflex-direction: column;\n\tpadding: 1rem 1.25rem;\n\tbackground: var(--paper, #f8fafc);\n\tborder: 1px solid var(--line, #e2e8f0);\n\tborder-radius: 8px;"),
		"Department card must NOT have nested card border and background",
	);
	assert.ok(
		css.includes(".executive-dept-card {\n\tdisplay: flex;\n\tflex-direction: column;\n\tpadding: 0.875rem 0.5rem;\n\tbackground: transparent;\n\tborder: none;\n\tborder-top: 1px solid var(--line, #e2e8f0);"),
		"Department card must use clean top divider with transparent background",
	);
});

test("ClinicalRulePanel: React key is stable and deterministic without Math.random()", () => {
	const rulePanelPath = path.join(webSrcRoot, "ClinicalRulePanel.tsx");
	const code = readFileSync(rulePanelPath, "utf8");

	assert.ok(
		!code.includes("Math.random()"),
		"ClinicalRulePanel.tsx must NOT contain Math.random()",
	);
	assert.ok(
		code.includes("key={evaluation?.id || `eval-${evaluation?.ruleId || idx}`}"),
		"ClinicalRulePanel.tsx must use stable deterministic evaluation ID or ruleId",
	);
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
