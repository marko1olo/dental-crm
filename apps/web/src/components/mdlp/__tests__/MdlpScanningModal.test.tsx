import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	MdlpScanningModal,
	createShiftCarpulesBatch,
	EMERGENCY_DISPENSE_PRESETS,
	SAMPLE_BARCODES,
} from "../MdlpScanningModal.js";

describe("MDLP / Chestny Znak Scanning Modal (Mandate 8e Invariants)", () => {
	it("createShiftCarpulesBatch generates 10 valid Articaine 1:100 000 carpules for shift", () => {
		const batch = createShiftCarpulesBatch(10);
		assert.strictEqual(batch.length, 10);
		for (const item of batch) {
			assert.strictEqual(item.gtin, "03664798000016");
			assert.ok(item.tradeName.includes("Ультракаин") || item.tradeName.includes("Артикаин") || item.tradeName.length > 0);
			assert.strictEqual(item.costRub, 450);
			assert.ok(item.serialNumber.startsWith("SN"));
		}
	});

	it("MdlpScanningModal renders static markup with nurse rules banner and 1-click actions", () => {
		const html = renderToStaticMarkup(
			createElement(MdlpScanningModal, {
				isOpen: true,
				onClose: () => {},
				clinicName: "ООО «Денте Стоматология»",
			}),
		);

		// Container and modal presence
		assert.ok(html.includes("data-testid=\"mdlp-scanning-modal-container\""));
		assert.ok(html.includes("Честный ЗНАК · ИС МДЛП"));
		assert.ok(html.includes("СХЕМА 701 / 531"));

		// Nurse rules & soft overdraft banner
		assert.ok(html.includes("data-testid=\"mdlp-nurse-rules-banner\""));
		assert.ok(html.includes("Правило медсестры:"));
		assert.ok(html.includes("Мягкий овердрафт:"));

		// 1-click actions: shift carpules & deferred disposal
		assert.ok(html.includes("data-testid=\"mdlp-shift-carpules-batch-btn\""));
		assert.ok(html.includes("⚡ Списать 10 карпул за смену (по журналу)"));
		assert.ok(html.includes("data-testid=\"mdlp-deferred-disposal-btn\""));
		assert.ok(html.includes("⚡ Отложенное списание МДЛП (офлайн-буфер)"));

		// CRPT server status and broken-scanner bypass button
		assert.ok(html.includes("data-testid=\"mdlp-crpt-status-strip\""));
		assert.ok(html.includes("data-testid=\"toggle-emergency-scanner-bypass-btn\""));
		assert.ok(html.includes("Поломка 2D-сканера? Аварийная выдача"));

		// Buttons MUST NOT be disabled
		assert.ok(html.includes("data-testid=\"mdlp-scan-submit-btn\""));
		assert.ok(!html.includes("data-testid=\"mdlp-scan-submit-btn\" disabled"));
		assert.ok(html.includes("data-testid=\"mdlp-clear-all-btn\""));
		assert.ok(!html.includes("data-testid=\"mdlp-clear-all-btn\" disabled"));
		assert.ok(html.includes("data-testid=\"mdlp-generate-xml-btn\""));
		assert.ok(!html.includes("data-testid=\"mdlp-generate-xml-btn\" disabled"));

		// Footer deferred disposal button
		assert.ok(html.includes("data-testid=\"mdlp-footer-deferred-btn\""));
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
		assert.ok(EMERGENCY_DISPENSE_PRESETS.length >= 4);
		const names = EMERGENCY_DISPENSE_PRESETS.map((p) => p.shortName);
		assert.ok(names.some((n) => n.includes("Ультракаин")));
		assert.ok(names.some((n) => n.includes("Септанест")));
		assert.ok(names.some((n) => n.includes("Скандонест")));
		assert.ok(names.some((n) => n.includes("Dentium")));
	});
});
