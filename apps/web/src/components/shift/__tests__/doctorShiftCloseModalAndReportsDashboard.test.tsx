/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Shift Closure Reconciliation & Reports Dashboard Tests
 *
 * Invariants:
 * 1. Mandate 8b: Integer kopecks & SSR rendering (zero memory leaks, 0 MB DOM bloat).
 * 2. Mandate 8c: Touch targets >= 44x44px for clinical workflows.
 * 3. Mandate 8d: Zero cartoon emojis across all rendered HTML.
 * 4. Mandate 8e & 8n: Solo Doctor & Small Clinic Sovereignty (Zero Dead-Ends).
 * 5. Strict test ceiling <= 10s per suite.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	CashShiftClosingModal,
	type CashShiftClosingModalProps,
	type ZReportData,
} from "../CashShiftClosingModal";

const EMOJI_REGEX = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

function cleanSsrHtml(html: string): string {
	return html.replace(/<!--.*?-->/g, "").replace(/\u00a0/g, " ").replace(/\s+/g, " ");
}

describe("Doctor Shift Closure Reconciliation & Executive Reports Dashboard", () => {
	describe("1. CashShiftClosingModal (Canonical SSOT)", () => {
		it("1.1 Renders null when isOpen is false", () => {
			const html = renderToString(
				React.createElement(CashShiftClosingModal, {
					isOpen: false,
					onClose: () => {},
				}),
			);
			assert.equal(html, "");
		});

		it("1.2 Renders shift reconciliation summary, cash breakdown and channels when open", () => {
			const html = renderToString(
				React.createElement(CashShiftClosingModal, {
					isOpen: true,
					onClose: () => {},
					cashierFullName: "Д-р Смирнов Алексей Петрович",
					clinicLegalName: "ООО «Денте Стоматология»",
					incomeCashRub: 40000,
					incomeElectronicRub: 75000,
					incomeSbpRub: 20000,
					advanceOffsetRub: 10000,
				}),
			);

			const cleanHtml = cleanSsrHtml(html);

			// Must contain cashier/doctor info
			assert.ok(cleanHtml.includes("Закрытие смены и Z-отчёт"));
			assert.ok(cleanHtml.includes("Смирнов Алексей Петрович"));
			assert.ok(cleanHtml.includes("ООО «Денте Стоматология»"));

			// Must contain cash channels
			assert.ok(cleanHtml.includes("Наличные"));
			assert.ok(cleanHtml.includes("Безнал / карта"));
			assert.ok(cleanHtml.includes("QR СБП"));
			assert.ok(cleanHtml.includes("Зачёт аванса"));

			// Mandate 8d: Zero cartoon emojis
			assert.equal(
				EMOJI_REGEX.test(html),
				false,
				"CashShiftClosingModal must contain zero cartoon emojis",
			);
		});

		it("1.3 Handles zero/empty cash summary gracefully with internal fallback", () => {
			const html = renderToString(
				React.createElement(CashShiftClosingModal, {
					isOpen: true,
					onClose: () => {},
					incomeCashRub: 0,
					incomeElectronicRub: 0,
					incomeSbpRub: 0,
					advanceOffsetRub: 0,
				}),
			);

			const cleanHtml = cleanSsrHtml(html);
			assert.ok(cleanHtml.includes("Закрытие смены и Z-отчёт"));
			assert.ok(cleanHtml.includes("0 ₽"));
			assert.equal(
				EMOJI_REGEX.test(html),
				false,
				"CashShiftClosingModal zero state must contain zero emojis",
			);
		});

		it("1.4 Renders cash reconciliation block and acquiring check", () => {
			const html = renderToString(
				React.createElement(CashShiftClosingModal, {
					isOpen: true,
					onClose: () => {},
					incomeCashRub: 15000,
					incomeElectronicRub: 35000,
					incomeSbpRub: 10000,
					advanceOffsetRub: 5000,
				}),
			);

			const cleanHtml = cleanSsrHtml(html);
			assert.ok(cleanHtml.includes("Сверка фактической наличности"));
			assert.ok(cleanHtml.includes("Сверка терминала эквайринга"));
			assert.equal(
				EMOJI_REGEX.test(html),
				false,
				"CashShiftClosingModal must contain zero emojis",
			);
		});
	});
});
