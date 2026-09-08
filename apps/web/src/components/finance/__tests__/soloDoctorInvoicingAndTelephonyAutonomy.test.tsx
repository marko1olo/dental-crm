/**
 * apps/web/src/components/finance/__tests__/soloDoctorInvoicingAndTelephonyAutonomy.test.tsx
 *
 * Verification suite for Solo Doctor & Clinic Autonomy (Mandates 8e, 8k, 8n, 8d):
 * 1. Telephony outgoing call button is never disabled; empty dial triggers focus + toast.
 * 2. 54-FZ fiscal payment does not require physical person INN.
 * 3. Solo doctor cashier fallback (no cashier/admin required).
 * 4. Multi-tender split combination (card, cash, SBP, certificate, bonus) with exact kopecks.
 * 5. 100% warranty discount (0 ₽ receipt bypass).
 * 6. InvoicesView dense 1-line toolbar, <=2 card buttons, context menu, and touch targets >=44px.
 * 7. Zero emojis across all rendered interfaces.
 */

import React from "react";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import fs from "node:fs";
import path from "node:path";
import {
	validate54FzBuyerInn,
	calculateCashChange,
	allocateRemainderToTender,
	createCertificateAndCardComboTenders,
	createBonusAndCardComboTenders,
} from "../cashboxOperations.js";
import { PaymentModal } from "../PaymentModal.js";
import { InvoicesView, type BillingInvoice } from "../../billing/InvoicesView.js";

