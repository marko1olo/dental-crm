import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChairsideEndoQuickBar } from "../ChairsideEndoQuickBar";
import { generateSoapEndoProtocol } from "../quickbar/soapGenerator";
import { executeChairsideTransferToDiary } from "../quickbar/quickBarTransferExecutor";
import type { QuickCanalState } from "../quickbar/types";

describe("ChairsideEndoChips & Invoice Bridge (Mandates 8e, 8n)", () => {
	it("1. 1-Click Quick-Pick Chips: Working Length (19, 20, 21, 21.5, 22 mm)", () => {
		const html = renderToStaticMarkup(createElement(ChairsideEndoQuickBar, { activeTooth: 16 }));
		assert.ok(html.includes("chip-length-MB-19"), "Has 19 mm chip");
		assert.ok(html.includes("chip-length-MB-20"), "Has 20 mm chip");
		assert.ok(html.includes("chip-length-MB-21"), "Has 21 mm chip");
		assert.ok(html.includes("chip-length-MB-21.5"), "Has 21.5 mm chip");
		assert.ok(html.includes("chip-length-MB-22"), "Has 22 mm chip");
		assert.ok(html.includes("Apex 0.0"), "Shows Apex 0.0 indicator");
	});

	it("2. 1-Click Quick-Pick Chips: Master Apical File (25/.04, 30/.04, 25/.06, 20/.04)", () => {
		const html = renderToStaticMarkup(createElement(ChairsideEndoQuickBar, { activeTooth: 16 }));
		assert.ok(html.includes("chip-maf-MB-2504"), "Has 25/.04 chip");
		assert.ok(html.includes("chip-maf-MB-3004"), "Has 30/.04 chip");
		assert.ok(html.includes("chip-maf-MB-2506"), "Has 25/.06 chip");
		assert.ok(html.includes("chip-maf-MB-2004"), "Has 20/.04 chip");
	});

	it("3. 1-Click Obturation Type: Gutta-percha + AH Plus vs Bioceramic vs Ca(OH)2", () => {
		const html = renderToStaticMarkup(createElement(ChairsideEndoQuickBar, { activeTooth: 16 }));
		assert.ok(html.includes("chip-obturation-gutta-MB"), "Has Gutta-percha chip");
		assert.ok(html.includes("chip-obturation-bio-MB"), "Has Bioceramic chip");
		assert.ok(html.includes("chip-obturation-caoh2-MB"), "Has Ca(OH)2 chip");
	});

	it("4. Collapsible compact accordion: «Детализация каналов (для эндодонтиста)»", () => {
		const html = renderToStaticMarkup(createElement(ChairsideEndoQuickBar, { activeTooth: 16 }));
		assert.ok(html.includes("endo-canals-accordion"), "Renders canals accordion");
		assert.ok(html.includes("Детализация каналов (для эндодонтиста)"), "Has clean title");
	});

	it("5. Autopilot SOAP protocol for Pulpitis 1-visit contains full clinical steps", () => {
		const canals: QuickCanalState[] = [
			{ id: "1", name: "MB", workingLengthMm: 21.5, masterApicalFile: "#25", taper: ".04", obturationType: "gutta_sealer", sealer: "AH Plus" },
		];
		const soap = generateSoapEndoProtocol({ activeTooth: 16, toothAnatomicalName: "Первый моляр", currentCanals: canals });
		assert.ok(soap.includes("анестезия") && soap.includes("коффердам"), "Includes anesthesia & dam");
		assert.ok(soap.includes("ProTaper/WaveOne до F2"), "Includes instrumentation");
		assert.ok(soap.includes("3% раствор NaOCl с УЗ-активацией"), "Includes ultrasound irrigation");
		assert.ok(soap.includes("латеральной компакции"), "Includes obturation method");
	});

	it("6. Seamless bridge to cashier: executeChairsideTransferToDiary dispatches invoice event", () => {
		let capturedEvent: CustomEvent | null = null;
		const originalWindow = globalThis.window;
		const mockWindow = {
			dispatchEvent: (ev: Event) => {
				if ((ev as CustomEvent).type === "dente-add-services-to-invoice") {
					capturedEvent = ev as CustomEvent;
				}
				return true;
			},
		};
		// @ts-ignore
		globalThis.window = mockWindow;

		try {
			const canals: QuickCanalState[] = [
				{ id: "1", name: "MB", workingLengthMm: 21.5, masterApicalFile: "#25", taper: ".04", obturationType: "gutta_sealer", sealer: "AH Plus" },
				{ id: "2", name: "DB", workingLengthMm: 20.0, masterApicalFile: "#25", taper: ".04", obturationType: "gutta_sealer", sealer: "AH Plus" },
				{ id: "3", name: "P", workingLengthMm: 22.0, masterApicalFile: "#30", taper: ".04", obturationType: "gutta_sealer", sealer: "AH Plus" },
			];
			executeChairsideTransferToDiary({
				activeTooth: 16,
				toothAnatomicalName: "Первый моляр",
				canals,
				patientId: "pat-123",
			});
			assert.ok(capturedEvent, "Event dente-add-services-to-invoice must be dispatched");
			const detail = (capturedEvent as CustomEvent).detail;
			assert.equal(detail.toothNumber, 16);
			assert.ok(detail.services.length > 0, "Dispatched services to cashier");
			assert.ok(detail.services.some((s: any) => s.category === "Эндодонтия"));
		} finally {
			globalThis.window = originalWindow;
		}
	});
});
