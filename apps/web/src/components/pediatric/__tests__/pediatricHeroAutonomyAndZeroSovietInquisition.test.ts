/**
 * pediatricHeroAutonomyAndZeroSovietInquisition.test.ts
 *
 * Red Team Inquisitor Test for Pediatric Clinical Autonomy & Hero Diploma
 * Mandates: 8e (Doctor Autonomy), 8n (Solo/Small clinic), 8x (Zero Soviet bureaucracy)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React, { createElement } from "react";
import { renderToString } from "react-dom/server";

import {
	PediatricAnesthesiaCalculator,
	calculatePediatricAnesthesia,
	PEDIATRIC_ANESTHETIC_SPECS,
	checkPediatricAnesthesiaContraindications,
} from "../PediatricAnesthesiaCalculator";

import {
	PediatricBraveryDiplomaModal as PediatricHeroDiplomaModal,
} from "../PediatricBraveryDiplomaModal";

import {
	generateHeroDiplomaHtml,
} from "../pediatricHeroDiplomaPrint";

import {
	PediatricWeightQuickChips,
	PEDIATRIC_WEIGHT_PRESETS,
} from "../PediatricWeightQuickChips";

import {
	PediatricAnesthesiaQuickSelector,
} from "../PediatricAnesthesiaQuickSelector";

import {
	usePediatricVisitLogic,
} from "../usePediatricVisitLogic";

describe("Red Team Inquisition: Pediatric Doctor Autonomy & Hero Diploma", () => {
	describe("1. Pediatric Doctor Autonomy (Mandate 8e: Zero Disabled Buttons)", () => {
		it("proves apply anesthesia button is NEVER disabled, even with overdose or allergy", () => {
			const overdoseCalc = calculatePediatricAnesthesia({
				drug: PEDIATRIC_ANESTHETIC_SPECS.articaine_4,
				selectedDrugId: "articaine_4",
				weightKg: 15,
				carpules: 2.0, // Overdose for 15 kg child
				patientAgeYears: 4,
				articaineContraindicated: true,
				mepivacaineContraindicated: false,
			});

			assert.strictEqual(overdoseCalc.isOverdose, true, "Must detect overdose");
			assert.strictEqual(overdoseCalc.isContraindicated, true, "Must detect contraindication");

			const html = renderToString(
				createElement(PediatricAnesthesiaQuickSelector, {
					selectedDrugId: "articaine_4",
					onSelectDrugId: () => {},
					carpules: 2.0,
					onSelectCarpules: () => {},
					calculation: overdoseCalc,
					isArticaineContraindicated: true,
					isMepivacaineContraindicated: false,
					onSetMaxSafeDose: () => {},
					onApplyAnesthesia: () => {},
				}),
			);

			assert.ok(!html.includes("disabled"), "Selector must NOT have disabled buttons (Mandate 8e)");
			assert.ok(html.includes("btn-apply-anesthesia-protocol"), "Apply button must be present and clickable");
			assert.ok(html.includes("btn-reduce-to-safe-dose"), "Quick step-down button must be available");
		});

		it("provides 1-click weight preset chips (12-15 kg, 16-20 kg, 21-25 kg)", () => {
			const html = renderToString(
				createElement(PediatricWeightQuickChips, {
					weightKg: 18,
					onWeightChange: () => {},
					patientAgeYears: 5,
				}),
			);

			for (const preset of PEDIATRIC_WEIGHT_PRESETS) {
				assert.ok(html.includes(`data-testid="btn-weight-preset-${preset.weight}"`), `Must render chip for ${preset.label}`);
			}
			assert.ok(html.includes("data-testid=\"pediatric-weight-input\""), "Must allow direct weight input without blocking");
		});

		it("provides 1-click carpule dose options (0.25, 0.5, 1.0, 1.5)", () => {
			const defaultCalc = calculatePediatricAnesthesia({
				drug: PEDIATRIC_ANESTHETIC_SPECS.mepivacaine_3,
				selectedDrugId: "mepivacaine_3",
				weightKg: 20,
				carpules: 0.5,
				patientAgeYears: 6,
				articaineContraindicated: false,
				mepivacaineContraindicated: false,
			});

			const html = renderToString(
				createElement(PediatricAnesthesiaCalculator, {
					initialWeightKg: 20,
					initialCarpules: 0.5,
					patientAgeYears: 6,
				}),
			);

			for (const dose of [0.25, 0.5, 1.0, 1.5]) {
				assert.ok(html.includes(`data-testid="btn-pediatric-carpules-${dose}"`), `Must render carpule button for ${dose}`);
			}
		});
	});

	describe("2. 1-Click Primary Dentition Norm (FDI 51-85)", () => {
		it("ensures all 20 deciduous teeth are marked intact in 1 click", () => {
			const expectedTeeth = [
				51, 52, 53, 54, 55,
				61, 62, 63, 64, 65,
				71, 72, 73, 74, 75,
				81, 82, 83, 84, 85,
			];
			assert.strictEqual(expectedTeeth.length, 20, "Must be exactly 20 primary teeth");
		});
	});

	describe("3. 1-Click Hero Diploma Generation (A5 Landscape)", () => {
		it("generates beautiful A5 Hero Diploma HTML with patient name, clinic and doctor", () => {
			const html = generateHeroDiplomaHtml({
				heroName: "Артём Смирнов",
				doctorName: "Д-р Иванов А.С.",
				clinicName: "Клиника DENTE",
				visitDate: "25 октября 2026",
				diplomaNumber: "042",
			});

			assert.ok(html.includes("ДИПЛОМ ЗА ХРАБРОСТЬ"), "Must contain main diploma title");
			assert.ok(html.includes("Герой: Артём Смирнов"), "Must contain child hero name");
			assert.ok(html.includes("Клиника DENTE"), "Must contain clinic name");
			assert.ok(html.includes("Д-р Иванов А.С."), "Must contain doctor name");
			assert.ok(html.includes("size: A5 landscape"), "Must be styled for A5 landscape printing");
			assert.ok(html.includes("window.print()"), "Must invoke window.print on load");
		});

		it("renders PediatricHeroDiplomaModal with zero nested modals and accessible actions", () => {
			const html = renderToString(
				createElement(PediatricHeroDiplomaModal, {
					isOpen: true,
					onClose: () => {},
					patientName: "София Лебедева",
					patientAgeYears: 5,
					doctorName: "Д-р Петрова",
					clinicName: "Дентал Сити",
				}),
			);

			assert.ok(html.includes("data-testid=\"pediatric-hero-diploma-modal\""), "Must render modal container");
			assert.ok(html.includes("data-testid=\"diploma-preview-card\""), "Must render preview card");
			assert.ok(html.includes("София Лебедева"), "Must display patient name");
			assert.ok(html.includes("data-testid=\"btn-modal-print-diploma\""), "Must have print button");
			assert.ok(html.includes("data-testid=\"btn-copy-diploma-text\""), "Must have copy text button");
			assert.ok(!html.includes("disabled"), "Modal must NOT contain disabled buttons (Mandate 8e)");
		});
	});

	describe("4. Zero Soviet Bureaucracy in Clinical SOAP Notes (Mandate 8x)", () => {
		it("verifies formatted note uses clean clinical Russian instead of Soviet order numbers", () => {
			const calc = calculatePediatricAnesthesia({
				drug: PEDIATRIC_ANESTHETIC_SPECS.articaine_4,
				selectedDrugId: "articaine_4",
				weightKg: 22,
				carpules: 0.5,
				patientAgeYears: 7,
				articaineContraindicated: false,
				mepivacaineContraindicated: false,
			});

			const note = calc.formattedClinicalNote;
			assert.ok(!note.includes("043/у"), "Clinical note must NOT contain 043/у (Mandate 8x)");
			assert.ok(!note.includes("804н"), "Clinical note must NOT contain 804н (Mandate 8x)");
			assert.ok(note.includes("Анестезиологическое пособие"), "Note must use clean clinical terminology");
			assert.ok(note.includes("Вес ребенка: 22 кг"), "Note must include child weight");
			assert.ok(note.includes("ДОЗА БЕЗОПАСНА"), "Note must state safety evaluation");
		});
	});
});
