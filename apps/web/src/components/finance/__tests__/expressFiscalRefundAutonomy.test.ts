/**
 * expressFiscalRefundAutonomy.test.ts
 *
 * DENTE Dental CRM — Unit Tests for 54-FZ Express Refund & Fiscal Receipt Autonomy.
 *
 * Governed by:
 * - Mandate 8e: Doctor & Cashier Autonomy (Zero unnecessary barriers, frictionless checkout and refunds).
 * - Mandate 8k: Friction-Killer Law (1-click 100% refund, 1-click deselect, advance return without plan items).
 * - Mandate 8n: Scale Sovereignty — Solo-doctor & small clinic autonomy (no mandatory treatment plan items for advance refunds).
 * - 54-FZ / FFD 1.2: Income Return Receipt (Возврат прихода, Тег 1054 = 2).
 */

import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import type { TreatmentPlanItem } from "../../treatment-plans/types";
import {
	FiscalReceipt54FzModal,
	selectAllRefundItems,
	deselectAllRefundItems,
	calculateRefundActiveItems,
	calculateRefundFiscalSummary,
} from "../FiscalReceipt54FzModal";
import { generateFiscalRefundReceipt54Fz } from "../order804nFiscalEngine";

const SAMPLE_TREATMENT_ITEMS: readonly TreatmentPlanItem[] = [
	{
		id: "item-therapy-1",
		code804n: "A16.07.002.001",
		toothNumber: 16,
		name: "Восстановление зуба пломбой световой полимеризации",
		category: "Терапия",
		quantity: 1,
		unitPriceRub: 4500,
		discountRub: 0,
		priceRub: 4500,
		phase: 1,
		stageKind: "stage_1_therapy",
	},
	{
		id: "item-endo-2",
		code804n: "A16.07.030.002",
		toothNumber: 16,
		name: "Инструментальная и медикаментозная обработка корневого канала",
		category: "Эндодонтия",
		quantity: 3,
		unitPriceRub: 2500,
		discountRub: 500,
		priceRub: 7500,
		phase: 1,
		stageKind: "stage_1_therapy",
	},
	{
		id: "item-hygiene-3",
		code804n: "A16.07.051",
		name: "Профессиональная гигиена полости рта и зубов",
		category: "Профилактика",
		quantity: 1,
		unitPriceRub: 5000,
		discountRub: 0,
		priceRub: 5000,
		phase: 1,
		stageKind: "stage_1_therapy",
	},
];

