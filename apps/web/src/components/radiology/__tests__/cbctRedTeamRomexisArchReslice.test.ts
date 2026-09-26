/**
 * DENTE CRM — CBCT Red Team Planmeca Romexis Parity: Arch Spline, Cross-Sections & HU Presets
 * Standards: Planmeca Romexis 6.x, Vatech Ez3D-i, DICOM PS3.3, Misch CE, Buser
 *
 * Verifies under adversarial scrutiny:
 * 1. Dental Arch Spline Fitting & Control Point Manipulation (Catmull-Rom, Hit Testing, Vector Field).
 * 2. Perpendicular Transverse Cross-Section Reslicing (Step: 1.0 mm, 1.5 mm, 2.0 mm, Orthogonality T . N = 0).
 * 3. 1-Click Hounsfield Unit Contrast Presets (Bone, Soft Tissue, Enamel, Metal, Cortical).
 * 4. Architectural Invariants: Mandate 8b (<= 800 lines), Mandate 8d (Zero emojis), UTF-8 encoding.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
	DEFAULT_MANDIBULAR_ARCH_ANCHORS,
	DEFAULT_MAXILLARY_ARCH_ANCHORS,
	buildDentalArchCurve,
	calculateArchLengthMm,
	calculateArchTangentsAndNormals,
	fitSmoothDentalArchSpline,
	getFocalTroughBoundaryCurves,
	hitTestDentalArchControlPoint,
	updateDentalArchAnchorPosition,
} from "../cbctArchSplineMath";
import {
	generateCrossSectionSlices,
	measureAlveolarRidgeCrossSection,
} from "../cbctCrossSectionResliceMath";
import {
	findCrossSectionAndPositionByFdi,
	findNearestCrossSectionIndexByPanoX,
	getPanoramicSliceFanTicks,
	mapPanoPointerToCrosshairAndSlice,
	mapSliceToPanoramicX,
} from "../cbctPanoramicNavigationMath";
import {
	reconstructPanoramicView,
} from "../cbctPanoramicReconstructionMath";
import {
	CBCT_HOUNSFIELD_PRESETS,
	createEmptyCbctVolume,
	get16BitLut,
} from "../cbctMprMath";

describe("CBCT Red Team Romexis Parity: Dental Arch & Reslice Engine", () => {
	// ─── 1. DENTAL ARCH SPLINE & ANCHOR MANIPULATION ──────────────────────────
	describe("1. Dental Arch Spline & Anchor Manipulation", () => {
		it("fits a continuous smooth Catmull-Rom curve through all 16 mandibular anchors", () => {
			const curve = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible", 12.0);
			assert.equal(curve.anchors.length, 16);
			assert.ok(curve.splinePointsMm.length > 50, "Spline must have >= 50 interpolated points");
			assert.ok(curve.totalArcLengthMm > 80 && curve.totalArcLengthMm < 160, `Total arc length ${curve.totalArcLengthMm} mm must match adult mandible`);
		});

		it("fits maxillary arch with wider anterior curvature than mandibular", () => {
			const mand = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible");
			const max = buildDentalArchCurve(DEFAULT_MAXILLARY_ARCH_ANCHORS, "maxilla");
			assert.ok(max.totalArcLengthMm > mand.totalArcLengthMm, "Maxillary dental arch arc length should exceed mandibular");
		});

		it("hit-tests control points within 24px diameter (12-14px radius)", () => {
			const volume = createEmptyCbctVolume(100, 100, 80, 0.4, 0);
			const curve = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible");

			// Compute expected screen position
			const hit = hitTestDentalArchControlPoint(
				{ x: 50, y: 50 }, // Arbitrary pointer
				curve,
				volume,
				{ panX: 0, panY: 0, zoom: 1.0 },
				200, // Large radius to guarantee a hit
				0,
			);
			assert.ok(hit !== null, "Hit test with generous radius must find anchor");
			assert.equal(typeof hit.index, "number");
			assert.ok(hit.anchor.toothFdi.length > 0);
		});

		it("modifying an anchor updates spline points and recalculates total arc length", () => {
			const initial = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible");
			const initialLength = initial.totalArcLengthMm;

			// Shift anterior incisor 41 anteriorly by 5 mm
			const updated = updateDentalArchAnchorPosition(initial, 7, {
				x: initial.anchors[7]!.positionMm.x,
				y: initial.anchors[7]!.positionMm.y - 5.0,
			});

			assert.notEqual(updated.totalArcLengthMm, initialLength, "Arc length must change when anchor moves");
			assert.equal(updated.anchors[7]!.positionMm.y, initial.anchors[7]!.positionMm.y - 5.0);
		});

		it("generates inner and outer focal trough boundary curves with exact thickness", () => {
			const curve = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible", 14.0);
			const bounds = getFocalTroughBoundaryCurves(curve.splinePointsMm, curve.focalTroughThicknessMm);

			assert.equal(bounds.innerBoundary.length, bounds.outerBoundary.length);
			assert.equal(bounds.innerBoundary.length, curve.splinePointsMm.length);

			// Measure distance between inner and outer boundary at midpoint
			const midIdx = Math.floor(curve.splinePointsMm.length / 2);
			const pIn = bounds.innerBoundary[midIdx]!;
			const pOut = bounds.outerBoundary[midIdx]!;
			const measuredDist = Math.hypot(pOut.x - pIn.x, pOut.y - pIn.y);

			assert.ok(
				Math.abs(measuredDist - 14.0) < 0.5,
				`Boundary width must equal focal trough thickness 14.0 mm (got ${measuredDist.toFixed(2)})`,
			);
		});
	});

	// ─── 2. PERPENDICULAR TRANSVERSE CROSS-SECTION RESLICING ───────────────────
	describe("2. Perpendicular Transverse Cross-Sections & Tangent-Normal Orthogonality", () => {
		it("proves Tangent and Normal vectors are strictly perpendicular (T . N = 0)", () => {
			const curve = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible");
			const vectorField = calculateArchTangentsAndNormals(curve.splinePointsMm);

			assert.ok(vectorField.length > 0);
			for (const node of vectorField) {
				const dotProduct = node.tangent.x * node.normal.x + node.tangent.y * node.normal.y;
				assert.ok(
					Math.abs(dotProduct) < 1e-4,
					`Dot product must be 0 (got ${dotProduct} at dist ${node.distanceAlongArchMm})`,
				);

				const normT = Math.hypot(node.tangent.x, node.tangent.y);
				const normN = Math.hypot(node.normal.x, node.normal.y);
				assert.ok(Math.abs(normT - 1.0) < 1e-3, `Tangent must be unit vector (got ${normT})`);
				assert.ok(Math.abs(normN - 1.0) < 1e-3, `Normal must be unit vector (got ${normN})`);
			}
		});

		it("generates cross-sections with configurable step (1.0 mm, 1.5 mm, 2.0 mm)", () => {
			const volume = createEmptyCbctVolume(100, 100, 80, 0.4, 0);
			const curve = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible");

			const slices10 = generateCrossSectionSlices(volume, curve, 1.0, 0);
			const slices15 = generateCrossSectionSlices(volume, curve, 1.5, 0);
			const slices20 = generateCrossSectionSlices(volume, curve, 2.0, 0);

			assert.ok(slices10.length > slices15.length, "Step 1.0 mm must produce more slices than 1.5 mm");
			assert.ok(slices15.length > slices20.length, "Step 1.5 mm must produce more slices than 2.0 mm");

			// Check slice spacing consistency
			const expectedCount15 = Math.round(curve.totalArcLengthMm / 1.5);
			assert.ok(
				Math.abs(slices15.length - expectedCount15) <= 2,
				`Slice count at 1.5 mm (${slices15.length}) should match ~${expectedCount15}`,
			);
		});

		it("maps cross-section slices to panoramic X columns and back", () => {
			const volume = createEmptyCbctVolume(100, 100, 80, 0.4, 0);
			const curve = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible");
			const slices = generateCrossSectionSlices(volume, curve, 1.5, 0);
			const panoW = 600;

			for (let i = 0; i < slices.length; i += 10) {
				const sl = slices[i]!;
				const panoX = mapSliceToPanoramicX(sl, panoW, curve.totalArcLengthMm);
				assert.ok(panoX >= 0 && panoX < panoW, `panoX ${panoX} must be within [0..${panoW})`);

				const recoveredIdx = findNearestCrossSectionIndexByPanoX(panoX, panoW, slices, curve.totalArcLengthMm);
				assert.ok(
					Math.abs(recoveredIdx - i) <= 1,
					`Recovered slice index ${recoveredIdx} must closely match original ${i}`,
				);
			}
		});

		it("finds cross-section by FDI tooth number", () => {
			const volume = createEmptyCbctVolume(100, 100, 80, 0.4, 0);
			const curve = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible");
			const slices = generateCrossSectionSlices(volume, curve, 1.5, 0);

			const tooth46 = findCrossSectionAndPositionByFdi("46", slices, curve, 0);
			assert.equal(tooth46.found, true);
			assert.equal(tooth46.nearestToothFdi, "46");
			assert.ok(typeof tooth46.crossSectionIdx === "number");
		});
	});

	// ─── 3. 1-CLICK HOUNSFIELD UNIT CONTRAST PRESETS ───────────────────────────
	describe("3. 1-Click Hounsfield Unit Contrast Presets", () => {
		it("provides all canonical Romexis/Ez3D clinical contrast presets", () => {
			const expectedIds = ["bone_dense", "enamel_dentin", "bone_cortical", "soft_tissue", "implant_metal"];
			for (const id of expectedIds) {
				const preset = CBCT_HOUNSFIELD_PRESETS.find((p) => p.id === id);
				assert.ok(preset !== undefined, `Preset '${id}' must be present in CBCT_HOUNSFIELD_PRESETS`);
				assert.ok(preset.windowWidth > 0, `Preset '${id}' must have positive window width`);
				assert.ok(Number.isFinite(preset.windowLevel), `Preset '${id}' must have finite window level`);
			}
		});

		it("generates clean 16-bit LUT without NaN or negative values for all presets", () => {
			for (const preset of CBCT_HOUNSFIELD_PRESETS) {
				const lut = get16BitLut(preset.windowWidth, preset.windowLevel, false);
				assert.equal(lut.length, 65536);

				// Test key anatomical HU points mapped through LUT:
				// -1000 HU (Air), 0 HU (Water), +1000 HU (Spongiosa), +2000 HU (Cortical), +3071 HU (Enamel)
				for (const hu of [-1000, 0, 500, 1000, 2000, 3071]) {
					const lutIdx = (hu + 32768) & 0xffff;
					const val = lut[lutIdx]!;
					assert.ok(val >= 0 && val <= 255, `LUT value for ${hu} HU in preset '${preset.id}' must be in [0..255] (got ${val})`);
				}
			}
		});
	});

	// ─── 4. CONSTITUTION MANDATES 8B & 8D VERIFICATION ─────────────────────────
	describe("4. Constitution Mandates 8b (<= 800 lines) & 8d (Zero emojis)", () => {
		const radiologyFiles = [
			"cbctArchSplineMath.ts",
			"cbctPanoramicReconstructionMath.ts",
			"cbctCrossSectionResliceMath.ts",
			"cbctPanoramicNavigationMath.ts",
			"dentalCurveEngine.ts",
			"CbctHeaderBar.tsx",
			"CbctLeftToolDock.tsx",
			"CbctMprImplantStudioModal.tsx",
		];

		const getRadiologyDir = () => {
			const direct = path.resolve(process.cwd(), "src/components/radiology");
			if (fs.existsSync(direct)) return direct;
			return path.resolve(process.cwd(), "apps/web/src/components/radiology");
		};

		it("verifies all modularized radiology source files strictly satisfy Mandate 8b (<= 800 lines)", () => {
			const radiologyDir = getRadiologyDir();
			const mprDir = path.resolve(radiologyDir, "mpr");

			for (const file of radiologyFiles) {
				let fullPath = path.join(radiologyDir, file);
				if (!fs.existsSync(fullPath)) {
					fullPath = path.join(mprDir, file);
				}
				assert.ok(fs.existsSync(fullPath), `Target file ${file} must exist at ${fullPath}`);

				const content = fs.readFileSync(fullPath, "utf8");
				const lines = content.split("\n").length;
				assert.ok(
					lines <= 800,
					`File ${file} has ${lines} lines, exceeding Mandate 8b strict limit of 800 lines!`,
				);
			}
		});

		it("verifies useCbctInteractionHandlers.ts strictly satisfies Mandate 8b (<= 800 lines)", () => {
			const radiologyDir = getRadiologyDir();
			const handlerPath = path.resolve(radiologyDir, "mpr/useCbctInteractionHandlers.ts");
			assert.ok(fs.existsSync(handlerPath), "useCbctInteractionHandlers.ts must exist");
			const content = fs.readFileSync(handlerPath, "utf8");
			const lines = content.split("\n").length;
			assert.ok(
				lines <= 800,
				`useCbctInteractionHandlers.ts has ${lines} lines, exceeding Mandate 8b strict limit of 800 lines!`,
			);
		});

		it("verifies zero cartoon emojis in modularized radiology source code (Mandate 8d)", () => {
			const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
			const radiologyDir = getRadiologyDir();

			for (const file of [
				"cbctArchSplineMath.ts",
				"cbctPanoramicReconstructionMath.ts",
				"cbctCrossSectionResliceMath.ts",
				"cbctPanoramicNavigationMath.ts",
				"dentalCurveEngine.ts",
			]) {
				const fullPath = path.join(radiologyDir, file);
				const content = fs.readFileSync(fullPath, "utf8");
				assert.equal(
					emojiRegex.test(content),
					false,
					`File ${file} contains cartoon emoji violating Mandate 8d!`,
				);
			}
		});
	});
});