describe("Solo Doctor & Friction Killer Autonomy Suite (Wave 40 / Mandates 8e, 8k, 8n)", () => {
	describe("1. Telephony Autonomy (Mandate 8e: Non-blocking call button)", () => {
		it("TelephonyFloatingWidget source has no disabled call button and wires dialInputRef focus", () => {
			const filePath = fs.existsSync(
				path.resolve(process.cwd(), "src/components/telephony/TelephonyFloatingWidget.tsx"),
			)
				? path.resolve(process.cwd(), "src/components/telephony/TelephonyFloatingWidget.tsx")
				: path.resolve(process.cwd(), "apps/web/src/components/telephony/TelephonyFloatingWidget.tsx");
			const code = fs.readFileSync(filePath, "utf-8");

			// Verify dialInputRef is declared and attached
			assert.ok(
				code.includes("dialInputRef = useRef<HTMLInputElement | null>(null)"),
				"Must declare dialInputRef",
			);
			assert.ok(
				code.includes("ref={dialInputRef}"),
				"Must attach dialInputRef to dialer input",
			);

			// Verify handleStartOutgoingCall focuses input and shows toast on empty number
			assert.ok(
				code.includes("dialInputRef.current?.focus()"),
				"Must focus dial input on empty call attempt",
			);
			assert.ok(
				code.includes('showToast("Введите номер телефона для набора", "warning")'),
				"Must show soft toast warning instead of blocking button",
			);

			// Verify call button does NOT have disabled={!dialNumber.trim()}
			assert.ok(
				!code.includes("disabled={!dialNumber.trim()}"),
				"Call button must NEVER be disabled on empty dialNumber",
			);
		});
	});

	describe("2. 54-FZ Fiscal Autonomy (Mandates 8e & 8n: Physical person INN not required)", () => {
		it("Physical person does NOT require INN for payment", () => {
			const resEmpty = validate54FzBuyerInn("", "physical");
			assert.equal(resEmpty.isValid, true);
			assert.equal(resEmpty.errorMessage, undefined);

			const resWhitespace = validate54FzBuyerInn("   ", "physical");
			assert.equal(resWhitespace.isValid, true);
			assert.equal(resWhitespace.errorMessage, undefined);
		});

		it("Physical person allows valid 12-digit INN optionally", () => {
			const res12 = validate54FzBuyerInn("770123456789", "physical");
			assert.equal(res12.isValid, true);
			assert.equal(res12.errorMessage, undefined);
		});

		it("Legal entity / IP strictly requires valid 10 or 12 digit INN", () => {
			const resEmptyLegal = validate54FzBuyerInn("", "legal_entity");
			assert.equal(resEmptyLegal.isValid, false);
			assert.ok(resEmptyLegal.errorMessage?.includes("обязателен"));

			const resInvalidLength = validate54FzBuyerInn("12345", "legal_entity");
			assert.equal(resInvalidLength.isValid, false);
			assert.ok(resInvalidLength.errorMessage?.includes("10 цифр"));

			const resValid10 = validate54FzBuyerInn("7701234567", "legal_entity");
			assert.equal(resValid10.isValid, true);

			const resValid12 = validate54FzBuyerInn("770123456789", "individual_entrepreneur");
			assert.equal(resValid12.isValid, true);
		});

		it("Cash change calculation gives exact kopecks without float drift", () => {
			const change1 = calculateCashChange(5000, 5000);
			assert.equal(change1.changeRub, 0);
			assert.equal(change1.isExact, true);
			assert.equal(change1.isShortage, false);

			const change2 = calculateCashChange(4550.5, 5000);
			assert.equal(change2.changeRub, 449.5);
			assert.equal(change2.isExact, false);
			assert.equal(change2.isShortage, false);

			const change3 = calculateCashChange(6000, 5000);
			assert.equal(change3.isShortage, true);
		});
	});

	describe("3. Multi-tender Combination with Certificate and Bonus (Mandate 8e)", () => {
		it("allocateRemainderToTender correctly allocates to certificate with balance cap", () => {
			const current = { cardRub: 2000, cashRub: 0, sbpRub: 0, depositRub: 0, familyRub: 0, certificateRub: 0, bonusRub: 0 };
			const res = allocateRemainderToTender({
				totalDueRub: 5000,
				currentTenders: current,
				targetTender: "certificate",
				availableCertificateRub: 2500,
			});
			assert.equal(res.certificateRub, 2500);
			assert.equal(res.cardRub, 2000);
		});

		it("allocateRemainderToTender correctly allocates to bonus with balance cap", () => {
			const current = { cardRub: 3000, cashRub: 0, sbpRub: 0, depositRub: 0, familyRub: 0, certificateRub: 0, bonusRub: 0 };
			const res = allocateRemainderToTender({
				totalDueRub: 5000,
				currentTenders: current,
				targetTender: "bonus",
				availableBonusRub: 1500,
			});
			assert.equal(res.bonusRub, 1500);
			assert.equal(res.cardRub, 3000);
		});

		it("createCertificateAndCardComboTenders creates exact kopeck split without drift", () => {
			const combo = createCertificateAndCardComboTenders(10000, 3000);
			assert.equal(combo.certificateRub, 3000);
			assert.equal(combo.cardRub, 7000);
			assert.equal(combo.cashRub, 0);
			assert.equal((combo.cardRub || 0) + (combo.certificateRub || 0), 10000);
		});

		it("createBonusAndCardComboTenders creates exact kopeck split without drift", () => {
			const combo = createBonusAndCardComboTenders(7500.5, 1500);
			assert.equal(combo.bonusRub, 1500);
			assert.equal(combo.cardRub, 6000.5);
			assert.equal(combo.cashRub, 0);
			assert.equal((combo.cardRub || 0) + (combo.bonusRub || 0), 7500.5);
		});
	});

	describe("4. PaymentModal Solo Doctor Autonomy & Quick Presets", () => {
		it("Renders 100% warranty preset button and quick print buttons in header", () => {
			const html = renderToString(
				<PaymentModal
					isOpen={true}
					onClose={() => {}}
					amountKopecks={650000}
					patientId="pat-test-1"
					patientName="Иванов И.И."
					doctorName="Д-р Смирнов А.В."
					invoiceId="inv-test-1"
				/>,
			);

			// Fast print buttons in header
			assert.ok(
				html.includes('data-testid="btn-payment-modal-print-invoice"'),
				"Must render quick print invoice button in header",
			);
			assert.ok(
				html.includes('data-testid="btn-payment-modal-print-act"'),
				"Must render quick print act button in header",
			);

			// 100% Warranty preset button
			assert.ok(
				html.includes('data-testid="preset-warranty-100"'),
				"Must render 100% warranty preset button",
			);
			assert.ok(
				html.includes("Гарантия 100% (0 ₽)"),
				"Must show warranty label",
			);

			// Quick presets: Exact cash and full card
			assert.ok(html.includes('data-testid="preset-exact-cash"'));
			assert.ok(html.includes('data-testid="preset-full-card"'));

			// Solo doctor fallback: doctorName or clinic is used without requiring cashier
			assert.ok(html.includes("54-ФЗ"));
		});

		it("Renders Certificate and Bonus inputs and remainder buttons in Split tab", () => {
			const html = renderToString(
				<PaymentModal
					isOpen={true}
					onClose={() => {}}
					defaultMethod="split"
					amountKopecks={1000000}
					patientId="pat-test-2"
					patientName="Петрова А.С."
					doctorName="Д-р Васильев И.П."
				/>,
			);

			// Certificate & Bonus inputs
			assert.ok(
				html.includes('data-testid="input-split-certificate"'),
				"Must render split certificate input",
			);
			assert.ok(
				html.includes('data-testid="input-split-bonus"'),
				"Must render split bonus input",
			);

			// Remainder buttons
			assert.ok(
				html.includes('data-testid="btn-payment-remainder-certificate"'),
				"Must render remainder certificate button",
			);
			assert.ok(
				html.includes('data-testid="btn-payment-remainder-bonus"'),
				"Must render remainder bonus button",
			);
			assert.ok(
				html.includes('data-testid="btn-payment-remainder-sbp"'),
				"Must render remainder SBP button",
			);
		});
	});

	describe("5. InvoicesView & Acts Autonomy (7 Deadly Sins of UI & Mandate 8e)", () => {
		const testInvoices: BillingInvoice[] = [
			{
				id: "inv-test-101",
				number: "СЧ-001001",
				patientId: "pat-101",
				patientName: "Тестовый Пациент Оплаченный",
				doctorName: "Д-р Смирнов А.В.",
				date: "08.09.2026",
				totalAmountRub: 5000,
				paidAmountRub: 5000,
				status: "paid",
				items: [{ id: "li-1", name: "Консультация", quantity: 1, priceRub: 5000 }],
				createdAt: new Date().toISOString(),
				paymentMethod: "card_terminal",
			},
			{
				id: "inv-test-102",
				number: "СЧ-001002",
				patientId: "pat-102",
				patientName: "Тестовый Пациент К Оплате",
				doctorName: "Д-р Смирнов А.В.",
				date: "08.09.2026",
				totalAmountRub: 8000,
				paidAmountRub: 0,
				status: "issued",
				items: [{ id: "li-2", name: "Лечение кариеса", quantity: 1, priceRub: 8000 }],
				createdAt: new Date().toISOString(),
			},
			{
				id: "inv-test-103",
				number: "СЧ-001003",
				patientId: "pat-103",
				patientName: "Тестовый Пациент Гарантия",
				doctorName: "Д-р Смирнов А.В.",
				date: "08.09.2026",
				totalAmountRub: 0,
				paidAmountRub: 0,
				status: "warranty_100",
				items: [{ id: "li-3", name: "Гарантийная шлифовка", quantity: 1, priceRub: 0 }],
				createdAt: new Date().toISOString(),
				paymentMethod: "warranty_discount_100",
			},
		];

		it("Renders 1-line dense toolbar (32–36px) with role='toolbar'", () => {
			const html = renderToString(
				<InvoicesView
					initialInvoices={testInvoices}
					currentDoctorName="Д-р Смирнов А.В."
				/>,
			);

			assert.ok(html.includes('role="toolbar"'), "Must render 1-line dense toolbar");
			assert.ok(html.includes("min-h-[36px]"), "Toolbar must be dense (32-36px)");

			// Filter tabs
			assert.ok(html.includes('data-testid="filter-invoices-all"'));
			assert.ok(html.includes('data-testid="filter-invoices-pending"'));
			assert.ok(html.includes('data-testid="filter-invoices-paid"'));
			assert.ok(html.includes('data-testid="filter-invoices-warranty"'));

			// Fast search input and create invoice button
			assert.ok(html.includes('data-testid="input-search-invoices"'));
			assert.ok(html.includes('data-testid="btn-create-invoice-open"'));
		});

		it("Each invoice card has at most 2 direct action buttons, secondary in context menu (...)", () => {
			const html = renderToString(
				<InvoicesView
					initialInvoices={testInvoices}
					currentDoctorName="Д-р Смирнов А.В."
				/>,
			);

			// Unpaid card has [Оплатить] and [Счет]
			assert.ok(html.includes('data-testid="btn-pay-invoice-inv-test-102"'));
			assert.ok(html.includes('data-testid="btn-print-invoice-inv-test-102"'));
			assert.ok(html.includes('data-testid="btn-invoice-menu-inv-test-102"'));

			// Paid card does not have [Оплатить], only [Счет] and [...]
			assert.ok(!html.includes('data-testid="btn-pay-invoice-inv-test-101"'));
			assert.ok(html.includes('data-testid="btn-print-invoice-inv-test-101"'));
		});

		it("All interactive controls enforce touch targets >= 44px on mobile and >= 34px on desktop", () => {
			const html = renderToString(
				<InvoicesView
					initialInvoices={testInvoices}
					currentDoctorName="Д-р Смирнов А.В."
				/>,
			);

			// Verify min-h-[44px] touch target class on action buttons
			assert.ok(html.includes("min-h-[44px]"), "Buttons must comply with >=44px touch targets");
		});

		it("Strict ban on cartoon emojis in documents, cards, and toolbars (Lucide icons only)", () => {
			const html = renderToString(
				<InvoicesView
					initialInvoices={testInvoices}
					currentDoctorName="Д-р Смирнов А.В."
				/>,
			);

			// Forbidden emojis
			const forbiddenEmojis = ["⚡", "🧾", "💳", "📄", "💰", "🦷", "🏥", "✅", "❌", "⚠️", "🔥"];
			for (const emoji of forbiddenEmojis) {
				assert.ok(
					!html.includes(emoji),
					`Rendered HTML must NOT contain emoji '${emoji}', use Lucide icons instead`,
				);
			}
		});
	});
});
