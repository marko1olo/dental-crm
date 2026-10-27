import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DentalLabOrderModalPresetsBar } from "../orderModalModules/DentalLabOrderModalPresetsBar";
import { DentalLabOrthopedicConstructionGrid } from "../restorationTabModules/DentalLabOrthopedicConstructionGrid";
import { DentalLabOrderModalFooter } from "../orderModalModules/DentalLabOrderModalFooter";
import { MODAL_EXPRESS_LAB_PRESETS } from "../dentalLabModalPresets";

describe("Red Team — Dental Lab Buttons, Presets & Action Bar Invariants", () => {
	it("1. Renders exactly 18 neutral preset pills with ZERO lightning bolts (Zap/amber circus eliminated)", () => {
		assert.equal(MODAL_EXPRESS_LAB_PRESETS.length, 18);
		const html = renderToStaticMarkup(
			<DentalLabOrderModalPresetsBar
				onSelectPreset={() => {}}
				selectedMaterial="zirconia_multilayer"
				selectedConstruction="single_crown"
			/>,
		);
		// Zero lightning bolts or amber circus
		assert.equal(html.includes("lucide-zap"), false);
		assert.equal(html.includes("amber-500"), false);
		assert.equal(html.includes("Быстрые шаблоны ортопедии:"), true);
		assert.equal(html.includes("dente-btn-pill"), true);
		// Active preset has teal highlight
		assert.equal(html.includes("is-active"), true);
		assert.equal(html.includes("border-[var(--teal,#0d9488)]"), true);
		// All 18 presets rendered with testids
		for (const p of MODAL_EXPRESS_LAB_PRESETS) {
			assert.equal(html.includes(`data-testid="lab-preset-btn-${p.id}"`), true);
		}
	});

	it("2. Construction and material cards are harmonized: both use unified teal active state and zero amber", () => {
		const html = renderToStaticMarkup(
			<DentalLabOrthopedicConstructionGrid
				constructionType="single_crown"
				setConstructionType={() => {}}
				material="zirconia_multilayer"
				setMaterial={() => {}}
			/>,
		);
		assert.equal(html.includes("amber-500"), false);
		assert.equal(html.includes("amber-900"), false);
		assert.equal(html.includes('data-testid="construction-type-single_crown"'), true);
		assert.equal(html.includes('data-testid="material-type-zirconia_multilayer"'), true);
	});

	it("3. Footer action bar has exactly ONE Primary CTA (teal), other buttons are neutral outline", () => {
		const html = renderToStaticMarkup(
			<DentalLabOrderModalFooter
				selectedTeeth={[16]}
				isSubmitting={false}
				isEdit={false}
				onCopySummary={() => {}}
				onPrint={() => {}}
				onClose={() => {}}
				onSubmit={() => {}}
			/>,
		);
		// Primary CTA button is present and highlighted with teal
		assert.equal(html.includes("submit-lab-order-btn"), true);
		assert.equal(html.includes("Отправить наряд в лабораторию"), true);
		assert.equal(html.includes("bg-[var(--teal,#0d9488)]"), true);
		// Secondary buttons are neutral
		assert.equal(html.includes("lab-order-copy-messenger-btn"), true);
		assert.equal(html.includes("Скопировать для лаборатории"), true);
		assert.equal(html.includes("lab-order-footer-print-btn"), true);
		assert.equal(html.includes("Печать бланка (А4)"), true);
	});
});
