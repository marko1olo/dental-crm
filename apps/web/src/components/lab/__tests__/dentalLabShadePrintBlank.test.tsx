import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
	setupMockDom,
	findNodeByTestId,
} from "./helpers/dentalLabTestDomHelper";
import { DentalLabPrintBlank } from "../DentalLabPrintBlank";
import { generateBarcodeSvg, generateQrCodeSvg } from "../labMath";

describe("Dental Lab 3D Shade — Print Blank Form ZTL-1", () => {
	it("9. DentalLabPrintBlank renders statutory Form ZTL-1 fields, vector barcodes, and deadline", async () => {
		const { doc } = setupMockDom();
		const container = doc.createElement("div");
		doc.body.appendChild(container);

		let root: Root | null = null;
		await act(async () => {
			root = createRoot(container as any);
			root.render(
				<DentalLabPrintBlank
					gostOrderNumber="ЗТЛ-2609-TEST01"
					secureToken="SECURE-TOKEN-123"
					formPatientName="Иванов Иван Иванович"
					formDoctorName="Д-р Петров С. М."
					clinicName="ООО «ДЕНТЕ» · Стоматологическая клиника"
					selectedTeeth={[11, 21]}
					constructionType="single_crown"
					material="zirconia_multilayer"
					shadeSystem="classical"
					shadeClassical="A2"
					shade3dMaster="2M2"
					shadeBleach="0M1"
					shadeCervical="A3"
					shadeBody="A2"
					shadeIncisal="A1"
					shadeStump="ND2"
					translucency="HT"
					mamelons={true}
					calcifications={false}
					dueDate="2026-10-05"
					clinicalNotes="Прецизионная посадка 30 мкм"
					totalLabPriceRub={24000}
					portalUrl="http://localhost:5173/#/portal/lab-order/SECURE-TOKEN-123"
					handlePrint={() => {}}
					isDraft={false}
					isSigned={true}
				/>,
			);
		});

		const blank = findNodeByTestId(container, "form-ztl-1-blank");
		assert.ok(blank, "Бланк формы ЗТЛ-1 должен присутствовать");

		const tracker = findNodeByTestId(container, "lab-blank-5stage-tracker");
		assert.ok(tracker, "Трекер этапов ЗТЛ должен присутствовать на бланке");

		const deadlineBadge = findNodeByTestId(container, "print-blank-deadline-badge");
		assert.ok(deadlineBadge, "Индикатор дедлайна с рабочими днями должен присутствовать");

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
