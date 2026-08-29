import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	findOcclusalZPlane,
	computeOcclusalDensityProfile,
	extractAxialMIPSlab,
	sampleMipHUContinuous,
	detectDentalArchCentroids,
	autoDetectDentalArch,
} from "../cbctAutoArchEngine";
import {
	createEmptyCbctVolume,
	type CbctVoxelVolume,
	worldMmToVoxel,
} from "../cbctMprMath";
import {
	DEFAULT_MANDIBULAR_ARCH_ANCHORS,
	DEFAULT_MAXILLARY_ARCH_ANCHORS,
	calculateArchTangentsAndNormals,
} from "../dentalCurveEngine";

/**
 * Creates a calibrated synthetic 3D CBCT volume with anatomical structures:
 * - Mandibular arch with enamel crowns at Z = -10 mm (HU = 3200)
 * - Maxillary arch with enamel crowns at Z = +10 mm (HU = 3200)
 * - Cortical alveolar bone surrounding teeth (HU = 1400)
 * - Metal crown restoration on Tooth 46 (HU = 4500)
 */
function createSyntheticDualArchVolume(): CbctVoxelVolume {
	// Dimensions: 180 x 180 x 60 voxels, 0.5 mm spacing -> 90 x 90 x 30 mm physical volume
	// Origin: (-45, -75, -15) mm -> X: [-45..45], Y: [-75..15], Z: [-15..15]
	const width = 180;
	const height = 180;
	const depth = 60;
	const spacingMm = 0.5;

	const volume = createEmptyCbctVolume(width, height, depth, spacingMm, -1000);
	// Explicitly align origin so that dental arch (-40 <= X <= 40, -60 <= Y <= 5) is fully centered
	(volume as { originMm: { x: number; y: number; z: number } }).originMm = {
		x: -45.0,
		y: -75.0,
		z: -15.0,
	};
	const data = volume.data!;
	const totalSliceVoxels = width * height;

	// Mandibular teeth at Z = -10 mm (slice index ~10)
	// Maxillary teeth at Z = +10 mm (slice index ~50)
	const mandibularZMm = -10.0;
	const maxillaryZMm = 10.0;

	// Draw mandibular dental arch
	for (const anchor of DEFAULT_MANDIBULAR_ARCH_ANCHORS) {
		const vox = worldMmToVoxel({ x: anchor.positionMm.x, y: anchor.positionMm.y, z: mandibularZMm }, volume);

		// Paint a 3x3x3 voxel tooth crown with enamel (3200 HU)
		for (let dz = -1; dz <= 1; dz++) {
			for (let dy = -1; dy <= 1; dy++) {
				for (let dx = -1; dx <= 1; dx++) {
					const z = vox.z + dz;
					const y = vox.y + dy;
					const x = vox.x + dx;

					if (x >= 0 && x < width && y >= 0 && y < height && z >= 0 && z < depth) {
						const idx = z * totalSliceVoxels + y * width + x;
						// Metal restoration on tooth 46
						if (anchor.toothFdi === "46") {
							data[idx] = 4500;
						} else {
							data[idx] = 3200;
						}
					}
				}
			}
		}
	}

	// Draw maxillary dental arch
	for (const anchor of DEFAULT_MAXILLARY_ARCH_ANCHORS) {
		const vox = worldMmToVoxel({ x: anchor.positionMm.x, y: anchor.positionMm.y, z: maxillaryZMm }, volume);

		for (let dz = -1; dz <= 1; dz++) {
			for (let dy = -1; dy <= 1; dy++) {
				for (let dx = -1; dx <= 1; dx++) {
					const z = vox.z + dz;
					const y = vox.y + dy;
					const x = vox.x + dx;

					if (x >= 0 && x < width && y >= 0 && y < height && z >= 0 && z < depth) {
						const idx = z * totalSliceVoxels + y * width + x;
						data[idx] = 3000;
					}
				}
			}
		}
	}

	return volume;
}

