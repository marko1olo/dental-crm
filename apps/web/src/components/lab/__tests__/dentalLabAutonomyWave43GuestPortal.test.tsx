import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
	setupMockDom,
	findNodeByTestId,
	clickNode,
	createMockFn,
	type MockFn,
} from "./helpers/dentalLabTestDomHelper";
import { GuestLabPortal } from "../../../GuestLabPortal.js";
import {
	generateBarcodeSvg,
	generateQrCodeSvg,
	formatGostOrderNumber,
} from "../labMath";

describe("Wave 43 Autonomy — GuestLabPortal", () => {
	it("1. Renders 1-click status buttons: in-progress, ready, shipped, refitting", async () => {
		const { doc } = setupMockDom();
		const root: Root = createRoot(doc.body as unknown as HTMLElement);

		const fakeOrder = {
			id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
			patientFullName: "Иванов Иван Иванович",
			toothFdi: "16",
			material: "zirconia",
			colorVita: "A2",
			status: "sent",
			clinicalNotes: "Анатомическая коронка ZrO2",
			attachedImageUrl: null,
			createdAt: "2026-09-08T10:00:00.000Z",
		};

		const originalFetch = globalThis.fetch;
		globalThis.fetch = createMockFn(async (url: string) => {
			if (url.includes("/api/portal/lab-order/token123")) {
				return { ok: true, status: 200, json: async () => fakeOrder };
			}
			return { ok: false, status: 404 };
		}) as unknown as typeof fetch;

		try {
			await act(async () => {
				root.render(<GuestLabPortal token="token123" />);
			});

			await act(async () => {
				await new Promise((r) => setTimeout(r, 10));
			});

			assert.notStrictEqual(findNodeByTestId(doc.body, "btn-status-in-progress"), null);
			assert.notStrictEqual(findNodeByTestId(doc.body, "btn-status-ready"), null);
			assert.notStrictEqual(findNodeByTestId(doc.body, "btn-status-shipped"), null);
			assert.notStrictEqual(findNodeByTestId(doc.body, "btn-status-refitting"), null);

			const toggleWaybillBtn = findNodeByTestId(doc.body, "toggle-courier-waybill-btn");
			assert.notStrictEqual(toggleWaybillBtn, null);
			assert.strictEqual(findNodeByTestId(doc.body, "courier-waybill-card"), null);

			await clickNode(toggleWaybillBtn!);

			assert.notStrictEqual(findNodeByTestId(doc.body, "courier-waybill-card"), null);
			assert.notStrictEqual(findNodeByTestId(doc.body, "courier-waybill-barcode"), null);
			assert.notStrictEqual(findNodeByTestId(doc.body, "courier-waybill-qr"), null);

			const printBtn = findNodeByTestId(doc.body, "courier-waybill-print-btn");
			assert.notStrictEqual(printBtn, null);

			const win = (doc as unknown as { defaultView: { print: MockFn } }).defaultView;
			await clickNode(printBtn!);
			assert.strictEqual(win.print.calls.length, 1);
		} finally {
			globalThis.fetch = originalFetch;
			await act(async () => {
				root.unmount();
			});
		}
	});

	it("2. Validates Code 128 barcode and Reed-Solomon QR vector generators", () => {
		const orderToken = "order-token-test-43";
		const gostNumber = formatGostOrderNumber(orderToken);
		assert.ok(gostNumber.startsWith("ЗТЛ-"));

		const barcodeSvg = generateBarcodeSvg(orderToken);
		assert.ok(barcodeSvg.includes("<svg"));
		assert.ok(barcodeSvg.includes("<rect"));
		assert.ok(barcodeSvg.includes(orderToken));

		const qrSvg = generateQrCodeSvg(`DENTE-ZTL:${orderToken}`);
		assert.ok(qrSvg.includes("<svg"));
		assert.ok(qrSvg.includes("<rect"));
	});
});
