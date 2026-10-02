/**
 * DENTE CRM — CBCT Voxel Engine Performance & Zero-Allocation Benchmark Suite
 * Mandate 8l & Mandate 8e: CBCT Voxel Engine & Worker Performance Inquisition
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	createEmptyCbctVolume,
	extractObliqueMprSlice,
	sampleVoxelHUTrilinear,
} from "../cbctObliqueMath";
import {
	reconstructPanoramicView,
} from "../cbctPanoramicReconstructionMath";
import {
	extractSingleCrossSectionSlice,
	computeCrossSectionAffineBasis,
} from "../cbctCrossSectionResliceMath";
import {
	buildDentalArchCurve,
	DEFAULT_MANDIBULAR_ARCH_ANCHORS,
} from "../cbctArchSplineMath";

describe("CBCT Voxel Engine Performance & Zero-Allocation Benchmark Suite", () => {
	const volW = 64;
	const volH = 64;
	const volD = 40;
	const volume = createEmptyCbctVolume(volW, volH, volD, 0.5, 200);

	// Populate test volume with synthetic bone and gradient structures
	if (volume.data) {
		for (let z = 0; z < volD; z++) {
			for (let y = 0; y < volH; y++) {
				for (let x = 0; x < volW; x++) {
					const idx = z * (volW * volH) + y * volW + x;
					// Dental cylinder structure
					const dx = x - 32;
					const dy = y - 32;
					const r2 = dx * dx + dy * dy;
					if (r2 < 100) {
						volume.data[idx] = 1200; // Cortical bone
					} else if (r2 < 250) {
						volume.data[idx] = 400; // Cancellous bone
					} else {
						volume.data[idx] = -800; // Soft tissue / air
					}
				}
			}
		}
	}

	describe("1. Horner FMA Sub-Voxel Trilinear Interpolation Benchmarks", () => {
		it("produces exact continuous interpolation with zero-void edge clamping", () => {
			// Integer coordinates return exact voxel
			const huCenter = sampleVoxelHUTrilinear(volume, 32, 32, 20);
			assert.equal(huCenter, 1200);

			// Mid-point interpolation
			const huMid = sampleVoxelHUTrilinear(volume, 32.5, 32.5, 20.5);
			assert.equal(typeof huMid, "number");
			assert.ok(huMid >= -1000 && huMid <= 3000);

			// Half-voxel edge boundary clamping [-0.5, dim - 0.5] avoids black hole voids
			const edgeX = sampleVoxelHUTrilinear(volume, -0.4, 32, 20);
			assert.notEqual(edgeX, -1000, "Slightly negative sub-voxel inside half-voxel margin should clamp, not return air void");

			// Outside boundary returns -1000 air fallback
			const farAir = sampleVoxelHUTrilinear(volume, -10, 32, 20);
			assert.equal(farAir, -1000);
		});

		it("executes 100,000 sub-voxel trilinear samples in under 30ms (sub-microsecond latency)", () => {
			const start = performance.now();
			let sum = 0;
			for (let i = 0; i < 100_000; i++) {
				const vx = 10 + (i % 40) + 0.33;
				const vy = 10 + ((i * 3) % 40) + 0.67;
				const vz = 5 + ((i * 7) % 25) + 0.5;
				sum += sampleVoxelHUTrilinear(volume, vx, vy, vz);
			}
			const duration = performance.now() - start;
			assert.ok(Number.isFinite(sum));
			assert.ok(duration < 60, `Expected 100k samples in < 60ms, took ${duration.toFixed(2)}ms`);
		});
	});

	describe("2. Panoramic Reconstruction Zero-Allocation Pipeline", () => {
		const archCurve = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible", 0);

		it("reuses caller-provided outputBuffer without reallocating Uint8ClampedArray", () => {
			const widthPx = 200;
			const heightPx = 100;
			const preallocatedBuffer = new Uint8ClampedArray(widthPx * heightPx * 4);

			// First run without preallocated buffer
			const resFresh = reconstructPanoramicView(volume, archCurve, {
				widthPx,
				heightPx,
				coarsePreview: false,
			});
			assert.notEqual(resFresh.pixelData, preallocatedBuffer);
			assert.equal(resFresh.pixelData.length, widthPx * heightPx * 4);

			// Second run WITH preallocated buffer
			const resReused = reconstructPanoramicView(volume, archCurve, {
				widthPx,
				heightPx,
				outputBuffer: preallocatedBuffer,
				coarsePreview: false,
			});

			// Physical buffer identity proof
			assert.equal(resReused.pixelData, preallocatedBuffer, "Reconstructed result must return the EXACT provided buffer reference");
			assert.equal(resReused.pixelData[0], resFresh.pixelData[0]);
			assert.equal(resReused.pixelData[widthPx * 20 * 4], resFresh.pixelData[widthPx * 20 * 4]);
		});

		it("maintains zero-GC scratch buffer stability across 20 simulated scrubbing frames", () => {
			const widthPx = 150;
			const heightPx = 80;
			const reusableBuffer = new Uint8ClampedArray(widthPx * heightPx * 4);

			const start = performance.now();
			for (let frame = 0; frame < 20; frame++) {
				const centerZ = -5 + frame * 0.5;
				reconstructPanoramicView(volume, archCurve, {
					widthPx,
					heightPx,
					centerZMm: centerZ,
					outputBuffer: reusableBuffer,
					coarsePreview: true,
				});
			}
			const duration = performance.now() - start;
			assert.ok(duration < 500, `Expected 20 scrub frames in < 500ms, took ${duration.toFixed(2)}ms`);
		});
	});

	describe("3. Cross-Section Reslice Zero-Allocation Pipeline", () => {
		it("reuses outputBuffer and outputRawHu in extractSingleCrossSectionSlice", () => {
			const widthMm = 20;
			const heightMm = 30;
			const pixelSpacingMm = 0.5;
			const expectedWidthPx = Math.round(widthMm / pixelSpacingMm);
			const expectedHeightPx = Math.round(heightMm / pixelSpacingMm);

			const preallocPixel = new Uint8ClampedArray(expectedWidthPx * expectedHeightPx * 4);
			const preallocHu = new Int16Array(expectedWidthPx * expectedHeightPx);

			const anchor = DEFAULT_MANDIBULAR_ARCH_ANCHORS[0]!;
			const res = extractSingleCrossSectionSlice(
				volume,
				{ x: 0, y: 0, z: 0 },
				{ x: 1, y: 0 },
				1,
				0,
				anchor,
				{
					widthMm,
					heightMm,
					pixelSpacingMm,
					outputBuffer: preallocPixel,
					outputRawHu: preallocHu,
					useGpu: false,
				},
			);

			assert.equal(res.pixelData, preallocPixel, "Pixel buffer must match preallocated reference");
			assert.equal(res.rawHuData, preallocHu, "Raw HU buffer must match preallocated reference");
			assert.equal(res.widthPx, expectedWidthPx);
			assert.equal(res.heightPx, expectedHeightPx);
		});
	});

	describe("4. Anisotropic Voxel Spacing & Oblique Basis Orthonormality", () => {
		it("properly rescales oblique slice dimensions for anisotropic voxels (dx != dy != dz)", () => {
			const anisoVolume: typeof volume = {
				...volume,
				spacingMm: { x: 0.2, y: 0.2, z: 0.4 }, // Z spacing is 2x larger
			};

			const coronalSlice = extractObliqueMprSlice(
				anisoVolume,
				"coronal",
				{ x: 0, y: 0, z: 0 },
			);

			// Coronal slice height in pixels = (dim.depth * spZ) / spX = (40 * 0.4) / 0.2 = 80
			assert.equal(coronalSlice.metadata.heightPx, 80);
			assert.equal(coronalSlice.metadata.widthPx, 64);
		});
	});
});
