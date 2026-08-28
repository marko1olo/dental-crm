import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SbpPaymentQrModal } from "../SbpPaymentQrModal.js";
import type { SbpPaymentInvoice } from "../omnichannelTypes.js";

describe("SbpPaymentQrModal Component Suite", () => {
	const sampleInvoice: SbpPaymentInvoice = {
		orderId: "ORD-TEST-100",
		patientId: "pat-101",
		patientName: "Смирнов Алексей Викторович",
		phone: "+7 (916) 450-12-34",
		sumRub: 14500,
		sumKopecks: 1450000,
		purpose: "Оплата медицинских стоматологических услуг (ООО ДЕНТЕ)",
		clinicName: "DENTE Dental Clinic",
		totalInvoiceRub: 14500,
	};

	it("returns null when isOpen is false", () => {
		const html = renderToStaticMarkup(
			createElement(SbpPaymentQrModal, {
				isOpen: false,
				onClose: () => {},
				invoice: sampleInvoice,
			}),
		);
		assert.equal(html, "");
	});

	it("renders SBP modal with dynamic QR, NSPK brand, exact amount, and 1-click action buttons", () => {
		const html = renderToStaticMarkup(
			createElement(SbpPaymentQrModal, {
				isOpen: true,
				onClose: () => {},
				invoice: sampleInvoice,
				defaultTtlMinutes: 15,
			}),
		);

		// Заголовок и бренд СБП
		assert.ok(html.includes("Оплата по динамическому QR-коду СБП"), "Contains title");
		assert.ok(html.includes("СБП"), "Contains SBP brand emblem");
		assert.ok(html.includes("НСПК Банка России"), "Contains NSPK legal info");
		assert.ok(html.includes("ORD-TEST-100"), "Contains Order ID");
		assert.ok(html.includes("Смирнов Алексей Викторович"), "Contains patient name");

		// Точная сумма
		assert.ok(html.includes("14 500,00 ₽") || html.includes("14 500,00 ₽") || html.includes("14500"), "Contains exact sum formatted");

		// QR-код SVG
		assert.ok(html.includes("<svg"), "Contains SVG QR-code element");
		assert.ok(html.includes("viewBox"), "Contains valid SVG viewBox");

		// Таймер и статус
		assert.ok(html.includes("Срок действия QR-кода"), "Contains timer label");
		assert.ok(html.includes("15:00") || html.includes("14:59"), "Contains 15 min countdown");
		assert.ok(html.includes("Ожидание сканирования"), "Contains awaiting scan status");

		// Кнопки 1-кликовых действий
		assert.ok(html.includes("Скопировать ссылку"), "Contains copy link button");
		assert.ok(html.includes("Отправить в WhatsApp"), "Contains WhatsApp share button");
		assert.ok(html.includes("Отправить в Telegram"), "Contains Telegram share button");
		assert.ok(html.includes("Печать QR для стойки"), "Contains print button");

		// 54-ФЗ и ГОСТ
		assert.ok(html.includes("ФЗ-54"), "Contains 54-FZ legal notice");
		assert.ok(html.includes("ГОСТ Р 56042"), "Contains GOST reference");
	});

	it("renders split tender deposit coverage when family deposit is applied", () => {
		const splitInvoice: SbpPaymentInvoice = {
			...sampleInvoice,
			sumRub: 5000,
			sumKopecks: 500000,
			familyDepositOffsetRub: 9500,
			totalInvoiceRub: 14500,
		};

		const html = renderToStaticMarkup(
			createElement(SbpPaymentQrModal, {
				isOpen: true,
				onClose: () => {},
				invoice: splitInvoice,
			}),
		);

		assert.ok(html.includes("Покрыто семейным депозитом (Тег 1215)"), "Contains Tag 1215 split row");
		assert.ok(html.includes("9 500") || html.includes("9 500"), "Contains deposit amount");
		assert.ok(html.includes("5 000") || html.includes("5 000"), "Contains SBP remaining charge");
	});
});
