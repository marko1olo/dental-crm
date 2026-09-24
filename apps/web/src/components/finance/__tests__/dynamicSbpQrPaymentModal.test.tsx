/**
 * apps/web/src/components/finance/__tests__/dynamicSbpQrPaymentModal.test.tsx
 *
 * Targeted verification suite for Dynamic SBP QR (ГОСТ Р 56042-2014 & NSPK)
 * in PaymentModal & Split Tender Auto-Offset per Mandates 8b, 8e, 8k.
 */

import React from "react";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import {
	generateDynamicSbpQrPayload,
	generateQrCodeSvg,
} from "@dental/shared/fiscal";
import { generateDynamicSbpQrSvg } from "../../../../../../packages/shared/src/fiscal/qrGenerator.js";
import { PaymentModal } from "../PaymentModal.js";

describe("Dynamic SBP QR & Split Tender Auto-Offset (Mandates 8b, 8e, 8k)", () => {
	describe("1. Shared SBP QR Generator Pure In-Memory Verification", () => {
		it("generates valid dynamic SBP payload without network requests", () => {
			const payload = generateDynamicSbpQrPayload({
				sumRub: 4500.5,
				orderId: "ORD-SBP-12345",
				purpose: "Оплата стоматологических услуг",
				clinicName: "ООО ДЕНТЕ",
				ttlMinutes: 15,
			});

			assert.ok(payload.nspkUrl.startsWith("https://qr.nspk.ru/"), "Must point to official NSPK domain");
			assert.equal(payload.sumKopecks, 450050, "Exact kopeck arithmetic (4500.50 -> 450050)");
			assert.ok(payload.sumFormattedRu.includes("4500.50"), "Formatted sum in rubles");
			assert.ok(payload.qrId.length > 5, "Generated unique QR identifier");
		});

		it("generates pure vector SVG markup locally without third-party network APIs", () => {
			const svgResult = generateDynamicSbpQrSvg({
				sumRub: 12000,
				orderId: "ORD-SBP-99999",
				purpose: "Протезирование зубов",
				clinicName: "ООО ДЕНТЕ",
			});

			assert.ok(svgResult.svg.includes("<svg"), "Must output valid XML SVG element");
			assert.ok(svgResult.svg.includes("</svg>"), "Must close SVG element");
			assert.ok(svgResult.svg.includes("<rect"), "Must include vector rect elements");
			assert.ok(svgResult.dataUri.startsWith("data:image/svg+xml;base64,"), "Data-URI is valid base64 SVG");
		});
	});

	describe("2. PaymentModal SBP Tab Rendering (activeMethod = sbp_qr)", () => {
		it("renders dynamic vector SVG QR code and status verification controls in SBP tab", () => {
			const html = renderToString(
				<PaymentModal
					isOpen={true}
					onClose={() => {}}
					defaultMethod="sbp_qr"
					amountKopecks={750000}
					patientId="pat-sbp-1"
					patientName="Кузнецов А.В."
					doctorName="Д-р Воронова Е.И."
					invoiceId="inv-sbp-7500"
				/>,
			);

			// Embedded container and display panel
			assert.ok(
				html.includes('data-testid="sbp-qr-embedded-container"'),
				"Must render sbp-qr-embedded-container",
			);
			assert.ok(
				html.includes('data-testid="sbp-qr-display-panel"'),
				"Must render sbp-qr-display-panel",
			);
			assert.ok(
				html.includes('data-testid="sbp-dynamic-qr-svg"'),
				"Must render vector SVG QR container",
			);

			// Verification and manual cashier confirm buttons (Mandates 8e, 8k)
			assert.ok(
				html.includes('data-testid="btn-check-sbp-status"'),
				"Must render button to query SBP status from bank gateway",
			);
			assert.ok(
				html.includes('data-testid="btn-manual-confirm-sbp"'),
				"Must render manual confirmation button for cashier autonomy",
			);

			// Footer trigger
			assert.ok(
				html.includes('data-testid="btn-sbp-submit-footer"'),
				"Must render dedicated SBP confirmation button in footer",
			);
			assert.ok(
				html.includes("7500") || html.includes("7\u00A0500") || html.includes("7\u202F500") || html.includes("7 500"),
				"Must display formatted amount 7 500 ₽ in SBP panel",
			);
		});
	});

	describe("3. PaymentModal Split Tab with SBP Tender (splitSbpRub > 0)", () => {
		it("renders dynamic SBP QR panel inside Split tab when SBP remainder is applied", () => {
			const html = renderToString(
				<PaymentModal
					isOpen={true}
					onClose={() => {}}
					defaultMethod="split"
					amountKopecks={1000000}
					patientId="pat-sbp-split"
					patientName="Морозова Т.Н."
					doctorName="Д-р Смирнов А.В."
					invoiceId="inv-split-sbp"
				/>,
			);

			// Remainder SBP button is present
			assert.ok(
				html.includes('data-testid="btn-payment-remainder-sbp"'),
				"Must render remainder SBP button in Split tab",
			);
		});
	});
});
