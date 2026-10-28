import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { AnesthesiaQuickBar } from "../AnesthesiaQuickBar";
import { calculateAnesthesiaSafety } from "../anesthesiaEngine";

describe("Red Team Inquisition: Anesthesia Clinical Autonomy & Fast Presets (Mandates 8e, 8n, 8y)", () => {
	it("1. Zero disposal clutter and zero bureaucracy: no nurse disposal garbage", () => {
		const html = renderToString(<AnesthesiaQuickBar targetToothNumberFdi={16} onApplyAnesthesia={() => {}} />);
		assert.equal(html.includes("nurse-quick-carpule-disposal"), false);
		assert.equal(html.includes("Списать карпулу (FEFO)"), false);
	});

	it("2. Three primary fast presets in 1 tap: Articaine 1:200k, Articaine 1:100k, Mepivacaine 3%", () => {
		const html = renderToString(<AnesthesiaQuickBar targetToothNumberFdi={16} onApplyAnesthesia={() => {}} />);
		assert.ok(html.includes("Артикаин 1:200 000"), "Must render [ Артикаин 1:200 000 ]");
		assert.ok(html.includes("Артикаин 1:100 000"), "Must render [ Артикаин 1:100 000 ]");
		assert.ok(html.includes("Мепивакаин 3% (без адреналина)"), "Must render [ Мепивакаин 3% (без адреналина) ]");
		assert.ok(html.includes("secondary-button"), "Presets must use canonical .secondary-button");
	});

	it("3. Dominant CTA button 'Применить анестезию в протокол' with zero disabled state", () => {
		const html = renderToString(<AnesthesiaQuickBar targetToothNumberFdi={16} onApplyAnesthesia={() => {}} />);
		assert.ok(html.includes("primary-button"), "Must include .primary-button class");
		assert.ok(html.includes("Применить анестезию"), "Must display CTA 'Применить анестезию'");
		assert.ok(html.includes('data-testid="btn-apply-anesthesia-to-card"'));

		const btnMatch = html.match(/<button[^>]*data-testid="btn-apply-anesthesia-to-card"[^>]*>/);
		assert.ok(btnMatch && !btnMatch[0].includes("disabled"), "CTA button must NEVER be disabled");
	});

	it("4. Passive safety strip (Mandate 8y): 'Аллергия в анамнезе' badge, Scandonest auto-selection, CTA active", () => {
		const html = renderToString(
			<AnesthesiaQuickBar targetToothNumberFdi={21} hasLidocaineAllergy={true} hasArticaineAllergy={true} hasCardiovascularRisk={true} onApplyAnesthesia={() => {}} />,
		);
		assert.ok(html.includes("Аллергия в анамнезе: Лидокаин"), "Must render passive allergy badge");
		assert.ok(html.includes("Рекомендуется препарат без вазоконстриктора (Скандонест 3%)"), "Must render passive cardio alert");

		const btnMatch = html.match(/<button[^>]*data-testid="btn-apply-anesthesia-to-card"[^>]*>/);
		assert.ok(btnMatch && !btnMatch[0].includes("disabled"), "Primary CTA button must NEVER be disabled");
	});

	it("5. Zero weight obsession: default weight is 70 kg without intrusive prompts", () => {
		const html = renderToString(<AnesthesiaQuickBar targetToothNumberFdi={36} onApplyAnesthesia={() => {}} />);
		assert.ok(html.includes("70 кг"), "Must default smoothly to standard adult weight (70 kg)");
		assert.equal(html.includes("Введите вес"), false, "No intrusive weight prompt allowed");
	});

	it("6. Automatic clean Latin entry in 043/u diary: Sol. Articaini 4% cum Epinephrini 1:200 000 — 1.7 мл (1 карпула). Осложнений нет.", () => {
		const safety = calculateAnesthesiaSafety({
			drugId: "articaine_1_200k", carpulesCount: 1.0, patientWeightKg: 70, patientAgeYears: 35,
			asaStatus: "asa_1", hasCardiovascularRisk: false, hasSulfiteAllergy: false,
			hasBronchialAsthma: false, isPregnantOrLactating: false, techniqueId: "infiltration",
			needleType: "g30_short_21mm", targetToothNumberFdi: 16, aspirationNegativeConfirmed: true,
		});
		assert.ok(safety.diaryEntryRu.includes("Проведена инфильтрационная анестезия"), "Contains clean technique name");
		assert.ok(safety.diaryEntryRu.includes("Sol. Articaini 4% cum Epinephrini 1:200 000"), "Contains pure Latin formula");
		assert.ok(safety.diaryEntryRu.includes("1.7 мл (1 карпула)"), "Contains clean volume and carpule count");
		assert.ok(safety.diaryEntryRu.includes("Осложнений нет"), "Contains zero complications");
		assert.equal(safety.diaryEntryRu.includes("30G"), false, "Must NOT leak needle gauge bureaucracy");
		assert.equal(safety.diaryEntryRu.includes("Серия:"), false, "Must NOT leak batch bureaucracy in standard diary");
	});

	it("7. Passive dosage alert triggered on pediatric weight without disabling Primary CTA (Mandates 8e, 8y)", () => {
		const html = renderToString(<AnesthesiaQuickBar patientWeightKg={15} patientAgeYears={5} onApplyAnesthesia={() => {}} />);
		assert.ok(html.includes("data-testid=\"anesthesia-passive-overdose-alert\"") || html.includes("15 кг"), "Must render weight indicator");
		const btnMatch = html.match(/<button[^>]*data-testid="btn-apply-anesthesia-to-card"[^>]*>/);
		assert.ok(btnMatch && !btnMatch[0].includes("disabled"), "Primary CTA button must NEVER be disabled");
	});
});
