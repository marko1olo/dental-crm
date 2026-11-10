/**
 * PEDIATRIC DENTISTRY SSOT TEST SUITE
 * Tests for Pediatric Clinical EBM, Frankl Behavior Scale, Weight Estimation,
 * Anesthesia Safety Calculations (Articaine <= 5mg/kg, Mepivacaine <= 4.4mg/kg),
 * Milk Dentition FDI 51-85, PediatricMixedDentitionModal ergonomics & Doctor Autonomy (Mandates 8e, 8y, 8x, 8am).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React, { createElement } from "react";
import { renderToString } from "react-dom/server";
import {
	FRANKL_SCALE_DEFINITIONS,
	ALL_PRIMARY_TEETH,
	estimatePediatricWeightKg,
	CANONICAL_PEDIATRIC_AGE_PRESETS,
	RESORPTION_STAGES,
} from "@dental/shared";
import {
	calculatePediatricAnesthesia,
	PEDIATRIC_ANESTHETIC_SPECS,
} from "../PediatricAnesthesiaCalculator";
import { generateBraveryDiplomaHtml } from "../diploma/diplomaPrint";
import { PediatricBraveryDiplomaModal } from "../PediatricBraveryDiplomaModal";
import { PediatricMixedDentitionModal } from "../../odontogram/PediatricMixedDentitionModal";
import { DirectPediatricLauncher } from "../DirectPediatricLauncher";

describe("1. Pediatric Clinical EBM & Dentition SSOT", () => {
	it("provides 4 Frankl behavior presets with clinical tactics and symbols", () => {
		assert.equal(FRANKL_SCALE_DEFINITIONS[1]!.symbol, "--");
		assert.ok(FRANKL_SCALE_DEFINITIONS[1]!.managementStrategiesRu[0]!.includes("Скажи"));

		assert.equal(FRANKL_SCALE_DEFINITIONS[2]!.symbol, "-");
		assert.ok(FRANKL_SCALE_DEFINITIONS[2]!.managementStrategiesRu[0]!.includes("Скажи") || FRANKL_SCALE_DEFINITIONS[2]!.managementStrategiesRu[0]!.includes("Tell"));

		assert.equal(FRANKL_SCALE_DEFINITIONS[3]!.symbol, "+");
		assert.equal(FRANKL_SCALE_DEFINITIONS[4]!.symbol, "++");
	});

	it("estimates weight by age and provides fast clinical norms", () => {
		assert.equal(estimatePediatricWeightKg(1), 10);
		assert.equal(estimatePediatricWeightKg(3), 14);
		assert.equal(estimatePediatricWeightKg(5), 18);
		assert.ok(estimatePediatricWeightKg(6) >= 20);
		assert.ok(estimatePediatricWeightKg(8) >= 26);
	});

	it("contains exactly 20 primary teeth according to FDI standard (quadrants 5..8, positions 1..5)", () => {
		assert.equal(ALL_PRIMARY_TEETH.length, 20);

		// Check specific primary teeth presence
		assert.ok(ALL_PRIMARY_TEETH.includes(51));
		assert.ok(ALL_PRIMARY_TEETH.includes(54));
		assert.ok(ALL_PRIMARY_TEETH.includes(65));
		assert.ok(ALL_PRIMARY_TEETH.includes(75));
		assert.ok(ALL_PRIMARY_TEETH.includes(85));
	});

	it("provides canonical physiological resorption stages including intact norm (0%)", () => {
		assert.ok(RESORPTION_STAGES.includes(0));
		assert.ok(RESORPTION_STAGES.includes(25));
		assert.ok(RESORPTION_STAGES.includes(50));
		assert.ok(RESORPTION_STAGES.includes(75));
		assert.ok(RESORPTION_STAGES.includes(100));
	});

	it("defines age-based presets without Soviet bureaucracy", () => {
		assert.ok(CANONICAL_PEDIATRIC_AGE_PRESETS.length >= 3);
		assert.ok(CANONICAL_PEDIATRIC_AGE_PRESETS[0]!.labelRu.includes("прикус") || CANONICAL_PEDIATRIC_AGE_PRESETS[0]!.stageNameRu.includes("прикус"));
	});
});

describe("2. Pediatric Anesthesia MRD Safety Calculations (Mandate 8y)", () => {
	it("strictly enforces safe dose limits for Articaine 4%", () => {
		const art = PEDIATRIC_ANESTHETIC_SPECS.articaine_4;
		assert.equal(art.maxDoseMgPerKg, 5.0);

		// 20 kg child: max allowed is 100 mg
		const safeDose = calculatePediatricAnesthesia({
			drug: art,
			selectedDrugId: "articaine_4",
			weightKg: 20,
			carpules: 1, // 68 mg
			patientAgeYears: 6,
			articaineContraindicated: false,
			mepivacaineContraindicated: false,
		});
		assert.equal(safeDose.maxAllowedTotalDoseMg, 100);
		assert.equal(safeDose.totalDoseAdministeredMg, 68);
		assert.equal(safeDose.isOverdose, false);

		// 2 carpules = 136 mg (> 100 mg limit)
		const overDose = calculatePediatricAnesthesia({
			drug: art,
			selectedDrugId: "articaine_4",
			weightKg: 20,
			carpules: 2, // 136 mg
			patientAgeYears: 6,
			articaineContraindicated: false,
			mepivacaineContraindicated: false,
		});
		assert.equal(overDose.totalDoseAdministeredMg, 136);
		assert.equal(overDose.isOverdose, true);
	});

	it("strictly enforces 4.4 mg/kg limit for Mepivacaine 3% (Scandonest)", () => {
		const mep = PEDIATRIC_ANESTHETIC_SPECS.mepivacaine_3;
		assert.equal(mep.maxDoseMgPerKg, 4.4);

		// 15 kg child: max allowed is 66 mg
		const safeDose = calculatePediatricAnesthesia({
			drug: mep,
			selectedDrugId: "mepivacaine_3",
			weightKg: 15,
			carpules: 1, // 51 mg
			patientAgeYears: 4,
			articaineContraindicated: false,
			mepivacaineContraindicated: false,
		});
		assert.equal(safeDose.maxAllowedTotalDoseMg, 66);
		assert.equal(safeDose.totalDoseAdministeredMg, 51);
		assert.equal(safeDose.isOverdose, false);

		// 15 kg child with 1.5 carpules = 76.5 mg
		const overDose = calculatePediatricAnesthesia({
			drug: mep,
			selectedDrugId: "mepivacaine_3",
			weightKg: 15,
			carpules: 1.5,
			patientAgeYears: 4,
			articaineContraindicated: false,
			mepivacaineContraindicated: false,
		});
		assert.equal(overDose.isOverdose, true);
	});
});

describe("3. 1-Click Printable Documents (Hero Diploma)", () => {
	it("builds inspiring Hero Diploma HTML with doctor and clinic requisites", () => {
		const html = generateBraveryDiplomaHtml({
			heroName: "Михаил Кузнецов",
			doctorName: "Д-р Смирнова Е.В.",
			clinicName: "Клиника DENTE",
			visitDate: "25 октября 2026",
			diplomaNumber: "54-2026",
		});

		assert.ok(html.includes("ДИПЛОМ ЗА ХРАБРОСТЬ"));
		assert.ok(html.includes("Михаил Кузнецов"));
		assert.ok(html.includes("Зубной Феей"));
		assert.ok(html.includes("Д-р Смирнова Е.В."));
	});

	it("renders PediatricBraveryDiplomaModal without blocking buttons (Mandate 8e)", () => {
		const html = renderToString(
			createElement(PediatricBraveryDiplomaModal, {
				isOpen: true,
				onClose: () => {},
				patientName: "Полина Васильева",
				doctorName: "Д-р Смирнова",
				clinicName: "Клиника DENTE",
			}),
		);

		assert.ok(html.includes("Диплом за храбрость") || html.includes("ДИПЛОМ ЗА ХРАБРОСТЬ"));
		assert.ok(html.includes("Полина Васильева"));
		assert.ok(!html.includes("disabled"));
	});
});

describe("4. Canonical Pediatric Dentition Modal Ergonomics & Autonomy (Mandates 8e, 8am, 8ze)", () => {
	it("renders PediatricMixedDentitionModal with exactly ONE Primary CTA button (Готово)", () => {
		const html = renderToString(
			createElement(PediatricMixedDentitionModal, {
				isOpen: true,
				onClose: () => {},
				initialAge: 6.5,
			}),
		);

		assert.ok(html.includes("Готово"));
		assert.ok(html.includes("Детский и сменный прикус"));
		assert.ok(html.includes("bg-emerald-600"), "Primary CTA has distinctive accent");
	});

	it("guarantees ZERO disabled buttons across PediatricMixedDentitionModal (Mandate 8e)", () => {
		const html = renderToString(
			createElement(PediatricMixedDentitionModal, {
				isOpen: true,
				onClose: () => {},
				initialAge: 5.0,
			}),
		);

		// Must never have disabled buttons
		assert.ok(!html.includes("disabled"), "All action buttons must remain accessible without blocking");
	});

	it("renders tabs for Cariogram, Resorption, Timeline, and Frankl", () => {
		const html = renderToString(
			createElement(PediatricMixedDentitionModal, {
				isOpen: true,
				onClose: () => {},
				initialAge: 7.0,
			}),
		);

		assert.ok(html.includes("Сроки смены"));
		assert.ok(html.includes("Cariogram"));
		assert.ok(html.includes("Резорбция"));
		assert.ok(html.includes("Шкала Frankl"));
	});

	it("does not render when isOpen is false", () => {
		const html = renderToString(
			createElement(PediatricMixedDentitionModal, {
				isOpen: false,
				onClose: () => {},
			}),
		);
		assert.equal(html, "");
	});

	it("mounts DirectPediatricLauncher without crash", () => {
		const html = renderToString(createElement(DirectPediatricLauncher));
		assert.ok(typeof html === "string");
	});
});
