/**
 * anesthesiaDosagePrintUiWave54.test.tsx
 * UI Rendering and 1-Click Action Buttons in QuickBar (Mandate 8b <= 120 lines)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToString } from "react-dom/server";
import { AnesthesiaQuickBar } from "../AnesthesiaQuickBar";

describe("Wave 54: UI Rendering and 1-Click Action Buttons in QuickBar", () => {
	it("renders quick presets and 1-click carpule buttons in AnesthesiaQuickBar", () => {
		const html = renderToString(
			<AnesthesiaQuickBar targetToothNumberFdi={16} patientWeightKg={70} onApplyAnesthesia={() => {}} />,
		);

		assert.ok(html.includes('data-testid="anesthesia-quick-bar"'), "Must render container");
		assert.ok(html.includes('data-testid="anesthesia-dose-norm-preset"'), "Must render norm preset");
		assert.ok(html.includes("Убистезин форте") || html.includes("Норма: Артикаин 1:100k"), "Must show label");
		assert.ok(html.includes("Вес пациента: 70 кг"), "Must show patient weight");
	});

	it("guarantees doctor autonomy (Mandate 8e): Primary CTA is NEVER disabled even if disabled prop is passed", () => {
		const html = renderToString(
			<AnesthesiaQuickBar disabled={true} onApplyAnesthesia={() => {}} />,
		);
		const btnApplyMatch = html.match(/<button[^>]*data-testid="btn-apply-anesthesia-to-card"[^>]*>/);
		assert.ok(btnApplyMatch, "CTA button must be rendered");
		assert.equal(btnApplyMatch[0].includes("disabled"), false, "Primary CTA must NEVER be disabled");

		const normPresetMatch = html.match(/<button[^>]*data-testid="anesthesia-dose-norm-preset"[^>]*>/);
		assert.ok(normPresetMatch, "Norm preset button must be rendered");
		assert.equal(normPresetMatch[0].includes("disabled"), false, "Norm preset must NEVER be disabled");
	});

	it("renders 1-click carpule buttons with compliant touch target (min-height >= 44px)", () => {
		const html = renderToString(
			<AnesthesiaQuickBar targetToothNumberFdi={24} onApplyAnesthesia={() => {}} />,
		);

		assert.ok(html.includes('data-testid="anesthesia-dose-1carp"'), "Must render dose-1carp");
		assert.ok(
			html.includes("min-h-[44px]") || html.includes("min-height: 44px"),
			"1-carpule button must have min-height >= 44px",
		);
	});

	it("emergency shock action button has min-height 48px", () => {
		const html = renderToString(
			<AnesthesiaQuickBar onOpenEmergencyProtocol={() => {}} onApplyAnesthesia={() => {}} />,
		);

		assert.ok(html.includes('data-testid="btn-anesthesia-quick-emergency"'), "Must render emergency button");
		assert.ok(
			html.includes("min-h-[48px]") || html.includes("min-height: 48px"),
			"Emergency button must enforce min-height: 48px",
		);
	});
});
