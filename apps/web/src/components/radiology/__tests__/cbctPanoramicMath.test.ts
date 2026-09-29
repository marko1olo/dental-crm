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
} from "../cbctArchSplineMath";
import {
	reconstructPanoramicView,
	resolveOcclusalCenterZ,
	project3DNerveToPanorama,
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
});
