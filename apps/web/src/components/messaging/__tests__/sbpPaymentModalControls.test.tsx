import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	SbpCashierControl,
	SbpInvoiceSummaryCard,
	SbpModalFooter,
	SbpShareActions,
	checkSbpOrderStatus,
} from "../sbpPaymentModal/index.js";
import type { SbpPaymentInvoice } from "../omnichannelTypes.js";

describe("sbpPaymentModal — Controls, Invoices & Actions", () => {
	const sampleInvoice: SbpPaymentInvoice = {
		orderId: "ORD-999-XYZ",
		patientId: "pat-101",
		patientName: "Смирнов Алексей Викторович",
		phone: "+7 (916) 450-12-34",
		sumRub: 18500,
		sumKopecks: 1850000,
		purpose: "Лечение кариеса и реставрация зуба 4.6",
		clinicName: "ООО ДЕНТЕ",
		familyDepositOffsetRub: 3500,
		totalInvoiceRub: 22000,
	};

	it("renders SbpInvoiceSummaryCard with multi-tender family deposit breakdown", () => {
		const html = renderToStaticMarkup(
			createElement(SbpInvoiceSummaryCard, { invoice: sampleInvoice }),
		);
		assert.ok(html.includes("18 500") || html.includes("18 500"));
		assert.ok(html.includes("Покрыто семейным депозитом:"));
		assert.ok(html.includes("3 500") || html.includes("3 500"));
	});

	it("renders SbpShareActions with 4 channel action triggers", () => {
		const html = renderToStaticMarkup(
			createElement(SbpShareActions, {
				copied: false,
				qrPayload: null,
				invoice: sampleInvoice,
				onCopyLink: () => {},
				onPrint: () => {},
			}),
		);
		assert.ok(html.includes("Скопировать ссылку в буфер"));
		assert.ok(html.includes("Отправить в WhatsApp"));
		assert.ok(html.includes("Отправить в Telegram"));
	});

	it("renders SbpCashierControl in normal and confirmation-pending states", () => {
		const htmlNormal = renderToStaticMarkup(
			createElement(SbpCashierControl, {
				sumRub: 18500,
				isCheckingStatus: false,
				statusCheckMessage: null,
				isManualConfirmPending: false,
				onCheckGatewayStatus: () => {},
				onToggleManualConfirm: () => {},
				onConfirmManualReconciliation: () => {},
			}),
		);
		assert.ok(htmlNormal.includes("Контроль кассира"));

		const htmlPending = renderToStaticMarkup(
			createElement(SbpCashierControl, {
				sumRub: 18500,
				isCheckingStatus: false,
				statusCheckMessage: null,
				isManualConfirmPending: true,
				onCheckGatewayStatus: () => {},
				onToggleManualConfirm: () => {},
				onConfirmManualReconciliation: () => {},
			}),
		);
		assert.ok(htmlPending.includes("Да, подтверждаю"));
	});

	it("renders SbpModalFooter with legal note and action buttons", () => {
		const htmlAwaiting = renderToStaticMarkup(
			createElement(SbpModalFooter, { status: "awaiting_scan", onClose: () => {} }),
		);
		assert.ok(htmlAwaiting.includes("Безопасный эквайринг через АО «НСПК» и ЦБ РФ"));
	});

	it("checkSbpOrderStatus resolves properly with custom checker", async () => {
		const res = await checkSbpOrderStatus("ORD-1", async () => ({
			paid: true,
			fiscalReceiptId: "REC-123",
		}));
		assert.equal(res.paid, true);
		assert.equal(res.fiscalReceiptId, "REC-123");
	});
});
