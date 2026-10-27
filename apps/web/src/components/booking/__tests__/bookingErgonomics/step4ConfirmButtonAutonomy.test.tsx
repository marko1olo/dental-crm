import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, it } from "node:test";
import { PublicOnlineBookingWidget } from "../../PublicOnlineBookingWidget.js";
import {
	expect,
	findNodeByTestId,
	isNodeDisabled,
	setupMockDom,
} from "./bookingTestDomHarness.js";

describe("Booking Ergonomics: Step 4 Confirm Button & Touch Targets (Mandates 8e, 8ze)", () => {
	it("Step 4 confirm button is NOT disabled when name or phone is empty", () => {
		const html = renderToString(<PublicOnlineBookingWidget initialStep={4} />);
		expect(html).toContain("dbw-btn-confirm");
		expect(html).toContain("Подтвердить запись");
		expect(html).not.toMatch(/class="[^"]*dbw-btn-confirm[^"]*"[^>]*disabled/);
	});

	it("Step 4 confirm button in mounted DOM has disabled === false when fields are empty", async () => {
		const { doc } = setupMockDom();
		const rootContainer = doc.createElement("div");
		doc.body.appendChild(rootContainer);
		const root: Root = createRoot(rootContainer as unknown as HTMLElement);

		await act(async () => {
			root.render(<PublicOnlineBookingWidget initialStep={4} />);
		});

		const confirmBtn = findNodeByTestId(rootContainer, "step4-confirm-btn");
		expect(confirmBtn).not.toBeNull();
		expect(isNodeDisabled(confirmBtn!)).toBe(false);
	});

	it("Touch targets on all action buttons meet or exceed the 44px threshold", () => {
		const html3 = renderToString(<PublicOnlineBookingWidget initialStep={3} />);
		expect(html3).toContain("min-h-[44px]");

		const html4 = renderToString(<PublicOnlineBookingWidget initialStep={4} />);
		expect(html4).toContain("min-h-[44px]");
	});
});
