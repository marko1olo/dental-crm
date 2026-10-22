/**
 * billingPosTerminalInquisition.test.tsx
 *
 * Red Team Inquisitor Test Suite:
 * - Demolition of monochrome Sber POS LCD emulator
 * - Zero INN requirements for physical persons (Mandate 8n)
 * - Ban on decree numbers and bird language in cashbox/checkout (Mandates 8x, 8ap)
 * - Consolidation of 1-screen FastCheckout with strictly 1 Primary CTA (Mandate 8am)
 * - 100% doctor discount autonomy without administrator PIN blocks (Mandate 8e)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SberPosLcdDisplay } from "../sberPos/terminalModalModules/SberPosLcdDisplay.js";
import {
	validateBuyerInn,
	validateBuyerInnShort,
	isCashierActionBlockedByInn,
} from "../../finance/cashboxInnValidation.js";
import { FastCheckoutReceiptPreview } from "../../finance/FastCheckoutReceiptPreview.js";

describe("Red Team Cashbox, Billing & POS Terminal Inquisition", () => {
	describe("1. Demolition of Sber POS LCD Display Emulator", () => {
		it("renders clean transparent terminal status card without arcade LCD simulator or Pilot-NT raw packet dumps", () => {
			const html = renderToStaticMarkup(
				<SberPosLcdDisplay
					activeModelName="SBER-POS"
					terminalId="TID-778899"
					isConfigured={true}
					status="ready"
					statusMessage="Ожидание прикладывания карты..."
					totalBillKop={450000}
					operation="sale"
				/>,
			);

			// Должна отображаться сумма и нормальный статус
			assert.ok(html.includes("4500") || html.includes("4 500") || html.includes("4\u00a0500"));
			assert.ok(html.includes("Банковский POS-терминал"));
			assert.ok(html.includes("Ожидание прикладывания карты..."));
			assert.ok(html.includes("data-testid=\"sber-pos-status-panel\""));

			// Запрещены сырые команды и псевдо-экраны
			assert.equal(html.includes("Драйвер эквайринга: Pilot-NT (CMD 1)"), false);
			assert.equal(html.includes("sber-pos-lcd-screen"), false);
		});

		it("displays clear success badge when card payment is authorized", () => {
			const html = renderToStaticMarkup(
				<SberPosLcdDisplay
					activeModelName="SBER-POS"
					terminalId="TID-778899"
					isConfigured={true}
					status="success"
					statusMessage="Оплата успешно авторизована"
					totalBillKop={150000}
					operation="sale"
				/>,
			);
			assert.ok(html.includes("Оплата успешно авторизована банком!"));
		});

		it("displays clear failure notification without crashing when card is declined", () => {
			const html = renderToStaticMarkup(
				<SberPosLcdDisplay
					activeModelName="SBER-POS"
					terminalId="TID-778899"
					isConfigured={true}
					status="card_declined"
					statusMessage="Недостаточно средств на карте"
					totalBillKop={300000}
					operation="sale"
				/>,
			);
			assert.ok(html.includes("Недостаточно средств на карте"));
		});
	});

	describe("2. Elimination of INN Requirement for Physical Persons (Mandates 8e, 8n)", () => {
		it("citizen/physical person without INN is 100% valid and never blocked", () => {
			const resEmpty = validateBuyerInn({ payerType: "physical_person", buyerInn: "" });
			assert.equal(resEmpty.isValid, true);
			assert.equal(resEmpty.isRequired, false);
			assert.equal(resEmpty.errorRu, undefined);

			const resUndef = validateBuyerInn({ payerType: "physical_person", buyerInn: undefined });
			assert.equal(resUndef.isValid, true);
			assert.equal(resUndef.isRequired, false);

			const resShort = validateBuyerInnShort(undefined, "physical");
			assert.equal(resShort.isValid, true);
			assert.equal(resShort.isRequired, false);
		});

		it("isCashierActionBlockedByInn NEVER blocks physical person even with empty or irregular input", () => {
			assert.equal(isCashierActionBlockedByInn({ payerType: "physical_person", buyerInn: "" }), false);
			assert.equal(isCashierActionBlockedByInn({ payerType: "physical", buyerInn: undefined }), false);
			assert.equal(isCashierActionBlockedByInn({ payerType: "physical_person", buyerInn: "12345" }), false);
		});

		it("strictly requires 10 digits for B2B Legal Entities (Юрлица)", () => {
			const emptyB2b = validateBuyerInn({ payerType: "legal_entity", buyerInn: "" });
			assert.equal(emptyB2b.isValid, false);
			assert.equal(emptyB2b.isRequired, true);

			const validB2b = validateBuyerInn({ payerType: "legal_entity", buyerInn: "7701234567" });
			assert.equal(validB2b.isValid, true);

			const invalidLengthB2b = validateBuyerInn({ payerType: "legal_entity", buyerInn: "123456789" });
			assert.equal(invalidLengthB2b.isValid, false);
		});

		it("strictly requires 12 digits for B2B Individual Entrepreneurs (ИП)", () => {
			const emptyIp = validateBuyerInn({ payerType: "individual_entrepreneur", buyerInn: "" });
			assert.equal(emptyIp.isValid, false);
			assert.equal(emptyIp.isRequired, true);

			const validIp = validateBuyerInn({ payerType: "individual_entrepreneur", buyerInn: "770123456789" });
			assert.equal(validIp.isValid, true);
		});
	});

	describe("3. Fast Checkout 1-Screen Consolidation with Strictly 1 Primary CTA (Mandates 8e, 8am)", () => {
		it("renders strictly ONE Primary CTA button in checkout footer", () => {
			const html = renderToStaticMarkup(
				<FastCheckoutReceiptPreview
					kktHardwareStatus={{ online: true, paperOk: true, isChecking: false }}
					interruptedPaymentState={null}
					setInterruptedPaymentState={() => {}}
					isPrinting={false}
					isFlushingQueue={false}
					isSubmittingManualCard={false}
					pendingOfflineCount={0}
					validation={{ isValid: true }}
					activeMethod="bank_card"
					targetBillKop={450000}
					targetBillRub={4500}
					isElectronicReceiptOnly={false}
					setIsElectronicReceiptOnly={() => {}}
					onClose={() => {}}
					onExecutePayment={async () => {}}
					onAcceptPaymentOfflineFallback={async () => {}}
					onManualCardTerminalConfirm={async () => {}}
					onRetryFiscalizationDirect={async () => {}}
					onFlushQueue={async () => {}}
					onFixValidationError={() => {}}
				/>,
			);

			// Ровно одна primary кнопка
			const primaryMatches = html.match(/class="[^"]*primary-button[^"]*"/g) || [];
			assert.equal(primaryMatches.length, 1);

			// Текст кнопки содержит канонический префикс и сумму
			assert.ok(html.includes("✓ Оплатить"));
			assert.ok(html.includes("(Картой)"));
			assert.ok(html.includes("4\u00a0500,00 ₽") || html.includes("4 500,00 ₽"));

			// Резервная кнопка автономного терминала оформлена как secondary, не конкурируя за фокус
			assert.ok(html.includes("btn-autonomous-terminal-checkout"));
			assert.ok(html.includes("secondary-button"));
		});

		it("displays zero-payment 100% warranty button when bill is 0 ₽", () => {
			const html = renderToStaticMarkup(
				<FastCheckoutReceiptPreview
					kktHardwareStatus={{ online: true, paperOk: true, isChecking: false }}
					interruptedPaymentState={null}
					setInterruptedPaymentState={() => {}}
					isPrinting={false}
					isFlushingQueue={false}
					isSubmittingManualCard={false}
					pendingOfflineCount={0}
					validation={{ isValid: true }}
					activeMethod="cash"
					targetBillKop={0}
					targetBillRub={0}
					isElectronicReceiptOnly={false}
					setIsElectronicReceiptOnly={() => {}}
					onClose={() => {}}
					onExecutePayment={async () => {}}
					onAcceptPaymentOfflineFallback={async () => {}}
					onManualCardTerminalConfirm={async () => {}}
					onRetryFiscalizationDirect={async () => {}}
					onFlushQueue={async () => {}}
					onFixValidationError={() => {}}
				/>,
			);

			assert.ok(html.includes("✓ Закрыть визит: 100% Гарантия (0 ₽)"));
		});
	});
});
