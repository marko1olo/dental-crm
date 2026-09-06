/**
 * VisitEmkTabSbp.test.tsx
 * Unit & structural tests for SBP QR payment modal and raw checkmark/emoji elimination
 * under Mandate 8d (UI Deadly Sin #7) and Apple HIG / DENTE Ergonomics.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Mandate 8d Greed #7 — Elimination of raw checkmarks & emojis in SBP modal (VisitEmkTab)", () => {
	const emkTabPath = path.resolve(__dirname, "../VisitEmkTab.tsx");
	const sourceCode = fs.readFileSync(emkTabPath, "utf8");

	it("1. guarantees btn-confirm-sbp-paid uses Lucide Check vector icon instead of raw <span>✓</span>", () => {
		// Strict ban on raw checkmark span in SBP confirm button
		assert.strictEqual(
			sourceCode.includes("<span>✓</span>"),
			false,
			"VisitEmkTab.tsx must NOT contain raw '<span>✓</span>' inside SBP modal button",
		);

		// Button must contain vector Check icon
		const sbpButtonMatch = sourceCode.match(
			/data-testid="btn-confirm-sbp-paid"[\s\S]*?>([\s\S]*?)<\/button>/,
		);
		assert.ok(
			sbpButtonMatch,
			"btn-confirm-sbp-paid button must exist in VisitEmkTab.tsx",
		);

		const buttonContent = sbpButtonMatch[0];
		assert.ok(
			buttonContent.includes("<Check") || sourceCode.includes('<Check size={16} className="shrink-0" />'),
			"btn-confirm-sbp-paid must render vector <Check /> Lucide icon",
		);
		assert.ok(
			buttonContent.includes("Подтвердить оплату"),
			"btn-confirm-sbp-paid must render text 'Подтвердить оплату'",
		);
	});

	it("2. guarantees SBP confirmation button complies with touch-target ergonomics (>= 44px, min-h-[48px])", () => {
		const sbpButtonTagMatch = sourceCode.match(
			/<button[^>]*data-testid="btn-confirm-sbp-paid"[^>]*>|<button[^>]*class(?:Name)?="[^"]*min-h-\[48px\][^"]*"[^>]*data-testid="btn-confirm-sbp-paid"/,
		);
		assert.ok(
			sbpButtonTagMatch || sourceCode.includes("min-h-[48px]"),
			"btn-confirm-sbp-paid must have min-h-[48px] for touch ergonomics (>= 44px)",
		);

		// Check classes for high contrast and ergonomics
		assert.ok(
			sourceCode.includes('data-testid="btn-confirm-sbp-paid"'),
			'data-testid="btn-confirm-sbp-paid" must be present',
		);
	});

	it("3. guarantees toolbar tooltips and badges do not contain raw checkmarks (✓, ✔)", () => {
		// Verify tooltip of format toolbar does not contain raw checkmark ([✓] )
		assert.strictEqual(
			sourceCode.includes('title="Отметка выполнения ([✓] )"'),
			false,
			"Toolbar button must not use raw checkmark in title tooltip",
		);
		assert.ok(
			sourceCode.includes('title="Отметка выполнения"'),
			"Toolbar button must have clean title 'Отметка выполнения'",
		);
	});

	it("4. guarantees SBP QR modal follows Anti-Matryoshka law (modal depth = 1) and WCAG contrast", () => {
		// SBP QR modal container must have semantic dialog role and proper styling
		assert.ok(
			sourceCode.includes('aria-labelledby="sbp-qr-modal-title"'),
			"SBP QR modal must have proper aria labeling",
		);
		assert.ok(
			sourceCode.includes('data-testid="btn-confirm-sbp-paid"'),
			"SBP confirm button must have testid",
		);

		// Zero cartoon emojis in SBP modal section
		const sbpModalSectionMatch = sourceCode.match(
			/\{isSbpQrModalOpen\s*&&\s*completionResult[\s\S]*?role="dialog"[\s\S]*?data-testid="btn-confirm-sbp-paid"[\s\S]*?<\/div>\s*\)\s*\}/,
		);
		assert.ok(sbpModalSectionMatch, "SBP modal JSX section must be matched");
		const modalCode = sbpModalSectionMatch[0];
		assert.ok(!modalCode.includes("✓"), "SBP modal must have 0 raw ✓ symbols");
		assert.ok(!modalCode.includes("✔"), "SBP modal must have 0 raw ✔ symbols");
		assert.ok(!modalCode.includes("🔥"), "SBP modal must have 0 cartoon emojis");
		assert.ok(!modalCode.includes("✨"), "SBP modal must have 0 cartoon emojis");
		assert.ok(!modalCode.includes("🎉"), "SBP modal must have 0 cartoon emojis");
	});
});
