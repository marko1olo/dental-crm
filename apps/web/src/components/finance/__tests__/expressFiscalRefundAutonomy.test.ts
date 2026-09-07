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

import { describe, it } from "node:test";
import assert from "node:assert/strict";
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

			assert.deepEqual(selection, {
				"item-therapy-1": true,
				"item-endo-2": true,
				"item-hygiene-3": true,
			});
			assert.equal(Object.keys(selection).length, 3);
			assert.equal(Object.values(selection).every(Boolean), true);
		});

		it("deselectAllRefundItems: clears all selected refund items to empty record", () => {
			const cleared = deselectAllRefundItems();

			assert.deepEqual(cleared, {});
			assert.equal(Object.keys(cleared).length, 0);
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

			assert.equal(summary.effectiveItems.length, 0);
			assert.equal(summary.totalRub, 0);
			assert.equal(summary.totalKopecks, 0);
			assert.equal(summary.canFiscalize, false);
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

			assert.equal(summary.effectiveItems.length, 1);
			assert.equal(summary.effectiveItems[0]!.id, "item-therapy-1");
			assert.equal(summary.totalRub, 4500);
			assert.equal(summary.totalKopecks, 450000);
			assert.equal(summary.canFiscalize, true);
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
			assert.equal(summary.effectiveItems.length, 3);
			assert.equal(summary.totalRub, 16500);
			assert.equal(summary.totalKopecks, 1650000);
			assert.equal(summary.canFiscalize, true);
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

			assert.equal(activeAfterClear.length, 0);

			const summaryAfterClear = calculateRefundFiscalSummary({
				items: SAMPLE_TREATMENT_ITEMS,
				selection: clearedSelection,
				isAdvanceRefund: false,
				advanceAmountRub: 0,
				advancePurpose: "",
			});

			assert.equal(summaryAfterClear.totalRub, 0);
			assert.equal(summaryAfterClear.canFiscalize, false);
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

			assert.equal(summary.effectiveItems.length, 1);
			const advanceItem = summary.effectiveItems[0]!;
			assert.equal(advanceItem.id, "refund-advance-deposit");
			assert.equal(advanceItem.name, "Возврат неизрасходованного аванса по договору № 2026/01");
			assert.equal(advanceItem.unitPriceRub, 5000);
			assert.equal(advanceItem.priceRub, 5000);
			assert.equal(advanceItem.quantity, 1);
			assert.equal(advanceItem.discountRub, 0);
			assert.equal(summary.totalRub, 5000);
			assert.equal(summary.totalKopecks, 500000);
			assert.equal(summary.canFiscalize, true);
		});

		it("defaults advance purpose to standard text if empty", () => {
			const items = calculateRefundActiveItems({
				items: [],
				selection: {},
				isAdvanceRefund: true,
				advanceAmountRub: 2500,
				advancePurpose: "   ",
			});

			assert.equal(items.length, 1);
			assert.equal(items[0]!.name, "Возврат аванса / денежных средств");
			assert.equal(items[0]!.unitPriceRub, 2500);
		});

		it("blocks fiscalization if advance amount is 0 or negative", () => {
			const zeroSummary = calculateRefundFiscalSummary({
				items: [],
				selection: {},
				isAdvanceRefund: true,
				advanceAmountRub: 0,
				advancePurpose: "Возврат аванса",
			});

			assert.equal(zeroSummary.effectiveItems.length, 0);
			assert.equal(zeroSummary.totalRub, 0);
			assert.equal(zeroSummary.canFiscalize, false);

			const negSummary = calculateRefundFiscalSummary({
				items: [],
				selection: {},
				isAdvanceRefund: true,
				advanceAmountRub: -100,
				advancePurpose: "Возврат аванса",
			});

			assert.equal(negSummary.effectiveItems.length, 0);
			assert.equal(negSummary.totalRub, 0);
			assert.equal(negSummary.canFiscalize, false);
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

			assert.equal(receipt.operationType, "income_return");
			assert.equal(receipt.operationTypeName, "Возврат прихода");
			assert.equal(receipt.receiptNumber.startsWith("CHK-RET-"), true);
			assert.equal(receipt.totalRub, 7500);
			assert.equal(receipt.totalKopecks, 750000);
			assert.equal(receipt.items.length, 1);
			assert.equal(receipt.items[0]!.name, "Возврат депозита пациенту");
			assert.equal(receipt.items[0]!.amountRub, 7500);
			assert.equal(receipt.payments.cardRub, 7500);
			assert.equal(receipt.originalReceiptNumber, "CHK-2026-99012");
			assert.equal(receipt.refundReason, "Возврат депозита по заявлению пациента");
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
			assert.equal(html.includes("Формирование чека возврата прихода"), true);
			assert.equal(html.includes("Тег 1054 = 2"), true);

			// 2. Verify 1-click express buttons
			assert.equal(html.includes('data-testid="btn-refund-select-all"'), true);
			assert.equal(html.includes("Выбрать все позиции (100% возврат)"), true);
			assert.equal(html.includes('data-testid="btn-refund-deselect-all"'), true);
			assert.equal(html.includes("Снять выбор"), true);

			// 3. Verify mode switcher
			assert.equal(html.includes('data-testid="btn-refund-mode-items"'), true);
			assert.equal(html.includes('data-testid="btn-refund-mode-advance"'), true);

			// 4. Verify checkboxes for items
			assert.equal(html.includes('data-testid="checkbox-refund-item-therapy-1"'), true);
			assert.equal(html.includes('data-testid="checkbox-refund-item-endo-2"'), true);
			assert.equal(html.includes('data-testid="checkbox-refund-item-hygiene-3"'), true);

			// 5. Verify action button exists and is disabled initially (0 items selected)
			assert.equal(html.includes('data-testid="btn-execute-refund"'), true);
			assert.equal(html.includes("Пробить чек возврата прихода на 0,00 ₽"), true);
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
			assert.equal(html.includes('data-testid="refund-advance-container"'), true);
			assert.equal(html.includes("Возврат аванса / денежных средств по номеру фискального чека (54-ФЗ)"), true);

			// 2. Verify inputs exist
			assert.equal(html.includes('data-testid="input-refund-advance-amount"'), true);
			assert.equal(html.includes('data-testid="input-refund-advance-purpose"'), true);

			// 3. Verify quick deposit button if patient deposit exists
			assert.equal(html.includes('data-testid="btn-use-full-deposit-refund"'), true);
			assert.equal(html.includes("Заполнить всю сумму"), true);

			// 4. Verify refund button is present
			assert.equal(html.includes('data-testid="btn-execute-refund"'), true);
		});
	});
});
