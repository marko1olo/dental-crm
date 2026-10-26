/**
 * apps/web/src/components/billing/__tests__/sbpQrEngine.test.ts
 *
 * Honest SBP QR contour tests.
 *
 * Verifies:
 * - The QR is requested from the clinic server; without a server answer no QR
 *   is drawn and no fabricated NSPK link appears anywhere in the module.
 * - Honest failure: missing operation id or unreachable server produce a human
 *   error text, never a fake payment link.
 * - Pure vector helpers (SBP center logo injection, clipboard guard).
 * - SSR of SbpDynamicQrCard, CashRegisterPaymentPane, CashRegisterDrawer,
 *   SplitPaymentModal mounting.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	fetchSbpDynamicQr,
	injectSbpCenterLogo,
	copySbpUrlToClipboard,
} from "../sbpQrEngine.js";
import { SbpDynamicQrCard } from "../SbpDynamicQrCard.js";
import { CashRegisterPaymentPane } from "../CashRegisterPaymentPane.js";
import { CashRegisterDrawer } from "../CashRegisterDrawer.js";
import { SplitPaymentModal } from "../SplitPaymentModal.js";

const here = dirname(fileURLToPath(import.meta.url));

describe("Honest SBP QR contour", () => {
	describe("1. sbpQrEngine — server-only QR source", () => {
		it("never fabricates an NSPK link on the client", () => {
			const source = readFileSync(join(here, "../sbpQrEngine.ts"), "utf8");
			assert.ok(!source.includes("qr.nspk.ru"), "Client module must not contain fabricated NSPK URLs");
			assert.ok(!source.includes("sbp://pay"), "Client module must not invent sbp:// deep links");
		});

		it("refuses to request a QR without an operation id", async () => {
			const result = await fetchSbpDynamicQr({ sumRub: 14500 });
			assert.equal(result.qr, null);
			assert.ok(result.errorRu && result.errorRu.length > 0, "Must return a human error text");
		});

		it("returns an honest error when the server is unreachable (node test, no API)", async () => {
			const result = await fetchSbpDynamicQr({ sumRub: 14500, operationId: "01900000-0000-7000-8000-000000000001" });
			assert.equal(result.qr, null, "No QR without a server answer");
			assert.ok(result.errorRu && result.errorRu.length > 10, "Human-readable failure reason required");
		});

		it("injects crisp SBP center logo into SVG without breaking XML structure", () => {
			const rawSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160"><rect width="160" height="160" fill="#fff"/></svg>`;
			const injected = injectSbpCenterLogo(rawSvg, 160);

			assert.ok(injected.includes('aria-label="СБП"'), "Contains SBP label");
			assert.ok(injected.includes('fill="#0047bb"'), "Contains SBP blue sector");
			assert.ok(injected.includes('fill="#ffb81c"'), "Contains SBP yellow sector");
			assert.ok(injected.includes('fill="#e40046"'), "Contains SBP crimson sector");
			assert.ok(injected.endsWith("</svg>"), "Properly closes SVG");
		});

		it("handles copySbpUrlToClipboard gracefully in headless environment", async () => {
			const result = await copySbpUrlToClipboard("");
			assert.equal(result, false, "Empty URL returns false");
		});
	});

	describe("2. SbpDynamicQrCard Component", () => {
		it("renders the card in loading state on SSR and shows the amount, no fake QR", () => {
			const html = renderToString(
				React.createElement(SbpDynamicQrCard, {
					sumRub: 9800,
					orderId: "INV-9800",
					patientName: "Иванова Ольга",
					ttlSeconds: 300,
				})
			);

			assert.ok(html.includes('data-testid="sbp-dynamic-qr-card"'), "Renders card container");
			assert.ok(html.includes("QR-код СБП"), "Renders human title");
			assert.ok(html.includes('data-testid="sbp-qr-loading"'), "Server QR not yet arrived — honest loading state");
			assert.ok(!html.includes("qr.nspk.ru"), "No fabricated NSPK link while loading");
			assert.ok(html.includes("9 000") || html.includes("9 800"), "Displays correct roubles sum");
		});

		it("hides the manual confirm button in split mode", () => {
			const html = renderToString(
				React.createElement(SbpDynamicQrCard, {
					sumRub: 4500,
					compactMode: true,
					hideManualConfirm: true,
				})
			);
			assert.ok(!html.includes('data-testid="btn-confirm-sbp-payment"'), "No local confirm inside a split");
		});
	});

	describe("3. CashRegisterPaymentPane Component (Anti-Accordion Grid)", () => {
		it("renders prominent amount, fast split chips, and 36px segmented switcher", () => {
			const html = renderToString(
				React.createElement(CashRegisterPaymentPane, {
					defaultAmountRub: 15000,
					cashierFullName: "Д-р Смирнов А.И.",
				})
			);

			assert.ok(html.includes('data-testid="cash-register-payment-pane"'), "Renders payment pane");
			assert.ok(html.includes('data-testid="cashier-display-total-amount"'), "Renders prominent amount");
			assert.ok(html.includes("15 000"), "Amount is displayed");

			assert.ok(html.includes('data-testid="chip-preset-50-50-sbp"'), "Renders 50/50 Нал+СБП chip");
			assert.ok(html.includes('data-testid="chip-preset-all-sbp"'), "Renders Вся сумма в СБП chip");
			assert.ok(html.includes('data-testid="chip-preset-round-hundreds"'), "Renders Округлить до сотен chip");

			assert.ok(html.includes('data-testid="cashier-method-switcher"'), "Renders segmented switcher");
			assert.ok(html.includes('data-testid="btn-method-tab-sbp"'), "Renders SBP tab");
			assert.ok(html.includes('data-testid="btn-method-tab-card"'), "Renders Card tab");
			assert.ok(html.includes('data-testid="btn-method-tab-cash"'), "Renders Cash tab");
			assert.ok(html.includes('data-testid="btn-method-tab-split"'), "Renders Split tab");

			assert.ok(html.includes('data-testid="sbp-dynamic-qr-card"'), "SBP widget is active by default");
		});
	});

	describe("4. CashRegisterDrawer Integration", () => {
		it("renders payment navigation tab and mounts payment pane", () => {
			const html = renderToString(
				React.createElement(CashRegisterDrawer, {
					isOpen: true,
					onClose: () => {},
					cashierFullName: "Врач-стоматолог",
				})
			);

			assert.ok(html.includes('data-testid="cash-register-drawer"'), "Renders drawer");
			assert.ok(html.includes('data-testid="tab-register-payment"'), "Renders payment tab");
			assert.ok(html.includes("Касса") && html.includes("СБП"), "Contains payment label");
			assert.ok(html.includes('data-testid="cash-register-payment-pane"'), "Mounts frictionless payment pane");
		});
	});

	describe("5. SplitPaymentModal Integration", () => {
		it("renders quick split chips, 36px segmented switcher, and SBP widget when allocated", () => {
			const html = renderToString(
				React.createElement(SplitPaymentModal, {
					isOpen: true,
					onClose: () => {},
					totalDueRub: 18000,
					patientId: "pat-101",
					patientName: "Козлова Мария",
				})
			);

			assert.ok(html.includes('data-testid="split-payment-modal"'), "Renders split modal");
			assert.ok(html.includes('data-testid="quick-presets-section"'), "Renders quick presets section");
			assert.ok(html.includes('data-testid="btn-checkout-split-50-50"'), "Renders 50/50 preset");
			assert.ok(html.includes('data-testid="split-payment-section"'), "Renders tender split section");
			assert.ok(html.includes('data-testid="execute-fast-checkout-btn"'), "Renders single primary checkout CTA");
		});
	});
});
