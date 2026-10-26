import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	SbpCashierControl,
	SbpExpiredBanner,
	SbpInvoiceSummaryCard,
	SbpLiveStatusPill,
	SbpModalFooter,
	SbpModalHeader,
	SbpQrFrame,
	SbpShareActions,
	SbpSuccessBanner,
	SbpTimerCard,
	checkSbpOrderStatus,
} from "../sbpPaymentModal/index.js";
import type { SbpPaymentInvoice } from "../omnichannelTypes.js";

describe("sbpPaymentModal Submodules Suite", () => {
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

	it("renders SbpModalHeader with title, order ID, and patient name", () => {
		const html = renderToStaticMarkup(
			createElement(SbpModalHeader, {
				titleId: "test-title-id",
				orderId: sampleInvoice.orderId,
				patientName: sampleInvoice.patientName,
				onClose: () => {},
			}),
		);
		assert.ok(html.includes("Оплата по динамическому QR-коду СБП"));
		assert.ok(html.includes("ORD-999-XYZ"));
		assert.ok(html.includes("Смирнов Алексей Викторович"));
		assert.ok(html.includes("СБП"));
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
		assert.ok(html.includes("18 500") || html.includes("18 500"));
		assert.ok(html.includes("REC-777"));
		assert.ok(html.includes("Фискальный накопитель подтвердил транзакцию"));
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
		assert.ok(html.includes("Подтверждено кассиром (ручная сверка"));
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
		assert.ok(html.includes("progress-warning"));
	});

	it("renders SbpLiveStatusPill across all 4 statuses", () => {
		const htmlAwaiting = renderToStaticMarkup(
			createElement(SbpLiveStatusPill, { status: "awaiting_scan", isManualReconciliation: false }),
		);
		assert.ok(htmlAwaiting.includes("Ожидание сканирования пациентом"));

		const htmlScanned = renderToStaticMarkup(
			createElement(SbpLiveStatusPill, { status: "scanned", isManualReconciliation: false }),
		);
		assert.ok(htmlScanned.includes("QR-код отсканирован, ожидание подтверждения"));

		const htmlPaid = renderToStaticMarkup(
			createElement(SbpLiveStatusPill, { status: "paid_success", isManualReconciliation: false }),
		);
		assert.ok(htmlPaid.includes("Платеж зачислен на расчетный счет"));

		const htmlExpired = renderToStaticMarkup(
			createElement(SbpLiveStatusPill, { status: "expired", isManualReconciliation: false }),
		);
		assert.ok(htmlExpired.includes("Код аннулирован"));
	});

	it("renders SbpInvoiceSummaryCard with multi-tender family deposit breakdown", () => {
		const html = renderToStaticMarkup(
			createElement(SbpInvoiceSummaryCard, { invoice: sampleInvoice }),
		);
		assert.ok(html.includes("18 500") || html.includes("18 500"));
		assert.ok(html.includes("Покрыто семейным депозитом:"));
		assert.ok(html.includes("3 500") || html.includes("3 500"));
		assert.ok(html.includes("Общая сумма по акту лечения:"));
		assert.ok(html.includes("22 000") || html.includes("22 000"));
		assert.ok(html.includes("0% (Бесплатно)"));
		assert.ok(html.includes("ГОСТ Р 56042 / EMVCo"));
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
		assert.ok(html.includes("Печать QR для стойки"));
	});

	it("renders SbpCashierControl in normal and confirmation-pending states", () => {
		const htmlNormal = renderToStaticMarkup(
			createElement(SbpCashierControl, {
				sumRub: 18500,
				isCheckingStatus: false,
				statusCheckMessage: { text: "Шлюз опрошен", type: "info" },
				isManualConfirmPending: false,
				onCheckGatewayStatus: () => {},
				onToggleManualConfirm: () => {},
				onConfirmManualReconciliation: () => {},
			}),
		);
		assert.ok(htmlNormal.includes("Контроль кассира (Касса и чеки / СБП):"));
		assert.ok(htmlNormal.includes("Обновить статус"));
		assert.ok(htmlNormal.includes("Подтвердить зачисление по банковской выписке"));

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
		assert.ok(htmlPending.includes("Вы подтверждаете, что сумма"));
		assert.ok(htmlPending.includes("Да, подтверждаю"));
		assert.ok(htmlPending.includes("Отмена"));
	});

	it("renders SbpModalFooter with legal note and action buttons", () => {
		const htmlAwaiting = renderToStaticMarkup(
			createElement(SbpModalFooter, { status: "awaiting_scan", onClose: () => {} }),
		);
		assert.ok(htmlAwaiting.includes("Безопасный эквайринг через АО «НСПК» и ЦБ РФ"));
		assert.ok(htmlAwaiting.includes("Закрыть"));

		const htmlPaid = renderToStaticMarkup(
			createElement(SbpModalFooter, { status: "paid_success", onClose: () => {} }),
		);
		assert.ok(htmlPaid.includes("Готово"));
	});

	it("checkSbpOrderStatus resolves properly with custom checker", async () => {
		const res = await checkSbpOrderStatus("ORD-1", async () => ({
			paid: true,
			fiscalReceiptId: "REC-123",
		}));
		assert.equal(res.paid, true);
		assert.equal(res.fiscalReceiptId, "REC-123");
		assert.equal(res.type, "success");
	});
});
