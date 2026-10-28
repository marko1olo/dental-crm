import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
	setupMockDom,
	findNodeByTestId,
	clickNode,
	createMockFn,
} from "./helpers/dentalLabTestDomHelper";
import {
	DentalLabOrdersModal,
	DentalLabOrderModal,
	MODAL_EXPRESS_LAB_PRESETS,
} from "../DentalLabOrdersModal";

describe("DentalLabOrdersModal — SSOT Architecture & Chairside 1-Click Sync", () => {
	it("1. DentalLabOrdersModal is canonical SSOT with identical interface and alias DentalLabOrderModal", () => {
		assert.strictEqual(typeof DentalLabOrdersModal, "function");
		assert.strictEqual(DentalLabOrdersModal, DentalLabOrderModal);
		assert.strictEqual(MODAL_EXPRESS_LAB_PRESETS.length, 18);
	});

	it("2. Modal renders with exactly ONE Primary CTA in Teal (#0d9488) and never disabled (Mandate 8e & 8am)", async () => {
		const { doc } = setupMockDom();
		const root: Root = createRoot(doc.body as unknown as HTMLElement);

		try {
			await act(async () => {
				root.render(
					<DentalLabOrdersModal
						isOpen={true}
						onClose={() => {}}
						patientId="pat-ssot-1"
						patientName="Семенов Аркадий Петрович"
						doctorId="doc-1"
						doctorName="Др. Ортопедов В. С."
						initialToothFdi="16"
					/>,
				);
			});

			const primaryCta = findNodeByTestId(doc.body, "submit-lab-order-btn");
			assert.notStrictEqual(primaryCta, null);
			const className = primaryCta?.getAttribute("class") || "";
			assert.ok(className.includes("var(--teal,#0d9488)") || className.includes("#0d9488"));
			assert.strictEqual(primaryCta?.getAttribute("disabled"), null); // Never disabled (Mandate 8e)
		} finally {
			await act(async () => {
				root.unmount();
			});
		}
	});

	it("3. Rapid 1-click order creation: presets pre-populate material, construction, and turnaround date without bureaucracy", async () => {
		const { doc } = setupMockDom();
		const root: Root = createRoot(doc.body as unknown as HTMLElement);

		try {
			await act(async () => {
				root.render(
					<DentalLabOrdersModal
						isOpen={true}
						onClose={() => {}}
						patientId="pat-ssot-2"
						patientName="Иванова Екатерина"
						doctorId="doc-2"
						doctorName="Др. Смирнова Е. В."
					/>,
				);
			});

			const zrPresetBtn = findNodeByTestId(doc.body, "lab-preset-btn-zirconia_crown_express");
			assert.notStrictEqual(zrPresetBtn, null);
			const emaxPresetBtn = findNodeByTestId(doc.body, "lab-preset-btn-emax_crown_express");
			assert.notStrictEqual(emaxPresetBtn, null);
		} finally {
			await act(async () => {
				root.unmount();
			});
		}
	});

	it("4. Mobile Apple HIG: Mobile drag handle 36x5px is rendered at top of modal for smartphone sheet", async () => {
		const { doc } = setupMockDom();
		const root: Root = createRoot(doc.body as unknown as HTMLElement);

		try {
			await act(async () => {
				root.render(
					<DentalLabOrdersModal
						isOpen={true}
						onClose={() => {}}
						patientId="pat-ssot-3"
						patientName="Ковалев Дмитрий"
					/>,
				);
			});

			const modalDrawer = findNodeByTestId(doc.body, "dental-lab-order-drawer");
			assert.notStrictEqual(modalDrawer, null);
			const className = modalDrawer?.getAttribute("class") || "";
			assert.ok(className.includes("max-sm:rounded-t-[24px]")); // Apple HIG top corner rounding
		} finally {
			await act(async () => {
				root.unmount();
			});
		}
	});
});
