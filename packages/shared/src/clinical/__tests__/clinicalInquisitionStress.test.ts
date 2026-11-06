/**
 * packages/shared/src/clinical/__tests__/clinicalInquisitionStress.test.ts
 *
 * DENTE Dental CRM — Senior Red Team Clinical & Domain Stress Test Inquisition Suite.
 *
 * Invariants & Standards:
 * - 100% defect presumption & zero trust for domain calculations.
 * - ISO 3950 / FDI Dental Formula strict boundary validation (11..48, 51..85).
 * - Wheeler 2.5D Dental Anatomy geometry & mobile viewport constraint (300px <= 320px).
 * - Pediatric mixed dentition arch resolution (replacement of deciduous by permanent).
 * - Chairside voice speech & shorthand parsing (MOD surfaces, multi-tooth lists, prefix syntax).
 * - Strict financial kopeck integrity & Mandate 8e (100% doctor discount zero-cost acts).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	ALL_FDI_TEETH,
	PERMANENT_TEETH,
	DECIDUOUS_TEETH,
	isValidFdiToothNumber,
	assertValidFdiToothNumber,
	isPermanentTooth,
	isDeciduousTooth,
	isMaxillaryTooth,
	isMandibularTooth,
	isPatientLeftSide,
	getQuadrantForTooth,
	getWheelerToothClass,
	getWheelerCellWidthPx,
	calculateFrontalGroupWidthPx,
	WHEELER_CELL_WIDTHS_PX,
	WHEELER_TOOTH_WIDTHS_MM,
	getToothDentitionType,
	resolveMixedDentitionArch,
	MIXED_TOP_TEETH,
	MIXED_BOTTOM_TEETH,
	normalizeFdiToothList,
} from "../dentalFormulaFdi.js";

import {
	parseDentalFormulaShorthand,
	resolveTeethRange,
	resolveSafeSanitationTargets,
	isSurgicalOrProstheticState,
} from "../dentalFormulaTextParser.js";

import {
	normalizeCanonicalSurfaces,
	normalizeCanonicalSurface,
	formatSurfacesRu,
} from "../dentalFormulaSurfaces.js";

import {
	validateAndBalanceSplitPayment,
	balanceSplitTenderRemainder,
	allocateSplitPaymentAcrossItems,
	SplitPaymentValidationError,
	type SplitPaymentPositionItem,
} from "../../billing/splitPayment.js";

describe("Senior Red Team Clinical Logic Inquisition Suite (@dental/shared)", () => {
	// ========================================================================
	// SECTION 1: FDI DENTAL FORMULA (ISO 3950) BOUNDARY INQUISITION
	// ========================================================================
	describe("1. FDI Tooth Number Strict Boundary Inquisition", () => {
		it("accepts all 32 permanent and 20 deciduous teeth without exception", () => {
			assert.equal(ALL_FDI_TEETH.length, 52);
			assert.equal(PERMANENT_TEETH.length, 32);
			assert.equal(DECIDUOUS_TEETH.length, 20);

			for (const tooth of ALL_FDI_TEETH) {
				assert.equal(isValidFdiToothNumber(tooth), true, `Tooth ${tooth} should be valid FDI`);
				assert.doesNotThrow(() => assertValidFdiToothNumber(tooth));
			}
		});

		it("strictly rejects non-existent quadrant numbers and surrogate teeth", () => {
			const invalidTeeth = [
				0, -1, -48, 9, 10, 19, 20, 29, 30, 39, 40, 49, 50,
				56, 57, 58, 59, 60, 66, 67, 68, 69, 70, 76, 77, 78, 79, 80,
				86, 87, 88, 89, 90, 91, 99, 100, 111,
			];

			for (const tooth of invalidTeeth) {
				assert.equal(isValidFdiToothNumber(tooth), false, `Tooth ${tooth} MUST be rejected`);
				assert.throws(
					() => assertValidFdiToothNumber(tooth),
					/Некорректный номер зуба по стандарту FDI/,
				);
			}
		});

		it("strictly rejects non-integer, float, NaN, and non-numeric inputs", () => {
			const dirtyInputs = [
				16.5, 21.1, 36.0001, NaN, Infinity, -Infinity,
				"16", null, undefined, {}, [], [16], true, false, Symbol("16"),
			];

			for (const input of dirtyInputs) {
				assert.equal(isValidFdiToothNumber(input), false, `Input ${String(input)} MUST be rejected`);
				assert.throws(
					() => assertValidFdiToothNumber(input),
					/Некорректный номер зуба по стандарту FDI/,
				);
			}
		});

		it("preserves anatomical side and jaw orientation without false positives on invalid inputs", () => {
			// Maxillary vs Mandibular
			assert.equal(isMaxillaryTooth(16), true);
			assert.equal(isMaxillaryTooth(21), true);
			assert.equal(isMaxillaryTooth(55), true);
			assert.equal(isMaxillaryTooth(63), true);
			assert.equal(isMaxillaryTooth(36), false);
			assert.equal(isMaxillaryTooth(46), false);
			assert.equal(isMaxillaryTooth(75), false);
			assert.equal(isMaxillaryTooth(85), false);
			assert.equal(isMaxillaryTooth(99), false, "Surrogate tooth 99 must not be maxillary");

			assert.equal(isMandibularTooth(36), true);
			assert.equal(isMandibularTooth(46), true);
			assert.equal(isMandibularTooth(75), true);
			assert.equal(isMandibularTooth(85), true);
			assert.equal(isMandibularTooth(16), false);
			assert.equal(isMandibularTooth(21), false);
			assert.equal(isMandibularTooth(99), false, "Surrogate tooth 99 must not be mandibular");

			// Patient Left (Quadrants 2, 3, 6, 7) vs Patient Right (Quadrants 1, 4, 5, 8)
			assert.equal(isPatientLeftSide(21), true);
			assert.equal(isPatientLeftSide(26), true);
			assert.equal(isPatientLeftSide(36), true);
			assert.equal(isPatientLeftSide(65), true);
			assert.equal(isPatientLeftSide(75), true);
			assert.equal(isPatientLeftSide(11), false);
			assert.equal(isPatientLeftSide(46), false);
			assert.equal(isPatientLeftSide(55), false);
			assert.equal(isPatientLeftSide(85), false);
			assert.equal(isPatientLeftSide(99), false, "Surrogate tooth 99 must not be left side");

			// Quadrants 1..8
			assert.equal(getQuadrantForTooth(16), 1);
			assert.equal(getQuadrantForTooth(25), 2);
			assert.equal(getQuadrantForTooth(36), 3);
			assert.equal(getQuadrantForTooth(47), 4);
			assert.equal(getQuadrantForTooth(55), 5);
			assert.equal(getQuadrantForTooth(64), 6);
			assert.equal(getQuadrantForTooth(73), 7);
			assert.equal(getQuadrantForTooth(82), 8);
		});

		it("sorts and deduplicates messy FDI tooth input lists in clinical sequence", () => {
			const messy = "36, 16, 21, 11, 46, 26, 16, 99, -5, foo, 48, 18";
			const sorted = normalizeFdiToothList(messy);
			// Expected sequence: Quad 1 (18->11), Quad 2 (21->26), Quad 3 (36), Quad 4 (46, 48)
			assert.equal(sorted, "18, 16, 11, 21, 26, 36, 46, 48");
		});
	});

	// ========================================================================
	// SECTION 2: WHEELER DENTAL ANATOMY GEOMETRY & MOBILE VIEWPORT SSOT
	// ========================================================================
	describe("2. Wheeler Dental Anatomy & Mobile Viewport Geometry (Mandate 8ar)", () => {
		it("accurately classifies teeth by anatomical Wheeler class (Incisor, Canine, Premolar, Molar)", () => {
			// Adult Incisors
			for (const t of [11, 12, 21, 22, 31, 32, 41, 42]) {
				assert.equal(getWheelerToothClass(t), "incisor", `Tooth ${t} must be incisor`);
			}
			// Adult Canines
			for (const t of [13, 23, 33, 43]) {
				assert.equal(getWheelerToothClass(t), "canine", `Tooth ${t} must be canine`);
			}
			// Adult Premolars
			for (const t of [14, 15, 24, 25, 34, 35, 44, 45]) {
				assert.equal(getWheelerToothClass(t), "premolar", `Tooth ${t} must be premolar`);
			}
			// Adult Molars
			for (const t of [16, 17, 18, 26, 27, 28, 36, 37, 38, 46, 47, 48]) {
				assert.equal(getWheelerToothClass(t), "molar", `Tooth ${t} must be molar`);
			}

			// Pediatric Incisors & Canines
			for (const t of [51, 52, 61, 62, 71, 72, 81, 82]) {
				assert.equal(getWheelerToothClass(t), "incisor", `Pediatric ${t} must be incisor`);
			}
			for (const t of [53, 63, 73, 83]) {
				assert.equal(getWheelerToothClass(t), "canine", `Pediatric ${t} must be canine`);
			}
			// Primary 4 and 5 are DECIDUOUS MOLARS (pediatric dentition has NO premolars!)
			for (const t of [54, 55, 64, 65, 74, 75, 84, 85]) {
				assert.equal(getWheelerToothClass(t), "molar", `Pediatric ${t} must be molar`);
			}
		});

		it("enforces canonical cell widths (44/48, 50/54, 56/60, 64/68 px)", () => {
			assert.deepEqual(WHEELER_CELL_WIDTHS_PX.incisor, { compact: 44, standard: 48 });
			assert.deepEqual(WHEELER_CELL_WIDTHS_PX.canine, { compact: 50, standard: 54 });
			assert.deepEqual(WHEELER_CELL_WIDTHS_PX.premolar, { compact: 56, standard: 60 });
			assert.deepEqual(WHEELER_CELL_WIDTHS_PX.molar, { compact: 64, standard: 68 });

			assert.equal(getWheelerCellWidthPx(11, "standard"), 48);
			assert.equal(getWheelerCellWidthPx(11, "compact"), 44);
			assert.equal(getWheelerCellWidthPx(13, "standard"), 54);
			assert.equal(getWheelerCellWidthPx(14, "standard"), 60);
			assert.equal(getWheelerCellWidthPx(16, "standard"), 68);
		});

		it("proves that lower frontal group (43..33) fits inside iPhone 390px (300px <= 320px safe area)", () => {
			const frontalTeeth = [43, 42, 41, 31, 32, 33];
			const standardWidth = calculateFrontalGroupWidthPx(frontalTeeth, "standard");
			const compactWidth = calculateFrontalGroupWidthPx(frontalTeeth, "compact");

			// Standard: 54 + 48 + 48 + 48 + 48 + 54 = 300px
			assert.equal(standardWidth, 300);
			// Compact: 50 + 44 + 44 + 44 + 44 + 50 = 276px
			assert.equal(compactWidth, 276);

			// Strict Apple HIG constraint: screen width 390px minus 2x16px side padding = 358px usable
			// Both 300px and 276px are strictly <= 358px -> 0px horizontal drift!
			assert.ok(standardWidth <= 358);
			assert.ok(compactWidth <= 358);
		});

		it("provides validated anatomical ranges in millimeters (Wheeler Dental Anatomy)", () => {
			assert.ok(WHEELER_TOOTH_WIDTHS_MM.incisor.min >= 5.0);
			assert.ok(WHEELER_TOOTH_WIDTHS_MM.incisor.max <= 8.5);
			assert.ok(WHEELER_TOOTH_WIDTHS_MM.molar.min >= 9.5);
			assert.ok(WHEELER_TOOTH_WIDTHS_MM.molar.max <= 11.0);
		});
	});

	// ========================================================================
	// SECTION 3: PEDIATRIC & MIXED DENTITION ARCH RESOLUTION
	// ========================================================================
	describe("3. Pediatric & Mixed Dentition Eruption Dynamics", () => {
		it("classifies dentition type and throws on illegal FDI numbers", () => {
			assert.equal(getToothDentitionType(16), "permanent");
			assert.equal(getToothDentitionType(55), "deciduous");
			assert.throws(() => getToothDentitionType(99), /Invalid FDI tooth number/);
		});

		it("dynamically replaces primary incisors with erupted permanent incisors", () => {
			const baseArch = MIXED_TOP_TEETH; // [16, 55, 54, 53, 52, 51, 61, 62, 63, 64, 65, 26]

			// Case 1: No permanent incisors erupted yet -> arch remains pure deciduous base
			const archUnchanged = resolveMixedDentitionArch(baseArch, [16, 26]);
			assert.deepEqual(archUnchanged, [16, 55, 54, 53, 52, 51, 61, 62, 63, 64, 65, 26]);

			// Case 2: Central permanent incisors (11, 21) erupted
			const archCentrals = resolveMixedDentitionArch(baseArch, [16, 26, 11, 21]);
			assert.deepEqual(archCentrals, [16, 55, 54, 53, 52, 11, 21, 62, 63, 64, 65, 26]);

			// Case 3: All 4 incisors (12, 11, 21, 22) erupted
			const archAllIncisors = resolveMixedDentitionArch(baseArch, [16, 26, 11, 12, 21, 22]);
			assert.deepEqual(archAllIncisors, [16, 55, 54, 53, 12, 11, 21, 22, 63, 64, 65, 26]);
		});

		it("dynamically replaces primary molars and canines with premolars and permanent canines", () => {
			const baseLowerArch = MIXED_BOTTOM_TEETH; // [46, 85, 84, 83, 82, 81, 71, 72, 73, 74, 75, 36]

			// Adolescent child with lower premolars 44 and 34 erupted
			const archPremolars = resolveMixedDentitionArch(baseLowerArch, [46, 36, 44, 34]);
			assert.ok(archPremolars.includes(44));
			assert.ok(archPremolars.includes(34));
			assert.ok(!archPremolars.includes(84));
			assert.ok(!archPremolars.includes(74));
		});
	});

	// ========================================================================
	// SECTION 4: CLINICAL VOICE SHORTHAND PARSER INQUISITION
	// ========================================================================
	describe("4. Clinical Voice Shorthand & Dictation Parser Inquisition", () => {
		it("extracts multi-surface MOD and proximal qualifiers accurately", () => {
			// "16 МОД кариес, 24 ДО пломба, 36 оккл кариес"
			const res = parseDentalFormulaShorthand("16 МОД кариес, 24 ДО пломба, 36 оккл кариес");
			assert.equal(res.hasMatches, true);
			assert.equal(res.items.length, 3);

			const item16 = res.items.find((i) => i.toothNumber === 16);
			assert.ok(item16);
			assert.equal(item16.state, "Caries");
			assert.ok(item16.surfaces?.includes("M"));
			assert.ok(item16.surfaces?.includes("O"));
			assert.ok(item16.surfaces?.includes("D"));

			const item24 = res.items.find((i) => i.toothNumber === 24);
			assert.ok(item24);
			assert.equal(item24.state, "Filled");
			assert.ok(item24.surfaces?.includes("D"));
			assert.ok(item24.surfaces?.includes("O"));

			const item36 = res.items.find((i) => i.toothNumber === 36);
			assert.ok(item36);
			assert.equal(item36.state, "Caries");
			assert.ok(item36.surfaces?.includes("O"));
		});

		it("parses combined compound tokens with surfaces (16модк, 25доп)", () => {
			const res = parseDentalFormulaShorthand("16модк 25доп");
			assert.equal(res.items.length, 2);

			const item16 = res.items.find((i) => i.toothNumber === 16);
			assert.equal(item16?.state, "Caries");
			assert.ok(item16?.surfaces?.includes("M"));
			assert.ok(item16?.surfaces?.includes("O"));
			assert.ok(item16?.surfaces?.includes("D"));

			const item25 = res.items.find((i) => i.toothNumber === 25);
			assert.equal(item25?.state, "Filled");
			assert.ok(item25?.surfaces?.includes("D"));
			assert.ok(item25?.surfaces?.includes("O"));
		});

		it("fulfills the docstring promise: parses multiple wisdom teeth with shared status (18, 28, 38, 48 о)", () => {
			const res = parseDentalFormulaShorthand("18, 28, 38, 48 о");
			assert.equal(res.hasMatches, true);
			assert.equal(res.items.length, 4);

			for (const t of [18, 28, 38, 48]) {
				const item = res.items.find((i) => i.toothNumber === t);
				assert.ok(item, `Tooth ${t} must be parsed`);
				assert.equal(item.state, "Missing");
			}
			assert.equal(res.unrecognized.length, 0);
		});

		it("handles natural Russian chairside speech: skips filler words ('зуб 16 кариес, зуб 46 пульпит')", () => {
			const res = parseDentalFormulaShorthand("зуб 16 кариес, зуб 46 пульпит");
			assert.equal(res.items.length, 2);
			assert.equal(res.items.find((i) => i.toothNumber === 16)?.state, "Caries");
			assert.equal(res.items.find((i) => i.toothNumber === 46)?.state, "Pulpitis");
			assert.equal(res.unrecognized.length, 0);
		});

		it("parses prefix dictation pattern ('кариес 16, 26, 36')", () => {
			const res = parseDentalFormulaShorthand("кариес 16, 26, 36");
			assert.equal(res.items.length, 3);
			assert.equal(res.items.find((i) => i.toothNumber === 16)?.state, "Caries");
			assert.equal(res.items.find((i) => i.toothNumber === 26)?.state, "Caries");
			assert.equal(res.items.find((i) => i.toothNumber === 36)?.state, "Caries");
		});

		it("correctly routes illegal FDI numbers to unrecognized without breaking legal ones", () => {
			const res = parseDentalFormulaShorthand("16к 99к 00п 25п 19о");
			assert.equal(res.items.length, 2);
			assert.equal(res.items.find((i) => i.toothNumber === 16)?.state, "Caries");
			assert.equal(res.items.find((i) => i.toothNumber === 25)?.state, "Filled");

			assert.ok(res.unrecognized.includes("99к"));
			assert.ok(res.unrecognized.includes("00п"));
			assert.ok(res.unrecognized.includes("19о"));
		});

		it("gracefully handles empty strings, null, and pure whitespace", () => {
			const emptyRes = parseDentalFormulaShorthand("");
			assert.equal(emptyRes.hasMatches, false);
			assert.equal(emptyRes.items.length, 0);
			assert.equal(emptyRes.summaryRu, "Пустой ввод");

			const wsRes = parseDentalFormulaShorthand("   \t\n  ");
			assert.equal(wsRes.hasMatches, false);
			assert.equal(wsRes.items.length, 0);
		});
	});

	// ========================================================================
	// SECTION 5: FINANCIAL ACID & KOPECK INTEGRITY (MANDATE 8e)
	// ========================================================================
	describe("5. Financial ACID & Strict Kopeck Integrity (Mandate 8e)", () => {
		it("Mandate 8e: allows 100% doctor discount zero-cost acts (0 kopecks) without throwing", () => {
			// Warranty revision or 100% goodwill discount
			const result = validateAndBalanceSplitPayment({
				actTotalKopecks: 0,
				tenders: {},
			});

			assert.equal(result.isBalanced, true);
			assert.equal(result.status, "exact");
			assert.equal(result.actTotalKopecks, 0);
			assert.equal(result.totalTendersKopecks, 0);
			assert.equal(result.discrepancyKopecks, 0);
			assert.equal(result.errorMessage, undefined);
		});

		it("strictly rejects negative act totals and negative tender amounts", () => {
			assert.throws(
				() => validateAndBalanceSplitPayment({
					actTotalKopecks: -100,
					tenders: {},
				}),
				(err: unknown) => {
					assert.ok(err instanceof SplitPaymentValidationError);
					assert.equal(err.code, "InvalidActTotal");
					return true;
				},
			);

			assert.throws(
				() => validateAndBalanceSplitPayment({
					actTotalKopecks: 500000,
					tenders: { cashKopecks: -50000 },
				}),
				(err: unknown) => {
					assert.ok(err instanceof SplitPaymentValidationError);
					assert.equal(err.code, "NegativeTenderAmount");
					return true;
				},
			);
		});

		it("Hamilton-Hare line-item distribution loses 0 kopecks on non-divisible odd amounts", () => {
			// Act total: 10,000.01 ₽ (1,000,001 kopecks) across 3 identical positions
			const positions: SplitPaymentPositionItem[] = [
				{ id: "p1", name: "Услуга 1", quantity: 1, priceKopecks: 333333, priceRub: 3333.33 },
				{ id: "p2", name: "Услуга 2", quantity: 1, priceKopecks: 333334, priceRub: 3333.34 },
				{ id: "p3", name: "Услуга 3", quantity: 1, priceKopecks: 333334, priceRub: 3333.34 },
			];
			const grandKopecks = 333333 + 333334 + 333334; // 1,000,001 kopecks

			const val = validateAndBalanceSplitPayment({
				actTotalKopecks: grandKopecks,
				tenders: {
					cashKopecks: 400000,
					cardKopecks: 600001,
				},
			});

			assert.equal(val.isBalanced, true);

			const allocated = allocateSplitPaymentAcrossItems(positions, val);
			assert.equal(allocated.length, 3);

			const sumCash = allocated.reduce((s, a) => s + a.cashKopecks, 0);
			const sumCard = allocated.reduce((s, a) => s + a.cardKopecks, 0);

			// EXACT 0-drift guarantee
			assert.equal(sumCash, 400000);
			assert.equal(sumCard, 600001);
			assert.equal(sumCash + sumCard, 1000001);
		});

		it("1-click remainder balancer solves exact remainder down to 1 kopeck", () => {
			const actTotalKopecks = 777777; // 7,777.77 ₽
			const balanced = balanceSplitTenderRemainder({
				actTotalKopecks,
				currentTenders: { cashKopecks: 200000 },
				targetKind: "card",
			});

			assert.equal(balanced.cashKopecks, 200000);
			assert.equal(balanced.cardKopecks, 577777); // 5,777.77 ₽ exactly

			const val = validateAndBalanceSplitPayment({
				actTotalKopecks,
				tenders: balanced,
			});
			assert.equal(val.isBalanced, true);
			assert.equal(val.discrepancyKopecks, 0);
		});
	});
});
