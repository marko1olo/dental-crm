/**
 * Clinical Dental Photography, 12-Shot Photo Protocol & Wiper Comparison Test Suite
 * 
 * Tests:
 * 1. AACD / DSD 12-Shot Standard Dental Protocol Presets & Slot Definitions
 * 2. New Intraoral Slots: Frontal Disclusion & 1:1 Enamel Macro Texture
 * 3. VITA Classical (A1-D4 + BL1-BL4) & VITA 3D-Master (0M1-5M3) Calibrated Scales
 * 4. CIEDE2000 & CIE76 Color Difference, Delta L*, Delta C*, Delta H* & Bleaching Progress
 * 5. Interactive Wiper Split-Slider Clip Paths, Mouse Wheel & Keyboard Controls
 * 6. Bipupillary Guide Line & Incisal Edge Canting Alignment Math
 * 7. Dual-Image 2D Similarity Registration & Blend Scoring
 * 8. Clinical Presentation Collage Dimensions, Formats & Watermark Generation
 * 9. Robust Edge Cases & Boundary Safeguards
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	AACD_DSD_12_SLOT_PROTOCOL,
	AACD_12_SLOT_PROTOCOL,
	STANDARD_12_SLOT_PROTOCOL,
	AESTHETIC_8_SLOT_PROTOCOL,
	EXPRESS_6_SLOT_PROTOCOL,
	MINIMAL_3_SLOT_PROTOCOL,
	CLINICAL_PROTOCOLS_REGISTRY,
	DENTAL_PHOTO_SLOTS,
	getPresetById,
	getSlotDefinitionById,
} from "../components/photography/photoGridPresets";

import {
	VITA_CLASSICAL_SHADES,
	VITA_CLASSICAL_BLEACH_SHADES,
	VITA_CLASSICAL_STANDARD_SHADES,
	VITA_3D_MASTER_SHADES,
	ALL_VITA_SHADES,
	getVitaShadeByCode,
	calculateShadeDelta,
	rgbToLab,
	labToRgb,
	colorDistanceDeltaE76,
	colorDistanceDeltaE2000,
	findClosestVitaShade,
	calculateSplitClipPath,
	calculateWiperWheelDelta,
	calculateKeyboardWiperDelta,
	calculateBipupillaryAlignment,
	calculateIncisalEdgeAlignment,
	calculateAutoLevelTransform,
	calculateSimilarityTransform,
	calculateBlendDifferenceScore,
	calculateCollageDimensions,
	generateCollageWatermarkText,
	Point2D,
	ColorRGB,
} from "../components/photography/photoProtocolMath";

describe("Advanced Clinical Dental Photo Protocol & Wiper Slider Suite", () => {
	describe("1. AACD / DSD 12-Shot Clinical Dental Protocol Catalog", () => {
		it("validates that AACD_DSD_12_SLOT_PROTOCOL has exactly 4 extraoral and 8 intraoral slots", () => {
			assert.equal(AACD_DSD_12_SLOT_PROTOCOL.totalSlots, 12);
			assert.equal(AACD_DSD_12_SLOT_PROTOCOL.categoryCount.extraoral, 4);
			assert.equal(AACD_DSD_12_SLOT_PROTOCOL.categoryCount.intraoral, 8);
			assert.equal(AACD_12_SLOT_PROTOCOL.id, AACD_DSD_12_SLOT_PROTOCOL.id);

			const expectedExtraoral = [
				"portrait_rest",
				"portrait_smile_wide",
				"profile_90_rest",
				"portrait_45_smile",
			];

			const expectedIntraoral = [
				"intraoral_frontal_occlusion",
				"intraoral_frontal_disclusion",
				"intraoral_right_buccal",
				"intraoral_left_buccal",
				"intraoral_maxillary_occlusal",
				"intraoral_mandibular_occlusal",
				"intraoral_overjet",
				"intraoral_enamel_macro",
			];

			for (const id of expectedExtraoral) {
				const slot = AACD_DSD_12_SLOT_PROTOCOL.slots.find(s => s.id === id);
				assert.ok(slot, `Extraoral slot ${id} must exist in AACD protocol`);
				assert.equal(slot.category, "extraoral");
				assert.ok(slot.titleRu.length > 0);
				assert.ok(slot.guideInstructionsRu.length > 0);
			}

			for (const id of expectedIntraoral) {
				const slot = AACD_DSD_12_SLOT_PROTOCOL.slots.find(s => s.id === id);
				assert.ok(slot, `Intraoral slot ${id} must exist in AACD protocol`);
				assert.equal(slot.category, "intraoral");
				assert.ok(slot.titleRu.length > 0);
				assert.ok(slot.silhouetteSvgPath.length > 0);
			}
		});

		it("validates clinical equipment requirements for intraoral disclusion and enamel macro slots", () => {
			const disclusion = DENTAL_PHOTO_SLOTS.intraoral_frontal_disclusion;
			assert.ok(disclusion);
			assert.equal(disclusion.requiresRetractor, true);
			assert.equal(disclusion.requiresMirror, false);
			assert.equal(disclusion.retractorType, "vestibular_clear");
			assert.ok(disclusion.clinicalCheckpointsRu.some(c => c.includes("2-4 мм")));

			const macro = DENTAL_PHOTO_SLOTS.intraoral_enamel_macro;
			assert.ok(macro);
			assert.equal(macro.requiresRetractor, true);
			assert.equal(macro.retractorType, "contraster");
			assert.equal(macro.magnification, "1:1 (Макро текстуры)");
			assert.ok(macro.clinicalCheckpointsRu.some(c => c.includes("перикиматы") || c.includes("микротекстур")));
		});

		it("validates preset retrieval and fallback", () => {
			const aacd = getPresetById("aacd_dsd_12_aesthetic");
			assert.equal(aacd.id, "aacd_dsd_12_aesthetic");
			assert.equal(aacd.totalSlots, 12);

			const ortho = getPresetById("standard_12_ortho_aesthetic");
			assert.equal(ortho.id, "standard_12_ortho_aesthetic");
			assert.equal(ortho.totalSlots, 12);

			const slotDef = getSlotDefinitionById("intraoral_enamel_macro");
			assert.ok(slotDef);
			assert.equal(slotDef.id, "intraoral_enamel_macro");
		});
	});

	describe("2. VITA Classical & VITA 3D-Master Dental Color Scales", () => {
		it("validates VITA Classical catalog with 16 standard and 4 Bleach shades (BL1-BL4)", () => {
			assert.equal(VITA_CLASSICAL_BLEACH_SHADES.length, 4);
			assert.equal(VITA_CLASSICAL_STANDARD_SHADES.length, 16);
			assert.equal(VITA_CLASSICAL_SHADES.length, 20);

			const bleachCodes = ["BL1", "BL2", "BL3", "BL4"];
			for (const code of bleachCodes) {
				const shade = getVitaShadeByCode(code);
				assert.ok(shade, `Bleach shade ${code} must exist`);
				assert.equal(shade.hueGroup, "Bleach");
				assert.equal(shade.system, "classical");
				assert.ok(shade.lab.L > 90, `Bleach shade ${code} must have L* > 90`);
			}

			// Validate ranking order (BL1 highest lightness L*)
			const bl1 = getVitaShadeByCode("BL1")!;
			const a1 = getVitaShadeByCode("A1")!;
			const a3 = getVitaShadeByCode("A3")!;
			const a4 = getVitaShadeByCode("A4")!;

			assert.ok(bl1.lab.L > a1.lab.L, "BL1 must be lighter than A1");
			assert.ok(a1.lab.L > a3.lab.L, "A1 must be lighter than A3");
			assert.ok(a3.lab.L > a4.lab.L, "A3 must be lighter than A4");
		});

		it("validates complete VITA 3D-Master 29-shade catalog across Groups 0 to 5", () => {
			assert.equal(VITA_3D_MASTER_SHADES.length, 29);

			// Check all 5 value groups and bleach group 0
			const required3dCodes = [
				"0M1", "0M2", "0M3", // Group 0
				"1M1", "1M2",         // Group 1
				"2L1.5", "2L2.5", "2M1", "2M2", "2M3", "2R1.5", "2R2.5", // Group 2
				"3L1.5", "3L2.5", "3M1", "3M2", "3M3", "3R1.5", "3R2.5", // Group 3
				"4L1.5", "4L2.5", "4M1", "4M2", "4M3", "4R1.5", "4R2.5", // Group 4
				"5M1", "5M2", "5M3"   // Group 5
			];

			for (const code of required3dCodes) {
				const shade = getVitaShadeByCode(code);
				assert.ok(shade, `3D-Master shade ${code} must be defined`);
				assert.equal(shade.system, "3d_master");
				assert.ok(shade.lab.L > 0 && shade.lab.L <= 100);
			}

			// Group 1 must be lighter than Group 5
			const m1 = getVitaShadeByCode("1M1")!;
			const m5 = getVitaShadeByCode("5M1")!;
			assert.ok(m1.lab.L > m5.lab.L, "1M1 must have higher lightness than 5M1");
		});

		it("performs case-insensitive shade lookup by code", () => {
			assert.equal(getVitaShadeByCode("a2")?.code, "A2");
			assert.equal(getVitaShadeByCode("A2")?.code, "A2");
			assert.equal(getVitaShadeByCode("bl1")?.code, "BL1");
			assert.equal(getVitaShadeByCode("3m2")?.code, "3M2");
			assert.equal(getVitaShadeByCode("2r1.5")?.code, "2R1.5");
			assert.equal(getVitaShadeByCode("unknown_code"), undefined);
		});
	});

	describe("3. CIEDE2000 & Colorimetry Delta Math", () => {
		it("calculates zero Delta E for identical shades", () => {
			const a2 = getVitaShadeByCode("A2")!;
			const de00 = colorDistanceDeltaE2000(a2.lab, a2.lab);
			const de76 = colorDistanceDeltaE76(a2.lab, a2.lab);
			assert.equal(de00, 0);
			assert.equal(de76, 0);
		});

		it("calculates clinical bleaching progression delta metrics (A3 -> A1 and A3 -> BL2)", () => {
			const deltaA3toA1 = calculateShadeDelta("A3", "A1");
			assert.equal(deltaA3toA1.beforeShade.code, "A3");
			assert.equal(deltaA3toA1.afterShade.code, "A1");
			assert.ok(deltaA3toA1.deltaL > 0, "Bleaching must increase Lightness Delta L*");
			assert.ok(deltaA3toA1.isLighter, "isLighter flag must be true");
			assert.ok(deltaA3toA1.isNoticeable, "Color shift must be clinically noticeable");
			assert.ok(deltaA3toA1.stepDelta > 0, "Step delta along value ranking must be positive");
			assert.ok(deltaA3toA1.lightnessImprovementRu.includes("Осветление"));

			const deltaA3toBL2 = calculateShadeDelta("A3", "BL2");
			assert.ok(deltaA3toBL2.deltaL > deltaA3toA1.deltaL, "BL2 must have higher lightness gain than A1");
			assert.ok(deltaA3toBL2.deltaE00 > deltaA3toA1.deltaE00);
			assert.ok(deltaA3toBL2.clinicalSummaryRu.includes("Эффект отбеливания"));
		});

		it("detects darkening and saturation increase correctly", () => {
			const deltaDark = calculateShadeDelta("A1", "A4");
			assert.ok(deltaDark.deltaL < 0, "Darkening must yield negative Delta L*");
			assert.equal(deltaDark.isLighter, false);
			assert.ok(deltaDark.stepDelta < 0);
			assert.ok(deltaDark.lightnessImprovementRu.includes("Потемнение"));
		});

		it("identifies closest VITA shade from sRGB input", () => {
			// Sample very close to A1
			const sampleA1: ColorRGB = { r: 242, g: 232, b: 212 };
			const matchA1 = findClosestVitaShade(sampleA1, "classical");
			assert.equal(matchA1.shade.code, "A1");
			assert.ok(matchA1.deltaE00 < 0.1);
			assert.equal(matchA1.deltaEQuality, "excellent");

			// Sample close to ultra white BL1
			const sampleBl1: ColorRGB = { r: 254, g: 252, b: 246 };
			const matchBl1 = findClosestVitaShade(sampleBl1, "classical");
			assert.equal(matchBl1.shade.code, "BL1");
		});

		it("accurately converts sRGB to CIELAB and back to sRGB", () => {
			const originalRgb: ColorRGB = { r: 220, g: 180, b: 140 };
			const lab = rgbToLab(originalRgb);
			const reconstructedRgb = labToRgb(lab);

			assert.ok(Math.abs(reconstructedRgb.r - originalRgb.r) <= 2);
			assert.ok(Math.abs(reconstructedRgb.g - originalRgb.g) <= 2);
			assert.ok(Math.abs(reconstructedRgb.b - originalRgb.b) <= 2);
		});
	});

	describe("4. Before/After Wiper Slider & Interactive Controls", () => {
		it("calculates polygon clip-path for vertical and horizontal wiper modes", () => {
			const clipV50 = calculateSplitClipPath(50, "vertical");
			assert.equal(clipV50, "polygon(50% 0%, 100% 0%, 100% 100%, 50% 100%)");

			const clipV25 = calculateSplitClipPath(25, "vertical");
			assert.equal(clipV25, "polygon(25% 0%, 100% 0%, 100% 100%, 25% 100%)");

			const clipH70 = calculateSplitClipPath(70, "horizontal");
			assert.equal(clipH70, "polygon(0% 70%, 100% 70%, 100% 100%, 0% 70%)");

			// Clamping tests
			assert.equal(calculateSplitClipPath(-10, "vertical"), "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)");
			assert.equal(calculateSplitClipPath(150, "vertical"), "polygon(100% 0%, 100% 0%, 100% 100%, 100% 100%)");
		});

		it("handles mouse wheel wiper stepping and boundary clamping", () => {
			// Scroll down (positive deltaY) -> increase split percent
			assert.equal(calculateWiperWheelDelta(50, 100, 2), 52);
			assert.equal(calculateWiperWheelDelta(99, 100, 2), 100);

			// Scroll up (negative deltaY) -> decrease split percent
			assert.equal(calculateWiperWheelDelta(50, -100, 2), 48);
			assert.equal(calculateWiperWheelDelta(1, -100, 2), 0);
		});

		it("handles keyboard wiper navigation (arrows, shift, Home, End)", () => {
			assert.equal(calculateKeyboardWiperDelta(50, "ArrowRight", false), 51);
			assert.equal(calculateKeyboardWiperDelta(50, "ArrowLeft", false), 49);
			assert.equal(calculateKeyboardWiperDelta(50, "ArrowRight", true), 55); // Shift + Arrow = +5%
			assert.equal(calculateKeyboardWiperDelta(50, "ArrowLeft", true), 45);  // Shift + Arrow = -5%
			assert.equal(calculateKeyboardWiperDelta(50, "Home"), 0);
			assert.equal(calculateKeyboardWiperDelta(50, "End"), 100);
			assert.equal(calculateKeyboardWiperDelta(50, "Enter"), 50); // Unrelated key unchanged
		});
	});

	describe("5. Incisal & Bipupillary Guide Alignment Math", () => {
		it("calculates bipupillary line tilt angle and leveling correction", () => {
			// Level eyes
			const leftPupil: Point2D = { x: 200, y: 300 };
			const rightPupilLevel: Point2D = { x: 400, y: 300 };
			const levelResult = calculateBipupillaryAlignment(leftPupil, rightPupilLevel);

			assert.equal(levelResult.angleDegrees, 0);
			assert.equal(levelResult.isLevel, true);
			assert.equal(levelResult.correctionAngleDegrees, 0);
			assert.equal(levelResult.center.x, 300);
			assert.equal(levelResult.center.y, 300);

			// Tilted eyes (right pupil 20px lower)
			const rightPupilTilted: Point2D = { x: 400, y: 320 };
			const tiltedResult = calculateBipupillaryAlignment(leftPupil, rightPupilTilted);

			assert.ok(tiltedResult.angleDegrees > 0);
			assert.equal(tiltedResult.isLevel, false);
			assert.equal(tiltedResult.correctionAngleDegrees, -tiltedResult.angleDegrees);
		});

		it("calculates incisal edge canting angle and direction", () => {
			// Level incisal edge
			const leftIncisor: Point2D = { x: 180, y: 500 };
			const rightIncisor: Point2D = { x: 220, y: 500 };
			const levelIncisal = calculateIncisalEdgeAlignment(leftIncisor, rightIncisor);

			assert.equal(levelIncisal.cantingAngleDegrees, 0);
			assert.equal(levelIncisal.cantingDirection, "level");
			assert.equal(levelIncisal.isWithinTolerance, true);

			// Canting to right (right corner lower -> positive angle)
			const rightIncisorLow: Point2D = { x: 220, y: 506 };
			const cantedResult = calculateIncisalEdgeAlignment(leftIncisor, rightIncisorLow);

			assert.ok(cantedResult.cantingAngleDegrees > 1.0);
			assert.equal(cantedResult.cantingDirection, "left_high");
			assert.equal(cantedResult.isWithinTolerance, false);
			assert.ok(cantedResult.descriptionRu.includes("Крен резцовой линии"));
		});

		it("computes 2D similarity transform between dual landmark pairs", () => {
			const beforePoints: [Point2D, Point2D] = [{ x: 100, y: 100 }, { x: 200, y: 100 }];
			const afterPoints: [Point2D, Point2D] = [{ x: 100, y: 100 }, { x: 200, y: 100 }];

			const identityTransform = calculateSimilarityTransform(beforePoints, afterPoints);
			assert.equal(identityTransform.scale, 1);
			assert.equal(Math.round(identityTransform.rotationDegrees), 0);
			assert.equal(Math.round(identityTransform.translateX), 0);
			assert.equal(Math.round(identityTransform.translateY), 0);
		});
	});

	describe("6. Presentation Collage Layout & Watermark Generation", () => {
		it("calculates standard dimensions for A4 and 16:9 presentation formats", () => {
			const a4p = calculateCollageDimensions("A4_portrait");
			assert.equal(a4p.widthPx, 2480);
			assert.equal(a4p.heightPx, 3508);
			assert.equal(a4p.dpi, 300);

			const a4l = calculateCollageDimensions("A4_landscape");
			assert.equal(a4l.widthPx, 3508);
			assert.equal(a4l.heightPx, 2480);
			assert.equal(a4l.dpi, 300);

			const hd169 = calculateCollageDimensions("16_9_hd");
			assert.equal(hd169.widthPx, 1920);
			assert.equal(hd169.heightPx, 1080);
			assert.equal(hd169.aspectRatio, 16 / 9);

			const uhd169 = calculateCollageDimensions("16_9_4k");
			assert.equal(uhd169.widthPx, 3840);
			assert.equal(uhd169.heightPx, 2160);
		});

		it("generates comprehensive watermark string containing clinic, patient and doctor", () => {
			const wm = generateCollageWatermarkText(
				"Dente Premium Clinic",
				"Петров Петр Петрович",
				"К-1092",
				"Д-р Ковалев А. С.",
				"26.08.2026"
			);

			assert.ok(wm.includes("DENTE PREMIUM CLINIC"));
			assert.ok(wm.includes("Петров Петр Петрович"));
			assert.ok(wm.includes("К-1092"));
			assert.ok(wm.includes("Д-р Ковалев А. С."));
			assert.ok(wm.includes("26.08.2026"));
		});

		it("handles edge cases in geometry, colorimetry and missing points gracefully", () => {
			// Zero-length pupil vector
			const zeroPupils = calculateBipupillaryAlignment({ x: 100, y: 100 }, { x: 100, y: 100 });
			assert.equal(zeroPupils.angleDegrees, 0);
			assert.equal(zeroPupils.distancePx, 0);

			// Zero-length incisor vector
			const zeroIncisors = calculateIncisalEdgeAlignment({ x: 50, y: 50 }, { x: 50, y: 50 });
			assert.equal(zeroIncisors.cantingAngleDegrees, 0);
			assert.equal(zeroIncisors.cantingDirection, "level");

			// Blend score for identical colors is 0
			const blendZero = calculateBlendDifferenceScore({ r: 200, g: 200, b: 200 }, { r: 200, g: 200, b: 200 });
			assert.equal(blendZero, 0);
		});
	});
});