describe("CBCT Auto-Arch Mathematical Engine Suite", () => {
	describe("1. findOcclusalZPlane & Density Profile", () => {
		it("detects distinct mandibular and maxillary occlusal Z peaks on a dual-arch volume", () => {
			const volume = createSyntheticDualArchVolume();
			const profile = computeOcclusalDensityProfile(volume);

			assert.ok(profile.length > 0);
			assert.equal(profile.length, volume.dimensions.depth);

			// Detect Mandibular occlusal plane (lower peak around Z = -10.0 mm)
			const mandibularZ = findOcclusalZPlane(volume, "mandible");
			assert.ok(Math.abs(mandibularZ - (-10.0)) <= 1.0, `Expected mandibular Z ~ -10.0, got ${mandibularZ}`);

			// Detect Maxillary occlusal plane (upper peak around Z = +10.0 mm)
			const maxillaryZ = findOcclusalZPlane(volume, "maxilla");
			assert.ok(Math.abs(maxillaryZ - 10.0) <= 1.0, `Expected maxillary Z ~ 10.0, got ${maxillaryZ}`);
		});

		it("handles empty or flat CBCT volumes gracefully without throwing", () => {
			const emptyVolume = createEmptyCbctVolume(40, 40, 20, 0.5, -1000);
			const zPlane = findOcclusalZPlane(emptyVolume, "mandible");
			assert.equal(typeof zPlane, "number");
			assert.equal(Number.isNaN(zPlane), false);
		});

		it("handles disposed volume safely", () => {
			const disposedVolume = {
				...createEmptyCbctVolume(20, 20, 10, 0.5, -1000),
				data: null,
				isDisposed: true,
			};
			const zPlane = findOcclusalZPlane(disposedVolume, "mandible");
			assert.equal(zPlane, 0.0);
		});
	});

	describe("2. extractAxialMIPSlab & Bilinear Interpolation", () => {
		it("extracts 2D Axial MIP slab with correct dimensions and physical bounds", () => {
			const volume = createSyntheticDualArchVolume();
			const mip = extractAxialMIPSlab(volume, -10.0, 14.0);

			assert.equal(mip.width, volume.dimensions.width);
			assert.equal(mip.height, volume.dimensions.height);
			assert.equal(mip.data.length, volume.dimensions.width * volume.dimensions.height);
			assert.equal(mip.centerZMm, -10.0);
			assert.equal(mip.thicknessMm, 14.0);

			// Metal crown (4500 HU) should be clipped to 4000 HU
			let maxFoundHU = -1000;
			for (let i = 0; i < mip.data.length; i++) {
				if (mip.data[i]! > maxFoundHU) maxFoundHU = mip.data[i]!;
			}
			assert.ok(maxFoundHU <= 4000, `Max HU should be clipped to 4000, got ${maxFoundHU}`);
			assert.ok(maxFoundHU >= 3000, "Max HU should reflect enamel density");
		});

		it("samples continuous sub-pixel HU values accurately via sampleMipHUContinuous", () => {
			const volume = createSyntheticDualArchVolume();
			const mip = extractAxialMIPSlab(volume, -10.0, 14.0);

			// Center of Tooth 41 in mandible
			const tooth41 = DEFAULT_MANDIBULAR_ARCH_ANCHORS.find((a) => a.toothFdi === "41")!;
			const hu = sampleMipHUContinuous(mip, tooth41.positionMm.x, tooth41.positionMm.y);

			assert.ok(hu >= 2000, `Expected high tooth density >= 2000 HU, got ${hu}`);

			// Far outside coordinate (air)
			const airHU = sampleMipHUContinuous(mip, 100.0, 100.0);
			assert.equal(airHU, -1000);
		});
	});

	describe("3. detectDentalArchCentroids (Polar Ridge Tracing)", () => {
		it("detects 16 anatomical FDI dental anchors for mandibular jaw", () => {
			const volume = createSyntheticDualArchVolume();
			const mip = extractAxialMIPSlab(volume, -10.0, 14.0);

			const anchors = detectDentalArchCentroids(mip, "mandible");
			assert.equal(anchors.length, 16);

			// Verify FDI codes 48..41 and 31..38
			const expectedFdis = ["48", "47", "46", "45", "44", "43", "42", "41", "31", "32", "33", "34", "35", "36", "37", "38"];
			for (let i = 0; i < 16; i++) {
				assert.equal(anchors[i]!.toothFdi, expectedFdis[i]);
				assert.equal(typeof anchors[i]!.positionMm.x, "number");
				assert.equal(typeof anchors[i]!.positionMm.y, "number");
				assert.equal(Number.isNaN(anchors[i]!.positionMm.x), false);
				assert.equal(Number.isNaN(anchors[i]!.positionMm.y), false);
			}

			// Quadrant check
			assert.equal(anchors[0]!.isQuadrantRight, true); // 48
			assert.equal(anchors[7]!.isQuadrantRight, true); // 41
			assert.equal(anchors[8]!.isQuadrantRight, false); // 31
			assert.equal(anchors[15]!.isQuadrantRight, false); // 38
		});

		it("detects 16 anatomical FDI dental anchors for maxillary jaw", () => {
			const volume = createSyntheticDualArchVolume();
			const mip = extractAxialMIPSlab(volume, 10.0, 14.0);

			const anchors = detectDentalArchCentroids(mip, "maxilla");
			assert.equal(anchors.length, 16);

			// Verify FDI codes 18..11 and 21..28
			const expectedFdis = ["18", "17", "16", "15", "14", "13", "12", "11", "21", "22", "23", "24", "25", "26", "27", "28"];
			for (let i = 0; i < 16; i++) {
				assert.equal(anchors[i]!.toothFdi, expectedFdis[i]);
			}
		});
	});

	describe("4. autoDetectDentalArch (Full Pipeline)", () => {
		it("runs end-to-end auto dental arch detection and returns a calibrated DentalArchCurve", () => {
			const volume = createSyntheticDualArchVolume();
			const curve = autoDetectDentalArch(volume, "mandible");

			assert.equal(curve.jawType, "mandible");
			assert.equal(curve.anchors.length, 16);
			assert.ok(curve.splinePointsMm.length >= 16);
			assert.ok(curve.totalArcLengthMm > 50.0, `Expected arc length > 50 mm, got ${curve.totalArcLengthMm}`);
			assert.equal(curve.focalTroughThicknessMm, 12.0);

			// Normal and tangent vector derivation along the detected spline
			const vectorField = calculateArchTangentsAndNormals(curve.splinePointsMm);
			assert.equal(vectorField.length, curve.splinePointsMm.length);

			for (const node of vectorField) {
				const tangentLen = Math.hypot(node.tangent.x, node.tangent.y);
				const normalLen = Math.hypot(node.normal.x, node.normal.y);
				assert.ok(Math.abs(tangentLen - 1.0) < 1e-4, "Tangent must be unit vector");
				assert.ok(Math.abs(normalLen - 1.0) < 1e-4, "Normal must be unit vector");

				// Dot product of tangent and normal must be ~0 (perpendicular)
				const dot = node.tangent.x * node.normal.x + node.tangent.y * node.normal.y;
				assert.ok(Math.abs(dot) < 1e-4, "Tangent and normal must be orthogonal");
			}
		});
	});
});
