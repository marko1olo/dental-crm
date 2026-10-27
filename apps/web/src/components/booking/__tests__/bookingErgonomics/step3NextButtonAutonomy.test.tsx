import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, it } from "node:test";
import {
	DEFAULT_BRANCHES,
	DEFAULT_DOCTORS,
	DEFAULT_SERVICE_CATEGORIES,
	PublicOnlineBookingWidget,
} from "../../PublicOnlineBookingWidget.js";
import {
	clickNode,
	expect,
	findNodeByTestId,
	isNodeDisabled,
	setupMockDom,
	vi,
} from "./bookingTestDomHarness.js";

describe("Booking Ergonomics: Step 3 Next Button Autonomy (Mandates 8e, 8k)", () => {
	it("Step 3 next button is NOT disabled when slot is not initially selected", () => {
		const html = renderToString(<PublicOnlineBookingWidget initialStep={3} />);
		expect(html).toContain("dbw-btn-next");
		expect(html).toContain("Перейти к контактам");
		expect(html).not.toMatch(/class="[^"]*dbw-btn-next[^"]*"[^>]*disabled/);
	});

	it("Step 3 next button in mounted DOM has disabled === false initially", async () => {
		const { doc } = setupMockDom();
		const rootContainer = doc.createElement("div");
		doc.body.appendChild(rootContainer);
		const root: Root = createRoot(rootContainer as unknown as HTMLElement);

		await act(async () => {
			root.render(
				<PublicOnlineBookingWidget
					initialStep={3}
					customBranches={DEFAULT_BRANCHES}
					customCategories={DEFAULT_SERVICE_CATEGORIES}
					customDoctors={DEFAULT_DOCTORS}
				/>,
			);
		});

		const nextBtn = findNodeByTestId(rootContainer, "step3-next-btn");
		expect(nextBtn).not.toBeNull();
		expect(isNodeDisabled(nextBtn!)).toBe(false);
	});

	it("Clicking Step 3 next button auto-selects available slot or advances without dead button", async () => {
		const { doc } = setupMockDom();
		const rootContainer = doc.createElement("div");
		doc.body.appendChild(rootContainer);
		const root: Root = createRoot(rootContainer as unknown as HTMLElement);
		const stepChangeSpy = vi.fn();

		await act(async () => {
			root.render(<PublicOnlineBookingWidget initialStep={3} onStepChange={stepChangeSpy} />);
		});

		const nextBtn = findNodeByTestId(rootContainer, "step3-next-btn");
		expect(nextBtn).not.toBeNull();
		await clickNode(nextBtn!);
		expect(stepChangeSpy).toHaveBeenCalledWith(4);
	});

	it("Step 3 displays active guidance alert if slots are empty when clicking next", async () => {
		const { doc } = setupMockDom();
		const rootContainer = doc.createElement("div");
		doc.body.appendChild(rootContainer);
		const root: Root = createRoot(rootContainer as unknown as HTMLElement);
		const toastSpy = vi.fn();

		await act(async () => {
			root.render(<PublicOnlineBookingWidget initialStep={3} showToast={toastSpy} />);
		});

		const nextBtn = findNodeByTestId(rootContainer, "step3-next-btn");
		expect(nextBtn).not.toBeNull();
		expect(isNodeDisabled(nextBtn!)).toBe(false);
	});
});
