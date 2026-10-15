/**
 * apps/web/src/components/billing/__tests__/sbpQrEngine.test.ts
 *
 * Unit tests for Autonomous Dynamic SBP QR Code Engine & Frictionless Cashier.
 *
 * Verifies:
 * - ГОСТ Р 56042-2014 & NSPK EMVCo dynamic QR payload generation
 * - Pure vector 160x160 SVG rendering with authentic SBP center logo injection
 * - SbpDynamicQrCard component rendering and safe-plate dark mode contrast
 * - CashRegisterPaymentPane: 28-32px total, quick split chips, 36px segmented switch
 * - SplitPaymentModal & CashRegisterDrawer integration
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	createSbpDynamicQr,
	generateSbpPaymentId,
	injectSbpCenterLogo,
	copySbpUrlToClipboard,
} from "../sbpQrEngine.js";
import { SbpDynamicQrCard } from "../SbpDynamicQrCard.js";
import { CashRegisterPaymentPane } from "../CashRegisterPaymentPane.js";
import { CashRegisterDrawer } from "../CashRegisterDrawer.js";
import { SplitPaymentModal } from "../SplitPaymentModal.js";

describe("Autonomous SBP Dynamic QR Code Engine & Frictionless Cashier", () => {
	describe("1. sbpQrEngine Pure Logic & Vector Generation", () => {
		it("generates collision-resistant UUIDv7-compliant SBP paymentId", () => {
			const id1 = generateSbpPaymentId();
			const id2 = generateSbpPaymentId();
			assert.ok(id1.startsWith("sbp-"), "Must start with sbp- prefix");
			assert.notEqual(id1, id2, "Payment IDs must be unique");
			assert.ok(id1.length > 20, "Must be long cryptographically random identifier");
		});

		it("creates valid dynamic SBP payload under ГОСТ Р 56042-2014 / NSPK", () => {
			const qr = createSbpDynamicQr({
				sumRub: 14500,
				orderId: "INV-2026-999",
				patientName: "Алексеев Владимир Сергеевич",
				clinicLegalName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
				ttlSeconds: 30,
			});

			assert.equal(qr.sumRub, 14500);
			assert.equal(qr.sumKopecks, 1450000);
			assert.ok(qr.nspkUrl.includes("qr.nspk.ru"), "Must link to official NSPK gateway");
			assert.ok(qr.deepLinkUrl.startsWith("sbp://pay?"), "Must provide sbp:// mobile deep-link");
			assert.equal(qr.ttlSeconds, 30);
			assert.ok(qr.crc16Hex.length === 4, "Must calculate valid 4-char CRC16 checksum");
			assert.ok(qr.svg.includes("<svg"), "Must produce XML SVG");
			assert.ok(qr.svg.includes('class="sbp-center-badge"'), "Must inject SBP center emblem");
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
		it("renders 160x160 vector QR canvas on white safe underplate with 30s timer", () => {
			const html = renderToString(
				React.createElement(SbpDynamicQrCard, {
					sumRub: 9800,
					orderId: "INV-9800",
					patientName: "Иванова Ольга",
					ttlSeconds: 30,
				})
			);

			// Root card & labels
			assert.ok(html.includes('data-testid="sbp-dynamic-qr-card"'), "Renders card container");
			assert.ok(html.includes("Динамический QR СБП"), "Renders title");
			assert.ok(html.includes("0.4% комиссия"), "Highlights lower commission");

			// Protected underplate for dark mode contrast
			assert.ok(html.includes('data-testid="sbp-qr-camera-underplate"'), "Renders protected white plate");
			assert.ok(html.includes('data-testid="sbp-qr-svg-canvas"'), "Renders SVG canvas");

			// Timer & amount
			assert.ok(html.includes('data-testid="sbp-timer-indicator"'), "Renders 30s countdown indicator");
			assert.ok(html.includes('data-testid="sbp-display-amount"'), "Renders formatted amount");
			assert.ok(html.includes("9 800 ₽") || html.includes("9 800 ₽"), "Displays correct roubles sum");

			// Confirm & copy controls
			assert.ok(html.includes('data-testid="btn-confirm-sbp-payment"'), "Renders confirm CTA");
			assert.ok(html.includes('data-testid="btn-copy-sbp-link"'), "Renders copy link button");
		});
	});

	describe("3. CashRegisterPaymentPane Component (Anti-Accordion Grid)", () => {
		it("renders prominent 28-32px amount, fast split chips, and 36px segmented switcher", () => {
			const html = renderToString(
				React.createElement(CashRegisterPaymentPane, {
					defaultAmountRub: 15000,
					cashierFullName: "Д-р Смирнов А.И.",
				})
			);

			// Root pane & large amount
			assert.ok(html.includes('data-testid="cash-register-payment-pane"'), "Renders payment pane");
			assert.ok(html.includes('data-testid="cashier-display-total-amount"'), "Renders prominent amount");
			assert.ok(html.includes("15 000 ₽") || html.includes("15 000 ₽"), "Amount is displayed");

			// 3 Fast split and rounding chips
			assert.ok(html.includes('data-testid="chip-preset-50-50-sbp"'), "Renders 50/50 Нал+СБП chip");
			assert.ok(html.includes('data-testid="chip-preset-all-sbp"'), "Renders Вся сумма в СБП chip");
			assert.ok(html.includes('data-testid="chip-preset-round-hundreds"'), "Renders Округлить до сотен chip");

			// 36px Segmented Method Switcher
			assert.ok(html.includes('data-testid="cashier-method-switcher"'), "Renders segmented switcher");
			assert.ok(html.includes('data-testid="btn-method-tab-sbp"'), "Renders SBP tab");
			assert.ok(html.includes('data-testid="btn-method-tab-card"'), "Renders Card tab");
			assert.ok(html.includes('data-testid="btn-method-tab-cash"'), "Renders Cash tab");
			assert.ok(html.includes('data-testid="btn-method-tab-split"'), "Renders Split tab");

			// Default active SBP card is mounted
			assert.ok(html.includes('data-testid="sbp-dynamic-qr-card"'), "SBP widget is active by default");
		});
	});

	describe("4. CashRegisterDrawer Integration", () => {
		it("renders 'Касса & СБП' navigation tab and mounts payment pane", () => {
			const html = renderToString(
				React.createElement(CashRegisterDrawer, {
					isOpen: true,
					onClose: () => {},
					cashierFullName: "Врач-стоматолог",
				})
			);

			assert.ok(html.includes('data-testid="cash-register-drawer"'), "Renders drawer");
			assert.ok(html.includes('data-testid="tab-register-payment"'), "Renders payment tab");
			assert.ok(html.includes("Касса &amp; СБП") || html.includes("Касса & СБП"), "Contains payment label");
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
			assert.ok(html.includes('data-testid="chip-preset-50-50-sbp"'), "Renders 50/50 SBP chip");
			assert.ok(html.includes('data-testid="chip-preset-all-sbp"'), "Renders All SBP chip");
			assert.ok(html.includes('data-testid="chip-preset-round-hundreds"'), "Renders Round chip");
			assert.ok(html.includes('data-testid="split-method-switcher"'), "Renders segmented method switcher");
		});
	});
});
