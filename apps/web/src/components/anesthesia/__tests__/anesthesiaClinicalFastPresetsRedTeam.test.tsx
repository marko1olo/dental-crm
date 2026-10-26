import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToString } from "react-dom/server";
import { AnesthesiaQuickBar } from "../AnesthesiaQuickBar";
import { calculateAnesthesiaSafety } from "../anesthesiaEngine";

describe("Red Team Inquisition: Anesthesia & Clinical Fast Presets (Mandates 8e, 8n, 8y)", () => {
	it("1. Eradication of nurse disposal garbage: zero disposal clutter", () => {
		const html = renderToString(<AnesthesiaQuickBar targetToothNumberFdi={16} onApplyAnesthesia={() => {}} />);
		assert.equal(html.includes("nurse-quick-carpule-disposal"), false);
		assert.equal(html.includes("Списать карпулу (FEFO)"), false);
	});

	it("2. Four clinical presets rendered in 1 click with canonical .secondary-button", () => {
		const html = renderToString(<AnesthesiaQuickBar targetToothNumberFdi={16} onApplyAnesthesia={() => {}} />);
		assert.ok(html.includes("Ультракаин Д-С 1:200 000"), "Must render Ультракаин Д-С 1:200 000");
		assert.ok(html.includes("Ультракаин Д-С Форте 1:100 000"), "Must render Ультракаин Д-С Форте 1:100 000");
		assert.ok(html.includes("Скандонест 3% (Мепивакаин без вазоконстриктора, 1 карпула 1.8 мл)"), "Must render Скандонест 3% 1.8 мл");
		assert.ok(html.includes("Септанест с адреналином 1:100 000"), "Must render Септанест 1:100 000");
		assert.ok(html.includes("secondary-button"), "Presets must use canonical .secondary-button");
	});

	it("3. Dominant emerald/teal CTA button 'Применить анестезию в протокол'", () => {
		const html = renderToString(<AnesthesiaQuickBar targetToothNumberFdi={16} onApplyAnesthesia={() => {}} />);
		assert.ok(html.includes("primary-button"), "Must include .primary-button class");
		assert.ok(html.includes("Применить анестезию"), "Must display CTA 'Применить анестезию'");
		assert.ok(html.includes('data-testid="btn-apply-anesthesia-to-card"'));
	});

	it("4. Passive allergy & cardio mode (Mandate 8y): passive badge shown, CTA NEVER disabled", () => {
		const html = renderToString(
			<AnesthesiaQuickBar targetToothNumberFdi={21} hasLidocaineAllergy={true} hasArticaineAllergy={true} hasCardiovascularRisk={true} onApplyAnesthesia={() => {}} />,
		);
		assert.ok(html.includes("⚠️ Аллергия: Лидокаин"), "Must render passive allergy badge");
		assert.ok(html.includes("⚠️ Рекомендуется препарат без вазоконстриктора (Скандонест 3%)"), "Must render passive cardio alert");

		const btnMatch = html.match(/<button[^>]*data-testid="btn-apply-anesthesia-to-card"[^>]*>/);
		assert.ok(btnMatch && !btnMatch[0].includes("disabled"), "Primary CTA button must NEVER be disabled");
	});

	it("5. Zero weight obsession: default weight is 70 kg without warnings", () => {
		const html = renderToString(<AnesthesiaQuickBar targetToothNumberFdi={36} onApplyAnesthesia={() => {}} />);
		assert.ok(html.includes("70 кг"), "Must default smoothly to standard adult weight (70 kg)");
		assert.equal(html.includes("Введите вес"), false, "No intrusive weight prompt allowed");
	});

	it("6. SOAP diary contains drug name, dose, series, negative aspiration and zero complications", () => {
		const safety = calculateAnesthesiaSafety({
			drugId: "articaine_1_200k", carpulesCount: 1.0, patientWeightKg: 70, patientAgeYears: 35,
			asaStatus: "asa_1", hasCardiovascularRisk: false, hasSulfiteAllergy: false,
			hasBronchialAsthma: false, isPregnantOrLactating: false, techniqueId: "infiltration",
			needleType: "g30_short_21mm", targetToothNumberFdi: 16, aspirationNegativeConfirmed: true,
		});
		assert.ok(safety.diaryEntryRu.includes("Ультракаин Д-С"), "Contains drug brand");
		assert.ok(safety.diaryEntryRu.includes("1.7 мл") && safety.diaryEntryRu.includes("1 карп."), "Contains dose");
		assert.ok(safety.diaryEntryRu.includes("Серия"), "Contains series check");
		assert.ok(safety.diaryEntryRu.includes("Аспирационная проба отрицательна"), "Contains negative aspiration check");
		assert.ok(safety.diaryEntryRu.includes("осложнений нет"), "Contains zero complications");
	});
});
