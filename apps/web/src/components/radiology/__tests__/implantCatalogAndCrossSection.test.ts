import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	STANDARD_CLINICAL_DIAMETERS,
	STANDARD_CLINICAL_LENGTHS,
	CLINICAL_IMPLANT_BRANDS,
	CLINICAL_IMPLANT_LIBRARY,
	IMPLANT_PLATFORM_COLORS,
	buildClinicalImplantSpec,
	findClinicalImplant,
	calculateImplantCrossSectionGeometry,
	evaluateImplantObstacleClearance,
	type ClinicalImplantBrandKey,
} from "../mpr/workspaces/implant/implantCatalog";
import {
	measureCrossSectionRidgeWidths2_4_6,
} from "../cbctRidgeCaliperMath";

describe("Mandate 8l — Implant Catalog, Cross-Section Geometry & Caliper Tests", () => {
	it("verifies standard clinical implant size matrix (4 diameters x 4 lengths)", () => {
		assert.deepEqual(STANDARD_CLINICAL_DIAMETERS, [3.5, 4.0, 4.5, 5.0]);
		assert.deepEqual(STANDARD_CLINICAL_LENGTHS, [8.0, 10.0, 11.5, 13.0]);
		assert.equal(CLINICAL_IMPLANT_BRANDS.length, 5);
		assert.equal(CLINICAL_IMPLANT_LIBRARY.length, 80); // 5 brands * 4 diameters * 4 lengths
	});

	it("verifies platform ISO color coding convention", () => {
		assert.equal(IMPLANT_PLATFORM_COLORS[3.5]?.hex, "#eab308"); // Narrow Yellow
		assert.equal(IMPLANT_PLATFORM_COLORS[4.0]?.hex, "#10b981"); // Regular Green
		assert.equal(IMPLANT_PLATFORM_COLORS[4.5]?.hex, "#06b6d4"); // Wide Cyan
		assert.equal(IMPLANT_PLATFORM_COLORS[5.0]?.hex, "#a855f7"); // Molar Purple
	});

	it("builds clinical implant spec with apical taper and 2.0 mm safety zone", () => {
		const spec = buildClinicalImplantSpec("osstem", 4.0, 10.0);
		assert.equal(spec.brand, "osstem");
		assert.equal(spec.diameterMm, 4.0);
		assert.equal(spec.lengthMm, 10.0);
		assert.equal(spec.platformDiameterMm, 4.0);
		assert.equal(spec.safetyZoneMm, 2.0); // Strict clinical safety invariant
		assert.ok(spec.apexDiameterMm < spec.diameterMm, "Apex diameter must be tapered");
		assert.equal(spec.apexDiameterMm, 2.7);
		assert.equal(spec.articleNumber, "TS3S40100");
	});

	it("findClinicalImplant correctly locates exact matches or fallback", () => {
		const straumann = findClinicalImplant("straumann", 4.5, 11.5);
		assert.equal(straumann.brand, "straumann");
		assert.equal(straumann.diameterMm, 4.5);
		assert.equal(straumann.lengthMm, 11.5);
		assert.equal(straumann.safetyZoneMm, 2.0);

		const dentium = findClinicalImplant("dentium", 5.0, 8.0);
		assert.equal(dentium.brand, "dentium");
		assert.equal(dentium.diameterMm, 5.0);
		assert.equal(dentium.lengthMm, 8.0);
	});

	it("calculates 2D cross-section geometry vertices including apical taper and safety corridor", () => {
		const spec = buildClinicalImplantSpec("nobel_biocare", 4.0, 10.0);
		const geom = calculateImplantCrossSectionGeometry(
			spec,
			{ depthMm: 0.5, xOffsetMm: 0.0, angulationDeg: 0.0 },
			{ x: 0.0, y: 14.0 }, // crestReferenceMm
		);

		assert.equal(geom.platformWidthMm, 4.0);
		assert.equal(geom.safetyMarginMm, 2.0);
		assert.equal(geom.totalLengthMm, 10.0);
		assert.equal(geom.implantPolygonMm.length, 6, "Implant body polygon must have 6 vertices (tapered)");
		assert.equal(geom.safetyZonePolygonMm.length, 7, "Safety corridor polygon must have 7 vertices");

		// Platform entry Y should be crestY + depth = 14.0 + 0.5 = 14.5
		assert.equal(geom.entryCenterMm.y, 14.5);
		// Apex Y should be entryY + length = 14.5 + 10.0 = 24.5
		assert.equal(geom.apexCenterMm.y, 24.5);
	});

	it("correctly evaluates implant clearance to anatomical obstacle with safety buffer", () => {
		const spec = buildClinicalImplantSpec("osstem", 4.0, 10.0);
		const geom = calculateImplantCrossSectionGeometry(
			spec,
			{ depthMm: 0.5, xOffsetMm: 0.0, angulationDeg: 0.0 },
			{ x: 0.0, y: 10.0 }, // crestReferenceMm
		);

		// Apex Y is 10.0 (crest) + 0.5 (depth) + 10.0 (length) = 20.5 mm
		assert.equal(geom.apexCenterMm.y, 20.5);

		// Obstacle far below apex: distance = 29.0 - 20.5 = 8.5 mm -> safe
		const safeCheck = evaluateImplantObstacleClearance(geom.apexCenterMm.y, 29.0, 2.0);
		assert.equal(safeCheck.status, "safe");
		assert.ok(safeCheck.clearanceMm! > 5.0);

		// Obstacle within warning zone (buffer < 2.0 mm): distance = 22.0 - 20.5 = 1.5 mm
		const warnCheck = evaluateImplantObstacleClearance(geom.apexCenterMm.y, 22.0, 2.0);
		assert.equal(warnCheck.status, "warning");

		// Obstacle intersecting implant apex: distance <= 0 mm
		const dangerCheck = evaluateImplantObstacleClearance(geom.apexCenterMm.y, 20.0, 2.0);
		assert.equal(dangerCheck.status, "danger");
	});

	it("measures cross-section alveolar ridge widths at 2 mm, 4 mm, and 6 mm depths (W2, W4, W6)", () => {
		// Create synthetic cross-section slice with realistic cortical bone bell curve (RGBA format)
		const width = 80;
		const height = 80;
		const slice = new Uint8ClampedArray(width * height * 4);
		const spacing = 0.25; // 0.25 mm/px -> 20 mm x 20 mm

		// Ridge apex at y = 15 px (3.75 mm). Cortical crest grayscale = 220.
		// Alveolar bone width widens downwards:
		// At depth 2 mm (8 px down, y = 23): width = 24 px (6.0 mm)
		// At depth 4 mm (16 px down, y = 31): width = 28 px (7.0 mm)
		// At depth 6 mm (24 px down, y = 39): width = 32 px (8.0 mm)
		const crestY = 15;
		const midX = 40;

		for (let y = crestY; y < 70; y++) {
			const dy = y - crestY;
			const halfWidthPx = 8 + dy * 0.5; // grows from 8 px (4 mm) to 35 px
			for (let x = 0; x < width; x++) {
				const idx = (y * width + x) * 4;
				if (Math.abs(x - midX) <= halfWidthPx) {
					slice[idx] = 200;     // R (gray)
					slice[idx + 1] = 200; // G
					slice[idx + 2] = 200; // B
					slice[idx + 3] = 255; // A
				} else {
					slice[idx] = 10;
					slice[idx + 1] = 10;
					slice[idx + 2] = 10;
					slice[idx + 3] = 255;
				}
			}
		}

		const result = measureCrossSectionRidgeWidths2_4_6(slice, width, height, spacing, "mandible");

		assert.ok(result.widthW2Mm > 0, "W2 must be measured");
		assert.ok(result.widthW4Mm > 0, "W4 must be measured");
		assert.ok(result.widthW6Mm > 0, "W6 must be measured");
		assert.ok(result.widthW4Mm >= result.widthW2Mm, "Alveolar ridge should widen apically: W4 >= W2");
		assert.ok(result.widthW6Mm >= result.widthW4Mm, "Alveolar ridge should widen apically: W6 >= W4");
		assert.ok(result.availableHeightMm > 5.0, "Available bone height should be positive");
	});

	it("prevents absurd 23.3 mm full-width measurement when noise/tissue bleeds to image edge", () => {
		const width = 93; // 93 * 0.25mm = 23.25mm (exact user screenshot dimension)
		const height = 120;
		const spacing = 0.25;
		const slice = new Uint8ClampedArray(width * height * 4);

		// Fill entire right side with gray value 90 (simulating soft tissue / noise bleeding to edge)
		for (let y = 10; y < height; y++) {
			for (let x = 30; x < width; x++) {
				const idx = (y * width + x) * 4;
				slice[idx] = 90;
				slice[idx + 1] = 90;
				slice[idx + 2] = 90;
				slice[idx + 3] = 255;
			}
		}

		const result = measureCrossSectionRidgeWidths2_4_6(slice, width, height, spacing, "mandible");

		// Crucial assertion: caliper must NEVER return full image width (23.3 mm)
		assert.notStrictEqual(result.widthW2Mm, 23.3, "Caliper must NEVER return full canvas width 23.3 mm");
		assert.ok(
			!result.isDetected || (result.widthW2Mm >= 3.0 && result.widthW2Mm <= 11.5),
			`W2 must be in anatomical corridor [3.0 .. 11.5] or rejected (got ${result.widthW2Mm} mm)`,
		);
		assert.ok(
			!result.isDetected || (result.widthW4Mm >= 3.0 && result.widthW4Mm <= 12.0),
			`W4 must be in anatomical corridor [3.0 .. 12.0] or rejected (got ${result.widthW4Mm} mm)`,
		);
		assert.ok(
			!result.isDetected || (result.widthW6Mm >= 3.0 && result.widthW6Mm <= 13.0),
			`W6 must be in anatomical corridor [3.0 .. 13.0] or rejected (got ${result.widthW6Mm} mm)`,
		);
	});

	it("accurately detects cortical crest bone boundaries using rawHuData", () => {
		const width = 80;
		const height = 100;
		const spacing = 0.25;
		const rgba = new Uint8ClampedArray(width * height * 4);
		const rawHu = new Int16Array(width * height);

		// Initialize with air (-1000 HU)
		rawHu.fill(-1000);

		// Create bone structure with cortical shell (HU +600) and trabecular core (HU +350)
		const crestY = 20;
		const midX = 40;
		for (let y = crestY; y < 70; y++) {
			const halfW = 10 + (y - crestY) * 0.2; // 2.5 mm to 3.5 mm half-span (5.0 to 7.0 mm total)
			for (let x = 0; x < width; x++) {
				const dx = Math.abs(x - midX);
				const idx = y * width + x;
				if (dx <= halfW) {
					// Cortical border or trabecular bone
					rawHu[idx] = dx >= halfW - 2 ? 650 : 350;
					rgba[idx * 4] = 200;
					rgba[idx * 4 + 1] = 200;
					rgba[idx * 4 + 2] = 200;
					rgba[idx * 4 + 3] = 255;
				}
			}
		}

		const result = measureCrossSectionRidgeWidths2_4_6(rgba, width, height, spacing, "mandible", rawHu);

		assert.strictEqual(result.isDetected, true, "Crest must be detected from HU data");
		assert.strictEqual(result.w2Valid, true, "W2 must be valid");
		assert.ok(result.widthW2Mm >= 4.5 && result.widthW2Mm <= 6.5, `Expected W2 ~ 5.5mm, got ${result.widthW2Mm}mm`);
		assert.ok(result.widthW4Mm >= 5.0 && result.widthW4Mm <= 7.0, `Expected W4 ~ 6.0mm, got ${result.widthW4Mm}mm`);
		assert.ok(result.widthW6Mm >= 5.5 && result.widthW6Mm <= 7.5, `Expected W6 ~ 6.5mm, got ${result.widthW6Mm}mm`);
	});
});
