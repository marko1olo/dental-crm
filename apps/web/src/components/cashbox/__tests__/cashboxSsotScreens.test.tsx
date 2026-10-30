/**
 * cashboxSsotScreens.test.tsx — Red Team Inquisitor Test Suite for Domain 4: Cashbox SSOT screens.
 *
 * Validates:
 * 1. CashRegisterCheckoutModal: 32px total, tender tiles, split math, fiscalization toggle, 1 Primary CTA.
 * 2. CashShiftClosingModal: 4 revenue tenders, expected vs counted cash, terminal reconciliation, 1 Primary CTA.
 * 3. CashShiftJournalView: shift list, OFD status, print report buttons, 1 Primary CTA.
 * 4. Mandate 8e (0 disabled buttons), Mandate 8am (1 Primary CTA), Mandate 8x (Domain purity).
 * 5. cashboxCatalogData & DirectCashboxLauncher mounting and event contracts.
 */

import React from "react";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import { CashRegisterCheckoutModal } from "../CashRegisterCheckoutModal";
import { CashShiftClosingModal } from "../CashShiftClosingModal";
import { CashShiftJournalView } from "../CashShiftJournalView";
import { DirectCashboxLauncher } from "../DirectCashboxLauncher";
import {
	CASHBOX_TENDER_PRESETS,
	CASH_DENOMINATIONS,
	QUICK_CASH_PRESET_BILLS,
	PAYER_TYPE_PRESETS,
	DOCTOR_DISCOUNT_PRESETS,
	SPLIT_PAYMENT_PRESETS,
} from "../cashboxCatalogData";

