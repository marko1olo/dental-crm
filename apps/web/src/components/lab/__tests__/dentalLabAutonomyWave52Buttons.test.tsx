import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
	setupMockDom,
	findNodeByTestId,
	clickNode,
} from "./helpers/dentalLabTestDomHelper";
import { DentalLabOrderModal } from "../DentalLabOrderModal";

describe("Wave 52 — Dental Lab Footer Action Buttons", () => {
	it("3. Footer contains 1-click copy and print buttons with touch targets >= 44px", async () => {
		const { doc } = setupMockDom();
		const root: Root = createRoot(doc.body as unknown as HTMLElement);

		try {
			await act(async () => {
				root.render(
					<DentalLabOrderModal
						isOpen={true}
						onClose={() => {}}
						patientId="pat-52"
						patientName="Семенов Аркадий Петрович"
						doctorId="doc-1"
						doctorName="Др. Ортопедов В. С."
						initialToothFdi="24"
					/>,
				);
			});

			const copyBtn = findNodeByTestId(doc.body, "lab-order-copy-messenger-btn");
			assert.notStrictEqual(copyBtn, null);
			const copyClass = copyBtn?.getAttribute("class") || "";
			assert.ok(copyClass.includes("min-h-[44px]"));

			const printBtn = findNodeByTestId(doc.body, "lab-order-footer-print-btn");
			assert.notStrictEqual(printBtn, null);
			const printClass = printBtn?.getAttribute("class") || "";
			assert.ok(printClass.includes("min-h-[44px]"));
		} finally {
			await act(async () => {
				root.unmount();
			});
		}
	});

	it("4. Clicking lab-order-copy-messenger-btn copies formatted summary to clipboard", async () => {
		const { doc, clipboardWriteMock, getClipboardText } = setupMockDom();
		const root: Root = createRoot(doc.body as unknown as HTMLElement);

		try {
			await act(async () => {
				root.render(
					<DentalLabOrderModal
						isOpen={true}
						onClose={() => {}}
						patientId="pat-52"
						patientName="Семенов Аркадий Петрович"
						doctorId="doc-1"
						doctorName="Др. Ортопедов В. С."
						initialToothFdi="24"
						clinicPhone="+7 (495) 999-88-77"
					/>,
				);
			});

			const copyBtn = findNodeByTestId(doc.body, "lab-order-copy-messenger-btn");
			assert.notStrictEqual(copyBtn, null);

			await clickNode(copyBtn!);

			assert.ok(clipboardWriteMock.calls.length >= 1);
			const copied = getClipboardText();
			assert.ok(copied.includes("Заказ-наряд в зуботехническую лабораторию"));
			assert.ok(copied.includes("Семенов Аркадий Петрович"));
			assert.ok(copied.includes("Др. Ортопедов В. С."));
			assert.ok(copied.includes("+7 (495) 999-88-77"));
			assert.strictEqual(/\p{Extended_Pictographic}/u.test(copied), false);
		} finally {
			await act(async () => {
				root.unmount();
			});
		}
	});

	it("5. Clicking lab-order-footer-print-btn triggers window.print()", async () => {
		const { doc, printMock } = setupMockDom();
		const root: Root = createRoot(doc.body as unknown as HTMLElement);

		try {
			await act(async () => {
				root.render(
					<DentalLabOrderModal
						isOpen={true}
						onClose={() => {}}
						patientId="pat-52"
						patientName="Семенов Аркадий Петрович"
						doctorId="doc-1"
						doctorName="Др. Ортопедов В. С."
					/>,
				);
			});

			const printBtn = findNodeByTestId(doc.body, "lab-order-footer-print-btn");
			assert.notStrictEqual(printBtn, null);

			await clickNode(printBtn!);

			assert.strictEqual(printMock.calls.length, 1);
		} finally {
			await act(async () => {
				root.unmount();
			});
		}
	});
});
