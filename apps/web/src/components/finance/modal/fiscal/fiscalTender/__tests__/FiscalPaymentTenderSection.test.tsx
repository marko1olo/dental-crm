import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { FiscalPaymentTenderSection } from "../../FiscalPaymentTenderSection";
import {
	TenderMethodList,
	TenderModeSelector,
	TenderQuickPresets,
	TenderSummaryBadge,
	type FiscalPaymentTenderSectionProps,
} from "../index";

const { describe, it } = await (async () => {
	try {
		// @ts-ignore
		return await import("vitest");
	} catch {
		return await import("node:test");
	}
})();

function createMockProps(
	overrides: Partial<FiscalPaymentTenderSectionProps> = {},
): FiscalPaymentTenderSectionProps {
	const noop = () => {};
	const noopAsync = async () => {};
	return {
		paymentMode: "cash",
		setPaymentMode: noop,
		selectSingleMethod: noop,
		applyCombinedPaymentPreset: noop,
		totalSumRub: 10000,
		patientDepositRub: 3000,
		selectedDiscountPreset: "none",
		setSelectedDiscountPreset: noop,
		handleManualCardTerminalConfirm: noopAsync,
		isSubmittingManualCard: false,
		cashAmount: 10000,
		setCashAmount: noop as React.Dispatch<React.SetStateAction<number>>,
		receivedCashRub: 10000,
		setReceivedCashRub: noop as React.Dispatch<React.SetStateAction<number>>,
		cardAmount: 0,
		setCardAmount: noop as React.Dispatch<React.SetStateAction<number>>,
		sbpAmount: 0,
		setSbpAmount: noop as React.Dispatch<React.SetStateAction<number>>,
		depositAmount: 0,
		setDepositAmount: noop as React.Dispatch<React.SetStateAction<number>>,
		certificateAmount: 0,
		setCertificateAmount: noop as React.Dispatch<React.SetStateAction<number>>,
		insuranceAmount: 0,
		setInsuranceAmount: noop,
		guaranteeLetterNumber: "",
		setGuaranteeLetterNumber: noop,
		remainingRub: 0,
		allocation: {
			isFullyAllocated: true,
			isOverallocated: false,
			remainingKopecks: 0,
			allocatedKopecks: 1000000,
		},
		handleFillRemaining: noop,
		handleAutoDistributeRemaining: noop,
		handleAutoBalanceOverallocation: noop,
		...overrides,
	};
}

