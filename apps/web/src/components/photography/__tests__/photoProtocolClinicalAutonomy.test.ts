/**
 * Dental Photography, Calibration & VITA Shade Purity Suite
 * 
 * Verifies:
 * 1. Mandate 8e (Doctor Autonomy):
 *    - 0 disabled buttons across all photography components.
 *    - 1-click clinical presets for standard 12-shot and 8-shot protocols.
 *    - Occlusal upper and occlusal lower are both present in 12-shot and 8-shot protocols.
 * 2. Mandate 8d pt 7 (Zero Cartoon Emojis):
 *    - Eradication of cartoon emojis from buttons, overlays, and labels.
 * 3. Mandate 8k (Anti-Simulator Law):
 *    - Rapid clinical before/after comparison and patient presentation without academic diorama physics.
 * 4. VITA Shade Engine Purity:
 *    - VITA Classical (A1-D4, BL1-BL4).
 *    - VITA 3D-Master (Groups 0..5, 29 shades).
 *    - Bleach OM1-OM3 (Latin letter O) and 0M1-0M3 (Digit 0).
 *    - Cyrillic homoglyphs normalization (А->A, В->B, С->C, ОМ->0M).
 *    - Zero NaN, zero undefined values in Delta E, Delta L, Delta C, Delta H.
 *    - Nullish and empty input resilience without crashes.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const photographyDir = fs.existsSync(path.resolve(process.cwd(), "apps/web/src/components/photography"))
	? path.resolve(process.cwd(), "apps/web/src/components/photography")
	: path.resolve(__dirname, "..");

import {
	STANDARD_12_SLOT_PROTOCOL,
	STANDARD_8_SLOT_PROTOCOL,
	AESTHETIC_8_SLOT_PROTOCOL,
	EXPRESS_6_SLOT_PROTOCOL,
	MINIMAL_3_SLOT_PROTOCOL,
	CLINICAL_PROTOCOLS_REGISTRY,
	getPresetById,
	getSlotDefinitionById,
} from "../photoGridPresets";
import {
	getVitaShadeByCode,
	normalizeVitaShadeCode,
	calculateShadeDelta,
	colorDistanceDeltaE2000,
	colorDistanceDeltaE76,
	VITA_CLASSICAL_SHADES,
	VITA_3D_MASTER_SHADES,
	ALL_VITA_SHADES,
} from "../vitaShadesCatalog";
import {
	createVitaPhysicalTabReference,
	getShadeHueGroup,
	calculateSplitClipPath,
	calculateSimilarityTransform,
	calculateWiperWheelDelta,
	calculateKeyboardWiperDelta,
} from "../photoProtocolMath";

describe("Dental Photography, Calibration & VITA Shade Purity (Mandates 8e, 8k, 8d)", () => {
	describe("1. Doctor Autonomy (Mandate 8e) & 0 Disabled Buttons", () => {
		it("proves 0 disabled buttons across all photography component source files", () => {
			const targetComponentFiles = [
				"BeforeAfterComparisonView.tsx",
				"ClinicalPhotoProtocolModal.tsx",
				"PhotoCalibrationDrawer.tsx",
				"PhotoSlotCard.tsx",
				"VitaShadeSelector.tsx",
				"PhotoCollageExportSheet.tsx",
				"IncisalAlignmentGuideOverlay.tsx",
			];

			for (const file of targetComponentFiles) {
				const fullPath = path.join(photographyDir, file);
				assert.ok(fs.existsSync(fullPath), `Target file must exist: ${file}`);
				const content = fs.readFileSync(fullPath, "utf8");

				// Search for disabled attribute in JSX buttons or controls
				const disabledMatches = content.match(/<button[^>]*\bdisabled\b[^>]*>/gi);
				assert.equal(
					disabledMatches,
					null,
					`Found prohibited disabled button in ${file}: ${JSON.stringify(disabledMatches)}`
				);

				// Also ensure no disabled={...} in any element
				const disabledPropMatches = content.match(/\bdisabled\s*=\s*\{[^}]+\}/gi);
				assert.equal(
					disabledPropMatches,
					null,
					`Found prohibited disabled prop in ${file}: ${JSON.stringify(disabledPropMatches)}`
				);
			}
		});

		it("verifies standard 12-shot clinical protocol contains facial, smile, retracted frontal, and occlusal upper/lower", () => {
			assert.equal(STANDARD_12_SLOT_PROTOCOL.totalSlots, 12);
			const slotIds = STANDARD_12_SLOT_PROTOCOL.slots.map((s) => s.id);

			// Facial & smile
			assert.ok(slotIds.includes("portrait_rest"), "12-shot must include portrait rest (facial)");
			assert.ok(slotIds.includes("portrait_smile"), "12-shot must include portrait smile");
			assert.ok(slotIds.includes("portrait_smile_wide"), "12-shot must include wide smile");
			assert.ok(slotIds.includes("profile_90_smile"), "12-shot must include profile smile");

			// Retracted frontal occlusion
			assert.ok(slotIds.includes("intraoral_frontal_occlusion"), "12-shot must include retracted frontal occlusion");

			// Occlusal upper AND lower
			assert.ok(slotIds.includes("intraoral_maxillary_occlusal"), "12-shot must include maxillary occlusal (upper)");
			assert.ok(slotIds.includes("intraoral_mandibular_occlusal"), "12-shot must include mandibular occlusal (lower)");

			// Lateral buccals
			assert.ok(slotIds.includes("intraoral_right_buccal"), "12-shot must include right buccal");
			assert.ok(slotIds.includes("intraoral_left_buccal"), "12-shot must include left buccal");
		});

		it("verifies standard 8-shot clinical protocol contains facial, smile, retracted frontal, and occlusal upper/lower", () => {
			assert.equal(STANDARD_8_SLOT_PROTOCOL.totalSlots, 8);
			assert.equal(AESTHETIC_8_SLOT_PROTOCOL.totalSlots, 8);

			const slotIds = STANDARD_8_SLOT_PROTOCOL.slots.map((s) => s.id);

			// Facial & smile
			assert.ok(slotIds.includes("portrait_rest"), "8-shot must include portrait rest (facial)");
			assert.ok(slotIds.includes("portrait_smile"), "8-shot must include portrait smile");
			assert.ok(slotIds.includes("profile_90_smile"), "8-shot must include profile smile");

			// Retracted frontal occlusion
			assert.ok(slotIds.includes("intraoral_frontal_occlusion"), "8-shot must include retracted frontal occlusion");

			// Occlusal upper AND lower
			assert.ok(slotIds.includes("intraoral_maxillary_occlusal"), "8-shot must include maxillary occlusal (upper)");
			assert.ok(slotIds.includes("intraoral_mandibular_occlusal"), "8-shot must include mandibular occlusal (lower)");

			// Lateral buccals
			assert.ok(slotIds.includes("intraoral_right_buccal"), "8-shot must include right buccal");
			assert.ok(slotIds.includes("intraoral_left_buccal"), "8-shot must include left buccal");
		});

		it("verifies registry contains 1-click clinical presets and fallback resolution", () => {
			assert.ok(CLINICAL_PROTOCOLS_REGISTRY.length >= 4);
			assert.equal(getPresetById("standard_12_ortho_aesthetic").totalSlots, 12);
			assert.equal(getPresetById("aesthetic_8_prosthodontic").totalSlots, 8);
			assert.equal(getPresetById("express_6_monitoring").totalSlots, 6);
			assert.equal(getPresetById("minimal_3_therapy").totalSlots, 3);

			// Unknown preset falls back safely without throwing
			const fallback = getPresetById("unknown_preset_id");
			assert.equal(fallback.id, STANDARD_12_SLOT_PROTOCOL.id);
		});
	});

	describe("2. Zero Cartoon Emojis (Mandate 8d pt 7)", () => {
		it("verifies 0 cartoon emojis in all dental photography components and styles", () => {
			const filesToCheck = [
				"BeforeAfterComparisonView.tsx",
				"ClinicalPhotoProtocolModal.tsx",
				"PhotoCalibrationDrawer.tsx",
				"photoProtocolMath.ts",
				"vitaShadesCatalog.ts",
				"clinicalPhotography.css",
				"photoGridPresets.ts",
				"PhotoSlotCard.tsx",
				"VitaShadeSelector.tsx",
				"PhotoCollageExportSheet.tsx",
				"IncisalAlignmentGuideOverlay.tsx",
			];

			const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E0}-\u{1F1FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/u;

			for (const file of filesToCheck) {
				const fullPath = path.join(photographyDir, file);
				const content = fs.readFileSync(fullPath, "utf8");
				const lines = content.split("\n");
				lines.forEach((line, idx) => {
					assert.ok(
						!emojiRegex.test(line),
						`Found forbidden cartoon emoji in ${file}:${idx + 1}: ${line.trim()}`
					);
				});
			}
		});
	});

	describe("3. Anti-Simulator Law & Rapid Comparison Math (Mandate 8k)", () => {
		it("calculates split slider clip paths deterministically and prevents NaN", () => {
			assert.equal(
				calculateSplitClipPath(50, "vertical"),
				"polygon(50% 0%, 100% 0%, 100% 100%, 50% 100%)"
			);
			assert.equal(
				calculateSplitClipPath(0, "vertical"),
				"polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)"
			);
			assert.equal(
				calculateSplitClipPath(100, "vertical"),
				"polygon(100% 0%, 100% 0%, 100% 100%, 100% 100%)"
			);

			// NaN or infinite percentage safely clamps to 50%
			assert.equal(
				calculateSplitClipPath(Number.NaN, "vertical"),
				"polygon(50% 0%, 100% 0%, 100% 100%, 50% 100%)"
			);
			assert.equal(
				calculateSplitClipPath(150, "horizontal"),
				"polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)"
			);
		});

		it("calculates 2D similarity transform between before and after photo landmarks without NaN", () => {
			const beforePoints: [{ x: number; y: number }, { x: number; y: number }] = [
				{ x: 100, y: 100 },
				{ x: 200, y: 100 },
			];
			const afterPoints: [{ x: number; y: number }, { x: number; y: number }] = [
				{ x: 100, y: 100 },
				{ x: 200, y: 100 },
			];

			const transform = calculateSimilarityTransform(beforePoints, afterPoints);
			assert.equal(transform.scale, 1);
			assert.equal(transform.rotationDegrees, 0);
			assert.equal(transform.translateX, 0);
			assert.equal(transform.translateY, 0);

			// Degenerate zero-length landmark points safely return identity
			const degeneratePoints: [{ x: number; y: number }, { x: number; y: number }] = [
				{ x: 0, y: 0 },
				{ x: 0, y: 0 },
			];
			const degenerateTransform = calculateSimilarityTransform(degeneratePoints, afterPoints);
			assert.equal(degenerateTransform.scale, 1);
			assert.ok(!Number.isNaN(degenerateTransform.translateX));
		});

		it("handles wiper mouse wheel and keyboard navigation smoothly", () => {
			assert.equal(calculateWiperWheelDelta(50, 100, 2), 52);
			assert.equal(calculateWiperWheelDelta(50, -100, 2), 48);
			assert.equal(calculateWiperWheelDelta(99, 100, 5), 100);
			assert.equal(calculateWiperWheelDelta(1, -100, 5), 0);

			assert.equal(calculateKeyboardWiperDelta(50, "ArrowRight", false), 51);
			assert.equal(calculateKeyboardWiperDelta(50, "ArrowRight", true), 55);
			assert.equal(calculateKeyboardWiperDelta(50, "ArrowLeft", false), 49);
			assert.equal(calculateKeyboardWiperDelta(50, "Home", false), 0);
			assert.equal(calculateKeyboardWiperDelta(50, "End", false), 100);
		});
	});

	describe("4. VITA Shade Engine: Normalization, Bleach OM1-OM3 & Zero NaN Law", () => {
		it("normalizes Latin letter O Bleach shades OM1-OM3 to official 0M1-0M3", () => {
			assert.equal(normalizeVitaShadeCode("OM1"), "0M1");
			assert.equal(normalizeVitaShadeCode("OM2"), "0M2");
			assert.equal(normalizeVitaShadeCode("OM3"), "0M3");
			assert.equal(normalizeVitaShadeCode("om1"), "0M1");
			assert.equal(normalizeVitaShadeCode("0M1"), "0M1");
			assert.equal(normalizeVitaShadeCode("0M2"), "0M2");
		});

		it("normalizes Cyrillic keyboard homoglyphs to valid Latin VITA codes", () => {
			// Cyrillic А -> Latin A
			assert.equal(normalizeVitaShadeCode("А1"), "A1");
			assert.equal(normalizeVitaShadeCode("А2"), "A2");
			assert.equal(normalizeVitaShadeCode("А3.5"), "A3.5");

			// Cyrillic В -> Latin B
			assert.equal(normalizeVitaShadeCode("В1"), "B1");
			assert.equal(normalizeVitaShadeCode("В2"), "B2");

			// Cyrillic С -> Latin C
			assert.equal(normalizeVitaShadeCode("С1"), "C1");
			assert.equal(normalizeVitaShadeCode("С3"), "C3");

			// Cyrillic ОМ -> 0M Bleach
			assert.equal(normalizeVitaShadeCode("ОМ1"), "0M1");
			assert.equal(normalizeVitaShadeCode("ОМ2"), "0M2");
			assert.equal(normalizeVitaShadeCode("ОМ3"), "0M3");
		});

		it("resolves Bleach OM1-OM3 and Cyrillic shades via getVitaShadeByCode", () => {
			const om1 = getVitaShadeByCode("OM1");
			assert.ok(om1, "OM1 must resolve to a valid VitaShade");
			assert.equal(om1?.code, "0M1");
			assert.equal(om1?.hueGroup, "Bleach");
			assert.equal(om1?.system, "3d_master");

			const cyrillicA2 = getVitaShadeByCode("А2");
			assert.ok(cyrillicA2, "Cyrillic А2 must resolve to standard A2");
			assert.equal(cyrillicA2?.code, "A2");
			assert.equal(cyrillicA2?.hueGroup, "A");

			const cyrillicB1 = getVitaShadeByCode("В1");
			assert.equal(cyrillicB1?.code, "B1");

			const cyrillicC1 = getVitaShadeByCode("с1");
			assert.equal(cyrillicC1?.code, "C1");
		});

		it("creates clinical physical tab references with correct Bleach and standard defaults", () => {
			const refOM1 = createVitaPhysicalTabReference("OM1");
			assert.equal(refOM1.shade.code, "0M1");
			assert.equal(refOM1.isBleach, true);

			const ref0M2 = createVitaPhysicalTabReference("0M2");
			assert.equal(ref0M2.shade.code, "0M2");
			assert.equal(ref0M2.isBleach, true);

			const refCyrillicA2 = createVitaPhysicalTabReference("А2");
			assert.equal(refCyrillicA2.shade.code, "A2");
			assert.equal(refCyrillicA2.isBleach, false);

			// Invalid shade defaults safely to universal A2
			const refInvalid = createVitaPhysicalTabReference("NON_EXISTENT_SHADE");
			assert.equal(refInvalid.shade.code, "A2");
			assert.equal(refInvalid.isBleach, false);
		});

		it("determines correct hue group for OM1-OM3 and classical/3D-Master tabs", () => {
			assert.equal(getShadeHueGroup("OM1"), "Bleach");
			assert.equal(getShadeHueGroup("0M1"), "Bleach");
			assert.equal(getShadeHueGroup("BL1"), "Bleach");
			assert.equal(getShadeHueGroup("А2"), "A");
			assert.equal(getShadeHueGroup("B2"), "B");
			assert.equal(getShadeHueGroup("2L1.5"), "L");
			assert.equal(getShadeHueGroup("3M2"), "M");
			assert.equal(getShadeHueGroup("4R2.5"), "R");
		});

		it("proves calculateShadeDelta never produces NaN across all 2401 shade pairings", () => {
			for (const s1 of ALL_VITA_SHADES) {
				for (const s2 of ALL_VITA_SHADES) {
					const result = calculateShadeDelta(s1, s2);
					assert.ok(
						Number.isFinite(result.deltaE00),
						`deltaE00 must be finite for ${s1.code} -> ${s2.code}, got ${result.deltaE00}`
					);
					assert.ok(
						Number.isFinite(result.deltaE76),
						`deltaE76 must be finite for ${s1.code} -> ${s2.code}, got ${result.deltaE76}`
					);
					assert.ok(
						Number.isFinite(result.deltaL),
						`deltaL must be finite for ${s1.code} -> ${s2.code}, got ${result.deltaL}`
					);
					assert.ok(
						Number.isFinite(result.deltaC),
						`deltaC must be finite for ${s1.code} -> ${s2.code}, got ${result.deltaC}`
					);
					assert.ok(
						Number.isFinite(result.deltaH),
						`deltaH must be finite for ${s1.code} -> ${s2.code}, got ${result.deltaH}`
					);
					assert.ok(
						Number.isFinite(result.stepDelta),
						`stepDelta must be finite for ${s1.code} -> ${s2.code}, got ${result.stepDelta}`
					);
					assert.ok(result.clinicalSummaryRu.length > 0);
				}
			}
		});

		it("guarantees calculateShadeDelta safely recovers from null, undefined, and empty string inputs", () => {
			const resNull = calculateShadeDelta(null, undefined);
			assert.ok(Number.isFinite(resNull.deltaE00));
			assert.ok(Number.isFinite(resNull.deltaL));
			assert.equal(resNull.beforeShade.code, "A2");
			assert.equal(resNull.afterShade.code, "B1");

			const resEmpty = calculateShadeDelta("", "   ");
			assert.ok(Number.isFinite(resEmpty.deltaE00));
			assert.equal(resEmpty.beforeShade.code, "A2");

			const resCyrillicVsOM = calculateShadeDelta("А3", "OM1");
			assert.ok(resCyrillicVsOM.deltaL > 0, "Whitening from A3 to OM1 must show positive deltaL");
			assert.ok(resCyrillicVsOM.stepDelta > 0, "Step delta must be positive for whitening");
			assert.ok(resCyrillicVsOM.isLighter);
			assert.ok(resCyrillicVsOM.isNoticeable);
		});
	});

	describe("5. CSS Tokens Compliance", () => {
		it("proves clinicalPhotography.css uses design system CSS tokens", () => {
			const cssPath = path.resolve(photographyDir, "clinicalPhotography.css");
			const css = fs.readFileSync(cssPath, "utf8");

			assert.ok(css.includes("var(--paper"), "Must use var(--paper)");
			assert.ok(css.includes("var(--ink"), "Must use var(--ink)");
			assert.ok(css.includes("var(--line"), "Must use var(--line)");
			assert.ok(css.includes("var(--surface"), "Must use var(--surface)");
			assert.ok(css.includes("var(--brand-500"), "Must use var(--brand-500)");
			assert.ok(css.includes("var(--danger"), "Must use var(--danger)");
		});
	});
});
