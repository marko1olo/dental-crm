import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
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
	vector,
	vectorLength,
	distance,
	dotProduct,
	crossProduct2D,
	angleBetweenVectors,
	angle3Points,
	angleBetweenLines,
	projectPointOntoLine,
	signedDistanceToLine,
	calculateInterpupillaryTilt,
	calculateFrankfurtHorizontalTilt,
	calculateCamperTilt,
	calculateAutoLevelTransform,
	calculateGoldenProportionDeviation,
	calculateRickettsELine,
	calculateSmileLineCurvature,
	calculateSplitClipPath,
	calculateSimilarityTransform,
	calculateCropBoundingBox,
	fitImageIntoContainer,
	mirrorCoordinates,
	rgbToLab,
	labToRgb,
	colorDistanceDeltaE76,
	colorDistanceDeltaE2000,
	findClosestVitaShade,
	classifyHueGroup,
	sortShadesByLightness,
	VITA_CLASSICAL_SHADES,
	VITA_3D_MASTER_SHADES,
	Point2D,
	ColorRGB,
} from "../components/photography/photoProtocolMath";

describe("Clinical Dental Photography & Photo Protocol Suite", () => {
	describe("1. Dental Photo Protocol Grid & Presets", () => {
		it("validates that Standard 12-slot Protocol contains all required extraoral and intraoral slots", () => {
			assert.equal(STANDARD_12_SLOT_PROTOCOL.totalSlots, 12);
			assert.equal(STANDARD_12_SLOT_PROTOCOL.categoryCount.extraoral, 6);
			assert.equal(STANDARD_12_SLOT_PROTOCOL.categoryCount.intraoral, 6);

			const requiredSlotIds = [
				// Extraoral
				"portrait_rest",
				"portrait_smile",
				"portrait_smile_wide",
				"profile_90_rest",
				"profile_90_smile",
				"portrait_45_smile",
				// Intraoral
				"intraoral_frontal_occlusion",
				"intraoral_right_buccal",
				"intraoral_left_buccal",
				"intraoral_maxillary_occlusal",
				"intraoral_mandibular_occlusal",
				"intraoral_overjet",
			];

			for (const id of requiredSlotIds) {
				const slot = STANDARD_12_SLOT_PROTOCOL.slots.find((s) => s.id === id);
				assert.ok(slot, `Slot ${id} must exist in STANDARD_12_SLOT_PROTOCOL`);
				assert.ok(slot.titleRu.length > 0, `Slot ${id} must have Russian title`);
				assert.ok(slot.shortLabelRu.length > 0, `Slot ${id} must have short label`);
				assert.ok(slot.guideInstructionsRu.length > 0, `Slot ${id} must have guide instructions`);
				assert.ok(slot.silhouetteSvgPath.length > 0, `Slot ${id} must have silhouette SVG path`);
				assert.ok(slot.clinicalCheckpointsRu.length >= 2, `Slot ${id} must have checkpoints`);
			}
		});

		it("validates retractor and mirror requirements for intraoral occlusal slots", () => {
			const maxOcclusal = DENTAL_PHOTO_SLOTS.intraoral_maxillary_occlusal;
			assert.equal(maxOcclusal.requiresMirror, true);
			assert.equal(maxOcclusal.requiresRetractor, true);
			assert.equal(maxOcclusal.retractorType, "contraster");

			const mandOcclusal = DENTAL_PHOTO_SLOTS.intraoral_mandibular_occlusal;
			assert.equal(mandOcclusal.requiresMirror, true);
			assert.equal(mandOcclusal.requiresRetractor, true);

			const portraitRest = DENTAL_PHOTO_SLOTS.portrait_rest;
			assert.equal(portraitRest.requiresMirror, false);
			assert.equal(portraitRest.requiresRetractor, false);
		});

		it("correctly retrieves presets by ID or fallback", () => {
			assert.equal(getPresetById("aesthetic_8_prosthodontic").totalSlots, 8);
			assert.equal(getPresetById("express_6_monitoring").totalSlots, 6);
			assert.equal(getPresetById("minimal_3_therapy").totalSlots, 3);
			assert.equal(getPresetById("non_existent").id, "standard_12_ortho_aesthetic");
		});
	});

	describe("2. Vector Geometry & Coordinate Math", () => {
		it("calculates 2D vector operations, length, and distance correctly", () => {
			const p1: Point2D = { x: 10, y: 20 };
			const p2: Point2D = { x: 13, y: 24 };

			const v = vector(p1, p2);
			assert.equal(v.x, 3);
			assert.equal(v.y, 4);
			assert.equal(vectorLength(v), 5);
			assert.equal(distance(p1, p2), 5);
			assert.equal(dotProduct(v, { x: 2, y: 1 }), 10);
			assert.equal(crossProduct2D({ x: 1, y: 0 }, { x: 0, y: 1 }), 1);
		});

		it("calculates angles between vectors and lines", () => {
			const vX: Point2D = { x: 10, y: 0 };
			const vY: Point2D = { x: 0, y: 10 };
			assert.equal(Math.round(angleBetweenVectors(vX, vY)), 90);

			const vertex: Point2D = { x: 0, y: 0 };
			const pA: Point2D = { x: 5, y: 0 };
			const pB: Point2D = { x: 0, y: 5 };
			assert.equal(Math.round(angle3Points(pA, vertex, pB)), 90);

			// Parallel lines
			assert.equal(Math.round(angleBetweenLines({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 5 }, { x: 10, y: 5 })), 0);
		});

		it("projects points onto lines and calculates signed distance", () => {
			const lineStart: Point2D = { x: 0, y: 0 };
			const lineEnd: Point2D = { x: 100, y: 0 };
			const pt: Point2D = { x: 40, y: 30 };

			const proj = projectPointOntoLine(pt, lineStart, lineEnd);
			assert.equal(proj.x, 40);
			assert.equal(proj.y, 0);

			const signedDist = signedDistanceToLine(pt, lineStart, lineEnd);
			assert.equal(Math.abs(signedDist), 30);
		});
	});

	describe("3. Interpupillary & Frankfurt Auto-Leveling Tilt", () => {
		it("calculates zero tilt when eyes are perfectly horizontal", () => {
			const leftEye: Point2D = { x: 100, y: 200 };
			const rightEye: Point2D = { x: 300, y: 200 };
			const tilt = calculateInterpupillaryTilt(leftEye, rightEye);
			assert.equal(tilt, 0);
		});

		it("calculates positive or negative tilt for angled head positions", () => {
			const leftEye: Point2D = { x: 100, y: 200 };
			const rightEye: Point2D = { x: 200, y: 300 }; // 45 degrees downward
			const tilt = calculateInterpupillaryTilt(leftEye, rightEye);
			assert.equal(Math.round(tilt), 45);

			const porion: Point2D = { x: 50, y: 100 };
			const orbitale: Point2D = { x: 150, y: 100 };
			assert.equal(calculateFrankfurtHorizontalTilt(porion, orbitale), 0);
		});

		it("calculates auto-level transform with center midpoint", () => {
			const p1: Point2D = { x: 0, y: 0 };
			const p2: Point2D = { x: 10, y: 10 };
			const transform = calculateAutoLevelTransform(p1, p2, 0);
			assert.equal(Math.round(transform.rotationDegrees), -45);
			assert.equal(transform.center.x, 5);
			assert.equal(transform.center.y, 5);
		});
	});

	describe("4. Aesthetic Smile Ratios & Facial Planes", () => {
		it("calculates Golden Proportion deviation (1.618 ratio)", () => {
			// Perfect Levin Golden Proportion: Central = 8.5mm, Lateral = 8.5/1.618 = 5.253mm, Canine = 5.253/1.618 = 3.246mm
			const central = 8.5;
			const lateral = 8.5 / 1.61803398875;
			const canine = lateral / 1.61803398875;

			const result = calculateGoldenProportionDeviation(central, lateral, canine, 5);
			assert.equal(result.isWithinGoldenTolerance, true);
			assert.ok(result.lateralDeviationPercent < 0.1);
			assert.ok(result.canineDeviationPercent < 0.1);

			// Disproportionate teeth
			const disprop = calculateGoldenProportionDeviation(8.5, 8.0, 7.5, 10);
			assert.equal(disprop.isWithinGoldenTolerance, false);
			assert.ok(disprop.lateralDeviationPercent > 40);
		});

		it("calculates Ricketts E-Line (Esthetic Plane) distances and lip status", () => {
			const pronasale: Point2D = { x: 100, y: 50 };
			const pogonion: Point2D = { x: 100, y: 250 };
			// Upper lip at x = 60 (-40px * 0.1 = -4.0mm) -> Norm
			const upperLip: Point2D = { x: 60, y: 120 };
			// Lower lip at x = 80 (-20px * 0.1 = -2.0mm) -> Norm
			const lowerLip: Point2D = { x: 80, y: 170 };

			const res = calculateRickettsELine(pronasale, pogonion, upperLip, lowerLip, 0.1);
			assert.equal(Math.round(res.upperLipDistanceMm), -4);
			assert.equal(Math.round(res.lowerLipDistanceMm), -2);
			assert.equal(res.upperLipStatus, "norm");
			assert.equal(res.lowerLipStatus, "norm");
		});

		it("evaluates smile arc curvature", () => {
			const commLeft: Point2D = { x: 50, y: 100 };
			const commRight: Point2D = { x: 250, y: 100 };
			// Incisal edges curving downward below commissure line (Consonant smile)
			const edgesConsonant: Point2D[] = [
				{ x: 100, y: 120 },
				{ x: 150, y: 130 },
				{ x: 200, y: 120 },
			];
			const resConsonant = calculateSmileLineCurvature(commLeft, commRight, edgesConsonant);
			assert.equal(resConsonant.curvatureType, "consonant");
			assert.ok(resConsonant.symmetryScore >= 90);

			// Reverse smile arc (edges higher than commissure)
			const edgesReverse: Point2D[] = [
				{ x: 100, y: 80 },
				{ x: 150, y: 70 },
				{ x: 200, y: 80 },
			];
			const resReverse = calculateSmileLineCurvature(commLeft, commRight, edgesReverse);
			assert.equal(resReverse.curvatureType, "reverse");
		});
	});

	describe("5. Before/After Comparison & Image Transform Math", () => {
		it("generates correct clip path for vertical and horizontal split slider", () => {
			const clipV = calculateSplitClipPath(50, "vertical");
			assert.equal(clipV, "polygon(50% 0%, 100% 0%, 100% 100%, 50% 100%)");

			const clipH = calculateSplitClipPath(75, "horizontal");
			assert.equal(clipH, "polygon(0% 75%, 100% 75%, 100% 100%, 0% 75%)");
		});

		it("solves 2D similarity transform between landmark pairs", () => {
			const b1: Point2D = { x: 100, y: 100 };
			const b2: Point2D = { x: 200, y: 100 };

			const a1: Point2D = { x: 150, y: 150 };
			const a2: Point2D = { x: 350, y: 150 }; // scale = 2.0

			const transform = calculateSimilarityTransform([b1, b2], [a1, a2]);
			assert.equal(transform.scale, 0.5);
			assert.equal(Math.round(transform.rotationDegrees), 0);
		});

		it("fits image into container with aspect ratio preservation", () => {
			const fit = fitImageIntoContainer(1000, 500, 500, 500, "contain");
			assert.equal(fit.width, 500);
			assert.equal(fit.height, 250);
			assert.equal(fit.offsetX, 0);
			assert.equal(fit.offsetY, 125);
		});

		it("mirrors coordinates horizontally for occlusal mirror shots", () => {
			const pt: Point2D = { x: 100, y: 200 };
			const size = { width: 1000, height: 800 };
			const mirrored = mirrorCoordinates(pt, "horizontal", size);
			assert.equal(mirrored.x, 900);
			assert.equal(mirrored.y, 200);
		});
	});

	describe("6. VITA Shade Matching & Colorimetry Engine", () => {
		it("converts sRGB to CIELAB and back with high fidelity", () => {
			const testRgb: ColorRGB = { r: 234, g: 218, b: 192 }; // VITA A2 approx
			const lab = rgbToLab(testRgb);
			const backRgb = labToRgb(lab);

			assert.ok(Math.abs(backRgb.r - testRgb.r) <= 2);
			assert.ok(Math.abs(backRgb.g - testRgb.g) <= 2);
			assert.ok(Math.abs(backRgb.b - testRgb.b) <= 2);
		});

		it("calculates Delta E 76 and Delta E 2000 color differences", () => {
			const lab1 = { L: 90, a: 0, b: 10 };
			const lab2 = { L: 90, a: 0, b: 10 };
			assert.equal(colorDistanceDeltaE76(lab1, lab2), 0);
			assert.equal(colorDistanceDeltaE2000(lab1, lab2), 0);

			const labDiff = { L: 85, a: 2, b: 15 };
			const de00 = colorDistanceDeltaE2000(lab1, labDiff);
			assert.ok(de00 > 0 && de00 < 10);
		});

		it("identifies closest VITA Classical shade accurately", () => {
			const a2Shade = VITA_CLASSICAL_SHADES.find((s) => s.code === "A2")!;
			const match = findClosestVitaShade(a2Shade.rgb, "classical");

			assert.equal(match.shade.code, "A2");
			assert.ok(match.deltaE00 < 0.5);
			assert.equal(match.deltaEQuality, "excellent");
			assert.ok(match.matchConfidencePercent >= 90);
		});

		it("identifies VITA Bleach shades", () => {
			const bleachRgb: ColorRGB = { r: 252, g: 250, b: 242 };
			const match = findClosestVitaShade(bleachRgb, "3d_master");
			assert.equal(match.shade.code, "0M1");
			assert.equal(match.shade.hueGroup, "Bleach");
		});

		it("classifies tooth hue group (A, B, C, D, Bleach)", () => {
			const hueB = classifyHueGroup({ r: 245, g: 238, b: 210 }); // Yellowish B
			assert.equal(hueB === "B" || hueB === "Bleach", true);

			const sorted = sortShadesByLightness(VITA_CLASSICAL_SHADES);
			assert.equal(sorted[0]?.code, "B1"); // B1 is lightest
			assert.equal(sorted[sorted.length - 1]?.code, "C4"); // C4 is among darkest
		});
	});
});
