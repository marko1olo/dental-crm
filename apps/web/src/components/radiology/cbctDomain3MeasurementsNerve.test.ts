/**
 * DENTE CRM — CBCT Clinical UX Wave 29 Domain 3 Suite
 * Unit tests for:
 * 1. HTML DOM Anti-Pixelation Overlays (Rulers, Angles, Probes, Nerve Badges)
 * 2. Misch Bone Density Classification & High-Contrast Tokens
 * 3. 3D Mandibular Nerve Distance Gating & Gated Spline Segments
 * 4. Screen-Space Coordinate Projection & Angle Bisector Math
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	type Point3D,
	type ViewportTransform,
	DEFAULT_VIEWPORT_TRANSFORM,
	createEmptyCbctVolume,
} from "./cbctMprMath";
import {
	type CbctMeasurementRuler,
	type CbctProbeMarker,
	type CbctAngleMeasurement,
	calculatePhysicalDistanceMm,
	calculatePhysicalDistance3DMm,
	calculateAngleBetween3Points3D,
	interpolateNerveSpline3D,
	calculateSplineLength3DMm,
	calculateNerveDistanceGating,
	getGatedNerveSegments,
	formatRulerBadgeText,
	formatAngleBadgeText,
	formatProbeBadgeText,
	formatNerveBadgeText,
	MANDIBULAR_NERVE_SAFETY_MARGIN_MM,
} from "./cbctCaliperNerveMath";
import {
	getMischTissueDescription,
	getMischBadgeCssClasses,
	formatMischTooltip,
} from "./boneDensityMischMath";

describe("Wave 29 Domain 3 — Calipers, 3D Nerve & DOM Overlays Suite", () => {
	// ─── 1. HTML/CSS DOM BADGE FORMATTERS ────────────────────────────────────
	describe("1. HTML DOM Anti-Pixelation Overlay Formatters", () => {
		it("formats ruler distance in exact millimeters with Russian units", () => {
			assert.equal(formatRulerBadgeText(10.54), "10.5 мм");
			assert.equal(formatRulerBadgeText(0.2), "0.2 мм");
			assert.equal(formatRulerBadgeText(14.0), "14.0 мм");
		});

		it("formats angle degrees with Russian degree symbol", () => {
			assert.equal(formatAngleBadgeText(45.67), "45.7°");
			assert.equal(formatAngleBadgeText(90.0), "90.0°");
			assert.equal(formatAngleBadgeText(112.4), "112.4°");
		});

		it("formats HU density probe with tissue name and Misch class", () => {
			assert.equal(formatProbeBadgeText(1350, "Кость D1 (Плотная кортикальная)"), "1350 HU · Кость D1 (Плотная кортикальная)");
			assert.equal(formatProbeBadgeText(-750, "Воздух / Гайморова пазуха"), "-750 HU · Воздух / Гайморова пазуха");
			assert.equal(formatProbeBadgeText(45, "Мягкие ткани / Десна"), "45 HU · Мягкие ткани / Десна");
		});

		it("formats 3D mandibular nerve badge with total length and 2.0 mm safety buffer", () => {
			const badge = formatNerveBadgeText(32.4, MANDIBULAR_NERVE_SAFETY_MARGIN_MM);
			assert.equal(badge, "Канал IAN (3D 32.4 мм · 2.0 мм буфер)");
		});
	});

	// ─── 2. MISCH BONE DENSITY CLASSIFICATION ─────────────────────────────────
	describe("2. Misch CE Bone Density Classification & High-Contrast Tokens", () => {
		it("classifies Misch D1 (>1250 HU) as dense cortical bone with highest primary stability", () => {
			const desc = getMischTissueDescription(1350);
			assert.equal(desc.boneClass, "D1");
			assert.equal(desc.isHighRisk, false);
			assert.ok(desc.nameRu.includes("D1"));
		});

		it("classifies Misch D2 (850..1250 HU) as thick porous cortical & coarse trabecular bone", () => {
			const desc = getMischTissueDescription(950);
			assert.equal(desc.boneClass, "D2");
			assert.equal(desc.isHighRisk, false);
			assert.ok(desc.nameRu.includes("D2"));
		});

		it("classifies Misch D3 (350..850 HU) as thin porous cortical & fine trabecular bone", () => {
			const desc = getMischTissueDescription(500);
			assert.equal(desc.boneClass, "D3");
			assert.equal(desc.isHighRisk, false);
			assert.ok(desc.nameRu.includes("D3"));
		});

		it("classifies Misch D4 (150..350 HU) as fine trabecular bone requiring under-drilling", () => {
			const desc = getMischTissueDescription(220);
			assert.equal(desc.boneClass, "D4");
			assert.equal(desc.isHighRisk, true);
			assert.ok(desc.nameRu.includes("D4"));
		});

		it("classifies Misch D5 / Immature bone (<150 HU) with high surgical risk", () => {
			const desc = getMischTissueDescription(120);
			assert.equal(desc.boneClass, "D5");
			assert.equal(desc.isHighRisk, true);
			assert.ok(desc.nameRu.includes("D5"));
		});

		it("classifies Enamel (>1500 HU), Soft Tissue (-400..0 HU), and Sinus Air (<-400 HU)", () => {
			assert.ok(getMischTissueDescription(1600).nameRu.includes("Эмаль"));
			assert.ok(getMischTissueDescription(-100).nameRu.includes("Мягкие ткани"));
			assert.ok(getMischTissueDescription(-800).nameRu.includes("Воздух"));
		});

		it("provides high-contrast CSS class tokens with backdrop blur and teal/amber typography", () => {
			const tokens = getMischBadgeCssClasses(950);
			assert.equal(tokens.bg, "bg-slate-900/80 backdrop-blur");
			assert.equal(tokens.text, "text-teal-300");
			assert.equal(tokens.border, "border-slate-700/80");

			const riskTokens = getMischBadgeCssClasses(200);
			assert.equal(riskTokens.border, "border-amber-500/60");
		});

		it("formats Misch tooltip with comprehensive surgical advice", () => {
			const tip = formatMischTooltip(300);
			assert.ok(tip.includes("300 HU"));
			assert.ok(tip.includes("D4"));
		});
	});

	// ─── 3. 3D NERVE DISTANCE GATING MATH ─────────────────────────────────────
	describe("3. 3D Mandibular Nerve Distance Gating Invariants", () => {
		it("calculates exponential opacity alpha = exp(-(delta / 2.0)^2)", () => {
			const onSlice = calculateNerveDistanceGating(0.0);
			assert.equal(onSlice.isVisible, true);
			assert.equal(onSlice.isDashed, false);
			assert.equal(onSlice.alpha, 1.0);

			const nearSlice = calculateNerveDistanceGating(2.0);
			assert.equal(nearSlice.isVisible, true);
			assert.equal(nearSlice.isDashed, false);
			assert.ok(Math.abs(nearSlice.alpha - Math.exp(-1.0)) < 0.01);
		});

		it("renders solid stroke for delta <= 3.5 mm", () => {
			const gate3mm = calculateNerveDistanceGating(3.0);
			assert.equal(gate3mm.isVisible, true);
			assert.equal(gate3mm.isDashed, false);
			assert.ok(gate3mm.alpha > 0.05);
		});

		it("renders dashed stroke for 3.5 < delta <= 6.0 mm", () => {
			const gate4mm = calculateNerveDistanceGating(4.0);
			assert.equal(gate4mm.isVisible, true);
			assert.equal(gate4mm.isDashed, true);
			assert.ok(gate4mm.alpha > 0.01);

			const gate6mm = calculateNerveDistanceGating(6.0);
			assert.equal(gate6mm.isVisible, true);
			assert.equal(gate6mm.isDashed, true);
		});

		it("gates off / hides nerve when delta > 6.0 mm", () => {
			const gate7mm = calculateNerveDistanceGating(7.0);
			assert.equal(gate7mm.isVisible, false);
			assert.equal(gate7mm.alpha, 0.0);
		});

		it("interpolates smooth 3D Catmull-Rom spline and calculates physical trajectory length", () => {
			const waypoints: Point3D[] = [
				{ x: -15, y: -10, z: -10 },
				{ x: -10, y: -5, z: -8 },
				{ x: -5, y: 0, z: -6 },
				{ x: 0, y: 5, z: -4 },
			];
			const spline = interpolateNerveSpline3D(waypoints, 10);
			assert.ok(spline.length >= 30);
			const totalLen = calculateSplineLength3DMm(spline);
			assert.ok(totalLen > 20 && totalLen < 40);

			const segments = getGatedNerveSegments(spline, -8.0);
			assert.ok(segments.length > 0);
			assert.ok(segments.every((s) => s.alpha > 0));
		});
	});

	// ─── 4. PHYSICAL CALIPER & PROTRACTOR MATH ────────────────────────────────
	describe("4. Physical 3D Calipers & Protractor Trigonometry", () => {
		it("calculates Euclidean 3D distance with 0.01 mm precision", () => {
			const p1: Point3D = { x: 0, y: 0, z: 0 };
			const p2: Point3D = { x: 3, y: 4, z: 12 };
			const dist = calculatePhysicalDistance3DMm(p1, p2);
			assert.equal(dist, 13.0);
		});

		it("calculates 3D angle between 3 points with vertex at p2", () => {
			const p1: Point3D = { x: 10, y: 0, z: 0 };
			const vertex: Point3D = { x: 0, y: 0, z: 0 };
			const p2: Point3D = { x: 0, y: 10, z: 0 };
			const angle = calculateAngleBetween3Points3D(p1, vertex, p2);
			assert.equal(angle, 90.0);

			const straightP2: Point3D = { x: -10, y: 0, z: 0 };
			const straightAngle = calculateAngleBetween3Points3D(p1, vertex, straightP2);
			assert.equal(straightAngle, 180.0);
		});
	});
});
