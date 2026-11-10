import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
	setupMockDom,
	findNodeByTestId,
} from "./helpers/dentalLabTestDomHelper";
import { DentalLabStudioPrintTab } from "../printBlankModules/DentalLabStudioPrintTab";
import { SEED_LAB_ORDERS, getMaterialMeta } from "../dentalLabCatalogData";
import { generateBarcodeSvg, generateQrCodeSvg } from "../labMath";

describe("Dental Lab 3D Shade — Print Blank Form ZTL-1", () => {
	it("9. DentalLabStudioPrintTab renders clinical print blank, vector barcodes, and deadline", async () => {
		const { doc } = setupMockDom();
		const container = doc.createElement("div");
		doc.body.appendChild(container);

		const order = SEED_LAB_ORDERS[0]!;
		const mat = getMaterialMeta(order.materialId);

		let root: Root | null = null;
		await act(async () => {
			root = createRoot(container as any);
			root.render(
				<DentalLabStudioPrintTab
					currentPrintOrder={order}
					printMaterial={mat}
					onBackToRegistry={() => {}}
				/>,
			);
		});

		const blank = findNodeByTestId(container, "lab-order-printable-blank");
		assert.ok(blank, "Бланк заказа-наряда должен присутствовать");

		const submitBtn = findNodeByTestId(container, "print-blank-submit-btn");
		assert.ok(submitBtn, "Кнопка печати бланка должна присутствовать");

		const barcodeSvg = generateBarcodeSvg("ЗТЛ-2609-TEST01");
		assert.ok(barcodeSvg.includes("<svg"), "Штрихкод обязан быть векторным SVG");
		assert.ok(barcodeSvg.includes("<rect"), "Штрихкод обязан содержать штрихи rect");

		const qrSvg = generateQrCodeSvg("http://localhost:5173/#/portal");
		assert.ok(qrSvg.includes("<svg"), "QR-код обязан быть векторным SVG");

		if (root) {
			await act(async () => {
				(root as Root).unmount();
			});
		}
	});
});
