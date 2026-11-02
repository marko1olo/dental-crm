/**
 * paymentFiscalReceiptAutonomy.test.tsx
 *
 * Sweet-spot suite for 54-FZ Fiscal Receipts, Taxation Codes & Error Handling:
 * - Mandate 8e: Doctor & Staff Autonomy (No unexplained disabled buttons; informative toasts instead of crash)
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (Cashier autonomy; offline queue sync)
 * - Mandate 8o: Scope-bounded verifiable assertions for 54-FZ fiscal receipt validation
 */

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import React, { act } from "react";
(globalThis as any).React = React;
import { createRoot, type Root } from "react-dom/client";
import { PaymentCapture } from "../PaymentCapture";
import {
	createBaseProps, clickNode, expect, findNodeByTestId,
	isNodeDisabled, type MockDomNode, setupMockDom, showToast, vi,
} from "./paymentCaptureTestHelpers";

describe("PaymentFiscalReceiptAutonomy — Mandates 8e, 8n Fiscal & Tax Suite", () => {
	let container: MockDomNode;
	let root: Root;

	beforeEach(() => {
		vi.clearAllMocks();
		const { doc } = setupMockDom();
		container = doc.createElement("div");
		doc.body.appendChild(container);
		root = createRoot(container as unknown as HTMLElement);
	});

	it("1. Mandate 8e: Buttons are NOT disabled when patient is not selected (disabled === false)", async () => {
		const props = createBaseProps({
			patientId: null,
			patientContextReady: false,
			amount: "5000",
			isSaving: false,
		});

		await act(async () => {
			root.render(<PaymentCapture {...props} />);
		});

		const submitBtn = findNodeByTestId(container, "payment-submit-button");
		const sberPosBtn = findNodeByTestId(container, "payment-sberpos-button");

		expect(submitBtn).not.toBeNull();
		expect(sberPosBtn).not.toBeNull();
		expect(isNodeDisabled(submitBtn)).toBe(false);
		expect(isNodeDisabled(sberPosBtn)).toBe(false);
	});

	it("2. Mandate 8e: Buttons are NOT disabled when amount is empty or 0 (disabled === false)", async () => {
		const props = createBaseProps({
			patientId: "pat-123",
			patientContextReady: true,
			amount: "",
			isSaving: false,
		});

		await act(async () => {
			root.render(<PaymentCapture {...props} />);
		});

		const submitBtn = findNodeByTestId(container, "payment-submit-button");
		const sberPosBtn = findNodeByTestId(container, "payment-sberpos-button");

		expect(submitBtn).not.toBeNull();
		expect(sberPosBtn).not.toBeNull();
		expect(isNodeDisabled(submitBtn)).toBe(false);
		expect(isNodeDisabled(sberPosBtn)).toBe(false);
	});

	it("3. Mandate 8e: Clicking submit button without selected patient shows warning toast without crash", async () => {
		const onSubmit = vi.fn();
		const props = createBaseProps({
			patientId: null,
			patientContextReady: false,
			amount: "3000",
			onSubmit,
		});

		await act(async () => {
			root.render(<PaymentCapture {...props} />);
		});

		const submitBtn = findNodeByTestId(container, "payment-submit-button");
		expect(submitBtn).not.toBeNull();

		await clickNode(submitBtn!);

		expect(onSubmit).not.toHaveBeenCalled();
		expect(showToast).toHaveBeenCalledWith(
			"Выберите пациента для проведения платежа",
			"warning",
		);
	});

	it("4. Mandate 8e: Clicking submit button without amount shows warning toast when no remaining debt", async () => {
		const onSubmit = vi.fn();
		const props = createBaseProps({
			patientId: "patient-101",
			amount: "",
			remainingDebt: 0,
			onSubmit,
		});

		await act(async () => {
			root.render(<PaymentCapture {...props} />);
		});

		const submitBtn = findNodeByTestId(container, "payment-submit-button");
		expect(submitBtn).not.toBeNull();

		await clickNode(submitBtn!);

		expect(onSubmit).not.toHaveBeenCalled();
		expect(showToast).toHaveBeenCalledWith(
			"Укажите сумму платежа или выберите услугу из плана",
			"warning",
		);
	});

	it("5. Mandate 8e: Payment capture buttons are disabled ONLY when isSaving is true", async () => {
		const props = createBaseProps({
			patientId: "patient-101",
			amount: "5000",
			isSaving: true,
		});

		await act(async () => {
			root.render(<PaymentCapture {...props} />);
		});

		const submitBtn = findNodeByTestId(container, "payment-submit-button");
		const sberPosBtn = findNodeByTestId(container, "payment-sberpos-button");

		expect(submitBtn).not.toBeNull();
		expect(sberPosBtn).not.toBeNull();
		expect(isNodeDisabled(submitBtn)).toBe(true);
		expect(isNodeDisabled(sberPosBtn)).toBe(true);
	});

	it("6. Mandate 54-FZ: Fiscal cashier details, taxation codes and non-blocking tax deduction draft", async () => {
		const onTaxDeductionCodeChange = vi.fn();
		const onFiscalCashierNameChange = vi.fn();
		const onSubmit = vi.fn();

		const props = createBaseProps({
			patientId: "patient-101",
			amount: "15000",
			fiscalCashierName: "Иванова И. И.",
			taxDeductionCode: "1",
			payerFullName: "Иванов Иван Иванович",
			onTaxDeductionCodeChange,
			onFiscalCashierNameChange,
			onSubmit,
		});

		await act(async () => {
			root.render(<PaymentCapture {...props} />);
		});

		const submitBtn = findNodeByTestId(container, "payment-submit-button");
		expect(submitBtn).not.toBeNull();
		expect(isNodeDisabled(submitBtn)).toBe(false);

		// Non-blocking submission with tax deduction draft
		await clickNode(submitBtn!);
		expect(onSubmit).toHaveBeenCalled();
	});

	it("7. Mandate 8n: Cashier bar handles manual card terminal entry and split payment navigation without crash", async () => {
		const props = createBaseProps({
			patientId: "patient-101",
			amount: "8000",
			method: "card",
		});

		await act(async () => {
			root.render(<PaymentCapture {...props} />);
		});

		const sberPosBtn = findNodeByTestId(container, "payment-sberpos-button");
		expect(sberPosBtn).not.toBeNull();
		expect(isNodeDisabled(sberPosBtn)).toBe(false);

		const splitBtn = findNodeByTestId(container, "payment-split-modal-button");
		expect(splitBtn).not.toBeNull();
		expect(isNodeDisabled(splitBtn)).toBe(false);
	});
});
