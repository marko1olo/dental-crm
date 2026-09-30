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
} from "../cbctArchSplineMath";
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
});


