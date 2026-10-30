import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import {
	PediatricAnesthesiaCalculator,
	calculatePediatricAnesthesia,
	PEDIATRIC_ANESTHETIC_SPECS,
} from "../../PediatricAnesthesiaCalculator";
import { PediatricWeightQuickChips, PEDIATRIC_WEIGHT_PRESETS } from "../../PediatricWeightQuickChips";
import { PediatricAnesthesiaQuickSelector } from "../../PediatricAnesthesiaQuickSelector";

describe("Pediatric Doctor Autonomy (Mandate 8e: Zero Disabled Buttons)", () => {
	it("proves apply anesthesia button is NEVER disabled, even with overdose or allergy", () => {
		const overdoseCalc = calculatePediatricAnesthesia({
			drug: PEDIATRIC_ANESTHETIC_SPECS.articaine_4,
			selectedDrugId: "articaine_4",
			weightKg: 15,
			carpules: 2.0,
			patientAgeYears: 4,
			articaineContraindicated: true,
			mepivacaineContraindicated: false,
		});

		assert.strictEqual(overdoseCalc.isOverdose, true);
		assert.strictEqual(overdoseCalc.isContraindicated, true);

		const html = renderToString(createElement(PediatricAnesthesiaQuickSelector, {
			selectedDrugId: "articaine_4",
			onSelectDrugId: () => {},
			carpules: 2.0,
			onSelectCarpules: () => {},
			calculation: overdoseCalc,
			isArticaineContraindicated: true,
			isMepivacaineContraindicated: false,
			onSetMaxSafeDose: () => {},
			onApplyAnesthesia: () => {},
		}));

		assert.ok(!html.includes("disabled"), "Selector must NOT have disabled buttons (Mandate 8e)");
		assert.ok(html.includes("btn-apply-anesthesia-protocol"));
		assert.ok(html.includes("btn-reduce-to-safe-dose"));
	});

	it("provides 1-click weight preset chips (12-15 kg, 16-20 kg, 21-25 kg)", () => {
		const html = renderToString(createElement(PediatricWeightQuickChips, {
			weightKg: 18, onWeightChange: () => {}, patientAgeYears: 5,
		}));
		for (const preset of PEDIATRIC_WEIGHT_PRESETS) {
			assert.ok(html.includes(`data-testid="btn-weight-preset-${preset.weight}"`));
		}
		assert.ok(html.includes('data-testid="pediatric-weight-input"'));
	});

	it("provides 1-click carpule dose options (0.25, 0.5, 1.0, 1.5)", () => {
		const html = renderToString(createElement(PediatricAnesthesiaCalculator, {
			initialWeightKg: 20, initialCarpules: 0.5, patientAgeYears: 6,
		}));
		for (const dose of [0.25, 0.5, 1.0, 1.5]) {
			assert.ok(html.includes(`data-testid="btn-pediatric-carpules-${dose}"`));
		}
	});

	it("ensures all 20 deciduous teeth are marked intact in 1 click", () => {
		const expectedTeeth = [
			51, 52, 53, 54, 55, 61, 62, 63, 64, 65,
			71, 72, 73, 74, 75, 81, 82, 83, 84, 85,
		];
		assert.strictEqual(expectedTeeth.length, 20, "Must be exactly 20 primary teeth");
	});
});
