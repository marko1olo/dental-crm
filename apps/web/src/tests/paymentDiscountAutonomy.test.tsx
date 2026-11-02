/**
 * paymentDiscountAutonomy.test.tsx
 *
 * Sweet-spot suite for Doctor Discounts & Tender Autonomy in PaymentCapture:
 * - Mandate 8e: Doctor & Staff Autonomy (100% doctor discount without master password)
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (No mandatory physical person INN, combined payments, quick tender)
 * - Mandates 8am, 8ze: Apple HIG touch targets >= 44px
 */

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import React, { act } from "react";
(globalThis as any).React = React;
import { createRoot, type Root } from "react-dom/client";
import { PaymentCapture } from "../PaymentCapture";
import { money } from "../AppHelpers";
import {
	createBaseProps, clickNode, expect, findAllButtons, findNodeByTestId,
	isNodeDisabled, type MockDomNode, setupMockDom, showToast, vi,
} from "./paymentCaptureTestHelpers";

describe("PaymentDiscountAutonomy — Mandates 8e, 8n Doctor Discounts & Tender Suite", () => {
	let container: MockDomNode;
	let root: Root;

	beforeEach(() => {
		vi.clearAllMocks();
		const { doc } = setupMockDom();
		container = doc.createElement("div");
		doc.body.appendChild(container);
		root = createRoot(container as unknown as HTMLElement);
	});

	it("1. Mandate 8e item 7: Doctor discount presets support up to 100% without master passwords", async () => {
		const onAmountChange = vi.fn();
		const props = createBaseProps({
			patientId: "patient-101",
			amount: "5000",
			remainingDebt: 5000,
			onAmountChange,
		});

		await act(async () => {
			root.render(<PaymentCapture {...props} />);
		});

		const warrantyBtn = findNodeByTestId(container, "btn-doctor-discount-warranty");
		const colleagueBtn = findNodeByTestId(container, "btn-doctor-discount-colleague");
		const discount50Btn = findNodeByTestId(container, "btn-doctor-discount-50");

		expect(warrantyBtn).not.toBeNull();
		expect(colleagueBtn).not.toBeNull();
		expect(discount50Btn).not.toBeNull();

		// 1. Warranty rework 100% discount
		await clickNode(warrantyBtn!);
		expect(onAmountChange).toHaveBeenCalledWith("0");
		expect(showToast).toHaveBeenCalledWith(
			"Применена 100% скидка врача: гарантийная переделка (к оплате 0 ₽, без пароля)",
			"info",
		);

		// 2. Colleague 100% discount
		await clickNode(colleagueBtn!);
		expect(onAmountChange).toHaveBeenCalledWith("0");
		expect(showToast).toHaveBeenCalledWith(
			"Применена 100% скидка для персонала (к оплате 0 ₽, без пароля)",
			"info",
		);

		// 3. 50% discount
		await clickNode(discount50Btn!);
		expect(onAmountChange).toHaveBeenCalledWith("2500");
		expect(showToast).toHaveBeenCalledWith(
			`Применена скидка врача 50%: ${money(2500)}`,
			"info",
		);
	});

	it("2. Mandate 8e item 9 & 8n: INN is optional for physical persons and does not block payment submission", async () => {
		const onSubmit = vi.fn();
		const props = createBaseProps({
			patientId: "patient-101",
			amount: "5000",
			payerInn: "", // Empty INN for physical person
			taxDeductionCode: "",
			onSubmit,
		});

		await act(async () => {
			root.render(<PaymentCapture {...props} />);
		});

		const submitBtn = findNodeByTestId(container, "payment-submit-button");
		expect(submitBtn).not.toBeNull();
		expect(isNodeDisabled(submitBtn)).toBe(false);

		await clickNode(submitBtn!);
		expect(onSubmit).toHaveBeenCalled();
	});

	it("3. Mandates 8e, 8n, 8k: 1-click combined payment presets and family wallet selection", async () => {
		const onAmountChange = vi.fn();
		const onMethodChange = vi.fn();
		const props = createBaseProps({
			patientId: "patient-101",
			amount: "10000",
			remainingDebt: 10000,
			onAmountChange,
			onMethodChange,
		});

		await act(async () => {
			root.render(<PaymentCapture {...props} />);
		});

		// 1. 50/50 Нал + Карта
		const split50Btn = findNodeByTestId(container, "btn-combo-split-50-50");
		expect(split50Btn).not.toBeNull();
		await clickNode(split50Btn!);
		expect(onAmountChange).toHaveBeenCalledWith("5000");
		expect(onMethodChange).toHaveBeenCalledWith("cash");
		expect(showToast).toHaveBeenCalledWith(
			`Комбинированная оплата 50/50: 1-я часть (${money(5000)}, Наличные). 2-я часть (${money(5000)}, Карта) принимается следом.`,
			"info",
		);

		// 2. Нал + Карта + Баланс
		const splitThreeWayBtn = findNodeByTestId(container, "btn-combo-split-three-way");
		expect(splitThreeWayBtn).not.toBeNull();
		await clickNode(splitThreeWayBtn!);
		expect(showToast).not.toHaveBeenCalledWith(
			"Открыто окно комбинированной оплаты (Нал + Карта + Баланс)",
			"info",
		);

		// 3. Баланс + Карта
		const splitDepositBtn = findNodeByTestId(container, "btn-combo-split-deposit-card");
		expect(splitDepositBtn).not.toBeNull();
		await clickNode(splitDepositBtn!);
		expect(showToast).not.toHaveBeenCalledWith(
			"Открыто окно комбинированной оплаты (Баланс + Карта)",
			"info",
		);

		// 4. Family wallet method selection in 1 click
		const familyWalletMethodBtn = findNodeByTestId(container, "payment-method-family_wallet");
		expect(familyWalletMethodBtn).not.toBeNull();
		await clickNode(familyWalletMethodBtn!);
		expect(onMethodChange).toHaveBeenCalledWith("family_wallet");

		// 5. Split modal button in action bar
		const splitModalBtn = findNodeByTestId(container, "payment-split-modal-button");
		expect(splitModalBtn).not.toBeNull();
		expect(isNodeDisabled(splitModalBtn)).toBe(false);
	});

	it("4. Mandates 8e, 8n: Quick tender cash input, change calculation and debt payment by estimate", async () => {
		const onAmountChange = vi.fn();
		const onSubmit = vi.fn();
		const props = createBaseProps({
			patientId: "patient-101",
			amount: "0",
			remainingDebt: 7500,
			onAmountChange,
			onSubmit,
		});

		await act(async () => {
			root.render(<PaymentCapture {...props} />);
		});

		const submitBtn = findNodeByTestId(container, "payment-submit-button");
		expect(submitBtn).not.toBeNull();

		await clickNode(submitBtn!);

		expect(onAmountChange).toHaveBeenCalledWith("7500");
		expect(onSubmit).not.toHaveBeenCalled();
		expect(showToast).toHaveBeenCalledWith(
			`Установлена сумма по смете: ${money(7500)}. Нажмите «Принять оплату» для подтверждения`,
			"info",
		);
	});

	it("5. Mandates 8am, 8ze (Apple HIG): Touch targets >= 44px across all buttons and presets", async () => {
		const props = createBaseProps({
			remainingDebt: 10000,
			method: "cash",
			amount: "5000",
		});

		await act(async () => {
			root.render(<PaymentCapture {...props} />);
		});

		const allButtons = findAllButtons(container);
		assert.ok(allButtons.length >= 10, `Expected at least 10 buttons, found ${allButtons.length}`);

		for (const btn of allButtons) {
			const minHeightVal = parseInt(btn.style.minHeight || "0", 10);
			const hasStyle44 = minHeightVal >= 44;
			const classMatch = btn.className.match(/min-h-\[(\d+)px\]/);
			const minHeightFromClass = classMatch ? parseInt(classMatch[1], 10) : 0;
			const hasClass44 = minHeightFromClass >= 44 || btn.className.includes("min-h-[44px]");

			assert.ok(
				hasStyle44 || hasClass44,
				`Button ${btn.textContent || btn.getAttribute("aria-label") || "unnamed"} missing >= 44px minHeight (style: ${btn.style.minHeight}, class: ${btn.className})`,
			);
		}
	});
});
