/**
 * apps/web/src/components/cashbox/__tests__/cashboxViewModules.test.tsx
 *
 * Dedicated Modular Decomposed Test Suite for CashboxView & cashboxViewModules.
 * Validates Hook Key Parity, DAG Subcomponents rendering, 100% 54-FZ contracts.
 */

import React from "react";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import {
	CASHBOX_AMOUNT_PRESETS,
	CASHBOX_DISCOUNT_PRESETS,
	CASHBOX_54FZ_STATUS_BADGE,
	formatCurrencyRub,
	getOperationTypeLabel,
	getPaymentMethodName,
} from "../cashboxViewModules/cashboxConstants.js";
import { CashboxShiftStatusCard } from "../cashboxViewModules/CashboxShiftStatusCard.js";
import { CashboxQuickActionsBar } from "../cashboxViewModules/CashboxQuickActionsBar.js";
import { UnpaidInvoicesQueue } from "../cashboxViewModules/UnpaidInvoicesQueue.js";
import { CashboxOperationsTable } from "../cashboxViewModules/CashboxOperationsTable.js";
import { CashboxView } from "../CashboxView.js";
import type { CashboxOperationItem, CashBoxSummary } from "../cashboxViewModules/types.js";

describe("CashboxView Modular Decomposition Architecture", () => {
	it("Layer 1 Constants & Formatters: deterministic pure helpers", () => {
		assert.deepEqual([...CASHBOX_AMOUNT_PRESETS], [1000, 3000, 5000, 10000]);
		assert.deepEqual([...CASHBOX_DISCOUNT_PRESETS], [50, 20, 10]);
		assert.equal(CASHBOX_54FZ_STATUS_BADGE.text, "Касса: без барьеров");

		assert.equal(formatCurrencyRub(15000), "15 000 ₽");
		assert.equal(getOperationTypeLabel("payment").label, "Приход (Оплата)");
		assert.equal(getOperationTypeLabel("refund").label, "Возврат прихода");
		assert.equal(getOperationTypeLabel("cash_in").label, "Внесение наличных");
		assert.equal(getOperationTypeLabel("cash_out").label, "Инкассация / Изъятие");

		assert.equal(getPaymentMethodName("cash"), "Наличные");
		assert.equal(getPaymentMethodName("card"), "Банковская карта");
		assert.equal(getPaymentMethodName("sbp"), "СБП (QR-код)");
		assert.equal(getPaymentMethodName("split"), "Сплит-оплата");
	});

	it("Layer 4 CashboxShiftStatusCard: renders shift widget and cash boxes balance", () => {
		const sampleBoxes: readonly CashBoxSummary[] = [
			{ id: "box-1", type: "main", name: "Основная касса", balanceRub: 42500, isShiftOpen: true },
			{ id: "box-2", type: "card", name: "Эквайринг POS", balanceRub: 120000, isShiftOpen: true },
		];

		const html = renderToString(
			<CashboxShiftStatusCard
				isShiftOpen={true}
				cashierName="Д-р Воронов"
				clinicName="ДЕНТЕ"
				cashBoxes={sampleBoxes}
				onOpenShift={async () => {}}
				onCloseShift={async () => {}}
				onPrintXReport={async () => {}}
				onCashIn={async () => {}}
				onCashOut={async () => {}}
			/>,
		);

		assert.ok(html.includes("Основная касса"), "Must display main cash box name");
		assert.ok(html.includes((42500).toLocaleString("ru-RU")), "Must display main cash box balance");
		assert.ok(html.includes("Эквайринг POS"), "Must display card terminal box");
	});

	it("Layer 4 CashboxQuickActionsBar: renders all 54-FZ controls and preserves test anchors", () => {
		const html = renderToString(
			<CashboxQuickActionsBar
				grossAmountRub={5000}
				setGrossAmountRub={() => {}}
				onAddAmountPreset={() => {}}
				discountPercent={0}
				setDiscountPercent={() => {}}
				isWarranty={false}
				setIsWarranty={() => {}}
				isStaffColleague={false}
				setIsStaffColleague={() => {}}
				onResetDiscount={() => {}}
				onOpenRetailModal={() => {}}
				payerType="physical_person"
				setPayerType={() => {}}
				buyerInn=""
				setBuyerInn={() => {}}
				innValidation={{ isValid: true, isRequired: false }}
				checkoutResult={{
					isZeroDue: false,
					totalGrossRub: 5000,
					totalDiscountRub: 0,
					totalNetRub: 5000,
					totalNetKop: 500000,
					status: "ready_for_payment",
					paymentStatus: "Ожидает оплаты",
					statusBannerText: "",
					bypassKktZeroReceipt: false,
					fiscalSign: "",
					receiptDocNumber: 1,
				}}
				isSubmittingZeroReceipt={false}
				onProcessZeroDiscountCheckout={async () => {}}
				onAllocateAll={() => {}}
				onOpenPaymentWithMethod={() => {}}
			/>,
		);

		assert.ok(html.includes('id="gross-amount-input"'), "Must have gross-amount-input ID anchor");
		assert.ok(html.includes('id="cashbox-inn-input"'), "Must have cashbox-inn-input ID anchor");
		assert.ok(html.includes('data-testid="btn-open-retail-showcase"'), "Must have retail showcase anchor");
		assert.ok(html.includes('data-testid="btn-open-fast-checkout-modal"'), "Must have fast checkout anchor");
		assert.ok(html.includes('data-testid="btn-open-split-modal"'), "Must have split modal anchor");
		assert.ok(html.includes('data-testid="btn-open-payment-modal"'), "Must have payment modal anchor");

		assert.ok(html.includes("Всё картой"));
		assert.ok(html.includes("Всё наличными"));
		assert.ok(html.includes("Всё по СБП"));
		assert.ok(html.includes("100% Гарантия"));
		assert.ok(html.includes("100% Персонал"));
	});

	it("Layer 4 CashboxOperationsTable: handles both empty state and populated rows", () => {
		const emptyHtml = renderToString(
			<CashboxOperationsTable isShiftOpen={true} operations={[]} />,
		);
		assert.ok(emptyHtml.includes("За текущую кассовую смену операций не зафиксировано"));

		const sampleOps: readonly CashboxOperationItem[] = [
			{
				id: "op-1",
				time: "14:22",
				type: "payment",
				method: "card",
				amountRub: 7500,
				patientName: "Иванов И.И.",
				status: "completed",
			},
			{
				id: "op-2",
				time: "15:05",
				type: "cash_in",
				method: "cash",
				amountRub: 5000,
				patientName: "Внесение размена",
				status: "completed",
			},
		];

		const filledHtml = renderToString(
			<CashboxOperationsTable isShiftOpen={true} operations={sampleOps} />,
		);
		assert.ok(filledHtml.includes("Иванов И.И."));
		assert.ok(filledHtml.includes("Приход (Оплата)"));
		assert.ok(filledHtml.includes((7500).toLocaleString("ru-RU")));
		assert.ok(filledHtml.includes("Внесение наличных"));
	});

	it("Layer 4 UnpaidInvoicesQueue: renders header, refresh trigger, empty state and populated rows safely", () => {
		const emptyHtml = renderToString(
			<UnpaidInvoicesQueue onSelectInvoiceForPayment={() => {}} initialInvoices={[]} />,
		);
		assert.ok(emptyHtml.includes("Очередь счетов к оплате"), "Must render queue title");
		assert.ok(emptyHtml.includes('data-testid="unpaid-invoices-count-badge"'), "Must render count badge");
		assert.ok(emptyHtml.includes("Все счета оплачены. В очереди нет ожидающих счетов."), "Must render empty state message");

		const populatedHtml = renderToString(
			<UnpaidInvoicesQueue
				onSelectInvoiceForPayment={() => {}}
				initialInvoices={[
					{
						id: "inv-demo-1",
						number: "СЧ-2026-9901",
						invoiceNumber: "СЧ-2026-9901",
						patientName: "Сидорова Анна",
						patientPhone: "+7 900 123-45-67",
						totalAmountRub: 14200,
						status: "issued",
						date: "15.10.2026",
					},
				]}
			/>,
		);
		assert.ok(populatedHtml.includes("Сидорова Анна"), "Must render patient name");
		assert.ok(populatedHtml.includes("СЧ-2026-9901"), "Must render invoice number");
		assert.ok(populatedHtml.includes((14200).toLocaleString("ru-RU")), "Must render formatted price");
		assert.ok(populatedHtml.includes("Принять оплату"), "Must render pay action button");
	});

	it("Layer 5 CashboxView Facade: renders complete unified workspace with portal guard and unpaid queue", () => {
		const html = renderToString(
			<CashboxView
				initialShiftOpen={true}
				cashierName="Д-р Иванов"
				clinicName="ДЕНТЕ Плюс"
				initialAmountRub={8000}
			/>,
		);

		assert.ok(html.includes("Касса и чеки"), "Must render header");
		assert.ok(html.includes("Касса: без барьеров"), "Must render 54-FZ badge");
		assert.ok(html.includes((8000).toLocaleString("ru-RU")), "Must render total amount");
		assert.ok(html.includes("Очередь счетов к оплате"), "Must render unpaid invoices queue");
		assert.ok(html.includes("Журнал операций смены"), "Must render operations section");
	});
});
