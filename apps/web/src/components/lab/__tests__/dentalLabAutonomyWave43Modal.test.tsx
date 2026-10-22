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
	DentalLabOrderModal,
	EXPRESS_PRESET_ZIRCONIA_CROWN,
	EXPRESS_PRESET_PFM_DUCERAM,
	EXPRESS_PRESET_EMAX_CROWN,
	EXPRESS_PRESET_PMMA_TEMPORARY,
	MODAL_EXPRESS_LAB_PRESETS,
	addWorkingDays,
} from "../DentalLabOrderModal";

describe("Wave 43 Autonomy — DentalLabOrderModal", () => {
	it("1. Displays clinical override button when advance < 50% without начмед blocks", async () => {
		const { doc } = setupMockDom();
		const root: Root = createRoot(doc.body as unknown as HTMLElement);
		const onOrderSaved = createMockFn();

		const originalFetch = globalThis.fetch;
		globalThis.fetch = createMockFn(async (url: string) => {
			if (url.includes("/api/clinical/lab-orders")) {
				return {
					ok: true,
					status: 200,
					json: async () => ({
						id: "lab-saved-1",
						patientId: "pat-43",
						doctorName: "Др. Ортопедов В. С.",
						status: "sent",
					}),
				};
			}
			return { ok: false, status: 404 };
		}) as unknown as typeof fetch;

		try {
			await act(async () => {
				root.render(
					<DentalLabOrderModal
						isOpen={true}
						onClose={() => {}}
						patientId="pat-43"
						patientName="Семенов Аркадий Петрович"
						doctorId="doc-1"
						doctorName="Др. Ортопедов В. С."
						initialToothFdi="24"
						patientDepositRub={0}
						stageTotalRub={40000}
						stagePaidRub={0}
						onOrderSaved={onOrderSaved}
					/>,
				);
			});

			const banner = findNodeByTestId(doc.body, "lab-order-clinical-autonomy-banner");
			assert.notStrictEqual(banner, null);

			const overrideBtn = findNodeByTestId(doc.body, "btn-lab-override-financial-gate");
			assert.notStrictEqual(overrideBtn, null);

			await clickNode(overrideBtn!);

			assert.strictEqual(onOrderSaved.calls.length, 1);
			const savedOrder = onOrderSaved.calls[0]![0];
			assert.strictEqual(savedOrder.patientId, "pat-43");
			assert.strictEqual(savedOrder.doctorName, "Др. Ортопедов В. С.");
		} finally {
			globalThis.fetch = originalFetch;
			await act(async () => {
				root.unmount();
			});
		}
	});

	it("3. Renders express preset buttons with testids in modal Tab 1", async () => {
		const { doc } = setupMockDom();
		const root: Root = createRoot(doc.body as unknown as HTMLElement);

		await act(async () => {
			root.render(
				<DentalLabOrderModal
					isOpen={true}
					onClose={() => {}}
					patientId="pat-43"
					patientName="Семенов Аркадий Петрович"
				/>,
			);
		});

		assert.notStrictEqual(findNodeByTestId(doc.body, "lab-preset-btn-zirconia_crown_express"), null);
		assert.notStrictEqual(findNodeByTestId(doc.body, "lab-preset-btn-pfm_duceram_express"), null);
		assert.notStrictEqual(findNodeByTestId(doc.body, "lab-preset-btn-emax_crown_express"), null);
		assert.notStrictEqual(findNodeByTestId(doc.body, "lab-preset-btn-pmma_temporary_express"), null);

		await act(async () => {
			root.unmount();
		});
	});
});
