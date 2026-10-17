import assert from "node:assert/strict";
import { describe, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { AnesthesiaQuickBar } from "../AnesthesiaQuickBar";

describe("Red Team Inquisition: Anesthesia & Clinical Fast Presets (Mandates 8e, 8n, 8y)", () => {
	it("1. Eradication of nurse disposal garbage: no disposal buttons rendered", () => {
		const html = renderToString(<AnesthesiaQuickBar targetToothNumberFdi={16} onApplyAnesthesia={() => {}} />);
		assert.equal(html.includes("nurse-quick-carpule-disposal"), false, "Nurse quick disposal must not exist");
		assert.equal(html.includes("nurse-quick-septanest-disposal"), false, "Nurse septanest disposal must not exist");
		assert.equal(html.includes("nurse-quick-packet-disposal"), false, "Nurse packet disposal must not exist");
		assert.equal(html.includes("Списать карпулу (FEFO)"), false, "Text 'Списать карпулу (FEFO)' must not be present");
	});

	it("2. Popular clinical presets rendered with .secondary-button classes and exact names", () => {
		const html = renderToString(<AnesthesiaQuickBar targetToothNumberFdi={16} onApplyAnesthesia={() => {}} />);
		assert.ok(html.includes("Ультракаин Д-С Форте 1:100 000"), "Must render preset: 'Ультракаин Д-С Форте 1:100 000'");
		assert.ok(html.includes("Ультракаин Д-С 1:200 000"), "Must render preset: 'Ультракаин Д-С 1:200 000'");
		assert.ok(html.includes("Скандонест без адреналина"), "Must render preset: 'Скандонест без адреналина'");
		assert.ok(html.includes("secondary-button"), "Presets must use canonical .secondary-button style");
	});

	it("3. Dominant emerald .primary-button 'Применить анестезию'", () => {
		const html = renderToString(<AnesthesiaQuickBar targetToothNumberFdi={16} onApplyAnesthesia={() => {}} />);
		assert.ok(html.includes("primary-button"), "Must include canonical .primary-button class");
		assert.ok(html.includes("Применить анестезию"), "Must display dominant CTA 'Применить анестезию'");
		assert.ok(html.includes('data-testid="btn-apply-anesthesia-to-card"'), "Must keep testid btn-apply-anesthesia-to-card");
	});

	it("4. Passive allergy mode (Mandate 8y): passive badge shown, CTA button NEVER disabled", () => {
		const html = renderToString(
			<AnesthesiaQuickBar
				targetToothNumberFdi={21}
				hasLidocaineAllergy={true}
				hasArticaineAllergy={true}
				onApplyAnesthesia={() => {}}
			/>,
		);
		assert.ok(html.includes("⚠️ Аллергия: Лидокаин"), "Must render passive allergy badge with ⚠️ for Lidocaine");
		assert.ok(html.includes("⚠️ Аллергия: Артикаин"), "Must render passive allergy badge with ⚠️ for Articaine");

		// Button 'Применить анестезию' MUST NOT be disabled
		const btnMatch = html.match(/<button[^>]*data-testid="btn-apply-anesthesia-to-card"[^>]*>/);
		assert.ok(btnMatch, "CTA button must be rendered");
		assert.equal(
			btnMatch[0].includes("disabled"),
			false,
			"Primary CTA button must NEVER be disabled due to passive allergy badge (Mandate 8e/8y)",
		);
	});

	it("5. Zero weight obsession: default weight is 70 kg without warnings", () => {
		const html = renderToString(<AnesthesiaQuickBar targetToothNumberFdi={36} onApplyAnesthesia={() => {}} />);
		assert.ok(html.includes("70 кг"), "Must default smoothly to standard adult weight (70 kg)");
		assert.equal(html.includes("Введите вес"), false, "No intrusive weight input prompt allowed");
	});
});
