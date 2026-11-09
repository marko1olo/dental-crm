import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, it } from "node:test";
import { PublicOnlineBookingWidget } from "../../PublicBookingWidget.js";
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
		const originalFetch = globalThis.fetch;
		globalThis.fetch = (async (url: any) => {
			const urlStr = String(url);
			if (urlStr.includes("/available-slots")) {
				return {
					ok: true,
					json: async () => [
						{
							time: "10:00",
							startsAt: "2026-10-15T10:00:00.000Z",
							endsAt: "2026-10-15T10:30:00.000Z",
							period: "morning",
						},
					],
				} as any;
			}
			return {
				ok: true,
				json: async () => ({ organizationId: "org-test-123" }),
			} as any;
		}) as any;

		try {
			const { doc } = setupMockDom();
			const rootContainer = doc.createElement("div");
			doc.body.appendChild(rootContainer);
			const root: Root = createRoot(rootContainer as unknown as HTMLElement);
			const stepChangeSpy = vi.fn();

			await act(async () => {
				root.render(
					<PublicOnlineBookingWidget
						organizationId="org-test-123"
						initialStep={4}
						onStepChange={stepChangeSpy}
					/>,
				);
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
		} finally {
			globalThis.fetch = originalFetch;
		}
	});
});
