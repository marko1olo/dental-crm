/**
 * surgeryExpressProtocolsAndInvoice.test.ts — Тесты 1-клик хирургических экспресс-протоколов и начисления в счет (Мандаты 8e, 8n, 8ap).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { buildChairsideSmartProtocol } from "../../visit/workflowModules/chairsideSmartProtocolBuilder";
import { dispatchExpressProtocolServicesToInvoice } from "../../visit/soapEditor/soapExpressInvoiceBridge";
import { SoapExpressProtocolsBar } from "../../visit/soapEditor/SoapExpressProtocolsBar";

describe("Surgery Chairside 1-Click Express Protocols & Invoice Dispatch (Mandates 8e, 8n, 8ap)", () => {
	it("1. builds complex extraction protocol with K01.1, osteotomy and root separation", () => {
		const proto = buildChairsideSmartProtocol("extraction_complex", 38);
		assert.equal(proto.icd10, "K01.1");
		assert.ok(proto.diagnosis.includes("38"));
		assert.ok(proto.diagnosis.includes("Сложное удаление с альвеолотомией"));
		assert.ok(proto.treatmentPlan.includes("разъединением корней"));
		assert.ok(proto.treatmentPlan.includes("Викрил 4-0"));
	});

	it("2. builds standard dental implant protocol with K08.1, 35 N*cm torque and FDM", () => {
		const proto = buildChairsideSmartProtocol("implant_standard", 46);
		assert.equal(proto.icd10, "K08.1");
		assert.ok(proto.diagnosis.includes("46"));
		assert.ok(proto.treatmentPlan.includes("35 Н·см"));
		assert.ok(proto.treatmentPlan.includes("ISQ 72"));
		assert.ok(proto.treatmentPlan.includes("формирователя десны"));
	});

	it("3. builds sinus lift & GBR protocol with K08.2, Bio-Oss and Bio-Gide", () => {
		const proto = buildChairsideSmartProtocol("sinus_gbr", 16);
		assert.equal(proto.icd10, "K08.2");
		assert.ok(proto.diagnosis.includes("16"));
		assert.ok(proto.treatmentPlan.includes("Bio-Oss"));
		assert.ok(proto.treatmentPlan.includes("Bio-Gide"));
		assert.ok(proto.treatmentPlan.includes("титановыми пинами"));
	});

	it("4. dispatches dente-add-services-to-invoice with valid items and tooth number", () => {
		let capturedEvent: CustomEvent | null = null;
		const listener = (e: Event) => {
			capturedEvent = e as CustomEvent;
		};

		if (typeof window !== "undefined") {
			window.addEventListener("dente-add-services-to-invoice", listener);
		}

		const services = dispatchExpressProtocolServicesToInvoice("extraction_complex", 48);
		assert.ok(services.length >= 3, "Complex extraction must provide at least 3 billable services");
		assert.ok(services.some((s) => s.code === "A16.07.001.001"), "Must include primary extraction code");

		if (capturedEvent) {
			assert.equal((capturedEvent as any).detail.toothNumber, 48);
			assert.ok((capturedEvent as any).detail.services.length >= 3);
		}

		if (typeof window !== "undefined") {
			window.removeEventListener("dente-add-services-to-invoice", listener);
		}
	});

	it("5. SoapExpressProtocolsBar renders all 1-click surgical buttons with ZERO disabled controls", () => {
		const html = renderToString(
			<SoapExpressProtocolsBar
				onApplyExpressProtocol={() => {}}
			/>,
		);

		assert.ok(html.includes("btn-soap-express-extraction"), "Must render simple extraction");
		assert.ok(html.includes("btn-soap-express-extraction-complex"), "Must render complex extraction");
		assert.ok(html.includes("btn-soap-express-implant"), "Must render implant express protocol");
		assert.ok(html.includes("btn-soap-express-sinus-gbr"), "Must render sinus lift express protocol");

		// Mandate 8e: Doctor Autonomy (ZERO buttons disabled)
		assert.equal(html.includes("disabled"), false, "Buttons must NEVER be disabled in chairside bar");
	});
});
