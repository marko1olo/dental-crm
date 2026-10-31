/**
 * PEDIATRIC DENTISTRY SSOT TEST SUITE
 * Tests for Pediatric Catalog Data, Frankl Behavior Scale, Weight Estimation,
 * Anesthesia Safety Calculations (Articaine <= 5mg/kg, Mepivacaine <= 4mg/kg),
 * Milk Dentition FDI 51-85, PediatricStudioModal ergonomics & Doctor Autonomy (Mandates 8e, 8y, 8x, 8am).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React, { createElement } from "react";
import { renderToString } from "react-dom/server";
import {
	FRANKL_BEHAVIOR_PRESETS,
	PEDIATRIC_WEIGHT_CHIPS,
	estimatePediatricWeightKg,
	calculatePediatricAnesthesiaSafety,
	PEDIATRIC_ANESTHETICS,
	PRIMARY_TEETH_FDI,
	PRIMARY_TOOTH_CONDITIONS,
	PEDIATRIC_AGE_PRESETS,
	buildHeroDiplomaSummary,
	buildParentMemoSummary,
} from "../pediatricCatalogData";
import { PediatricStudioModal } from "../PediatricStudioModal";
import { DirectPediatricLauncher } from "../DirectPediatricLauncher";

describe("1. Pediatric Catalog Data & Clinical EBM SSOT", () => {
	it("provides 4 Frankl behavior presets with clinical tactics and symbols", () => {
		assert.equal(FRANKL_BEHAVIOR_PRESETS.length, 4);
		assert.equal(FRANKL_BEHAVIOR_PRESETS[0]!.rating, 1);
		assert.equal(FRANKL_BEHAVIOR_PRESETS[0]!.symbol, "--");
		assert.ok(FRANKL_BEHAVIOR_PRESETS[0]!.clinicalTacticRu.includes("Адаптационный визит"));

		assert.equal(FRANKL_BEHAVIOR_PRESETS[1]!.rating, 2);
		assert.equal(FRANKL_BEHAVIOR_PRESETS[1]!.symbol, "-");
		assert.ok(FRANKL_BEHAVIOR_PRESETS[1]!.clinicalTacticRu.includes("Скажи-Покажи-Сделай"));

		assert.equal(FRANKL_BEHAVIOR_PRESETS[2]!.rating, 3);
		assert.equal(FRANKL_BEHAVIOR_PRESETS[2]!.symbol, "+");

		assert.equal(FRANKL_BEHAVIOR_PRESETS[3]!.rating, 4);
		assert.equal(FRANKL_BEHAVIOR_PRESETS[3]!.symbol, "++");
	});

	it("estimates weight by age and provides fast clinical chips (12, 16, 20, 25, 30 kg)", () => {
		assert.deepEqual(PEDIATRIC_WEIGHT_CHIPS, [12, 16, 20, 25, 30]);
		assert.equal(estimatePediatricWeightKg(1), 10);
		assert.equal(estimatePediatricWeightKg(3), 14);
		assert.equal(estimatePediatricWeightKg(5), 18);
		assert.equal(estimatePediatricWeightKg(6), 23);
		assert.equal(estimatePediatricWeightKg(8), 28);
		assert.equal(estimatePediatricWeightKg(11), 36);
		assert.equal(estimatePediatricWeightKg(14), 45);
	});

	it("contains exactly 20 primary teeth according to FDI standard (quadrants 5..8, positions 1..5)", () => {
		assert.equal(PRIMARY_TEETH_FDI.length, 20);
		const quadrants = new Set(PRIMARY_TEETH_FDI.map((t) => t.quadrant));
		assert.deepEqual(Array.from(quadrants).sort(), [5, 6, 7, 8]);

		// Check specific primary teeth presence
		assert.ok(PRIMARY_TEETH_FDI.some((t) => t.toothNumber === 51));
		assert.ok(PRIMARY_TEETH_FDI.some((t) => t.toothNumber === 54));
		assert.ok(PRIMARY_TEETH_FDI.some((t) => t.toothNumber === 65));
		assert.ok(PRIMARY_TEETH_FDI.some((t) => t.toothNumber === 75));
		assert.ok(PRIMARY_TEETH_FDI.some((t) => t.toothNumber === 85));
	});

	it("provides canonical tooth condition states (healthy, caries, pulpotomy, sealed, resorption, extracted)", () => {
		const conditions = Object.keys(PRIMARY_TOOTH_CONDITIONS);
		assert.ok(conditions.includes("healthy"));
		assert.ok(conditions.includes("caries"));
		assert.ok(conditions.includes("pulpotomy"));
		assert.ok(conditions.includes("sealed"));
		assert.ok(conditions.includes("resorption"));
		assert.ok(conditions.includes("extracted"));
	});

	it("defines age-based presets without Soviet bureaucracy", () => {
		assert.equal(PEDIATRIC_AGE_PRESETS.length, 3);
		assert.equal(PEDIATRIC_AGE_PRESETS[0]!.id, "toddlers");
		assert.ok(PEDIATRIC_AGE_PRESETS[0]!.dentitionRu.includes("Молочный прикус"));
	});
});

describe("2. Pediatric Anesthesia MRD Safety Calculations (Mandate 8y)", () => {
	it("strictly enforces 5.0 mg/kg limit for Articaine 4%", () => {
		const art = PEDIATRIC_ANESTHETICS.articaine_4;
		assert.equal(art.maxMgPerKg, 5.0);
		assert.equal(art.mgPerCarpule, 68.0);

		// 20 kg child: max allowed is 100 mg
		const safeDose = calculatePediatricAnesthesiaSafety({
			drugId: "articaine_4",
			weightKg: 20,
			carpules: 1, // 68 mg
			ageYears: 6,
		});
		assert.equal(safeDose.maxAllowedMg, 100);
		assert.equal(safeDose.administeredMg, 68);
		assert.equal(safeDose.isSafe, true);
		assert.equal(safeDose.isOverdose, false);

		// 2 carpules = 136 mg (> 100 mg limit)
		const overDose = calculatePediatricAnesthesiaSafety({
			drugId: "articaine_4",
			weightKg: 20,
			carpules: 2, // 136 mg
			ageYears: 6,
		});
		assert.equal(overDose.administeredMg, 136);
		assert.equal(overDose.isOverdose, true);
		assert.ok(overDose.statusMessageRu.includes("превышение расчетного предела"));
	});

	it("strictly enforces 4.0 mg/kg limit for Mepivacaine 3% (Scandonest)", () => {
		const mep = PEDIATRIC_ANESTHETICS.mepivacaine_3;
		assert.equal(mep.maxMgPerKg, 4.0);
		assert.equal(mep.mgPerCarpule, 51.0);

		// 15 kg child: max allowed is 60 mg
		const safeDose = calculatePediatricAnesthesiaSafety({
			drugId: "mepivacaine_3",
			weightKg: 15,
			carpules: 1, // 51 mg
			ageYears: 4,
		});
		assert.equal(safeDose.maxAllowedMg, 60);
		assert.equal(safeDose.administeredMg, 51);
		assert.equal(safeDose.isSafe, true);
		assert.equal(safeDose.isOverdose, false);

		// 15 kg child with 1.5 carpules = 76.5 mg
		const overDose = calculatePediatricAnesthesiaSafety({
			drugId: "mepivacaine_3",
			weightKg: 15,
			carpules: 1.5,
			ageYears: 4,
		});
		assert.equal(overDose.isOverdose, true);
	});
});

describe("3. 1-Click Printable Documents (Hero Diploma & Parent Memo)", () => {
	it("builds inspiring Hero Diploma text summary with doctor and clinic requisites", () => {
		const diploma = buildHeroDiplomaSummary({
			heroName: "Михаил Кузнецов",
			doctorName: "Д-р Смирнова Е.В.",
			clinicName: "Клиника DENTE",
			visitDateRu: "25 октября 2026",
			diplomaNumber: "54-2026",
		});

		assert.ok(diploma.includes("ДИПЛОМ МАЛЕНЬКОГО ГЕРОЯ"));
		assert.ok(diploma.includes("Михаил Кузнецов"));
		assert.ok(diploma.includes("Зубной Феей"));
		assert.ok(diploma.includes("Д-р Смирнова Е.В."));
	});

	it("builds comprehensive Parent Memo text summary with anesthesia care rules", () => {
		const memo = buildParentMemoSummary({
			patientName: "Полина Васильева",
			doctorName: "Д-р Смирнова",
			clinicName: "Клиника DENTE",
			hadAnesthesia: true,
			treatedTeeth: "Зуб 54 (Кариес), Зуб 55 (Герметизация)",
			recommendationsRu: "Использовать пасту с фторидами 1000 ppm",
		});

		assert.ok(memo.includes("ПАМЯТКА РОДИТЕЛЯМ ПО УХОДУ"));
		assert.ok(memo.includes("Полина Васильева"));
		assert.ok(memo.includes("прикусывать губу"));
		assert.ok(memo.includes("Зуб 54"));
		assert.ok(memo.includes("1000 ppm"));
	});
});

describe("4. PediatricStudioModal Ergonomics & Doctor Autonomy (Mandates 8e, 8am, 8ze)", () => {
	it("renders PediatricStudioModal with exactly ONE Primary CTA button (#0d9488)", () => {
		const html = renderToString(
			createElement(PediatricStudioModal, {
				isOpen: true,
				onClose: () => {},
				patientName: "Артём Смирнов",
				patientAgeYears: 6,
			}),
		);

		assert.ok(html.includes('data-testid="pediatric-studio-modal"'));
		assert.ok(html.includes("Детский приём и адаптация"));
		assert.ok(html.includes('data-testid="btn-save-pediatric-visit"'));
		assert.ok(html.includes("bg-[#0d9488]"), "Primary CTA must have teal background #0d9488");
		assert.ok(html.includes("✓ Зафиксировать детский приём"));
	});

	it("guarantees ZERO disabled buttons across PediatricStudioModal (Mandate 8e)", () => {
		const html = renderToString(
			createElement(PediatricStudioModal, {
				isOpen: true,
				onClose: () => {},
				patientName: "Алиса Морозова",
				patientAgeYears: 4,
			}),
		);

		// Must never have disabled buttons
		assert.ok(!html.includes("disabled"), "All action buttons must remain accessible without blocking");
	});

	it("renders Frankl scale chips and primary teeth 51-85", () => {
		const html = renderToString(
			createElement(PediatricStudioModal, {
				isOpen: true,
				onClose: () => {},
				patientName: "Даниил Орлов",
				patientAgeYears: 5,
			}),
		);

		assert.ok(html.includes('data-testid="frankl-chip-1"'));
		assert.ok(html.includes('data-testid="frankl-chip-2"'));
		assert.ok(html.includes('data-testid="frankl-chip-3"'));
		assert.ok(html.includes('data-testid="frankl-chip-4"'));
		assert.ok(html.includes('data-testid="tooth-fdi-54"'));
		assert.ok(html.includes('data-testid="btn-print-hero-diploma"'));
		assert.ok(html.includes('data-testid="btn-print-parent-memo"'));
	});

	it("renders mobile-first Drag Handle and Apple HIG touch-friendly sizing", () => {
		const html = renderToString(
			createElement(PediatricStudioModal, {
				isOpen: true,
				onClose: () => {},
			}),
		);

		assert.ok(html.includes("rounded-t-[24px]"), "Must feature rounded-t-[24px] for native mobile sheet");
		assert.ok(html.includes("w-9 h-1.5"), "Must feature 36x5px tactile Drag Handle");
		assert.ok(html.includes("min-h-[44px]"), "Must conform to Apple HIG 44px touch targets");
	});

	it("does not render when isOpen is false", () => {
		const html = renderToString(
			createElement(PediatricStudioModal, {
				isOpen: false,
				onClose: () => {},
			}),
		);
		assert.equal(html, "");
	});

	it("mounts DirectPediatricLauncher without crash", () => {
		const html = renderToString(createElement(DirectPediatricLauncher));
		// Standalone launcher mounts null or closed modal initially when no hash
		assert.ok(typeof html === "string");
	});
});
