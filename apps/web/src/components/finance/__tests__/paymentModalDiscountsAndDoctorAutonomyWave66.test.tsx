/**
 * paymentModalDiscountsAndDoctorAutonomyWave66.test.tsx
 *
 * DENTE Dental CRM — Wave 66 (Feature 255) Unit Tests:
 * 1-Click Doctor Discounts (5%, 10%, 15%, 20%, 50%, 100% Warranty),
 * Integer Kopeck Arithmetic, Split Payment Synchronization & Zero-Friction Cashier Autonomy.
 *
 * Governed by:
 * - Mandate 8e item 7: Freedom of doctor discounts (up to 100% for warranty remakes & staff) without master passwords.
 * - Mandate 8b: Exact integer kopeck math (Zero IEEE-754 floating-point drift in multi-tender splits & discounts).
 * - Mandate 8d: Burden of proof & 7 deadly sins checklist (Zero emojis, WCAG AAA contrast, touch targets >= 44px).
 * - Mandate 8k: Friction-killer law (1-click presets, fast checkout, instant clean documents).
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (No blocker popups, seamless operation).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	PaymentModal,
	calculatePaymentDiscount,
	generateInvoicePrintHtml,
	generateActPrintHtml,
} from "../PaymentModal.js";
import { rubToKopecks, kopecksToRub } from "@dental/shared";

describe("Wave 66 (Feature 255): 1-Click Doctor Discounts & Presets Rendering (Mandates 8e item 7, 8k, 8n)", () => {
	it("renders all 1-click doctor discount preset buttons and custom percent input in PaymentModal", () => {
		const html = renderToString(
			React.createElement(PaymentModal, {
				isOpen: true,
				onClose: () => {},
				patientId: "pat-w66-1",
				patientName: "Смирнов Алексей Игоревич",
				amountRub: 10000,
				defaultMethod: "card_terminal",
			})
		);

		// Assert existence of all required preset buttons by data-testid
		assert.ok(html.includes('data-testid="preset-discount-0"'), "Must render preset-discount-0 (0% Без скидки)");
		assert.ok(html.includes('data-testid="preset-discount-5"'), "Must render preset-discount-5 (-5% Пенс/Утро)");
		assert.ok(html.includes('data-testid="preset-discount-10"'), "Must render preset-discount-10 (-10% Постоянный)");
		assert.ok(html.includes('data-testid="preset-discount-15"'), "Must render preset-discount-15 (-15% Комплекс)");
		assert.ok(html.includes('data-testid="preset-discount-20"'), "Must render preset-discount-20 (-20% Партнёр)");
		assert.ok(html.includes('data-testid="preset-discount-50"'), "Must render preset-discount-50 (-50% Персонал)");
		assert.ok(html.includes('data-testid="preset-warranty-100"'), "Must render preset-warranty-100 (Гарантия 100%)");
		assert.ok(html.includes('data-testid="input-discount-custom-percent"'), "Must render input-discount-custom-percent");

		// Assert text labels
		assert.ok(html.includes("-5% Пенс/Утро"), "Must show -5% label");
		assert.ok(html.includes("-10% Постоянный"), "Must show -10% label");
		assert.ok(html.includes("-15% Комплекс"), "Must show -15% label");
		assert.ok(html.includes("-20% Партнёр"), "Must show -20% label");
		assert.ok(html.includes("-50% Персонал"), "Must show -50% label");
		assert.ok(html.includes("Гарантия 100% (0 ₽)"), "Must show 100% warranty label");

		// When initialized without discount, badge should not be present
		assert.equal(html.includes('data-testid="badge-discount-active"'), false, "Active discount badge should not appear when discount is 0%");
	});

	it("renders active discount badge, crossed-out original price, and net total when initial discount is applied", () => {
		const html = renderToString(
			React.createElement(PaymentModal, {
				isOpen: true,
				onClose: () => {},
				patientId: "pat-w66-2",
				patientName: "Иванова Ольга Сергеевна",
				amountRub: 10000,
				initialDiscountPercent: 10,
				initialDiscountReason: "Постоянный пациент",
				defaultMethod: "card_terminal",
			})
		);

		// Must render active discount badge
		assert.ok(html.includes('data-testid="badge-discount-active"'), "Must render badge-discount-active when discount > 0");
		assert.ok(html.includes("-10%"), "Badge must display -10%");
		// Must show crossed-out original amount (10 000 ₽) and net total (9 000 ₽)
		assert.ok(html.includes('data-testid="text-payment-original-total"'), "Must render text-payment-original-total");
		assert.ok(html.includes("line-through"), "Must display crossed-out original price");
		assert.ok(html.includes((10000).toLocaleString("ru-RU")), "Must show original amount 10 000 ₽");
		assert.ok(html.includes((9000).toLocaleString("ru-RU")), "Must show net discounted total due 9 000 ₽");
	});

	it("renders 50% staff discount correctly with halved total due", () => {
		const html = renderToString(
			React.createElement(PaymentModal, {
				isOpen: true,
				onClose: () => {},
				patientId: "pat-w66-3",
				patientName: "Сидорова Анна Владимировна",
				amountRub: 16000,
				initialDiscountPercent: 50,
				initialDiscountReason: "Скидка сотрудника клиники",
				defaultMethod: "card_terminal",
			})
		);

		assert.ok(html.includes('data-testid="badge-discount-active"'), "Must render active discount badge");
		assert.ok(html.includes("-50%"), "Must show -50%");
		assert.ok(html.includes("8&nbsp;000") || html.includes("8 000") || html.includes("8\u00A0000"), "Must show 8 000 ₽ net total for 16 000 ₽ bill");
	});
});

describe("Wave 66 (Feature 255): 100% Warranty Remake & Zero-Payment 1-Click Close (Mandate 8e item 7)", () => {
	it("renders 100% warranty zero-payment banner and 1-click close button without fiscal friction", () => {
		const html = renderToString(
			React.createElement(PaymentModal, {
				isOpen: true,
				onClose: () => {},
				patientId: "pat-w66-4",
				patientName: "Кузнецов Михаил Павлович",
				amountRub: 12500,
				initialWarranty100: true,
				defaultMethod: "card_terminal",
			})
		);

		// Must render zero warranty banner
		assert.ok(html.includes('data-testid="banner-payment-zero-warranty"'), "Must render banner-payment-zero-warranty when total due is 0 ₽");
		assert.ok(html.includes("Гарантийный прием / 100% скидка (к оплате 0 ₽)"), "Must state 100% warranty coverage");

		// Must render 1-click close button
		assert.ok(html.includes('data-testid="btn-payment-close-warranty-zero"'), "Must render btn-payment-close-warranty-zero");
		assert.ok(html.includes("Закрыть визит в 1 клик (0 ₽)"), "Must provide 1-click zero visit closure");

		// Header must show 0 ₽
		assert.ok(html.includes("0 ₽"), "Header must show 0 ₽ to pay");
	});
});

describe("Wave 66 (Feature 255): Integer Kopeck Math & calculatePaymentDiscount Pure Logic (Mandate 8b)", () => {
	it("calculates multi-tier percentage discounts with integer precision on standard sums", () => {
		const baseAmount = 10000;

		// 5% discount
		const d5 = calculatePaymentDiscount(baseAmount, { discountPercent: 5 });
		assert.equal(d5.rawTotalDueRub, 10000);
		assert.equal(d5.discountRub, 500);
		assert.equal(d5.discountKopecks, 50000);
		assert.equal(d5.totalDueRub, 9500);
		assert.equal(d5.totalDueKopecks, 950000);
		assert.equal(d5.effectiveDiscountPercent, 5);
		assert.equal(d5.isWarranty100, false);
		assert.equal(d5.totalDueKopecks + d5.discountKopecks, rubToKopecks(baseAmount));

		// 10% discount
		const d10 = calculatePaymentDiscount(baseAmount, { discountPercent: 10 });
		assert.equal(d10.discountRub, 1000);
		assert.equal(d10.totalDueRub, 9000);
		assert.equal(d10.totalDueKopecks + d10.discountKopecks, rubToKopecks(baseAmount));

		// 15% discount
		const d15 = calculatePaymentDiscount(baseAmount, { discountPercent: 15 });
		assert.equal(d15.discountRub, 1500);
		assert.equal(d15.totalDueRub, 8500);
		assert.equal(d15.totalDueKopecks + d15.discountKopecks, rubToKopecks(baseAmount));

		// 20% discount
		const d20 = calculatePaymentDiscount(baseAmount, { discountPercent: 20 });
		assert.equal(d20.discountRub, 2000);
		assert.equal(d20.totalDueRub, 8000);
		assert.equal(d20.totalDueKopecks + d20.discountKopecks, rubToKopecks(baseAmount));

		// 50% discount
		const d50 = calculatePaymentDiscount(baseAmount, { discountPercent: 50 });
		assert.equal(d50.discountRub, 5000);
		assert.equal(d50.totalDueRub, 5000);
		assert.equal(d50.totalDueKopecks + d50.discountKopecks, rubToKopecks(baseAmount));

		// 100% warranty
		const d100 = calculatePaymentDiscount(baseAmount, { isWarranty100: true });
		assert.equal(d100.discountRub, 10000);
		assert.equal(d100.discountKopecks, 1000000);
		assert.equal(d100.totalDueRub, 0);
		assert.equal(d100.totalDueKopecks, 0);
		assert.equal(d100.effectiveDiscountPercent, 100);
		assert.equal(d100.isWarranty100, true);
	});

	it("guarantees penny-exact integer balance on odd amounts with fractional kopecks", () => {
		// Complex clinical total: 6 543.21 ₽ with 15% discount
		const rawAmount = 6543.21;
		const rawKop = rubToKopecks(rawAmount); // 654321
		const res = calculatePaymentDiscount(rawAmount, { discountPercent: 15 });

		// Expected: Math.round(654321 * 15 / 100) = Math.round(98148.15) = 98148 kopecks
		// Due: 654321 - 98148 = 556173 kopecks
		assert.equal(res.discountKopecks, 98148);
		assert.equal(res.totalDueKopecks, 556173);
		assert.equal(res.discountRub, 981.48);
		assert.equal(res.totalDueRub, 5561.73);

		// Zero float drift law (Mandate 8b): totalDueKopecks + discountKopecks MUST EXACTLY equal rawKop
		assert.equal(res.totalDueKopecks + res.discountKopecks, rawKop);

		// Another irregular case: 1 999.99 ₽ with 7% custom discount
		const raw2 = 1999.99;
		const rawKop2 = rubToKopecks(raw2);
		const res2 = calculatePaymentDiscount(raw2, { discountPercent: 7 });
		assert.equal(res2.totalDueKopecks + res2.discountKopecks, rawKop2);
		assert.equal(kopecksToRub(res2.totalDueKopecks) + kopecksToRub(res2.discountKopecks), raw2);
	});

	it("calculates custom ruble discounts and prevents negative overdraft", () => {
		// 12 000 ₽ with 2 500 ₽ custom discount
		const res1 = calculatePaymentDiscount(12000, { customDiscountRub: 2500 });
		assert.equal(res1.discountRub, 2500);
		assert.equal(res1.totalDueRub, 9500);
		assert.equal(res1.totalDueKopecks, 950000);
		assert.equal(res1.effectiveDiscountPercent, 20.83);

		// Excess discount: 3 000 ₽ bill with 5 000 ₽ discount (should cap at 3 000 ₽, due 0 ₽)
		const res2 = calculatePaymentDiscount(3000, { customDiscountRub: 5000 });
		assert.equal(res2.discountRub, 3000);
		assert.equal(res2.totalDueRub, 0);
		assert.equal(res2.totalDueKopecks, 0);
		assert.equal(res2.effectiveDiscountPercent, 100);

		// Zero discount default
		const resZero = calculatePaymentDiscount(7500);
		assert.equal(resZero.discountRub, 0);
		assert.equal(resZero.totalDueRub, 7500);
		assert.equal(resZero.effectiveDiscountPercent, 0);
	});
});

describe("Wave 66 (Feature 255): Multi-Tender Split & Cash Tender Synchronization (Mandates 8b, 8e)", () => {
	it("proves split sum equals total discounted due with integer kopeck parity", () => {
		const rawAmount = 25000;
		const discountCalc = calculatePaymentDiscount(rawAmount, { discountPercent: 20 });
		assert.equal(discountCalc.totalDueRub, 20000);

		// Multi-tender split allocation
		const cardRub = 10000;
		const cashRub = 6000;
		const depositRub = 4000;

		const totalSplitRub = cardRub + cashRub + depositRub;
		const totalSplitKopecks = rubToKopecks(cardRub) + rubToKopecks(cashRub) + rubToKopecks(depositRub);

		assert.equal(totalSplitRub, discountCalc.totalDueRub);
		assert.equal(totalSplitKopecks, discountCalc.totalDueKopecks);
		assert.equal(totalSplitKopecks + discountCalc.discountKopecks, rubToKopecks(rawAmount));
	});

	it("proves 3-way split with fractional kopecks maintains exact parity with discounted total", () => {
		const rawAmount = 7777.77;
		const discountCalc = calculatePaymentDiscount(rawAmount, { discountPercent: 10 });
		const rawKop = rubToKopecks(rawAmount);

		assert.equal(discountCalc.totalDueKopecks + discountCalc.discountKopecks, rawKop);

		// Distribute discounted amount across card, cash, deposit
		const totalDueKop = discountCalc.totalDueKopecks;
		const cardKop = Math.floor(totalDueKop / 3);
		const cashKop = Math.floor(totalDueKop / 3);
		const depositKop = totalDueKop - cardKop - cashKop;

		assert.equal(cardKop + cashKop + depositKop, totalDueKop);
		assert.equal(cardKop + cashKop + depositKop + discountCalc.discountKopecks, rawKop);
	});
});

describe("Wave 66 (Feature 255): Print Templates Discount Breakdown (Mandates 8e item 5, 8k)", () => {
	it("generates invoice HTML containing full discount breakdown when discount is active", () => {
		const html = generateInvoicePrintHtml({
			invoiceNumber: "INV-2026-0042",
			clinicLegalName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
			patientName: "Васильев Петр Семенович",
			effectiveCashier: "Д-р Иванов А.И.",
			rawTotalDueRub: 12000,
			discountRub: 1800,
			effectiveDiscountPercent: 15,
			discountReason: "Комплексный план лечения",
			totalDueRub: 10200,
		});

		assert.ok(html.includes("СЧЁТ НА ОПЛАТУ № INV-2026-0042"), "Must have invoice title");
		assert.ok(html.includes("ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"), "Must have clinic legal name");
		assert.ok(html.includes("Васильев Петр Семенович"), "Must have patient name");
		assert.ok(html.includes("Сумма без скидки:"), "Must state original sum without discount");
		assert.ok(html.includes((12000).toLocaleString("ru-RU")), "Must state 12 000 ₽");
		assert.ok(html.includes("Скидка:"), "Must state discount line");
		assert.ok(html.includes((1800).toLocaleString("ru-RU")), "Must state 1 800 ₽ discount");
		assert.ok(html.includes("15%"), "Must state 15%");
		assert.ok(html.includes("Комплексный план лечения"), "Must state reason");
		assert.ok(html.includes("Итого к оплате:"), "Must state total due");
		assert.ok(html.includes((10200).toLocaleString("ru-RU")), "Must state 10 200 ₽ final total");
	});

	it("generates act HTML without discount lines when discount is zero", () => {
		const html = generateActPrintHtml({
			actNumber: "ACT-2026-0099",
			clinicLegalName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
			patientName: "Королева Марина Викторовна",
			effectiveCashier: "Д-р Соколова Н.В.",
			rawTotalDueRub: 8500,
			discountRub: 0,
			effectiveDiscountPercent: 0,
			discountReason: "",
			totalDueRub: 8500,
		});

		assert.ok(html.includes("АКТ СДАЧИ-ПРИЕМКИ ВЫПОЛНЕННЫХ СТОМАТОЛОГИЧЕСКИХ РАБОТ № ACT-2026-0099"), "Must have act title");
		assert.ok(html.includes("Итого к оплате:"), "Must have total line");
		assert.ok(html.includes((8500).toLocaleString("ru-RU")), "Must show 8 500 ₽");
		assert.equal(html.includes("Сумма без скидки:"), false, "Must not render discount lines when discount is zero");
	});
});

describe("Wave 66 (Feature 255): Ergonomics & Strict Clinical Quality Gates (Mandate 8d, Studio HIG)", () => {
	it("proves strict zero emojis in PaymentModal rendered HTML (Mandate 8d item 7)", () => {
		const html = renderToString(
			React.createElement(PaymentModal, {
				isOpen: true,
				onClose: () => {},
				patientId: "pat-w66-5",
				patientName: "Семенова Ирина Олеговна",
				amountRub: 14000,
				initialDiscountPercent: 20,
				defaultMethod: "split",
			})
		);

		// Assert zero emoji characters
		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;
		const match = html.match(emojiRegex);
		assert.equal(
			match,
			null,
			`PaymentModal must not contain emojis in official financial documents. Found: ${match ? match[0] : ""}`
		);
		assert.equal(html.includes("⚡"), false, "PaymentModal must use Lucide Zap vector icon instead of lightning emoji");
	});

	it("verifies touch target sizing (>= 44px) and zero unjustified disabled buttons (Mandate 8e item 7)", () => {
		const html = renderToString(
			React.createElement(PaymentModal, {
				isOpen: true,
				onClose: () => {},
				patientId: "pat-w66-6",
				patientName: "Григорьев Артем Дмитриевич",
				amountRub: 9000,
				defaultMethod: "cash",
			})
		);

		// Must enforce >= 44px touch targets on mobile
		assert.ok(html.includes("min-h-[44px]"), "PaymentModal controls must specify min-h-[44px] for gloved/touch ergonomics");

		// Doctor discount preset buttons must never be disabled without reason
		assert.ok(!html.includes('data-testid="preset-discount-10" disabled'), "Discount buttons must not be disabled");
		assert.ok(!html.includes('data-testid="preset-warranty-100" disabled'), "Warranty button must not be disabled");
	});
});
