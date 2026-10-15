/**
 * paymentModalModulesDecomposition.test.tsx
 *
 * Verifies the decomposed PaymentModal architecture in ./paymentModalModules/:
 * - Mandate 8b: Facade <= 120 lines, all submodules <= 800 lines.
 * - Export parity: All subcomponents and public contracts exported.
 * - Test anchor parity & 1-click cashier autonomy (Mandate 8e).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	PaymentModal,
	PaymentHeader,
	PaymentMethodSelector,
	PaymentCashCalculator,
	PaymentDiscountsPresets,
	PaymentBanners,
	PaymentFiscalPreview,
	PaymentFooterActions,
	PaymentActiveMethodCockpit,
	calculatePaymentDiscount,
	generateInvoicePrintHtml,
	generateActPrintHtml,
} from "../PaymentModal.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const billingDir = path.resolve(__dirname, "..");
const modulesDir = path.resolve(billingDir, "paymentModalModules");

describe("PaymentModal Decomposition Architecture (Mandate 8b & Decomposer Skill)", () => {
	it("enforces strict line limits: facade <= 120 lines, all submodules <= 800 lines", () => {
		const facadePath = path.resolve(billingDir, "PaymentModal.tsx");
		const facadeLines = fs.readFileSync(facadePath, "utf8").split("\n").length;
		assert.ok(
			facadeLines <= 120,
			`PaymentModal.tsx facade must be <= 120 lines, got ${facadeLines}`,
		);

		const moduleFiles = fs.readdirSync(modulesDir).filter((f) => /\.(ts|tsx)$/.test(f));
		assert.ok(moduleFiles.length >= 7, "Must contain decomposed module files");

		for (const file of moduleFiles) {
			const fullPath = path.join(modulesDir, file);
			const lines = fs.readFileSync(fullPath, "utf8").split("\n").length;
			assert.ok(
				lines <= 800,
				`Module ${file} exceeds 800 lines (${lines} lines)`,
			);
		}
	});

	it("exports all required modular subcomponents and domain helpers from facade", () => {
		assert.equal(typeof PaymentModal, "function");
		assert.equal(typeof PaymentHeader, "function");
		assert.equal(typeof PaymentMethodSelector, "function");
		assert.equal(typeof PaymentCashCalculator, "function");
		assert.equal(typeof PaymentDiscountsPresets, "function");
		assert.equal(typeof PaymentBanners, "function");
		assert.equal(typeof PaymentFiscalPreview, "function");
		assert.equal(typeof PaymentFooterActions, "function");
		assert.equal(typeof PaymentActiveMethodCockpit, "function");
		assert.equal(typeof calculatePaymentDiscount, "function");
		assert.equal(typeof generateInvoicePrintHtml, "function");
		assert.equal(typeof generateActPrintHtml, "function");
	});

	it("renders PaymentCashCalculator with denomination bill tiles and change calculation HUD", () => {
		const html = renderToString(
			React.createElement(PaymentCashCalculator, {
				totalDueRub: 3400,
				receivedCashRub: 5000,
				setReceivedCashRub: () => {},
				cashChange: {
					changeRub: 1600,
					isExact: false,
					shortageRub: 0,
				},
				handleCashSubmit: () => {},
				isSubmittingCash: false,
			}),
		);

		assert.ok(html.includes('data-testid="input-cash-received"'));
		assert.ok(html.includes('data-testid="btn-cash-exact"'));
		assert.ok(html.includes('data-testid="btn-cash-1000"'));
		assert.ok(html.includes('data-testid="btn-cash-2000"'));
		assert.ok(html.includes('data-testid="btn-cash-5000"'));
		assert.ok(html.includes('data-testid="btn-cash-10000"'));
		assert.ok(html.includes('data-testid="cash-change-display"'));
		assert.ok(html.includes('data-testid="cash-change-amount"'));
	});

	it("renders PaymentMethodSelector with all 5 tender methods when deposit is available", () => {
		const html = renderToString(
			React.createElement(PaymentMethodSelector, {
				activeMethod: "card_terminal",
				setActiveMethod: () => {},
				patientDepositRub: 5000,
				patientFamilyBalanceRub: 2000,
			}),
		);

		assert.ok(html.includes('data-testid="tab-method-card"'));
		assert.ok(html.includes('data-testid="tab-method-sbp"'));
		assert.ok(html.includes('data-testid="tab-method-cash"'));
		assert.ok(html.includes('data-testid="tab-method-split"'));
		assert.ok(html.includes('data-testid="tab-method-deposit"'));
	});
});