describe("FiscalPaymentTenderSection & fiscalTender Subcomponents Suite", () => {
	it("1. Renders segmented control, quick presets, cash calculator, and summary badge in cash mode", () => {
		const props = createMockProps({
			paymentMode: "cash",
			cashAmount: 8500,
			receivedCashRub: 10000,
			totalSumRub: 8500,
		});
		const html = renderToString(<FiscalPaymentTenderSection {...props} />);

		assert.ok(html.includes('data-testid="fiscal-segmented-control"'));
		assert.ok(html.includes('data-testid="segment-cash"'));
		assert.ok(html.includes('data-testid="segment-card"'));
		assert.ok(html.includes('data-testid="segment-sbp"'));
		assert.ok(html.includes('data-testid="segment-deposit"'));
		assert.ok(html.includes('data-testid="segment-split"'));
		assert.ok(html.includes('data-testid="fiscal-presets-strip"'));
		assert.ok(html.includes('data-testid="panel-cash-focused"'));
		assert.ok(html.includes("Сдача:"));
		assert.ok(html.includes("Сумма чека полностью распределена"));
	});

	it("2. Renders card focused panel and manual POS confirmation button", () => {
		const props = createMockProps({
			paymentMode: "card",
			cardAmount: 12000,
			cashAmount: 0,
			totalSumRub: 12000,
		});
		const html = renderToString(<FiscalPaymentTenderSection {...props} />);

		assert.ok(html.includes('data-testid="panel-card-focused"'));
		assert.ok(html.includes("Безналичные / Терминал"));
		assert.ok(html.includes("Подтвердить вручную (автономный POS)"));
	});

	it("3. Renders SBP QR focused panel and deposit focused panel with co-pay buttons", () => {
		const sbpHtml = renderToString(
			<FiscalPaymentTenderSection
				{...createMockProps({
					paymentMode: "sbp",
					sbpAmount: 5400,
					totalSumRub: 5400,
				})}
			/>,
		);
		assert.ok(sbpHtml.includes('data-testid="panel-sbp-focused"'));
		assert.ok(sbpHtml.includes("Система быстрых платежей (СБП QR)"));

		const depositHtml = renderToString(
			<FiscalPaymentTenderSection
				{...createMockProps({
					paymentMode: "deposit",
					patientDepositRub: 3000,
					depositAmount: 3000,
					totalSumRub: 10000,
				})}
			/>,
		);
		assert.ok(depositHtml.includes('data-testid="panel-deposit-focused"'));
		assert.ok(depositHtml.includes("+ Доплатить картой"));
		assert.ok(depositHtml.includes("+ Доплатить налом"));
	});

	it("4. Renders full split mode with all tender rows, +Остаток buttons, certificate nominals, and DMS fallback", () => {
		const props = createMockProps({
			paymentMode: "split",
			totalSumRub: 15000,
			cardAmount: 5000,
			sbpAmount: 2000,
			cashAmount: 1000,
			depositAmount: 1000,
			certificateAmount: 3000,
			insuranceAmount: 1000,
			guaranteeLetterNumber: "ГП-2026/77",
			remainingRub: 2000,
			allocation: {
				isFullyAllocated: false,
				isOverallocated: false,
				remainingKopecks: 200000,
				allocatedKopecks: 1300000,
			},
		});
		const html = renderToString(<FiscalPaymentTenderSection {...props} />);

		assert.ok(html.includes('data-testid="panel-split-focused"'));
		assert.ok(html.includes('data-testid="btn-fill-remaining-card"'));
		assert.ok(html.includes('data-testid="btn-fill-remaining-sbp"'));
		assert.ok(html.includes('data-testid="btn-fill-remaining-cash"'));
		assert.ok(html.includes('data-testid="split-certificate-row"'));
		assert.ok(html.includes('data-testid="input-certificate-amount"'));
		assert.ok(html.includes('data-testid="btn-fill-remaining-cert"'));
		assert.ok(html.includes('data-testid="btn-cert-nominal-3000"'));
		assert.ok(html.includes('data-testid="btn-cert-nominal-5000"'));
		assert.ok(html.includes('data-testid="btn-cert-nominal-10000"'));
		assert.ok(html.includes('data-testid="split-insurance-row"'));
		assert.ok(html.includes('data-testid="input-insurance-amount"'));
		assert.ok(html.includes('data-testid="btn-fill-remaining-insurance"'));
		assert.ok(html.includes('data-testid="input-tender-guarantee-letter"'));
		assert.ok(html.includes('data-testid="btn-fallback-dms-to-patient"'));
		assert.ok(html.includes('data-testid="btn-auto-distribute-remaining"'));
	});

	it("5. Renders overallocation state and balance button in TenderSummaryBadge", () => {
		const html = renderToString(
			<TenderSummaryBadge
				allocation={{
					isFullyAllocated: false,
					isOverallocated: true,
					remainingKopecks: -150000,
					allocatedKopecks: 1150000,
				}}
				remainingRub={-1500}
				totalSumRub={10000}
				handleAutoDistributeRemaining={() => {}}
				handleAutoBalanceOverallocation={() => {}}
			/>,
		);

		assert.ok(html.includes("Превышение суммы на"));
		assert.ok(html.includes('data-testid="btn-auto-balance-overallocated"'));
	});

	it("6. Directly exports all decomposed subcomponents from barrel", () => {
		assert.equal(typeof TenderModeSelector, "function");
		assert.equal(typeof TenderQuickPresets, "function");
		assert.equal(typeof TenderMethodList, "function");
		assert.equal(typeof TenderSummaryBadge, "function");
	});
});
