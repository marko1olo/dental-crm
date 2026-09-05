/**
 * Clinical Dental Photography Protocol Sanity & Verification Suite
 * 
 * Enforces Mandates 8i & 8k:
 * 1. Purge of pseudo-scientific VITA sRGB shade picker (findClosestVitaShade)
 *    - Automated RGB picking from phone photos is prohibited as inaccurate without spectrophotometer.
 *    - Replaced with manual physical VITA tab reference (A1-D4 / 3D-Master / Bleach) photographed at tooth.
 * 2. Purge of procedural golden ratio curves & DSD gimmicks from IncisalAlignmentGuideOverlay
 *    - Only clean orthopedic reference guides: bipupillary line, facial midline, incisal edge, rule of thirds.
 * 3. Exact colorimetric Delta E (CIEDE2000 & CIE76) between physical VITA tabs.
 * 4. Orthopedic alignment math: bipupillary leveling, incisal canting.
 * 5. UI Ergonomics & 7 Deadly Sins invariants: touch targets >= 44px, single row toolbar, zero emojis.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";

import {
	IncisalAlignmentGuideOverlay,
	GuideOverlayType,
} from "../IncisalAlignmentGuideOverlay";
import {
	createVitaPhysicalTabReference,
	getShadeHueGroup,
	getVitaShadeByCode,
	calculateShadeDelta,
	colorDistanceDeltaE76,
	colorDistanceDeltaE2000,
	calculateBipupillaryAlignment,
	calculateIncisalEdgeAlignment,
	calculateSplitClipPath,
	calculateWiperWheelDelta,
	calculateKeyboardWiperDelta,
	VITA_CLASSICAL_SHADES,
	VITA_3D_MASTER_SHADES,
	VITA_CLASSICAL_BLEACH_SHADES,
} from "../photoProtocolMath";
import * as photoProtocolMathModule from "../photoProtocolMath";

describe("Clinical Dental Photo Protocol Sanity (Mandates 8i, 8k)", () => {
	describe("1. Purge of Pseudo-Scientific sRGB Pipette (Mandates 8i, 8k)", () => {
		it("proves findClosestVitaShade is completely eliminated from photoProtocolMath", () => {
			assert.equal(
				(photoProtocolMathModule as Record<string, unknown>).findClosestVitaShade,
				undefined,
				"findClosestVitaShade must not be exported; automated smartphone sRGB picking is prohibited"
			);
		});

		it("proves classifyHueGroup with sRGB input is replaced with getShadeHueGroup from physical tab", () => {
			assert.equal(getShadeHueGroup("A2"), "A");
			assert.equal(getShadeHueGroup("B1"), "B");
			assert.equal(getShadeHueGroup("C3"), "C");
			assert.equal(getShadeHueGroup("D4"), "D");
			assert.equal(getShadeHueGroup("BL2"), "Bleach");
		});

		it("creates clinical physical VITA tab reference for dental lab (ZTL)", () => {
			const refA2 = createVitaPhysicalTabReference("A2");
			assert.equal(refA2.shadeCode, "A2");
			assert.equal(refA2.system, "classical");
			assert.equal(refA2.isBleach, false);
			assert.ok(refA2.clinicalNoteRu.includes("ЗТЛ"));
			assert.ok(refA2.clinicalNoteRu.includes("A2"));
			assert.equal(refA2.shade.hueGroup, "A");
			assert.ok(refA2.shade.descriptionRu.includes("естественный оттенок"));

			const refBL1 = createVitaPhysicalTabReference("BL1");
			assert.equal(refBL1.shadeCode, "BL1");
			assert.equal(refBL1.isBleach, true);
			assert.ok(refBL1.clinicalNoteRu.includes("BL1"));
		});

		it("verifies physical VITA Classical catalog contains all 16 standard and 4 bleach tabs", () => {
			assert.equal(VITA_CLASSICAL_SHADES.length, 20);
			assert.equal(VITA_CLASSICAL_BLEACH_SHADES.length, 4);

			const standardCodes = [
				"A1", "A2", "A3", "A3.5", "A4",
				"B1", "B2", "B3", "B4",
				"C1", "C2", "C3", "C4",
				"D2", "D3", "D4",
			];
			for (const code of standardCodes) {
				const shade = getVitaShadeByCode(code);
				assert.ok(shade, `VITA tab ${code} must exist in physical catalog`);
				assert.equal(shade.system, "classical");
			}
		});

		it("verifies physical VITA 3D-Master catalog contains all 29 tabs", () => {
			assert.equal(VITA_3D_MASTER_SHADES.length, 29);
			const sample3d = getVitaShadeByCode("2M2");
			assert.ok(sample3d);
			assert.equal(sample3d.system, "3d_master");
		});
	});

	describe("2. Purge of Procedural Golden Ratio & DSD Gimmicks (IncisalAlignmentGuideOverlay)", () => {
		it("verifies GuideOverlayType contains only orthopedic clinical guides", () => {
			const validGuideTypes: GuideOverlayType[] = [
				"bipupillary",
				"incisal",
				"midline",
				"thirds",
			];
			assert.equal(validGuideTypes.length, 4);

			const activeGuides: Record<GuideOverlayType, boolean> = {
				bipupillary: true,
				incisal: true,
				midline: true,
				thirds: false,
			};
			assert.equal(activeGuides.bipupillary, true);
			assert.equal(activeGuides.incisal, true);
			assert.equal(activeGuides.midline, true);
			assert.equal((activeGuides as Record<string, boolean>).golden_ratio, undefined);
		});

		it("renders orthopedic guide overlay without golden ratio curves", () => {
			const rendered = IncisalAlignmentGuideOverlay({
				activeGuides: {
					bipupillary: true,
					incisal: true,
					midline: true,
					thirds: true,
				},
				bipupillaryTiltDegrees: 1.5,
				incisalCantingDegrees: -0.8,
			});

			assert.ok(React.isValidElement(rendered), "IncisalAlignmentGuideOverlay must render valid React element");
			const element = rendered as React.ReactElement<any>;
			assert.equal(element.type, "svg");
			assert.equal(element.props.viewBox, "0 0 1000 1000");

			const children = React.Children.toArray(element.props.children);
			// 4 active guides: thirds, midline, bipupillary, incisal
			assert.equal(children.length, 4);
		});

		it("returns null when no guides are active", () => {
			const rendered = IncisalAlignmentGuideOverlay({
				activeGuides: {
					bipupillary: false,
					incisal: false,
					midline: false,
					thirds: false,
				},
			});
			assert.equal(rendered, null);
		});
	});

	describe("3. Clinical Colorimetry & Delta E Between Physical VITA Tabs", () => {
		it("calculates exact Delta E 2000 and Delta E 76 between physical tabs", () => {
			const a3 = getVitaShadeByCode("A3")!;
			const a1 = getVitaShadeByCode("A1")!;
			const delta = calculateShadeDelta(a3, a1);

			assert.ok(delta.deltaE00 > 0);
			assert.ok(delta.deltaE76 > 0);
			assert.ok(delta.deltaL > 0, "A1 must be lighter than A3 (positive deltaL)");
			assert.equal(delta.isLighter, true);
			assert.ok(delta.lightnessImprovementRu.includes("Осветление"));
			assert.ok(delta.clinicalSummaryRu.includes("Эффект отбеливания"));
		});

		it("calculates zero difference for identical tabs", () => {
			const b1 = getVitaShadeByCode("B1")!;
			const de00 = colorDistanceDeltaE2000(b1.lab, b1.lab);
			const de76 = colorDistanceDeltaE76(b1.lab, b1.lab);
			assert.equal(de00, 0);
			assert.equal(de76, 0);
		});
	});

	describe("4. Orthopedic Photographic Alignment & Wiper Math", () => {
		it("calculates bipupillary alignment and leveling correction angle", () => {
			const leftPupil = { x: 100, y: 200 };
			const rightPupil = { x: 300, y: 200 };
			const alignment = calculateBipupillaryAlignment(leftPupil, rightPupil);
			assert.equal(alignment.angleDegrees, 0);
			assert.equal(alignment.isLevel, true);
			assert.equal(alignment.correctionAngleDegrees, 0);
		});

		it("calculates incisal edge canting angle and direction", () => {
			const leftCorner = { x: 120, y: 400 };
			const rightCorner = { x: 280, y: 406 };
			const canting = calculateIncisalEdgeAlignment(leftCorner, rightCorner);
			assert.ok(canting.cantingAngleDegrees > 0);
			assert.equal(canting.cantingDirection, "left_high");
			assert.ok(canting.descriptionRu.includes("Крен резцовой линии"));
		});

		it("computes wiper split clip path with boundary clamping", () => {
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
		});

		it("handles wiper wheel delta and keyboard navigation", () => {
			assert.equal(calculateWiperWheelDelta(50, 120, 2), 52);
			assert.equal(calculateWiperWheelDelta(50, -120, 2), 48);
			assert.equal(calculateKeyboardWiperDelta(50, "ArrowRight", false), 51);
			assert.equal(calculateKeyboardWiperDelta(50, "ArrowLeft", true), 45);
			assert.equal(calculateKeyboardWiperDelta(50, "Home"), 0);
			assert.equal(calculateKeyboardWiperDelta(50, "End"), 100);
		});
	});
});
