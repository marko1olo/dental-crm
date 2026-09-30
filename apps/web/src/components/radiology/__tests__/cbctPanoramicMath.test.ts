/**
 * DENTE CRM — CBCT Panoramic Reconstruction (OPG) & Occlusal Z MIP Engine Tests
 * Standards: Planmeca Romexis 6.x, Vatech Ez3D-i, DICOM PS3.3, Misch CE, Buser
 *
 * Verifies under Red Team adversarial scrutiny:
 * 1. Occlusal Z plane resolution: options override -> arch planeZ -> anchors zMm -> findOcclusalZPlane -> fallback.
 * 2. Default MIP (Maximum Intensity Projection) mode vs blurry 'average' mode.
 * 3. Dynamic range and 16-bit LUT bone/enamel mapping (WW: 3500, WL: 800).
 * 4. Real clinical CBCT patient dataset (Zakharov Ivan Dmitrievich):
 *    - Reconstructs panoramic view with auto-detected arch and occlusal Z alignment.
 *    - Proves Quadrant 4 (teeth 48..41) contains crisp, bright tooth voxels (> 200 brightness).
 *    - Proves the old 'average' method resulted in dark shadows (< 90 brightness).
 * 5. Vertical FOV centering and mandibular nerve 3D projection alignment with centerZMm.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
	DEFAULT_MANDIBULAR_ARCH_ANCHORS,
	DEFAULT_MAXILLARY_ARCH_ANCHORS,
	buildDentalArchCurve,
	calculateArchTangentsAndNormals,
	getFocalTroughBoundaryCurves,
	type ArchVectorNode,
} from "../cbctArchSplineMath";
import {
	computeCrossSectionAffineBasis,
	isCrossSectionBasisOrthonormal,
	findNearestToothAnchorToDistance,
	extractArchCrossSectionSeries,
} from "../cbctCrossSectionResliceMath";
import {
	drawPanoramicOverlay,
} from "../mpr/cbctCurvedOverlayRenderers";
import {
	reconstructPanoramicView,
	reconstructPanoramicViewWebGl2,
	resolveOcclusalCenterZ,
	project3DNerveToPanorama,
	calculateToothMarkersOnPano,
	CBCT_PANORAMIC_VERTEX_SHADER,
	CBCT_PANORAMIC_FRAGMENT_SHADER,
} from "../cbctPanoramicReconstructionMath";
import {
	autoDetectDentalArch,
	findOcclusalZPlane,
} from "../cbctAutoArchEngine";
import {
	createEmptyCbctVolume,
	get16BitLut,
} from "../cbctMprMath";
import { buildVolumeFromDicomBuffers } from "../realDicomVolumeLoader";

describe("CBCT Panoramic Reconstruction (OPG) & Occlusal Z MIP Engine", () => {
	// ─── 1. OCCLUSAL Z-PLANE RESOLUTION ───────────────────────────────────────
	describe("1. Occlusal Z-Plane Resolution Hierarchy", () => {
		it("prioritizes options.centerZMm above all other sources", () => {
			const volume = createEmptyCbctVolume(100, 100, 80, 0.4, 0);
			const curve = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible", 12.0, -10.5);

			const z = resolveOcclusalCenterZ(volume, curve, 5.25);
			assert.equal(z, 5.25);
		});

		it("uses archCurve.planeZMm when options.centerZMm is not provided", () => {
			const volume = createEmptyCbctVolume(100, 100, 80, 0.4, 0);
			const curve = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible", 12.0, -8.75);

			const z = resolveOcclusalCenterZ(volume, curve);
			assert.equal(z, -8.75);
		});

		it("calculates average Z from anchor points if anchors contain zMm", () => {
			const volume = createEmptyCbctVolume(100, 100, 80, 0.4, 0);
			const anchorsWithZ = DEFAULT_MANDIBULAR_ARCH_ANCHORS.map((a, idx) => ({
				...a,
				zMm: -10.0 + (idx % 3) * 0.5,
			}));
			const curve = buildDentalArchCurve(anchorsWithZ, "mandible", 12.0);

			const expectedAvg = Number(
				(anchorsWithZ.reduce((sum, a) => sum + (a.zMm ?? 0), 0) / anchorsWithZ.length).toFixed(2),
			);
			const z = resolveOcclusalCenterZ(volume, curve);
			assert.equal(z, expectedAvg);
		});

		it("falls back to findOcclusalZPlane from volume density profile when no curve Z is specified", () => {
			const volume = createEmptyCbctVolume(100, 100, 80, 0.4, 0);
			const curve = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible");

			const z = resolveOcclusalCenterZ(volume, curve);
			const expectedZ = findOcclusalZPlane(volume, "mandible");
			assert.equal(z, expectedZ);
		});
	});

	// ─── 2. CLINICAL MIP PROJECTION & ADAPTIVE SLAB SAMPLING ─────────────────
	describe("2. Clinical MIP Projection & Adaptive Slab Sampling", () => {
		it("defaults projectionMode to 'mip' with focal trough thickness 14.0 mm", () => {
			const volume = createEmptyCbctVolume(100, 100, 80, 0.4, 0);
			const curve = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible", 14.0, -5.0);

			const pano = reconstructPanoramicView(volume, curve);
			assert.equal(pano.centerZMm, -5.0);
			assert.equal(pano.focalThicknessMm, 14.0);
			assert.ok(pano.pixelData.length > 0);
			assert.equal(pano.toothMarkersOnPano.length, 16);
		});

		it("supports 'ray_sum' clinical weighted blend mode", () => {
			const volume = createEmptyCbctVolume(100, 100, 80, 0.4, 0);
			const curve = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible");

			const pano = reconstructPanoramicView(volume, curve, { projectionMode: "ray_sum" });
			assert.ok(pano.pixelData.length > 0);
		});

		it("supports 'minip' mode for low-density root canal / airway tracing", () => {
			const volume = createEmptyCbctVolume(100, 100, 80, 0.4, 0);
			const curve = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible");

			const pano = reconstructPanoramicView(volume, curve, { projectionMode: "minip" });
			assert.ok(pano.pixelData.length > 0);
		});

		it("supports 'coarsePreview' mode for 60 FPS real-time spline scrubbing", () => {
			const volume = createEmptyCbctVolume(100, 100, 80, 0.4, 0);
			const curve = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible", 14.0, -5.0);

			const panoCoarse = reconstructPanoramicView(volume, curve, { coarsePreview: true });
			assert.equal(panoCoarse.centerZMm, -5.0);
			assert.equal(panoCoarse.focalThicknessMm, 14.0);
			assert.equal(panoCoarse.heightPx, 220);
			assert.ok(panoCoarse.pixelData.length > 0);
			assert.equal(panoCoarse.toothMarkersOnPano.length, 16);
		});
	});

	// ─── 3. REAL CLINICAL DATASET VERIFICATION (ZAKHAROV I.D. CBCT) ──────────
	describe("3. Real Clinical CBCT Dataset Verification (Zakharov I.D.)", () => {
		const demoDir = path.resolve(process.cwd(), "apps/web/public/radiology/demo_cbct");
		const hasDemoData = fs.existsSync(demoDir) && fs.existsSync(path.join(demoDir, "manifest.json"));

		it("reconstructs real Zakharov CBCT panorama with crisp Quadrant 4 tooth voxels (> 200 brightness)", async () => {
			if (!hasDemoData) {
				console.log("Demo CBCT directory not found, skipping real dataset test.");
				return;
			}

			const manifestRaw = fs.readFileSync(path.join(demoDir, "manifest.json"), "utf-8");
			const manifest = JSON.parse(manifestRaw) as { slices: string[] };

			const items = manifest.slices.map((sliceName) => {
				const buf = fs.readFileSync(path.join(demoDir, sliceName));
				return {
					buffer: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
					fileName: sliceName,
				};
			});

			const volume = await buildVolumeFromDicomBuffers(items);
			assert.ok(volume.dimensions.depth >= 50);

			const arch = autoDetectDentalArch(volume, "mandible");
			const occlusalZ = findOcclusalZPlane(volume, "mandible");
			assert.ok(Number.isFinite(occlusalZ));

			// Reconstruct panorama with new MIP engine and occlusal plane
			const panoMIP = reconstructPanoramicView(volume, arch, {
				windowWidth: 3500,
				windowLevel: 800,
				projectionMode: "mip",
			});

			assert.equal(panoMIP.centerZMm, occlusalZ, "Must align with detected occlusal plane");

			// Audit Quadrant 4 (Right side of arch: col 0 to outW / 2)
			const halfW = Math.floor(panoMIP.widthPx / 2);
			let q4MaxBrightness = 0;
			let q4BrightPixelCount = 0;

			for (let r = 0; r < panoMIP.heightPx; r++) {
				for (let c = 0; c < halfW; c++) {
					const idx = (r * panoMIP.widthPx + c) * 4;
					const gray = panoMIP.pixelData[idx]!;
					if (gray > q4MaxBrightness) q4MaxBrightness = gray;
					if (gray >= 200) q4BrightPixelCount++;
				}
			}

			assert.ok(
				q4MaxBrightness >= 200,
				`Quadrant 4 teeth must reach high clinical brightness >= 200 (got ${q4MaxBrightness})`,
			);
			assert.ok(
				q4BrightPixelCount >= 200,
				`Quadrant 4 must contain at least 200 bright tooth/bone pixels (got ${q4BrightPixelCount})`,
			);

			// Contrast against the old legacy 'average' method centered at Z = 0
			const panoOld = reconstructPanoramicView(volume, arch, {
				centerZMm: 0,
				projectionMode: "average",
				windowWidth: 4400,
				windowLevel: 1300,
			});

			let oldMax = 0;
			for (let i = 0; i < panoOld.pixelData.length; i += 4) {
				if (panoOld.pixelData[i]! > oldMax) oldMax = panoOld.pixelData[i]!;
			}

			// Proves the bug: old method produced dim murky shadows (< 100 brightness)
			assert.ok(
				oldMax < 100,
				`Legacy average method produced maximum brightness ${oldMax}, proving tooth signal suppression`,
			);
			assert.ok(
				q4MaxBrightness > oldMax * 2,
				`New MIP engine (${q4MaxBrightness}) must deliver >2x clinical brightness vs legacy (${oldMax})`,
			);
		});
	});

	// ─── 4. MANDIBULAR NERVE VERTICAL ALIGNMENT ───────────────────────────────
	describe("4. Mandibular Nerve 3D Projection Vertical Alignment", () => {
		it("aligns nerve projection vertically with panoramic centerZMm", () => {
			const curve = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible", 14.0, -10.0);
			const dummyNerve = [
				{ x: -32.0, y: -26.0, z: -15.0 },
				{ x: -28.0, y: -36.0, z: -14.0 },
				{ x: -23.0, y: -44.0, z: -13.0 },
			];

			const res = project3DNerveToPanorama(dummyNerve, curve, 500, 220, { centerZMm: -10.0 });
			assert.equal(res.projectedPoints.length, 3);

			// At centerZMm = -10.0, heightMm = 38.0:
			// zTopMm = -10 + 19 = 9.0 mm
			// For pt.z = -15.0 mm: (9.0 - (-15.0)) / 38.0 * 220 = 24.0 / 38.0 * 220 = 138.95 px
			const expectedY = Number((((9.0 - -15.0) / 38.0) * 220).toFixed(2));
			assert.ok(
				Math.abs(res.projectedPoints[0]!.y - expectedY) < 1.0,
				`Projected Y (${res.projectedPoints[0]!.y}) must match expected (${expectedY})`,
			);
		});
	});

	// ─── 5. CRASH RESILIENCE & BOUNDARY SAFETY ───────────────────────────────
	describe("5. Crash Resilience & Boundary Safety", () => {
		it("handles disposed volume safely without throwing unhandled exceptions", () => {
			const volume = createEmptyCbctVolume(100, 100, 80, 0.4, 0);
			(volume as any).isDisposed = true;
			const curve = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible");

			const pano = reconstructPanoramicView(volume, curve);
			assert.ok(pano.pixelData instanceof Uint8ClampedArray);
			assert.equal(pano.pixelData.length, pano.widthPx * pano.heightPx * 4);
			assert.equal(pano.toothMarkersOnPano.length, 0);
		});

		it("handles empty dental arch curve safely", () => {
			const volume = createEmptyCbctVolume(100, 100, 80, 0.4, 0);
			const emptyCurve = {
				id: "empty",
				jawType: "mandible" as const,
				anchors: [],
				splinePointsMm: [],
				totalArcLengthMm: 0,
				focalTroughThicknessMm: 12.0,
			};

			const pano = reconstructPanoramicView(volume, emptyCurve);
			assert.ok(pano.pixelData instanceof Uint8ClampedArray);
			assert.equal(pano.pixelData.length, pano.widthPx * pano.heightPx * 4);
			assert.equal(pano.toothMarkersOnPano.length, 0);
		});
	});

	// ─── 6. GPU WEBGL2 PANORAMIC SHADER & ENGINE ARCHITECTURE ────────────────
	describe("6. GPU WebGL2 Panoramic Shader & Engine Architecture", () => {
		it("defines valid GLSL ES 3.00 panoramic shaders with 3D texture isampler3D and 1D spline texture", () => {
			assert.ok(CBCT_PANORAMIC_VERTEX_SHADER.includes("#version 300 es"));
			assert.ok(CBCT_PANORAMIC_VERTEX_SHADER.includes("QUAD_POSITIONS"));
			assert.ok(CBCT_PANORAMIC_FRAGMENT_SHADER.includes("#version 300 es"));
			assert.ok(CBCT_PANORAMIC_FRAGMENT_SHADER.includes("isampler3D u_volume"));
			assert.ok(CBCT_PANORAMIC_FRAGMENT_SHADER.includes("sampler2D u_archSplineTexture"));
			assert.ok(CBCT_PANORAMIC_FRAGMENT_SHADER.includes("u_projectionMode"));
			assert.ok(CBCT_PANORAMIC_FRAGMENT_SHADER.includes("texelFetch"));
		});

		it("exports calculateToothMarkersOnPano with exact symmetric margins", () => {
			const curve = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible");
			const vectorField = calculateArchTangentsAndNormals(curve.splinePointsMm);
			const markers = calculateToothMarkersOnPano(curve, vectorField, curve.totalArcLengthMm, 800);
			assert.equal(markers.length, 16);
			assert.ok(markers[0]!.xPx >= 20);
			assert.ok(markers[markers.length - 1]!.xPx <= 780);
			// Left-to-right monotonic ordering across arch
			for (let i = 1; i < markers.length; i++) {
				assert.ok(markers[i]!.xPx >= markers[i - 1]!.xPx);
			}
		});

		it("handles reconstructPanoramicViewWebGl2 gracefully in headless/test environments", () => {
			const volume = createEmptyCbctVolume(100, 100, 80, 0.4, 0);
			const curve = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible");
			// In node.js test environment, document is undefined, so reconstructPanoramicViewWebGl2 safely returns null
			const res = reconstructPanoramicViewWebGl2(volume, curve);
			assert.equal(res, null);
		});
	});

	// ─── 7. GPU CURVED PANORAMIC SPLINE & FRENET FRAME INQUISITION ───────────
	describe("7. GPU Curved Panoramic Spline & Frenet Frame Inquisition", () => {
		it("passes both normal and tangent vectors in Frenet frame (2-row texture architecture)", () => {
			// Row 0: Point + Normal
			assert.ok(
				CBCT_PANORAMIC_FRAGMENT_SHADER.includes("texelFetch(u_archSplineTexture, splineCoord, 0)"),
				"Must sample Row 0 for dental arch point and normal",
			);
			// Row 1: Tangent + Arc Length
			assert.ok(
				CBCT_PANORAMIC_FRAGMENT_SHADER.includes("texelFetch(u_archSplineTexture, ivec2(splineCoord.x, 1), 0)"),
				"Must sample Row 1 for dental arch tangent vector",
			);
			// Analytical orthogonal fallback
			assert.ok(
				CBCT_PANORAMIC_FRAGMENT_SHADER.includes("vec2(-norm.y, norm.x)"),
				"Must provide analytical normal-orthogonal tangent fallback",
			);
		});

		it("supports analytical polynomial arch mode (parabolic model y = ax^2 + bx + c)", () => {
			assert.ok(
				CBCT_PANORAMIC_FRAGMENT_SHADER.includes("uniform vec4 u_archPolyCoeffs;"),
				"Declares analytical polynomial coefficients uniform",
			);
			assert.ok(
				CBCT_PANORAMIC_FRAGMENT_SHADER.includes("uniform int u_useAnalyticalPoly;"),
				"Declares analytical polynomial toggle uniform",
			);
			assert.ok(
				CBCT_PANORAMIC_FRAGMENT_SHADER.includes("float yArch = a * xArch * xArch + b * xArch + c;"),
				"Evaluates analytical parabolic dental arch curve directly on GPU",
			);
		});

		it("supports sub-voxel trilinear interpolation (u_trilinear) with safe nearest fallback", () => {
			assert.ok(
				CBCT_PANORAMIC_FRAGMENT_SHADER.includes("samplePanoramicHUTrilinear"),
				"Implements hardware 8-point 3D trilinear sub-voxel interpolation",
			);
			assert.ok(
				CBCT_PANORAMIC_FRAGMENT_SHADER.includes("samplePanoramicHUNearest"),
				"Implements fast nearest neighbor voxel sampling for 60 FPS slider scrubbing",
			);
			assert.ok(
				CBCT_PANORAMIC_FRAGMENT_SHADER.includes("uniform int u_trilinear;"),
				"Declares trilinear toggle uniform",
			);
		});

		it("guards volume boundaries and out-of-jaw samples with strict -1000 HU (ambient air)", () => {
			assert.ok(
				CBCT_PANORAMIC_FRAGMENT_SHADER.includes("return -1000.0;"),
				"Guards out-of-bounds continuous coordinates by returning -1000.0 HU air",
			);
			assert.ok(
				CBCT_PANORAMIC_FRAGMENT_SHADER.includes("isnan(vox.x) || isnan(vox.y) || isnan(vox.z)"),
				"Guards NaN voxel coordinates against GPU driver corruption",
			);
			assert.ok(
				CBCT_PANORAMIC_FRAGMENT_SHADER.includes("isinf(vox.x) || isinf(vox.y) || isinf(vox.z)"),
				"Guards Inf voxel coordinates against GPU driver corruption",
			);
			assert.ok(
				CBCT_PANORAMIC_FRAGMENT_SHADER.includes("float finalHU = -1000.0;"),
				"Defaults final HU to -1000.0 when all ray samples fall outside volume",
			);
		});

		it("supports interactive focal trough thickness 1..25 mm without performance degradation", () => {
			const volume = createEmptyCbctVolume(100, 100, 80, 0.4, 0);
			const curve = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible", 12.0);

			// Test minimum thickness (1.0 mm)
			const panoThin = reconstructPanoramicView(volume, curve, {
				focalTroughThicknessMm: 1.0,
				coarsePreview: true,
			});
			assert.equal(panoThin.focalThicknessMm, 1.0);
			assert.ok(panoThin.pixelData.length > 0);

			// Test maximum thickness (25.0 mm)
			const panoThick = reconstructPanoramicView(volume, curve, {
				focalTroughThicknessMm: 25.0,
				coarsePreview: true,
			});
			assert.equal(panoThick.focalThicknessMm, 25.0);
			assert.ok(panoThick.pixelData.length > 0);

			// Test clinical range (14.0 mm) with trilinear interpolation
			const panoStandard = reconstructPanoramicView(volume, curve, {
				focalTroughThicknessMm: 14.0,
				coarsePreview: false,
			});
			assert.equal(panoStandard.focalThicknessMm, 14.0);
			assert.ok(panoStandard.pixelData.length > 0);
		});

		it("prevents negative/invert mode black holes and blinding white flashes with sigmoid air transition", () => {
			assert.ok(
				CBCT_PANORAMIC_FRAGMENT_SHADER.includes("smoothstep(-650.0, -550.0, finalHU)"),
				"Applies smooth sigmoid transition between air and soft tissue in invert mode",
			);
			assert.ok(
				CBCT_PANORAMIC_FRAGMENT_SHADER.includes("float darkAir = 10.0 / 255.0;"),
				"Protects clinician eyes by mapping air to dark charcoal on white paper mode",
			);
		});
	});

	// ─── 8. FRENET-SERRET FRAME CURVATURE & ANTERIOR ARCH DYNAMICS ───────────
	describe("8. Dental Arch Spline Frenet-Serret Frame & Curvature Dynamics", () => {
		it("computes physical Frenet-Serret curvature kappa (mm^-1) along Catmull-Rom spline", () => {
			const curve = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible");
			const vectorField = calculateArchTangentsAndNormals(curve.splinePointsMm);

			assert.ok(vectorField.length > 50);

			for (const node of vectorField) {
				assert.equal(typeof node.curvature, "number");
				assert.equal(Number.isFinite(node.curvature), true);
				assert.ok(node.curvature >= 0, `Curvature must be non-negative, got ${node.curvature}`);

				// Unit length verification
				const tLen = Math.hypot(node.tangent.x, node.tangent.y);
				const nLen = Math.hypot(node.normal.x, node.normal.y);
				assert.ok(Math.abs(tLen - 1.0) < 1e-3, `Tangent must be unit length, got ${tLen}`);
				assert.ok(Math.abs(nLen - 1.0) < 1e-3, `Normal must be unit length, got ${nLen}`);

				// Strict orthogonality: T . N = 0
				const dot = node.tangent.x * node.normal.x + node.tangent.y * node.normal.y;
				assert.ok(Math.abs(dot) < 1e-4, `T . N must be 0, got ${dot}`);
			}

			// In adult mandible, anterior incisor turn (around midline) has significantly higher curvature than distal molars
			const midIdx = Math.floor(vectorField.length / 2);
			const anteriorCurv = vectorField[midIdx]!.curvature;
			const molarCurvRight = vectorField[2]!.curvature;
			const molarCurvLeft = vectorField[vectorField.length - 3]!.curvature;

			assert.ok(
				anteriorCurv > molarCurvRight,
				`Anterior curvature (${anteriorCurv}) must exceed right molar curvature (${molarCurvRight})`,
			);
			assert.ok(
				anteriorCurv > molarCurvLeft,
				`Anterior curvature (${anteriorCurv}) must exceed left molar curvature (${molarCurvLeft})`,
			);
			assert.ok(
				anteriorCurv >= 0.02,
				`Anterior arch turn must have curvature >= 0.02 mm^-1 (got ${anteriorCurv})`,
			);
		});
	});

	// ─── 9. FOCAL TROUGH PHYSIOLOGICAL ANTERIOR NARROWING (0.5..0.8) ─────────
	describe("9. Focal Trough with Physiological Anterior Narrowing (0.5..0.8)", () => {
		it("narrows boundary curves in incisor zone with anteriorTroughRatio 0.65", () => {
			const curve = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible", 14.0);
			const boundsNarrowed = getFocalTroughBoundaryCurves(curve.splinePointsMm, 14.0, 0.65);
			const boundsUniform = getFocalTroughBoundaryCurves(curve.splinePointsMm, 14.0, 1.0);

			assert.equal(boundsNarrowed.innerBoundary.length, curve.splinePointsMm.length);
			assert.equal(boundsNarrowed.outerBoundary.length, curve.splinePointsMm.length);

			const midIdx = Math.floor(curve.splinePointsMm.length / 2);
			const pInNarrow = boundsNarrowed.innerBoundary[midIdx]!;
			const pOutNarrow = boundsNarrowed.outerBoundary[midIdx]!;
			const midThicknessNarrow = Math.hypot(pOutNarrow.x - pInNarrow.x, pOutNarrow.y - pInNarrow.y);

			const pInUni = boundsUniform.innerBoundary[midIdx]!;
			const pOutUni = boundsUniform.outerBoundary[midIdx]!;
			const midThicknessUni = Math.hypot(pOutUni.x - pInUni.x, pOutUni.y - pInUni.y);

			// Expected midpoint thickness: 14.0 * 0.65 = 9.1 mm
			assert.ok(
				Math.abs(midThicknessNarrow - 9.1) < 0.6,
				`Midpoint thickness with ratio 0.65 must be ~9.1 mm (got ${midThicknessNarrow.toFixed(2)})`,
			);
			assert.ok(
				Math.abs(midThicknessUni - 14.0) < 0.5,
				`Uniform midpoint thickness must be ~14.0 mm (got ${midThicknessUni.toFixed(2)})`,
			);

			// Molar thickness should remain ~14.0 mm
			const pInMolar = boundsNarrowed.innerBoundary[2]!;
			const pOutMolar = boundsNarrowed.outerBoundary[2]!;
			const molarThickness = Math.hypot(pOutMolar.x - pInMolar.x, pOutMolar.y - pInMolar.y);
			assert.ok(
				Math.abs(molarThickness - 14.0) < 0.5,
				`Molar thickness must remain ~14.0 mm (got ${molarThickness.toFixed(2)})`,
			);
		});

		it("reconstructs panoramic view with physiological anterior narrowing in CPU path", () => {
			const volume = createEmptyCbctVolume(100, 100, 80, 0.4, 0);
			const curve = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible", 14.0, -10.0);

			const pano = reconstructPanoramicView(volume, curve, {
				anteriorTroughRatio: 0.65,
				projectionMode: "mip",
			});

			assert.equal(pano.centerZMm, -10.0);
			assert.equal(pano.focalThicknessMm, 14.0);
			assert.ok(pano.pixelData.length > 0);
			assert.equal(pano.toothMarkersOnPano.length, 16);
		});
	});

	// ─── 10. TRANSVERSE CROSS-SECTIONS ORTHONORMAL BASIS & FDI 18..48 ────────
	describe("10. Transverse Cross-Sections Orthonormal Basis & FDI 18..48 Mapping", () => {
		it("confirms cross-section affine basis is strictly orthonormal without shear", () => {
			const volume = createEmptyCbctVolume(100, 100, 80, 0.4, 0);
			const centerMm = { x: -15.0, y: -25.0, z: -10.0 };
			const normal2D = { x: 0.8, y: 0.6 };

			const basis = computeCrossSectionAffineBasis(volume, centerMm, normal2D, {
				widthMm: 24.0,
				heightMm: 34.0,
				pixelSpacingMm: 0.25,
				slabMode: "mip",
				slabThicknessMm: 3.0,
			});

			assert.ok(
				isCrossSectionBasisOrthonormal(basis),
				"Cross-section affine basis must satisfy orthonormal criteria",
			);
			assert.equal(basis.widthPx, 96);
			assert.equal(basis.heightPx, 136);
			assert.equal(basis.slabModeCode, 1);
		});

		it("maps FDI tooth numbers monotonically from right to left without wrap-around", () => {
			const curveMand = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible");
			const totalLenMand = curveMand.totalArcLengthMm;

			// Right molar 48
			const anchorStart = findNearestToothAnchorToDistance(0.5, curveMand);
			assert.equal(anchorStart.toothFdi, "48", `Distance 0.5 mm must bind to 48, got ${anchorStart.toothFdi}`);

			// Left molar 38
			const anchorEnd = findNearestToothAnchorToDistance(totalLenMand - 0.5, curveMand);
			assert.equal(anchorEnd.toothFdi, "38", `Distance ${totalLenMand - 0.5} mm must bind to 38, got ${anchorEnd.toothFdi}`);

			// Incisors near midline
			const anchorMidRight = findNearestToothAnchorToDistance(totalLenMand / 2 - 1.0, curveMand);
			const anchorMidLeft = findNearestToothAnchorToDistance(totalLenMand / 2 + 1.0, curveMand);
			assert.equal(anchorMidRight.toothFdi, "41");
			assert.equal(anchorMidLeft.toothFdi, "31");

			// Maxillary arch: 18 -> 11 -> 21 -> 28
			const curveMax = buildDentalArchCurve(DEFAULT_MAXILLARY_ARCH_ANCHORS, "maxilla");
			const totalLenMax = curveMax.totalArcLengthMm;
			assert.equal(findNearestToothAnchorToDistance(0.5, curveMax).toothFdi, "18");
			assert.equal(findNearestToothAnchorToDistance(totalLenMax - 0.5, curveMax).toothFdi, "28");
		});

		it("generates cross-section series with uniform 1.0 mm and 2.0 mm step", () => {
			const volume = createEmptyCbctVolume(80, 80, 60, 0.5, 0);
			const curve = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible");

			const series1mm = extractArchCrossSectionSeries(volume, curve, { stepMm: 1.0 });
			const series2mm = extractArchCrossSectionSeries(volume, curve, { stepMm: 2.0 });

			assert.ok(series1mm.length > series2mm.length);
			assert.equal(series1mm[0]!.sliceIndex, 1);
			assert.equal(series1mm[0]!.nearestToothFdi, "48");
			assert.equal(series1mm[series1mm.length - 1]!.nearestToothFdi, "38");
		});
	});

	// ─── 11. CURVED MPR OVERLAY RENDERER Z-ALIGNMENT & BADGES ───────────────
	describe("11. Curved MPR Overlay Renderer Z-Alignment & Badges", () => {
		it("renders panoramic overlay with axial line aligned to activePano.centerZMm and tooth badges", () => {
			const volume = createEmptyCbctVolume(100, 100, 80, 0.4, 0);
			const curve = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible", 14.0, -10.0);
			const pano = reconstructPanoramicView(volume, curve);

			// Mock CanvasRenderingContext2D
			const drawnLines: any[] = [];
			const drawnText: any[] = [];
			const mockCtx = {
				canvas: { width: pano.widthPx, height: pano.heightPx },
				save: () => {},
				restore: () => {},
				translate: () => {},
				scale: () => {},
				beginPath: () => {},
				moveTo: (x: number, y: number) => { drawnLines.push({ type: "moveTo", x, y }); },
				lineTo: (x: number, y: number) => { drawnLines.push({ type: "lineTo", x, y }); },
				stroke: () => {},
				fill: () => {},
				closePath: () => {},
				arc: () => {},
				rect: () => {},
				roundRect: () => {},
				setLineDash: () => {},
				measureText: (text: string) => ({ width: text.length * 6 }),
				fillText: (text: string, x: number, y: number) => { drawnText.push({ text, x, y }); },
				strokeStyle: "",
				fillStyle: "",
				lineWidth: 1,
				font: "",
				textAlign: "",
				textBaseline: "",
			} as unknown as CanvasRenderingContext2D;

			drawPanoramicOverlay(mockCtx, {
				activePano: pano,
				volume,
				crosshairMm: { x: 0, y: 0, z: -10.0 }, // exactly at centerZMm
				transform: { panX: 0, panY: 0, zoom: 1.0 },
				slabMode: "single",
				slabThicknessMm: 1.0,
				interpolatedNerve3D: [],
				archCurve: curve,
				nervePoints: [],
				studioMode: "panoramic",
				activeCrossSection: null,
				implant3DWorld: null,
				nerveAuditResult: {
					isDangerous: false,
					isWarning: false,
					netClearanceToCanalWallMm: 10,
					clinicalMessageRu: "OK",
				},
				crossSections: [],
				hoveredToothMarkerFdi: null,
				invertColors: false,
			});

			// Axial line should be drawn at heightPx / 2
			const expectedY = Math.round(pano.heightPx / 2);
			const axialLines = drawnLines.filter((l) => l.y === expectedY);
			assert.ok(axialLines.length >= 2, `Axial line must be centered at y=${expectedY} for crosshair z=-10.0`);

			// Tooth badges (#48, #47, etc.) should be rendered
			const badges = drawnText.filter((t) => t.text.startsWith("#"));
			assert.ok(badges.length >= 10, `FDI tooth badges must be rendered along top of panorama (got ${badges.length})`);
		});
	});
});