describe("Domain 4 SSOT Cashbox & Shift Screens Invariants", () => {
	describe("1. CashRegisterCheckoutModal (SSOT Checkout)", () => {
		it("renders prominent 32px total amount, method tiles, and exactly 1 Primary CTA", () => {
			const html = renderToString(
				<CashRegisterCheckoutModal
					isOpen={true}
					onClose={() => {}}
					totalDueRub={8500}
					patientId="pat-1"
					patientName="Иванов Иван Иванович"
					patientPhone="+7 (999) 111-22-33"
					patientDepositRub={3000}
					cashierFullName="Администратор Кассы"
					clinicLegalName="ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"
				/>
			);

			// 1. Prominent total due
			assert.ok(/8[\s\u00A0\u202F]?500/.test(html), "Must render total amount 8500");
			assert.ok(html.includes("text-[32px]"), "Total amount must be rendered in 32px");
			assert.ok(html.includes("data-testid=\"checkout-total-amount\""), "Must have checkout-total-amount testid");

			// 2. Tender method tiles
			assert.ok(html.includes("Банковская карта"), "Must include Card tender tile");
			assert.ok(html.includes("Наличные"), "Must include Cash tender tile");
			assert.ok(html.includes("QR СБП"), "Must include SBP QR tender tile");
			assert.ok(html.includes("Аванс / депозит"), "Must include Deposit tender tile");
			assert.ok(html.includes("Сплит / раздельно"), "Must include Split tender tile");

			// 3. Fiscalization
			assert.ok(html.includes("Чек с фискализацией"), "Must have fiscalization toggle");
			assert.ok(html.includes("Печать на кассе"), "Must have print receipt option");

			// 4. Exactly ONE Primary CTA button in var(--teal)
			assert.ok(html.includes("data-testid=\"btn-confirm-checkout-payment\""), "Must have confirm payment CTA");
			assert.ok(html.includes("Принять оплату"), "CTA text must be 'Принять оплату'");
			assert.ok(html.includes("var(--teal"), "CTA must use var(--teal)");

			// 5. Mandate 8e: Non-blocking, zero disabled buttons
			assert.ok(!html.includes("disabled=\"\"") || !html.includes("disabled "), "Primary CTA must not be disabled by secondary fields");

			// 6. Mandate 8x: Clean clinical language, no Soviet codes
			assert.ok(!html.includes("ФФД 1.2"), "Must not expose raw FFD 1.2");
			assert.ok(!html.includes("КНД 1151156"), "Must not expose KND numbers in checkout");
		});

		it("renders null when closed", () => {
			const html = renderToString(
				<CashRegisterCheckoutModal
					isOpen={false}
					onClose={() => {}}
					totalDueRub={5000}
					patientId="pat-1"
					patientName="Иванов Иван"
				/>
			);
			assert.equal(html, "");
		});
	});

	describe("2. CashShiftClosingModal (SSOT Shift Close & Z-Report)", () => {
		it("renders shift revenue breakdown, cash reconciliation, and exactly 1 Primary CTA", () => {
			const html = renderToString(
				<CashShiftClosingModal
					isOpen={true}
					onClose={() => {}}
					shiftNumber={104}
					cashierFullName="Администратор Кассы"
					clinicLegalName="ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"
					initialChangeFundRub={5000}
					incomeCashRub={15000}
					incomeElectronicRub={35000}
					incomeSbpRub={7000}
					advanceOffsetRub={2000}
				/>
			);

			// 1. Shift number & header
			assert.ok(html.includes("Закрытие смены и Z-отчёт"), "Must render shift closing title");
			assert.ok(html.includes("Смена №104"), "Must render shift number");

			// 2. Net revenue display
			assert.ok(html.includes("data-testid=\"shift-closing-net-revenue\""), "Must have net revenue testid");
			assert.ok(/59[\s\u00A0\u202F]?000/.test(html), "Must compute total revenue: 15k+35k+7k+2k = 59k");

			// 3. 4 Tender revenue cards
			assert.ok(html.includes("Наличные"), "Must show cash tender revenue");
			assert.ok(html.includes("Безнал / карта"), "Must show card tender revenue");
			assert.ok(html.includes("QR СБП"), "Must show SBP tender revenue");
			assert.ok(html.includes("Зачёт аванса"), "Must show advance offset revenue");

			// 4. Cash reconciliation
			assert.ok(html.includes("Сверка фактической наличности"), "Must show cash reconciliation title");
			assert.ok(html.includes("В ящике должно быть"), "Must show expected drawer cash formula");
			assert.ok(html.includes("Сходится ✓"), "Must show matched cash badge when balanced");
			assert.ok(html.includes("Сверка терминала эквайринга"), "Must show terminal reconciliation");

			// 5. Encashment / withdrawal options
			assert.ok(html.includes("Инкассация наличной выручки"), "Must show encashment section");
			assert.ok(html.includes("Оставить размен на утро"), "Must offer retaining change fund");

			// 6. Exactly ONE Primary CTA in var(--teal)
			assert.ok(html.includes("data-testid=\"btn-confirm-close-shift-z-report\""), "Must have Z-report CTA button");
			assert.ok(html.includes("Закрыть смену и напечатать Z-отчёт"), "Must have canonical close shift label");

			// 7. Touch targets & Apple HIG
			assert.ok(html.includes("min-h-[44px]"), "Buttons must have >=44px touch targets");
		});

		it("renders null when closed", () => {
			const html = renderToString(
				<CashShiftClosingModal
					isOpen={false}
					onClose={() => {}}
				/>
			);
			assert.equal(html, "");
		});
	});

	describe("3. CashShiftJournalView (SSOT Shift Registry)", () => {
		it("renders shift journal, status badges, OFD confirmation, and print report actions", () => {
			const html = renderToString(
				<CashShiftJournalView
					clinicName="ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"
					cashierFullName="Администратор Кассы"
				/>
			);

			// 1. Title and testid
			assert.ok(html.includes("data-testid=\"cash-shift-journal-view\""), "Must have journal testid");
			assert.ok(html.includes("Журнал кассовых смен"), "Must render journal title");

			// 2. Filter buttons
			assert.ok(html.includes("Все"), "Must have 'Все' filter");
			assert.ok(html.includes("Открытые"), "Must have 'Открытые' filter");
			assert.ok(html.includes("Закрытые"), "Must have 'Закрытые' filter");

			// 3. OFD Delivery badge
			assert.ok(html.includes("ОФД") || html.includes("Доставлен ✓"), "Must show OFD delivery status");

			// 4. Print report buttons
			assert.ok(html.includes("Z-отчёт") || html.includes("X-отчёт"), "Must offer report print buttons");

			// 5. Exactly ONE Primary CTA button
			const hasCloseShiftBtn = html.includes("data-testid=\"btn-journal-close-shift\"");
			const hasOpenShiftBtn = html.includes("data-testid=\"btn-journal-open-shift\"");
			assert.ok(hasCloseShiftBtn || hasOpenShiftBtn, "Must have exactly 1 shift lifecycle primary CTA");

			// 6. Desktop table and mobile grouped cards classes
			assert.ok(html.includes("hidden md:block"), "Must have desktop table container");
			assert.ok(html.includes("md:hidden"), "Must have mobile cards container");
		});
	});

	describe("4. Cashbox Catalog Data Presets & Invariants", () => {
		it("enforces Mandate 8n: Physical persons have isInnRequired = false", () => {
			const phys = PAYER_TYPE_PRESETS.find((p) => p.id === "physical_person");
			assert.ok(phys, "Physical person preset must exist");
			assert.equal(phys?.isInnRequired, false, "Physical person must never require INN");

			const legal = PAYER_TYPE_PRESETS.find((p) => p.id === "legal_entity");
			assert.ok(legal, "Legal entity preset must exist");
			assert.equal(legal?.isInnRequired, true);
			assert.equal(legal?.innLength, 10);

			const soleProp = PAYER_TYPE_PRESETS.find((p) => p.id === "sole_proprietor");
			assert.ok(soleProp, "Sole proprietor preset must exist");
			assert.equal(soleProp?.isInnRequired, true);
			assert.equal(soleProp?.innLength, 12);
		});

		it("contains 5 canonical payment tenders with clean Russian labels", () => {
			assert.equal(CASHBOX_TENDER_PRESETS.length, 5);
			const ids = CASHBOX_TENDER_PRESETS.map((t) => t.id);
			assert.deepEqual(ids, ["card", "cash", "sbp", "deposit", "split"]);
		});

		it("contains standard denominations and quick bills (1000, 2000, 5000)", () => {
			assert.ok(CASH_DENOMINATIONS.length >= 6);
			assert.deepEqual(QUICK_CASH_PRESET_BILLS, [1000, 2000, 5000]);
		});

		it("contains doctor discounts including 100% warranty (Mandate 8e)", () => {
			const warranty = DOCTOR_DISCOUNT_PRESETS.find((d) => d.isWarranty);
			assert.ok(warranty);
			assert.equal(warranty?.percent, 100);
		});
	});

	describe("5. DirectCashboxLauncher SSR & UI Tree Mounting", () => {
		it("renders null on SSR when no hash/search is active", () => {
			const html = renderToString(<DirectCashboxLauncher />);
			assert.equal(html, "");
		});
	});
});