describe("54-FZ Express Refund Autonomy (Mandates 8e, 8k, 8n)", () => {
	describe("1-Click Express Selection Functions", () => {
		it("selectAllRefundItems: marks 100% of treatment items in 1 click", () => {
			const selection = selectAllRefundItems(SAMPLE_TREATMENT_ITEMS);

			expect(selection).toEqual({
				"item-therapy-1": true,
				"item-endo-2": true,
				"item-hygiene-3": true,
			});
			expect(Object.keys(selection).length).toBe(3);
			expect(Object.values(selection).every(Boolean)).toBe(true);
		});

		it("deselectAllRefundItems: clears all selected refund items to empty record", () => {
			const cleared = deselectAllRefundItems();

			expect(cleared).toEqual({});
			expect(Object.keys(cleared).length).toBe(0);
		});
	});

	describe("Refund Calculation & Summary (Items Mode)", () => {
		it("returns 0 ₽ and canFiscalize=false when no items are selected", () => {
			const summary = calculateRefundFiscalSummary({
				items: SAMPLE_TREATMENT_ITEMS,
				selection: {},
				isAdvanceRefund: false,
				advanceAmountRub: 0,
				advancePurpose: "Возврат аванса / денежных средств",
			});

			expect(summary.effectiveItems.length).toBe(0);
			expect(summary.totalRub).toBe(0);
			expect(summary.totalKopecks).toBe(0);
			expect(summary.canFiscalize).toBe(false);
		});

		it("calculates exact refund when 1 item is selected", () => {
			const selection = { "item-therapy-1": true };
			const summary = calculateRefundFiscalSummary({
				items: SAMPLE_TREATMENT_ITEMS,
				selection,
				isAdvanceRefund: false,
				advanceAmountRub: 0,
				advancePurpose: "",
			});

			expect(summary.effectiveItems.length).toBe(1);
			expect(summary.effectiveItems[0]!.id).toBe("item-therapy-1");
			expect(summary.totalRub).toBe(4500);
			expect(summary.totalKopecks).toBe(450000);
			expect(summary.canFiscalize).toBe(true);
		});

		it("calculates exact 100% refund total taking item discounts into account", () => {
			const allSelected = selectAllRefundItems(SAMPLE_TREATMENT_ITEMS);
			const summary = calculateRefundFiscalSummary({
				items: SAMPLE_TREATMENT_ITEMS,
				selection: allSelected,
				isAdvanceRefund: false,
				advanceAmountRub: 0,
				advancePurpose: "",
			});

			// Item 1: 4500 ₽
			// Item 2: 3 * 2500 - 500 = 7000 ₽
			// Item 3: 5000 ₽
			// Expected Total: 4500 + 7000 + 5000 = 16500 ₽ (1650000 kopecks)
			expect(summary.effectiveItems.length).toBe(3);
			expect(summary.totalRub).toBe(16500);
			expect(summary.totalKopecks).toBe(1650000);
			expect(summary.canFiscalize).toBe(true);
		});

		it("resets total to 0 ₽ when selection is cleared after full selection", () => {
			const fullSelection = selectAllRefundItems(SAMPLE_TREATMENT_ITEMS);
			const clearedSelection = deselectAllRefundItems();

			const activeAfterClear = calculateRefundActiveItems({
				items: SAMPLE_TREATMENT_ITEMS,
				selection: clearedSelection,
				isAdvanceRefund: false,
				advanceAmountRub: 0,
				advancePurpose: "",
			});

			expect(activeAfterClear.length).toBe(0);

			const summaryAfterClear = calculateRefundFiscalSummary({
				items: SAMPLE_TREATMENT_ITEMS,
				selection: clearedSelection,
				isAdvanceRefund: false,
				advanceAmountRub: 0,
				advancePurpose: "",
			});

			expect(summaryAfterClear.totalRub).toBe(0);
			expect(summaryAfterClear.canFiscalize).toBe(false);
		});
	});

	describe("Advance Refund Scenario Without Treatment Plan Items (activeItems.length === 0)", () => {
		it("creates synthetic advance item and enables fiscalization when amount > 0", () => {
			const summary = calculateRefundFiscalSummary({
				items: [],
				selection: {},
				isAdvanceRefund: true,
				advanceAmountRub: 5000,
				advancePurpose: "Возврат неизрасходованного аванса по договору № 2026/01",
			});

			expect(summary.effectiveItems.length).toBe(1);
			const advanceItem = summary.effectiveItems[0]!;
			expect(advanceItem.id).toBe("refund-advance-deposit");
			expect(advanceItem.name).toBe("Возврат неизрасходованного аванса по договору № 2026/01");
			expect(advanceItem.unitPriceRub).toBe(5000);
			expect(advanceItem.priceRub).toBe(5000);
			expect(advanceItem.quantity).toBe(1);
			expect(advanceItem.discountRub).toBe(0);
			expect(summary.totalRub).toBe(5000);
			expect(summary.totalKopecks).toBe(500000);
			expect(summary.canFiscalize).toBe(true);
		});

		it("defaults advance purpose to standard text if empty", () => {
			const items = calculateRefundActiveItems({
				items: [],
				selection: {},
				isAdvanceRefund: true,
				advanceAmountRub: 2500,
				advancePurpose: "   ",
			});

			expect(items.length).toBe(1);
			expect(items[0]!.name).toBe("Возврат аванса / денежных средств");
			expect(items[0]!.unitPriceRub).toBe(2500);
		});

		it("blocks fiscalization if advance amount is 0 or negative", () => {
			const zeroSummary = calculateRefundFiscalSummary({
				items: [],
				selection: {},
				isAdvanceRefund: true,
				advanceAmountRub: 0,
				advancePurpose: "Возврат аванса",
			});

			expect(zeroSummary.effectiveItems.length).toBe(0);
			expect(zeroSummary.totalRub).toBe(0);
			expect(zeroSummary.canFiscalize).toBe(false);

			const negSummary = calculateRefundFiscalSummary({
				items: [],
				selection: {},
				isAdvanceRefund: true,
				advanceAmountRub: -100,
				advancePurpose: "Возврат аванса",
			});

			expect(negSummary.effectiveItems.length).toBe(0);
			expect(negSummary.totalRub).toBe(0);
			expect(negSummary.canFiscalize).toBe(false);
		});

		it("generates full 54-FZ FFD 1.2 Income Return Receipt from advance refund item", () => {
			const advanceItems = calculateRefundActiveItems({
				items: [],
				selection: {},
				isAdvanceRefund: true,
				advanceAmountRub: 7500,
				advancePurpose: "Возврат депозита пациенту",
			});

			const receipt = generateFiscalRefundReceipt54Fz({
				items: advanceItems,
				originalReceipt: {
					receiptNumber: "CHK-2026-99012",
					patientId: "PAT-001",
					patientName: "Смирнова Екатерина Васильевна",
					customerContact: "+7 (999) 111-22-33",
					cashierFullName: "Кассир-администратор Иванова А. В.",
					clinicLegalName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
				},
				refundReason: "Возврат депозита по заявлению пациента",
				cashierFullName: "Кассир-администратор Иванова А. В.",
			});

			expect(receipt.operationType).toBe("income_return");
			expect(receipt.operationTypeName).toBe("Возврат прихода");
			expect(receipt.receiptNumber.startsWith("CHK-RET-")).toBe(true);
			expect(receipt.totalRub).toBe(7500);
			expect(receipt.totalKopecks).toBe(750000);
			expect(receipt.items.length).toBe(1);
			expect(receipt.items[0]!.name).toBe("Возврат депозита пациенту");
			expect(receipt.items[0]!.amountRub).toBe(7500);
			expect(receipt.payments.cardRub).toBe(7500);
			expect(receipt.originalReceiptNumber).toBe("CHK-2026-99012");
			expect(receipt.refundReason).toBe("Возврат депозита по заявлению пациента");
		});
	});

	describe("Component UI Rendering (Mandate 8k & 8e visual proof)", () => {
		it("renders express buttons and item checkboxes when treatment items exist", () => {
			const html = renderToString(
				React.createElement(FiscalReceipt54FzModal, {
					isOpen: true,
					items: SAMPLE_TREATMENT_ITEMS,
					patientId: "PAT-2026-100",
					patientName: "Семенов Артем Сергеевич",
					initialTab: "refund",
					onClose: () => {},
				}),
			);

			// 1. Verify refund tab heading & tag 1054
			expect(html.includes("Формирование чека возврата прихода")).toBe(true);
			expect(html.includes("Тег 1054 = 2")).toBe(true);

			// 2. Verify 1-click express buttons
			expect(html.includes('data-testid="btn-refund-select-all"')).toBe(true);
			expect(html.includes("Выбрать все позиции (100% возврат)")).toBe(true);
			expect(html.includes('data-testid="btn-refund-deselect-all"')).toBe(true);
			expect(html.includes("Снять выбор")).toBe(true);

			// 3. Verify mode switcher
			expect(html.includes('data-testid="btn-refund-mode-items"')).toBe(true);
			expect(html.includes('data-testid="btn-refund-mode-advance"')).toBe(true);

			// 4. Verify checkboxes for items
			expect(html.includes('data-testid="checkbox-refund-item-therapy-1"')).toBe(true);
			expect(html.includes('data-testid="checkbox-refund-item-endo-2"')).toBe(true);
			expect(html.includes('data-testid="checkbox-refund-item-hygiene-3"')).toBe(true);

			// 5. Verify action button exists and is disabled initially (0 items selected)
			expect(html.includes('data-testid="btn-execute-refund"')).toBe(true);
			expect(html.includes("Пробить чек возврата прихода на 0,00 ₽")).toBe(true);
		});

		it("renders advance refund inputs when activeItems.length === 0 (zero dead-ends)", () => {
			const html = renderToString(
				React.createElement(FiscalReceipt54FzModal, {
					isOpen: true,
					items: [],
					patientDepositRub: 3500,
					patientId: "PAT-2026-101",
					patientName: "Кузнецова Мария Дмитриевна",
					initialTab: "refund",
					onClose: () => {},
				}),
			);

			// 1. Verify advance container rendered instead of empty items box
			expect(html.includes('data-testid="refund-advance-container"')).toBe(true);
			expect(html.includes("Возврат аванса / денежных средств по номеру фискального чека (54-ФЗ)")).toBe(true);

			// 2. Verify inputs exist
			expect(html.includes('data-testid="input-refund-advance-amount"')).toBe(true);
			expect(html.includes('data-testid="input-refund-advance-purpose"')).toBe(true);

			// 3. Verify quick deposit button if patient deposit exists
			expect(html.includes('data-testid="btn-use-full-deposit-refund"')).toBe(true);
			expect(html.includes("Заполнить всю сумму")).toBe(true);

			// 4. Verify refund button is present
			expect(html.includes('data-testid="btn-execute-refund"')).toBe(true);
		});
	});
});
