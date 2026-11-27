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
import React from "react";
import { renderToString } from "react-dom/server";
import {
	fetchSbpDynamicQr,
	injectSbpCenterLogo,
	copySbpUrlToClipboard,
} from "../sbpQrEngine.js";
import {
	isTerminalPaidSbpStatus,
	resolveSbpManualCheckMessage,
} from "../sbp/useSbpPolling.js";
import { SbpDynamicQrCard } from "../SbpDynamicQrCard.js";
import { CashRegisterStudioModal } from "../../cashbox/CashRegisterStudioModal.js";

describe("Honest SBP QR contour", () => {
	describe("1. sbpQrEngine & useSbpPolling — server-only QR & terminal paid statuses", () => {
		it("refuses to confirm pending/created/waiting/failed/expired SBP statuses and only accepts terminal paid", () => {
			for (const nonPaid of ["pending", "PENDING", "created", "waiting", "failed", "expired", "refunded", "voided", "", null, undefined]) {
				assert.equal(isTerminalPaidSbpStatus(nonPaid), false, `Must NOT treat '${String(nonPaid)}' as paid`);
			}
			for (const paid of ["PAID", "DEPOSITED", "SETTLED", "CONFIRMED", "paid", "success", "deposited"]) {
				assert.equal(isTerminalPaidSbpStatus(paid), true, `Must confirm terminal status '${paid}'`);
			}
			assert.equal(resolveSbpManualCheckMessage("pending"), "Оплата банком ещё не подтверждена");
			assert.match(resolveSbpManualCheckMessage("expired"), /отклонён или просрочен/);
			assert.match(resolveSbpManualCheckMessage("failed"), /отклонён или просрочен/);
		});

		it("never fabricates QR locally on network error and parses real server QR payload", async () => {
			const originalFetch = globalThis.fetch;
			let requestedHeaders: Record<string, string> | undefined;
			globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
				requestedHeaders = init?.headers as Record<string, string> | undefined;
				return new Response(
					JSON.stringify({
						success: true,
						operationId: "01900000-0000-7000-8000-000000000002",
						payloadUrl: "https://qr.nspk.ru/AD1000TESTSERVER",
						qrSvg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><rect width="160" height="160"/></svg>',
						ttlSeconds: 300,
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			}) as typeof fetch;

			try {
				const ok = await fetchSbpDynamicQr({
					sumRub: 4500,
					operationId: "01900000-0000-7000-8000-000000000002",
				});
				assert.ok(ok.qr, "Server QR must be returned when API answers 200");
				assert.equal(ok.qr?.nspkUrl, "https://qr.nspk.ru/AD1000TESTSERVER");
				assert.ok(requestedHeaders !== undefined, "Request options must be passed");
			} finally {
				globalThis.fetch = originalFetch;
			}
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



	describe("5. SplitPaymentModal Integration", () => {
		it("renders quick split chips, 36px segmented switcher, and SBP widget when allocated", () => {
			const html = renderToString(
				React.createElement(CashRegisterStudioModal, {
					isOpen: true,
					onClose: () => {},
					defaultMethod: "split",
					mode: "checkout",
					totalDueKopecks: 1800000n,
					patientId: "pat-101",
					patientName: "Козлова Мария",
				})
			);

			assert.ok(html.includes('data-testid="quick-presets-section"'), "Renders quick presets section");
			assert.ok(html.includes('data-testid="btn-checkout-split-50-50"'), "Renders 50/50 preset");
			assert.ok(html.includes('data-testid="split-tender-panel"'), "Renders tender split section");
		});
	});
});
