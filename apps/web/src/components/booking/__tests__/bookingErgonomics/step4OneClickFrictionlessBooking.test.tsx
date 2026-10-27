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

describe("Booking Ergonomics: Step 4 Frictionless Booking & Callback Notice (Mandate 8k)", () => {
	it("Step 4 allows 1-click booking without fake SMS simulation barriers, displays callback notice, and advances to confirmation", async () => {
		const { doc } = setupMockDom();
		const rootContainer = doc.createElement("div");
		doc.body.appendChild(rootContainer);
		const root: Root = createRoot(rootContainer as unknown as HTMLElement);
		const stepChangeSpy = vi.fn();

		await act(async () => {
			root.render(<PublicOnlineBookingWidget initialStep={4} onStepChange={stepChangeSpy} />);
		});

		const callbackNotice = findNodeByTestId(rootContainer, "patient-callback-notice");
		expect(callbackNotice).not.toBeNull();
		expect(rootContainer.textContent).toContain("Администратор клиники перезвонит вам по номеру");
		expect(rootContainer.textContent).not.toContain("[DEV / Отладка");

		const nameInput = findNodeByTestId(rootContainer, "patient-name-input");
		expect(nameInput).not.toBeNull();
		await changeInputValue(nameInput!, "Смирнова Анна Сергеевна");

		const phoneInput = findNodeByTestId(rootContainer, "patient-phone-input");
		expect(phoneInput).not.toBeNull();
		await changeInputValue(phoneInput!, "+7 (999) 123-45-67");

		const confirmBtn = findNodeByTestId(rootContainer, "step4-confirm-btn");
		expect(confirmBtn).not.toBeNull();
		await clickNode(confirmBtn!);

		expect(stepChangeSpy).toHaveBeenCalledWith(5);
	});
});
