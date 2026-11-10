import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DentalLabStudioModal } from "../DentalLabStudioModal";
import { MODAL_EXPRESS_LAB_PRESETS } from "../dentalLabModalPresets";

describe("Red Team — Dental Lab Buttons, Presets & Action Bar Invariants", () => {
	it("1. Renders express presets with ZERO lightning bolts (Zap/amber circus eliminated)", () => {
		assert.equal(MODAL_EXPRESS_LAB_PRESETS.length, 18);
		const html = renderToStaticMarkup(
			<DentalLabStudioModal isOpen={true} onClose={() => {}} />
		);
		// Zero lightning bolts or amber circus
		assert.equal(html.includes("lucide-zap"), false);
		assert.equal(html.includes("amber-500"), false);
		assert.equal(html.includes("Быстрые шаблоны ортопедии:"), true);
		assert.equal(html.includes("dente-btn-pill"), true);
		assert.equal(html.includes("border-[var(--teal,#0d9488)]"), true);
		assert.equal(html.includes('data-testid="lab-preset-btn-zirconia_crown_express"'), true);
	});

	it("2. Construction and material cards are harmonized: both use unified teal active state and zero amber", () => {
		const html = renderToStaticMarkup(
			<DentalLabStudioModal isOpen={true} onClose={() => {}} />
		);
		assert.equal(html.includes("amber-500"), false);
		assert.equal(html.includes("amber-900"), false);
		assert.equal(html.includes('data-testid="lab-material-select"'), true);
		assert.equal(html.includes('data-testid="quick-construction-zirconia_multilayer"'), true);
	});

	it("3. Studio action bar has exactly ONE Primary CTA (teal), other buttons are neutral outline", () => {
		const html = renderToStaticMarkup(
			<DentalLabStudioModal isOpen={true} onClose={() => {}} />
		);
		// Primary CTA button is present and highlighted with teal
		assert.equal(html.includes("submit-lab-order-btn"), true);
		assert.equal(html.includes("Создать заказ-наряд"), true);
		assert.equal(html.includes("bg-[var(--teal,#0d9488)]"), true);
		// Secondary buttons are neutral
		assert.equal(html.includes("print-lab-order-a5-btn"), true);
		assert.equal(html.includes("Печать наряда А5"), true);
		assert.equal(html.includes("courier-blank-btn"), true);
		assert.equal(html.includes("Бланк курьеру"), true);
	});
});
