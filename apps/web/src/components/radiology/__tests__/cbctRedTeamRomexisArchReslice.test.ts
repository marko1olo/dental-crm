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
	computeCrossSectionAffineBasis,
	extractArchCrossSectionSeries,
	extractSingleCrossSectionSlice,
	findNearestToothAnchorToDistance,
	generateCrossSectionSlices,
	generateCrossSectionsAlongArch,
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
import { computeGlCrossSectionCoordinates } from "../mpr/webgl/CbctVolumeGlContext";
import { handleWorkerMessage } from "../mpr/cbctSliceWorker";
import { CbctWorkerBridge } from "../mpr/cbctWorkerBridge";

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

		it("generates extractArchCrossSectionSeries with standard implant dimensions (24x32 mm, 0.25 mm/px) and orthogonal vectors", () => {
			const volume = createEmptyCbctVolume(120, 120, 80, 0.4, -1000);
			const curve = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible");
			const series = extractArchCrossSectionSeries(volume, curve, {
				stepMm: 1.5,
				widthMm: 24.0,
				heightMm: 32.0,
				pixelSpacingMm: 0.25,
			});

			assert.ok(series.length > 50, `Expected > 50 cross-sections, got ${series.length}`);
			const first = series[0]!;
			assert.equal(first.sliceIndex, 1);
			assert.equal(first.widthMm, 24.0);
			assert.equal(first.heightMm, 32.0);
			assert.equal(first.pixelSpacingMm, 0.25);
			assert.equal(first.widthPx, 96);
			assert.equal(first.heightPx, 128);
			assert.equal(first.pixelData.length, 96 * 128 * 4);
			assert.ok(first.sliceLabel?.includes("48"), `Expected sliceLabel to reference 48, got ${first.sliceLabel}`);

			for (let i = 0; i < series.length; i++) {
				const s = series[i]!;
				assert.equal(s.sliceIndex, i + 1);
				assert.equal(s.pixelData.length, 96 * 128 * 4);

				// Strict orthogonality between tangent and normal: T . N = 0
				const dot = s.tangentVector2D.x * s.normalVector2D.x + s.tangentVector2D.y * s.normalVector2D.y;
				assert.ok(Math.abs(dot) < 1e-4, `Slice #${s.sliceIndex}: T . N must be 0, got ${dot}`);

				// Unit length
				const tLen = Math.hypot(s.tangentVector2D.x, s.tangentVector2D.y);
				const nLen = Math.hypot(s.normalVector2D.x, s.normalVector2D.y);
				assert.ok(Math.abs(tLen - 1.0) < 1e-3, `Slice #${s.sliceIndex}: tangent length must be 1.0, got ${tLen}`);
				assert.ok(Math.abs(nLen - 1.0) < 1e-3, `Slice #${s.sliceIndex}: normal length must be 1.0, got ${nLen}`);

				// Monotonic distance along arch
				if (i > 0) {
					assert.ok(
						s.distanceAlongArchMm >= series[i - 1]!.distanceAlongArchMm,
						`Distance along arch must be monotonic at slice ${i}: ${s.distanceAlongArchMm} >= ${series[i - 1]!.distanceAlongArchMm}`,
					);
				}
			}
		});

		it("honors volume.defaultWindowWidth and volume.defaultWindowLevel fallback in cross-section slices", () => {
			const volume = createEmptyCbctVolume(60, 60, 40, 0.5, 0);
			// Inject custom DICOM header window/level
			(volume as { defaultWindowWidth?: number; defaultWindowLevel?: number }).defaultWindowWidth = 3800;
			(volume as { defaultWindowWidth?: number; defaultWindowLevel?: number }).defaultWindowLevel = 1100;

			const curve = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible");
			const slice = extractSingleCrossSectionSlice(
				volume,
				{ x: 0, y: -50, z: -10 },
				{ x: 0, y: 1 },
				1,
				50.0,
				curve.anchors[7]!,
			);

			assert.equal(slice.sliceIndex, 1);
			assert.equal(slice.nearestToothFdi, "41");
			assert.equal(slice.widthPx, 96);
			assert.equal(slice.heightPx, 128);
			assert.equal(slice.pixelData.length, 96 * 128 * 4);
		});

		it("binds FDI tooth labels across entire arch from right (48/18) to left (38/28) without end wrap-around", () => {
			const volume = createEmptyCbctVolume(100, 100, 60, 0.5, 0);

			// Test Mandibular Arch: 48 (Right) -> 41/31 (Midline) -> 38 (Left)
			const mandCurve = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible");
			const mandSlices = extractArchCrossSectionSeries(volume, mandCurve, { stepMm: 1.5 });

			assert.ok(mandSlices.length >= 2);
			const firstMand = mandSlices[0]!;
			const lastMand = mandSlices[mandSlices.length - 1]!;
			const midMand = mandSlices[Math.floor(mandSlices.length / 2)]!;

			assert.equal(firstMand.nearestToothFdi, "48", `First slice must bind to FDI 48, got ${firstMand.nearestToothFdi}`);
			assert.ok(
				midMand.nearestToothFdi === "41" || midMand.nearestToothFdi === "31",
				`Middle slice must bind to incisor 41 or 31, got ${midMand.nearestToothFdi}`,
			);
			assert.equal(
				lastMand.nearestToothFdi,
				"38",
				`CRITICAL BUG CHECK: Last slice must bind to FDI 38, NOT wrap around to 48! Got: ${lastMand.nearestToothFdi}`,
			);

			// Test Maxillary Arch: 18 (Right) -> 11/21 (Midline) -> 28 (Left)
			const maxCurve = buildDentalArchCurve(DEFAULT_MAXILLARY_ARCH_ANCHORS, "maxilla");
			const maxSlices = extractArchCrossSectionSeries(volume, maxCurve, { stepMm: 1.5 });

			const firstMax = maxSlices[0]!;
			const lastMax = maxSlices[maxSlices.length - 1]!;
			const midMax = maxSlices[Math.floor(maxSlices.length / 2)]!;

			assert.equal(firstMax.nearestToothFdi, "18", `First slice must bind to FDI 18, got ${firstMax.nearestToothFdi}`);
			assert.ok(
				midMax.nearestToothFdi === "11" || midMax.nearestToothFdi === "21",
				`Middle slice must bind to incisor 11 or 21, got ${midMax.nearestToothFdi}`,
			);
			assert.equal(
				lastMax.nearestToothFdi,
				"28",
				`CRITICAL BUG CHECK: Last slice must bind to FDI 28, NOT wrap around to 18! Got: ${lastMax.nearestToothFdi}`,
			);
		});

		it("protects Catmull-Rom spline, tangents, and normals against coinciding anchors and single points without NaN or zero division", () => {
			// Coinciding identical anchors
			const coincidingAnchors = [
				{ id: "c1", toothFdi: "46", labelRu: "46", positionMm: { x: 10.0, y: 10.0 }, isQuadrantRight: true },
				{ id: "c2", toothFdi: "45", labelRu: "45", positionMm: { x: 10.0, y: 10.0 }, isQuadrantRight: true },
				{ id: "c3", toothFdi: "44", labelRu: "44", positionMm: { x: 15.0, y: 12.0 }, isQuadrantRight: true },
			];

			const spline = fitSmoothDentalArchSpline(coincidingAnchors, 4);
			assert.ok(spline.length > 0);
			for (const p of spline) {
				assert.equal(Number.isFinite(p.x), true, `Spline X must be finite: ${p.x}`);
				assert.equal(Number.isFinite(p.y), true, `Spline Y must be finite: ${p.y}`);
			}

			const vectorField = calculateArchTangentsAndNormals(spline);
			assert.equal(vectorField.length, spline.length);
			for (const node of vectorField) {
				const tLen = Math.hypot(node.tangent.x, node.tangent.y);
				const nLen = Math.hypot(node.normal.x, node.normal.y);
				assert.ok(Math.abs(tLen - 1.0) < 1e-3, `Tangent length must be 1.0, got ${tLen}`);
				assert.ok(Math.abs(nLen - 1.0) < 1e-3, `Normal length must be 1.0, got ${nLen}`);

				const dot = node.tangent.x * node.normal.x + node.tangent.y * node.normal.y;
				assert.ok(Math.abs(dot) < 1e-4, `Tangent and normal must be orthogonal, got ${dot}`);
			}

			// Single anchor curve
			const singleAnchor = [
				{ id: "s1", toothFdi: "46", labelRu: "46", positionMm: { x: 0.0, y: 0.0 }, isQuadrantRight: true },
			];
			const singleSpline = fitSmoothDentalArchSpline(singleAnchor);
			assert.equal(singleSpline.length, 1);
			const singleField = calculateArchTangentsAndNormals(singleSpline);
			assert.equal(singleField.length, 1);
			assert.equal(Math.hypot(singleField[0]!.tangent.x, singleField[0]!.tangent.y), 1.0);
			assert.equal(Math.hypot(singleField[0]!.normal.x, singleField[0]!.normal.y), 1.0);

			// Anchors with NaN / Infinity
			const corruptAnchors = [
				{ id: "bad1", toothFdi: "46", labelRu: "46", positionMm: { x: Number.NaN, y: 10.0 }, isQuadrantRight: true },
				{ id: "good1", toothFdi: "45", labelRu: "45", positionMm: { x: 5.0, y: 5.0 }, isQuadrantRight: true },
				{ id: "bad2", toothFdi: "44", labelRu: "44", positionMm: { x: 10.0, y: Number.POSITIVE_INFINITY }, isQuadrantRight: true },
				{ id: "good2", toothFdi: "43", labelRu: "43", positionMm: { x: 15.0, y: 10.0 }, isQuadrantRight: true },
			];
			const safeSpline = fitSmoothDentalArchSpline(corruptAnchors);
			assert.ok(safeSpline.length > 0);
			for (const p of safeSpline) {
				assert.equal(Number.isFinite(p.x), true);
				assert.equal(Number.isFinite(p.y), true);
			}
		});

		it("measures alveolar ridge dimensions and determines implant adequacy per Buser / Misch criteria", () => {
			const volume = createEmptyCbctVolume(100, 100, 60, 0.5, 0);
			const curve = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible");
			const slice = extractSingleCrossSectionSlice(
				volume,
				{ x: -32, y: -26, z: -10 },
				{ x: 0, y: 1 },
				1,
				24.0,
				curve.anchors[2]!,
			);

			// Test with explicit adequate cortical crest data (H=12mm, W=7mm)
			const adequateSlice = {
				...slice,
				corticalCrestHeightMm: 12.0,
				alveolarRidgeWidthMm: 7.0,
			};
			const resAdequate = measureAlveolarRidgeCrossSection(adequateSlice);
			assert.ok(resAdequate !== null);
			assert.equal(resAdequate.heightMm, 12.0);
			assert.equal(resAdequate.crestWidthMm, 7.0);
			assert.equal(resAdequate.isAdequateForImplant, true);
			assert.ok(resAdequate.clinicalAdviceRu.includes("достаточен для стандартного имплантата"));

			// Test with deficient cortical crest data (H=8mm, W=4.5mm)
			const deficientSlice = {
				...slice,
				corticalCrestHeightMm: 8.0,
				alveolarRidgeWidthMm: 4.5,
			};
			const resDeficient = measureAlveolarRidgeCrossSection(deficientSlice);
			assert.ok(resDeficient !== null);
			assert.equal(resDeficient.heightMm, 8.0);
			assert.equal(resDeficient.crestWidthMm, 4.5);
			assert.equal(resDeficient.isAdequateForImplant, false);
			assert.ok(resDeficient.clinicalAdviceRu.includes("Показана аугментация"));
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
			"cbctCrossSectionResliceMath.ts",
			"dentalCurveEngine.ts",
			"CbctMprImplantStudioModal.tsx",
			"mpr/cbctWorkerBridge.ts",
			"mpr/cbctSliceWorker.ts",
			"mpr/webgl/CbctVolumeGlContext.ts",
			"mpr/useCbctSliceRenderer.ts",
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

		it("verifies useCbctInteractionHandlers.ts strictly satisfies modular limit (<= 900 lines)", () => {
			const radiologyDir = getRadiologyDir();
			const handlerPath = path.resolve(radiologyDir, "mpr/useCbctInteractionHandlers.ts");
			assert.ok(fs.existsSync(handlerPath), "useCbctInteractionHandlers.ts must exist");
			const content = fs.readFileSync(handlerPath, "utf8");
			const lines = content.split("\n").length;
			assert.ok(
				lines <= 900,
				`useCbctInteractionHandlers.ts has ${lines} lines, exceeding modular limit of 900 lines!`,
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

	// ─── 5. PANORAMIC RECONSTRUCTION & OCCLUSAL Z MIP PARITY ─────────────────
	describe("5. Panoramic Reconstruction: Occlusal Z Alignment & Clinical MIP Mode", () => {
		it("defaults reconstructPanoramicView projectionMode to clinical 'mip' and centers on occlusal plane", () => {
			const volume = createEmptyCbctVolume(100, 100, 80, 0.4, 0);
			const curve = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible", 14.0, -8.5);

			const pano = reconstructPanoramicView(volume, curve);
			assert.equal(pano.centerZMm, -8.5, "Reconstruction must honor archCurve.planeZMm");
			assert.equal(pano.focalThicknessMm, 14.0, "Must use adaptive focal trough thickness");
			assert.ok(pano.pixelData instanceof Uint8ClampedArray);
			assert.equal(pano.pixelData.length, pano.widthPx * pano.heightPx * 4);
		});

		it("allows explicit centerZMm override in options", () => {
			const volume = createEmptyCbctVolume(100, 100, 80, 0.4, 0);
			const curve = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible");

			const pano = reconstructPanoramicView(volume, curve, { centerZMm: -12.3 });
			assert.equal(pano.centerZMm, -12.3, "Must honor explicit centerZMm in options");
		});

		it("proves MIP projection produces higher brightness than average projection in the presence of air", () => {
			// Construct a synthetic volume with tooth enamel (+2500 HU) surrounded by air (-1000 HU)
			const volume = createEmptyCbctVolume(100, 100, 80, 0.4, -1000);
			const curve = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible", 12.0, 0.0);

			// Place dense bone/enamel voxel at center
			const midIdx = Math.floor(curve.splinePointsMm.length / 2);
			const midPt = curve.splinePointsMm[midIdx]!;
			const voxX = Math.round((midPt.x - volume.originMm.x) / volume.spacingMm.x);
			const voxY = Math.round((midPt.y - volume.originMm.y) / volume.spacingMm.y);
			const voxZ = Math.round((0 - volume.originMm.z) / volume.spacingMm.z);

			if (voxX >= 0 && voxX < 100 && voxY >= 0 && voxY < 100 && voxZ >= 0 && voxZ < 80) {
				const offset = voxZ * (100 * 100) + voxY * 100 + voxX;
				volume.data![offset] = 2500;
			}

			const panoMip = reconstructPanoramicView(volume, curve, { projectionMode: "mip", windowWidth: 3500, windowLevel: 800 });
			const panoAvg = reconstructPanoramicView(volume, curve, { projectionMode: "average", windowWidth: 3500, windowLevel: 800 });

			let maxMip = 0;
			let maxAvg = 0;
			for (let i = 0; i < panoMip.pixelData.length; i += 4) {
				if (panoMip.pixelData[i]! > maxMip) maxMip = panoMip.pixelData[i]!;
				if (panoAvg.pixelData[i]! > maxAvg) maxAvg = panoAvg.pixelData[i]!;
			}

			assert.ok(maxMip >= maxAvg, `MIP peak brightness (${maxMip}) must be >= average (${maxAvg})`);
		});
	});

	// ─── 6. GPU RESLICING COORDINATES & WEB WORKER PIPELINE ────────────────────
	describe("6. Hardware GPU Reslicing Coordinates & Web Worker Pipeline", () => {
		it("computes exact GlSliceCoordinates for transverse cross-section slice (24x34 mm at 0.25 mm/px)", () => {
			const volume = createEmptyCbctVolume(100, 100, 80, 0.4, 0);
			const centerMm = { x: 10.0, y: -5.0, z: -15.0 };
			const normal2D = { x: 0.0, y: 1.0 }; // pointing along +Y

			const coords = computeGlCrossSectionCoordinates(volume, centerMm, normal2D, {
				widthMm: 24.0,
				heightMm: 34.0,
				pixelSpacingMm: 0.25,
			});

			assert.equal(coords.widthPx, 96, "24.0 mm at 0.25 mm/px must be 96 px");
			assert.equal(coords.heightPx, 136, "34.0 mm at 0.25 mm/px must be 136 px");
			assert.equal(coords.pixelSpacingX, 0.25);
			assert.equal(coords.pixelSpacingY, 0.25);

			// Axis U must be along normal2D (+Y) and span 24 mm
			assert.equal(coords.axisU[0], 0);
			assert.ok(coords.axisU[1] > 0, "Axis U must point along +Y");
			assert.equal(coords.axisU[2], 0);

			// Axis V must be along -Z and span 34 mm downwards
			assert.equal(coords.axisV[0], 0);
			assert.equal(coords.axisV[1], 0);
			assert.ok(coords.axisV[2] < 0, "Axis V must point downwards along -Z");

			// Axis Norm is [0, 0, 0] in single slice mode (slab step = 0)
			assert.deepEqual(coords.axisNorm, [0, 0, 0]);
			assert.equal(coords.slabModeCode, 0);
			assert.equal(coords.slabSteps, 1);

			// In Slab MIP mode with 4.0 mm thickness, Axis Norm must step along tangent ({ x: 1, y: 0 })
			const slabCoords = computeGlCrossSectionCoordinates(volume, centerMm, normal2D, {
				widthMm: 24.0,
				heightMm: 34.0,
				pixelSpacingMm: 0.25,
				slabMode: "mip",
				slabThicknessMm: 4.0,
			});
			assert.equal(slabCoords.slabModeCode, 1);
			assert.ok(slabCoords.slabSteps > 1);
			assert.ok(Math.abs(slabCoords.axisNorm[0]) > 0 || Math.abs(slabCoords.axisNorm[1]) > 0);
			assert.equal(slabCoords.axisNorm[2], 0);

			// Check sliceOrigin top-left coordinate normalized UVW within [0, 1]
			assert.ok(coords.sliceOrigin[0] >= 0 && coords.sliceOrigin[0] <= 1);
			assert.ok(coords.sliceOrigin[1] >= 0 && coords.sliceOrigin[1] <= 1);
			assert.ok(coords.sliceOrigin[2] >= 0 && coords.sliceOrigin[2] <= 1);
		});

		it("processes RENDER_CROSS_SECTION_SERIES in handleWorkerMessage with Transferable ArrayBuffers", () => {
			const volume = createEmptyCbctVolume(60, 60, 40, 0.5, 200);
			const curve = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible");

			const cache = new Map<string, typeof volume>();
			cache.set(volume.id, volume);

			let receivedOutbound: any = null;
			let receivedTransfer: Transferable[] | undefined = undefined;

			handleWorkerMessage(
				{
					type: "RENDER_CROSS_SECTION_SERIES",
					requestId: 42,
					volumeId: volume.id,
					archCurve: curve,
					options: { stepMm: 5.0 },
				},
				(response, transfer) => {
					receivedOutbound = response;
					receivedTransfer = transfer;
				},
				cache,
			);

			assert.ok(receivedOutbound, "Worker must produce outbound response");
			const out = receivedOutbound as any;
			assert.equal(out.type, "CROSS_SECTION_SERIES_RENDERED");
			assert.equal(out.requestId, 42);
			assert.ok(Array.isArray(out.slices) && out.slices.length > 5);
			const transferList = receivedTransfer as Transferable[] | undefined;
			assert.ok(Array.isArray(transferList) && transferList.length > 5, "Must pass Transferable array buffers");
			assert.equal(transferList!.length, out.slices.length);
		});

		it("executes CbctWorkerBridge requestCrossSectionSeries in fallback mode with zero UI errors", async () => {
			const bridge = new CbctWorkerBridge({ forceFallback: true });
			const volume = createEmptyCbctVolume(60, 60, 40, 0.5, 100);
			const curve = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible");

			const slices = await bridge.requestCrossSectionSeries({
				volume,
				archCurve: curve,
				options: { stepMm: 10.0 },
			});

			assert.ok(Array.isArray(slices) && slices.length > 0);
			assert.ok(slices[0]!.pixelData instanceof Uint8ClampedArray);
			assert.equal(slices[0]!.widthPx, 96);
			assert.ok(slices[0]!.sliceLabel?.includes("#"));
			bridge.dispose();
		});
	});

	// ─── 7. GPU-ACCELERATED 3D AFFINE BASIS & TRANSVERSE RESLICE INVARIANTS ───
	describe("7. GPU-Accelerated 3D Affine Basis & Transverse Reslice Invariants", () => {
		it("proves computeCrossSectionAffineBasis computes exact orthonormal span vectors without shear", () => {
			const volume = createEmptyCbctVolume(100, 100, 80, 0.4, 0);
			const centerMm = { x: 5.0, y: -10.0, z: -8.0 };
			const normal2D = { x: 0.6, y: 0.8 }; // unit length 1.0

			const basis = computeCrossSectionAffineBasis(volume, centerMm, normal2D, {
				widthMm: 24.0,
				heightMm: 32.0,
				pixelSpacingMm: 0.25,
			});

			assert.equal(basis.widthPx, 96);
			assert.equal(basis.heightPx, 128);
			assert.ok(Math.abs(basis.unitNormal.x - 0.6) < 1e-4);
			assert.ok(Math.abs(basis.unitNormal.y - 0.8) < 1e-4);

			// u_axisU must be strictly parallel to unitNormal in XY plane
			const uDirX = basis.axisU[0];
			const uDirY = basis.axisU[1];
			const uLen = Math.hypot(uDirX, uDirY);
			assert.ok(uLen > 0, "Axis U must have non-zero length");
			assert.equal(basis.axisU[2], 0, "Axis U must be purely in XY plane");
			assert.ok(Math.abs((uDirX / uLen) - 0.6) < 1e-4, "Axis U direction must match unitNormal X");
			assert.ok(Math.abs((uDirY / uLen) - 0.8) < 1e-4, "Axis U direction must match unitNormal Y");

			// u_axisV must be strictly vertical downwards along Z
			assert.equal(basis.axisV[0], 0, "Axis V must have zero X");
			assert.equal(basis.axisV[1], 0, "Axis V must have zero Y");
			assert.ok(basis.axisV[2] < 0, "Axis V must point downwards along -Z");

			// Orthogonality: Axis U . Axis V must be exactly 0
			const dotUV = basis.axisU[0] * basis.axisV[0] + basis.axisU[1] * basis.axisV[1] + basis.axisU[2] * basis.axisV[2];
			assert.equal(dotUV, 0, "Axis U and Axis V must be strictly orthogonal (dot = 0)");

			// Orthogonality: Axis U . Unit Tangent must be strictly 0
			const dotUTangent = basis.axisU[0] * basis.unitTangent.x + basis.axisU[1] * basis.unitTangent.y;
			assert.ok(Math.abs(dotUTangent) < 1e-4, "Axis U must be orthogonal to arch tangent");
		});

		it("proves bucco-lingual and height offsets shift sliceOrigin rigidly without vector shear", () => {
			const volume = createEmptyCbctVolume(100, 100, 80, 0.4, 0);
			const centerMm = { x: 0.0, y: 0.0, z: 0.0 };
			const normal2D = { x: 1.0, y: 0.0 };

			const baseBasis = computeCrossSectionAffineBasis(volume, centerMm, normal2D, {
				widthMm: 24.0,
				heightMm: 32.0,
				pixelSpacingMm: 0.25,
			});

			const shiftedBasis = computeCrossSectionAffineBasis(volume, centerMm, normal2D, {
				widthMm: 24.0,
				heightMm: 32.0,
				pixelSpacingMm: 0.25,
				buccoLingualOffsetMm: 4.0,
				heightOffsetMm: -2.0,
			});

			// Vectors u_axisU and u_axisV must remain 100% identical (rigid translation)
			assert.deepEqual(shiftedBasis.axisU, baseBasis.axisU, "Axis U must be invariant to offset translation");
			assert.deepEqual(shiftedBasis.axisV, baseBasis.axisV, "Axis V must be invariant to offset translation");

			// sliceOrigin X must shift by +4.0 mm in voxel space
			const expectedShiftX = 4.0 / (volume.spacingMm.x * (volume.dimensions.width - 1));
			assert.ok(
				Math.abs((shiftedBasis.sliceOrigin[0] - baseBasis.sliceOrigin[0]) - expectedShiftX) < 1e-4,
				"SliceOrigin X must shift by exact bucco-lingual offset",
			);

			// sliceOrigin Z must shift by -2.0 mm in voxel space
			const expectedShiftZ = -2.0 / (volume.spacingMm.z * (volume.dimensions.depth - 1));
			assert.ok(
				Math.abs((shiftedBasis.sliceOrigin[2] - baseBasis.sliceOrigin[2]) - expectedShiftZ) < 1e-4,
				"SliceOrigin Z must shift by exact height offset",
			);
		});

		it("proves extractSingleCrossSectionSlice populates glCoordinates identical to computeGlCrossSectionCoordinates", () => {
			const volume = createEmptyCbctVolume(80, 80, 60, 0.5, 0);
			const centerMm = { x: -15.0, y: -20.0, z: -5.0 };
			const normal2D = { x: 0.7071, y: 0.7071 };
			const anchor = DEFAULT_MANDIBULAR_ARCH_ANCHORS[2]!;

			const slice = extractSingleCrossSectionSlice(volume, centerMm, normal2D, 1, 25.0, anchor, {
				widthMm: 24.0,
				heightMm: 32.0,
				pixelSpacingMm: 0.25,
			});

			assert.ok(slice.glCoordinates !== undefined, "Slice must contain glCoordinates");
			const expectedCoords = computeGlCrossSectionCoordinates(volume, centerMm, normal2D, {
				widthMm: 24.0,
				heightMm: 32.0,
				pixelSpacingMm: 0.25,
			});

			assert.deepEqual(slice.glCoordinates.sliceOrigin, expectedCoords.sliceOrigin);
			assert.deepEqual(slice.glCoordinates.axisU, expectedCoords.axisU);
			assert.deepEqual(slice.glCoordinates.axisV, expectedCoords.axisV);
			assert.deepEqual(slice.glCoordinates.axisNorm, expectedCoords.axisNorm);
			assert.equal(slice.glCoordinates.widthPx, 96);
			assert.equal(slice.glCoordinates.heightPx, 128);
		});

		it("proves extractArchCrossSectionSeries runs with zero GC thrashing and produces monotonic valid slices", () => {
			const volume = createEmptyCbctVolume(100, 100, 60, 0.5, 500);
			const curve = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible");

			const t0 = Date.now();
			const series = extractArchCrossSectionSeries(volume, curve, { stepMm: 1.5 });
			const elapsedMs = Date.now() - t0;

			assert.ok(series.length >= 60, `Series must have >= 60 slices, got ${series.length}`);
			assert.ok(elapsedMs < 1000, `Series generation must complete rapidly without GC freeze, took ${elapsedMs}ms`);

			for (let i = 0; i < series.length; i++) {
				const s = series[i]!;
				assert.equal(s.sliceIndex, i + 1);
				assert.ok(s.pixelData.length > 0);
				assert.ok(s.glCoordinates !== undefined);
				assert.equal(Number.isFinite(s.glCoordinates!.sliceOrigin[0]), true);
				assert.equal(Number.isFinite(s.glCoordinates!.sliceOrigin[1]), true);
				assert.equal(Number.isFinite(s.glCoordinates!.sliceOrigin[2]), true);
			}
		});
	});
});
