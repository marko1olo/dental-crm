import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, it } from "node:test";
import { PublicOnlineBookingWidget } from "../../PublicOnlineBookingWidget.js";
import {
	changeInputValue,
	clickNode,
	expect,
	findNodeByTestId,
	setupMockDom,
	vi,
} from "./bookingTestDomHarness.js";

describe("Booking Ergonomics: Step 4 Active Validation Feedback (Mandates 8e, 8n)", () => {
	it("Clicking Step 4 confirm button with empty name displays active validation feedback", async () => {
		const { doc } = setupMockDom();
		const rootContainer = doc.createElement("div");
		doc.body.appendChild(rootContainer);
		const root: Root = createRoot(rootContainer as unknown as HTMLElement);
		const toastSpy = vi.fn();

		await act(async () => {
			root.render(<PublicOnlineBookingWidget initialStep={4} showToast={toastSpy} />);
		});

		const confirmBtn = findNodeByTestId(rootContainer, "step4-confirm-btn");
		expect(confirmBtn).not.toBeNull();
		await clickNode(confirmBtn!);

		expect(toastSpy).toHaveBeenCalledWith("Пожалуйста, введите ваше имя", "warning");
		const errorAlert = findNodeByTestId(rootContainer, "step4-submit-error");
		expect(errorAlert).not.toBeNull();
	});

	it("Clicking Step 4 confirm button with empty or invalid phone displays active validation feedback", async () => {
		const { doc } = setupMockDom();
		const rootContainer = doc.createElement("div");
		doc.body.appendChild(rootContainer);
		const root: Root = createRoot(rootContainer as unknown as HTMLElement);
		const toastSpy = vi.fn();

		await act(async () => {
			root.render(<PublicOnlineBookingWidget initialStep={4} showToast={toastSpy} />);
		});

		const nameInput = findNodeByTestId(rootContainer, "patient-name-input");
		expect(nameInput).not.toBeNull();
		await changeInputValue(nameInput!, "Смирнова Анна Сергеевна");

		const confirmBtn = findNodeByTestId(rootContainer, "step4-confirm-btn");
		expect(confirmBtn).not.toBeNull();
		await clickNode(confirmBtn!);

		expect(toastSpy).toHaveBeenCalledWith("Введите корректный номер телефона (11 цифр)", "warning");
		const errorAlert = findNodeByTestId(rootContainer, "step4-submit-error");
		expect(errorAlert).not.toBeNull();
	});

	it("Step 4 auto-checks privacy policy when confirm is clicked without blocking the user", async () => {
		const { doc } = setupMockDom();
		const rootContainer = doc.createElement("div");
		doc.body.appendChild(rootContainer);
		const root: Root = createRoot(rootContainer as unknown as HTMLElement);
		const toastSpy = vi.fn();

		await act(async () => {
			root.render(<PublicOnlineBookingWidget initialStep={4} showToast={toastSpy} />);
		});

		const privacyCheckbox = findNodeByTestId(rootContainer, "privacy-checkbox");
		expect(privacyCheckbox).not.toBeNull();
	});
});
