import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	SbpExpiredBanner,
	SbpLiveStatusPill,
	SbpModalHeader,
	SbpSuccessBanner,
	SbpTimerCard,
} from "../sbpPaymentModal/index.js";

describe("sbpPaymentModal — Banners, Header & Status Pills", () => {
	it("renders SbpModalHeader with title, order ID, and patient name", () => {
		const html = renderToStaticMarkup(
			createElement(SbpModalHeader, {
				titleId: "test-title-id",
				orderId: "ORD-999-XYZ",
				patientName: "Смирнов Алексей Викторович",
				onClose: () => {},
			}),
		);
		assert.ok(html.includes("Оплата по динамическому QR-коду СБП"));
		assert.ok(html.includes("ORD-999-XYZ"));
		assert.ok(html.includes("Смирнов Алексей Викторович"));
	});

	it("renders SbpSuccessBanner with formatted sum and receipt", () => {
		const html = renderToStaticMarkup(
			createElement(SbpSuccessBanner, {
				sumRub: 18500,
				fiscalReceiptId: "REC-777",
				isManualReconciliation: false,
			}),
		);
		assert.ok(html.includes("Оплачено успешно!"));
		assert.ok(html.includes("REC-777"));
	});

	it("renders SbpSuccessBanner with manual cashier reconciliation badge", () => {
		const html = renderToStaticMarkup(
			createElement(SbpSuccessBanner, {
				sumRub: 18500,
				fiscalReceiptId: null,
				isManualReconciliation: true,
			}),
		);
		assert.ok(html.includes("Ручная сверка (без чека ККТ)"));
	});

	it("renders SbpExpiredBanner with refresh button", () => {
		const html = renderToStaticMarkup(
			createElement(SbpExpiredBanner, { onRefresh: () => {} }),
		);
		assert.ok(html.includes("Время действия QR-кода истекло"));
		assert.ok(html.includes("Сгенерировать новый QR-код"));
	});

	it("renders SbpTimerCard with warning style when < 120s remaining", () => {
		const html = renderToStaticMarkup(
			createElement(SbpTimerCard, { remainingSeconds: 45, defaultTtlMinutes: 15 }),
		);
		assert.ok(html.includes("00:45"));
		assert.ok(html.includes("timer-warning"));
	});

	it("renders SbpLiveStatusPill across statuses", () => {
		const htmlAwaiting = renderToStaticMarkup(
			createElement(SbpLiveStatusPill, { status: "awaiting_scan", isManualReconciliation: false }),
		);
		assert.ok(htmlAwaiting.includes("Ожидание сканирования пациентом"));

		const htmlPaid = renderToStaticMarkup(
			createElement(SbpLiveStatusPill, { status: "paid_success", isManualReconciliation: false }),
		);
		assert.ok(htmlPaid.includes("Платеж зачислен на расчетный счет"));
	});
});
