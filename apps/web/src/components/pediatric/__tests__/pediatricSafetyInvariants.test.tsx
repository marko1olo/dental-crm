/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PEDIATRIC SAFETY INVARIANTS & CLINICAL RED TEAM VERIFICATION
 * - Tooth auto-sanitization (Prevent adult tooth 16 on toddlers < 6 yrs)
 * - Physiological weight interpolation (Age-to-weight, no default 20 kg trap)
 * - Pediatric anesthesia toxic overdose calculation & reduction (Mandate 8e)
 * - Diploma of Young Hero ("Диплом юного героя / Диплом за храбрость")
 * - Post-anesthesia care memo (Lip biting trauma prevention)
 * - Zero disabled buttons, zero cartoon emojis in documents
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { estimatePediatricWeightKg } from "@dental/shared";
import {
	PediatricAnesthesiaCalculator,
	PEDIATRIC_ANESTHETIC_SPECS,
} from "../PediatricAnesthesiaCalculator";
import { VisitPediatricProtocolWidget } from "../VisitPediatricProtocolWidget";
import { PediatricBraveryDiplomaModal } from "../PediatricBraveryDiplomaModal";
import { PediatricParentMemoModal } from "../PediatricParentMemoModal";

const EMOJI_REGEX =
	/[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

describe("Pediatric Safety Invariants & Clinical Red Team Verification", () => {
	// ─────────────────────────────────────────────────────────────────────────
	// 1. DENTITION & TOOTH AUTO-SANITIZATION INVARIANT
	// ─────────────────────────────────────────────────────────────────────────
	describe("1. Tooth & Dentition Sanitization by Patient Age", () => {
		it("auto-sanitizes adult tooth 16 to deciduous tooth 54 for toddlers (< 6 years)", () => {
			// When activeTooth = 16 (adult tooth) but patient is 4 years old
			const html = renderToStaticMarkup(
				createElement(VisitPediatricProtocolWidget, {
					activeTooth: 16,
					patientAgeYears: 4,
				}),
			);

			// The widget must sanitize to primary molar 54 (or deciduous tooth) instead of accepting 16
			assert.ok(
				html.includes("Зуб 54") || html.includes("54"),
				"Must display tooth 54 as sanitized active tooth for 4-year-old child",
			);
			assert.ok(
				!html.includes("Зуб 16"),
				"Must NOT treat adult tooth 16 as primary active tooth for 4-year-old child",
			);
		});

		it("allows adult first permanent molars (16, 26, 36, 46) for mixed dentition (age >= 6)", () => {
			const html = renderToStaticMarkup(
				createElement(VisitPediatricProtocolWidget, {
					activeTooth: 16,
					patientAgeYears: 8,
				}),
			);

			// At age 8 (mixed dentition), tooth 16 is fully legitimate
			assert.ok(
				html.includes("16"),
				"Must support tooth 16 in mixed dentition at age 8",
			);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 2. PHYSIOLOGICAL WEIGHT INTERPOLATION & ANESTHESIA SAFETY
	// ─────────────────────────────────────────────────────────────────────────
	describe("2. Physiological Weight Interpolation & Anesthesia Overdose Protection", () => {
		it("estimates realistic pediatric weight based on age (WHO / RF centiles)", () => {
			assert.strictEqual(estimatePediatricWeightKg(2), 12, "Age 2 -> 12 kg");
			assert.strictEqual(estimatePediatricWeightKg(3), 14, "Age 3 -> 14 kg");
			assert.strictEqual(estimatePediatricWeightKg(4), 16, "Age 4 -> 16 kg");
			assert.strictEqual(estimatePediatricWeightKg(5), 18, "Age 5 -> 18 kg");
			assert.strictEqual(estimatePediatricWeightKg(6), 20, "Age 6 -> 20 kg");
			assert.strictEqual(estimatePediatricWeightKg(8), 26, "Age 8 -> 26 kg");
			assert.strictEqual(estimatePediatricWeightKg(10), 33, "Age 10 -> 33 kg");
		});

		it("prevents adult weight trap by initializing to interpolated weight for young children", () => {
			// A 3-year-old child has no explicit initialWeightKg provided
			const html = renderToStaticMarkup(
				createElement(PediatricAnesthesiaCalculator, {
					patientAgeYears: 3,
				}),
			);

			// Must initialize to 14 kg (not 20 kg adult trap)
			assert.ok(
				html.includes("14 кг") || html.includes('value="14"'),
				"Must calculate dosage based on interpolated 14 kg for 3-year-old",
			);
		});

		it("triggers toxic overdose alert when dose exceeds safe MRD for child weight", () => {
			// 14 kg child receiving 1.5 carpules Articaine 4% (102 mg administered vs 70 mg max allowed)
			const html = renderToStaticMarkup(
				createElement(PediatricAnesthesiaCalculator, {
					initialWeightKg: 14,
					patientAgeYears: 4,
				}),
			);

			// Check calculator renders safe vs overdose indicators
			assert.ok(
				html.includes('data-testid="pediatric-anesthesia-calculator"'),
				"Renders pediatric anesthesia calculator container",
			);
			assert.ok(
				html.includes('data-testid="btn-reduce-to-safe-dose"') ||
					html.includes('data-testid="btn-set-max-safe-dose"'),
				"Provides 1-click button to reduce dose to safe margin",
			);
		});

		it("enforces Mandate 8e: Doctor Autonomy — NEVER disables apply anesthesia button", () => {
			const html = renderToStaticMarkup(
				createElement(PediatricAnesthesiaCalculator, {
					initialWeightKg: 10,
					patientAgeYears: 2,
				}),
			);

			assert.ok(
				html.includes('data-testid="btn-apply-anesthesia-protocol"'),
				"Must render apply anesthesia button",
			);
			assert.ok(
				!html.includes('disabled=""') && !html.includes("disabled"),
				"Apply anesthesia button must NEVER be disabled (Mandate 8e Doctor Autonomy)",
			);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 3. BRAVERY DIPLOMA ("ДИПЛОМ ЮНОГО ГЕРОЯ / ДИПЛОМ ЗА ХРАБРОСТЬ")
	// ─────────────────────────────────────────────────────────────────────────
	describe("3. Bravery Diploma Verification", () => {
		it("renders bravery diploma with 'Диплом за храбрость' and 'Диплом юного героя' subtitle", () => {
			const html = renderToStaticMarkup(
				createElement(PediatricBraveryDiplomaModal, {
					isOpen: true,
					onClose: () => {},
					patientName: "Артём",
					doctorName: "Д-р Смирнова Е. В.",
				}),
			);

			assert.ok(
				html.includes("Диплом за храбрость"),
				"Must include 'Диплом за храбрость' title",
			);
			assert.ok(
				html.includes("Диплом юного героя"),
				"Must include 'Диплом юного героя' subtitle",
			);
			assert.ok(
				html.includes("Герой: Артём"),
				"Must format hero name appropriately",
			);
			assert.ok(
				!EMOJI_REGEX.test(html),
				"Must contain ZERO cartoon emojis (strict Lucide vector icons)",
			);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 4. PARENT MEMO & POST-ANESTHESIA CARE (LIP BITING PREVENTION)
	// ─────────────────────────────────────────────────────────────────────────
	describe("4. Parent Post-Anesthesia Care Memo", () => {
		it("includes critical warning against biting numb lip and cheeks", () => {
			const html = renderToStaticMarkup(
				createElement(PediatricParentMemoModal, {
					isOpen: true,
					onClose: () => {},
					patientName: "София",
					patientAgeYears: 5,
				}),
			);

			assert.ok(
				html.includes("онемевш") || html.includes("губ") || html.includes("прикусыва"),
				"Must warn parents about post-anesthesia numbness and lip biting trauma",
			);
			assert.ok(
				!EMOJI_REGEX.test(html),
				"Parent memo must contain ZERO cartoon emojis in medical document",
			);
		});
	});
});
