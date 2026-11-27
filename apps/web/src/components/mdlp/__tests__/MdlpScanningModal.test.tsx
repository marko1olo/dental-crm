import assert from "node:assert/strict";
import { afterEach, describe, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	MdlpScanningModal,
	createShiftCarpulesBatch,
	EMERGENCY_DISPENSE_PRESETS,
	SAMPLE_BARCODES,
} from "../MdlpScanningModal.js";
import { getEmergencyDispensePresets } from "../mdlpPresetsData.js";
import { setRuntimeDemoMode } from "../../../utils/demoModeEngine.js";

describe("MDLP / Chestny Znak Scanning Modal (Mandate 8e & Demo Isolation Invariants)", () => {
	afterEach(() => {
		setRuntimeDemoMode(null);
	});

	it("createShiftCarpulesBatch generates 10 valid Articaine 1:100 000 carpules for shift", () => {
		const batch = createShiftCarpulesBatch(10);
		assert.strictEqual(batch.length, 10);
		assert.strictEqual(batch[0]?.tradeName, "Ультракаин® Д-С форте");
		assert.strictEqual(batch[0]?.costRub, 450);
		assert.ok(batch.every((it) => Boolean(it.sgtin) && Boolean(it.gtin) && Boolean(it.rawBarcode)));
		assert.notStrictEqual(batch[0]?.sgtin, batch[1]?.sgtin);
	});

	it("isolates mock doc numbers, fake org subjectId, and emergency presets when demo mode is off", () => {
		setRuntimeDemoMode(false);
		assert.strictEqual(getEmergencyDispensePresets().length, 0);

		const html = renderToStaticMarkup(
			createElement(MdlpScanningModal, {
				isOpen: true,
				onClose: () => {},
				initialMode: "warehouse_acceptance",
			}),
		);
		assert.strictEqual(html.includes("УПД-2026-0891"), false, "Prod must not prefill mock UPD");
		assert.strictEqual(html.includes("АКТ-СПИСАНИЕ-0042"), false, "Prod must not prefill mock Act");
		assert.strictEqual(html.includes("00000000123456"), false, "Prod must not inject fake subjectId");
	});

	it("MdlpScanningModal renders static markup with nurse rules banner and quick actions", () => {
		setRuntimeDemoMode(true);
		const html = renderToStaticMarkup(
			createElement(MdlpScanningModal, {
				isOpen: true,
				onClose: () => {},
			}),
		);

		assert.ok(html.includes("Маркировка препаратов · Честный Знак"));
		assert.ok(html.includes("Приёмка и списание"));
		assert.ok(html.includes("mdlp-nurse-rules-banner"));
		assert.ok(html.includes("Списать 10 карпул за смену"));
		assert.ok(html.includes("mdlp-confirm-disposal-primary-cta"));
		assert.ok(html.includes("Вывести из оборота"));
		assert.ok(html.includes("toggle-emergency-scanner-bypass-btn"));
		assert.ok(html.includes("mdlp-deferred-disposal-btn"));
		assert.strictEqual(html.includes("disabled"), false);
		assert.ok(SAMPLE_BARCODES.length >= 5);
	});

	it("MdlpScanningModal supports human semantic modes (warehouse_acceptance, care_dispense, spoilage_disposal)", () => {
		setRuntimeDemoMode(true);
		const html = renderToStaticMarkup(
			createElement(MdlpScanningModal, {
				isOpen: true,
				onClose: () => {},
				initialMode: "warehouse_acceptance",
			}),
		);

		assert.ok(html.includes("data-testid=\"mdlp-tab-acceptance\""));
		assert.ok(html.includes("Приёмка на склад"));
		assert.ok(html.includes("Списание при оказании медпомощи"));
		assert.ok(html.includes("Списание по сроку годности / браку"));
		assert.ok(html.includes("УПД-2026-0891"));
	});

	it("MdlpScanningModal returns empty markup when isOpen is false", () => {
		const html = renderToStaticMarkup(
			createElement(MdlpScanningModal, {
				isOpen: false,
				onClose: () => {},
			}),
		);
		assert.strictEqual(html, "");
	});

	it("EMERGENCY_DISPENSE_PRESETS contains anesthetics and implants for broken scanner emergency bypass", () => {
		setRuntimeDemoMode(true);
		assert.ok(EMERGENCY_DISPENSE_PRESETS.length >= 4);
		assert.ok(EMERGENCY_DISPENSE_PRESETS.some((p) => p.badge === "Имплант"));
		assert.ok(EMERGENCY_DISPENSE_PRESETS.some((p) => p.badge === "Анестезия"));
	});

	it("MdlpScanningModal renders Scheme 444 tab and supports initialMode disposal_444", () => {
		setRuntimeDemoMode(true);
		const html = renderToStaticMarkup(
			createElement(MdlpScanningModal, {
				isOpen: true,
				onClose: () => {},
				initialMode: "disposal_444",
			}),
		);

		assert.ok(html.includes("data-testid=\"mdlp-tab-disposal-444\""));
		assert.ok(html.includes("Списание по медицинской карте приёма"));
		assert.ok(html.includes("АКТ-СПИСАНИЕ-0042"));
		assert.ok(html.includes("Списание материалов"));
	});
});
