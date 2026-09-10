import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  type Vec3,
  type CbctPoint3D as Point3D,
  type CbctVoxelVolume,
  type CropBox,
  NO_CROP,
  DENTAL_CROP_PRESETS,
  normalizeCropBox,
  isCropActive,
  clipPlanes,
  clipPlanesFromVolume,
  isPointInsideCropBox,
  isNormalizedPointInsideCropBox,
  doesPointSatisfyClipPlanes,
  voxelBoundsFromCropBox,
  cropBoxFromVoxelBounds,
  worldBoundsFromCropBox,
  extractSubVolume,
  estimateSubVolumeMemory,
  intersectCropBoxes,
  expandCropBoxWithMargin,
} from "../radiology/index.js";

/**
 * Creates a synthetic CbctVoxelVolume for unit testing.
 */
function createSyntheticVolume(
  width = 60,
  height = 60,
  depth = 40,
  spacing: [number, number, number] = [0.25, 0.25, 0.5],
  origin: [number, number, number] = [-7.5, -7.5, -10.0],
): CbctVoxelVolume {
  const voxelCount = width * height * depth;
  const data = new Int16Array(voxelCount);

  // Fill volume with deterministic HU pattern
  // Air: -1000, Soft tissue: 40, Trabecular bone: 400, Cortical bone: 1400, Enamel: 2200
  let minHU = Infinity;
  let maxHU = -Infinity;

  for (let z = 0; z < depth; z++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = z * (width * height) + y * width + x;
        // Gradient pattern + simulated tooth core
        const dx = x - width / 2;
        const dy = y - height / 2;
        const dist = Math.hypot(dx, dy);
        let hu = -1000; // air background
        if (dist < 20) hu = 300 + (z * 15); // bone
        if (dist < 10) hu = 1200 + (x * 5); // dense cortical / tooth
        data[idx] = hu;
        if (hu < minHU) minHU = hu;
        if (hu > maxHU) maxHU = hu;
      }
    }
  }

  return {
    id: "test-volume-synth-01",
    dimensions: { width, height, depth },
    spacingMm: { x: spacing[0], y: spacing[1], z: spacing[2] },
    originMm: { x: origin[0], y: origin[1], z: origin[2] },
    physicalSizeMm: {
      x: width * spacing[0],
      y: height * spacing[1],
      z: depth * spacing[2],
    },
    data,
    minHU,
    maxHU,
    rescaleSlope: 1.0,
    rescaleIntercept: 0.0,
    defaultWindowWidth: 4400,
    defaultWindowLevel: 1300,
    isDisposed: false,
  };
}

describe("CBCT Crop Box Engine & Sub-Volume Extraction", () => {
  const bmin: Vec3 = [0, 0, 0];
  const bmax: Vec3 = [10, 20, 30];

  describe("clipPlanes", () => {
    it("produces no planes for a full (uncropped) box", () => {
      const planes = clipPlanes(bmin, bmax, NO_CROP);
      assert.equal(planes.length, 0);
    });

    it("produces no planes when crop values are within tolerance of uncropped bounds", () => {
      const nearFull: CropBox = {
        min: [0.0005, 0.0008, 0],
        max: [0.9995, 1.0, 0.9999],
      };
      const planes = clipPlanes(bmin, bmax, nearFull, 0.001);
      assert.equal(planes.length, 0);
    });

    it("cuts only requested sides with correct origins and normals (matching DenCT reference)", () => {
      const crop: CropBox = { min: [0.2, 0, 0], max: [1, 0.5, 1] };
      const planes = clipPlanes(bmin, bmax, crop);
      assert.equal(planes.length, 2);

      // X low at 0.2 * 10 = 2, keeps x >= 2 -> normal +X
      const xlo = planes.find((p) => p.normal[0] === 1);
      assert.ok(xlo, "Should find +X plane");
      assert.ok(Math.abs(xlo.origin[0] - 2) < 1e-5);
      assert.deepEqual(xlo.normal, [1, 0, 0]);

      // Y high at 0.5 * 20 = 10, keeps y <= 10 -> normal -Y
      const yhi = planes.find((p) => p.normal[1] === -1);
      assert.ok(yhi, "Should find -Y plane");
      assert.ok(Math.abs(yhi.origin[1] - 10) < 1e-5);
      assert.deepEqual(yhi.normal, [-0, -1, -0]);
    });

    it("produces all 6 clipping planes when fully cropped inward", () => {
      const crop: CropBox = { min: [0.1, 0.1, 0.1], max: [0.9, 0.9, 0.9] };
      const planes = clipPlanes(bmin, bmax, crop);
      assert.equal(planes.length, 6);

      const posNormals = planes.filter((p) => p.normal.some((n) => n > 0));
      const negNormals = planes.filter((p) => p.normal.some((n) => n < 0));
      assert.equal(posNormals.length, 3);
      assert.equal(negNormals.length, 3);

      // Verify origin coordinates
      const xMinPlane = planes.find((p) => p.normal[0] === 1)!;
      const xMaxPlane = planes.find((p) => p.normal[0] === -1)!;
      assert.ok(Math.abs(xMinPlane.origin[0] - 1) < 1e-5); // 0.1 * 10
      assert.ok(Math.abs(xMaxPlane.origin[0] - 9) < 1e-5); // 0.9 * 10

      const yMinPlane = planes.find((p) => p.normal[1] === 1)!;
      const yMaxPlane = planes.find((p) => p.normal[1] === -1)!;
      assert.ok(Math.abs(yMinPlane.origin[1] - 2) < 1e-5); // 0.1 * 20
      assert.ok(Math.abs(yMaxPlane.origin[1] - 18) < 1e-5); // 0.9 * 20

      const zMinPlane = planes.find((p) => p.normal[2] === 1)!;
      const zMaxPlane = planes.find((p) => p.normal[2] === -1)!;
      assert.ok(Math.abs(zMinPlane.origin[2] - 3) < 1e-5); // 0.1 * 30
      assert.ok(Math.abs(zMaxPlane.origin[2] - 27) < 1e-5); // 0.9 * 30
    });

    it("calculates planes correctly in negative world space coordinates", () => {
      const negBmin: Vec3 = [-50, -40, -30];
      const negBmax: Vec3 = [50, 40, 30]; // span: 100, 80, 60
      const crop: CropBox = { min: [0.25, 0.25, 0.25], max: [0.75, 0.75, 0.75] };

      const planes = clipPlanes(negBmin, negBmax, crop);
      assert.equal(planes.length, 6);

      const xMinPlane = planes.find((p) => p.normal[0] === 1)!;
      const xMaxPlane = planes.find((p) => p.normal[0] === -1)!;
      // -50 + 0.25 * 100 = -25
      assert.ok(Math.abs(xMinPlane.origin[0] - (-25)) < 1e-5);
      // -50 + 0.75 * 100 = +25
      assert.ok(Math.abs(xMaxPlane.origin[0] - 25) < 1e-5);
    });

    it("clipPlanesFromVolume accurately maps volume spatial bounds", () => {
      const volume = createSyntheticVolume(60, 60, 40, [0.2, 0.2, 0.5], [-6, -6, -10]);
      // physicalSize: [12, 12, 20], bmin: [-6, -6, -10], bmax: [6, 6, 10]
      const crop: CropBox = { min: [0.5, 0.0, 0.5], max: [1.0, 1.0, 1.0] };

      const planes = clipPlanesFromVolume(volume, crop);
      assert.equal(planes.length, 2); // only X min and Z min cut

      const xMin = planes.find((p) => p.normal[0] === 1)!;
      const zMin = planes.find((p) => p.normal[2] === 1)!;
      // -6 + 0.5 * 12 = 0
      assert.ok(Math.abs(xMin.origin[0] - 0) < 1e-5);
      // -10 + 0.5 * 20 = 0
      assert.ok(Math.abs(zMin.origin[2] - 0) < 1e-5);
    });
  });

  describe("isPointInsideCropBox & doesPointSatisfyClipPlanes", () => {
    const crop: CropBox = { min: [0.2, 0.2, 0.2], max: [0.8, 0.8, 0.8] };
    // bounds: [2..8, 4..16, 6..24] in [0..10, 0..20, 0..30]
    const planes = clipPlanes(bmin, bmax, crop);

    it("correctly identifies points inside the crop box", () => {
      const insidePoint: Vec3 = [5, 10, 15]; // center
      assert.equal(isPointInsideCropBox(insidePoint, bmin, bmax, crop), true);
      assert.equal(doesPointSatisfyClipPlanes(insidePoint, planes), true);

      // Object Point3D format
      const insideObj: Point3D = { x: 5, y: 10, z: 15 };
      assert.equal(isPointInsideCropBox(insideObj, bmin, bmax, crop), true);
      assert.equal(doesPointSatisfyClipPlanes(insideObj, planes), true);
    });

    it("correctly identifies points outside the crop box", () => {
      const outsidePoints: Vec3[] = [
        [1.0, 10, 15], // x < 2
        [9.0, 10, 15], // x > 8
        [5, 3.0, 15],  // y < 4
        [5, 17.0, 15], // y > 16
        [5, 10, 5.0],  // z < 6
        [5, 10, 25.0], // z > 24
      ];

      for (const pt of outsidePoints) {
        assert.equal(isPointInsideCropBox(pt, bmin, bmax, crop), false, `Point ${pt} should be outside`);
        assert.equal(doesPointSatisfyClipPlanes(pt, planes), false, `Point ${pt} should fail planes`);
      }
    });

    it("considers boundary points inside within tolerance", () => {
      const boundaryMin: Vec3 = [2.0, 4.0, 6.0];
      const boundaryMax: Vec3 = [8.0, 16.0, 24.0];
      assert.equal(isPointInsideCropBox(boundaryMin, bmin, bmax, crop), true);
      assert.equal(isPointInsideCropBox(boundaryMax, bmin, bmax, crop), true);
      assert.equal(doesPointSatisfyClipPlanes(boundaryMin, planes), true);
      assert.equal(doesPointSatisfyClipPlanes(boundaryMax, planes), true);
    });

    it("isNormalizedPointInsideCropBox evaluates normalized coordinates", () => {
      assert.equal(isNormalizedPointInsideCropBox([0.5, 0.5, 0.5], crop), true);
      assert.equal(isNormalizedPointInsideCropBox([0.1, 0.5, 0.5], crop), false);
      assert.equal(isNormalizedPointInsideCropBox({ x: 0.5, y: 0.8, z: 0.5 }, crop), true);
    });
  });

  describe("CropBox Normalization & Utilities", () => {
    it("normalizeCropBox fixes inverted and out-of-range bounds", () => {
      const inverted: CropBox = {
        min: [0.8, 1.2, -0.2],
        max: [0.2, 0.4, 0.6],
      };
      const norm = normalizeCropBox(inverted);
      assert.deepEqual(norm.min, [0.2, 0.4, 0]);
      assert.deepEqual(norm.max, [0.8, 1.0, 0.6]);
    });

    it("isCropActive returns false for uncropped and true for cropped", () => {
      assert.equal(isCropActive(NO_CROP), false);
      assert.equal(isCropActive({ min: [0.05, 0, 0], max: [1, 1, 1] }), true);
      assert.equal(isCropActive({ min: [0, 0, 0], max: [1, 0.95, 1] }), true);
    });

    it("intersectCropBoxes correctly computes overlaps and detects disjoints", () => {
      const boxA: CropBox = { min: [0.1, 0.1, 0.1], max: [0.6, 0.6, 0.6] };
      const boxB: CropBox = { min: [0.4, 0.4, 0.4], max: [0.9, 0.9, 0.9] };
      const overlap = intersectCropBoxes(boxA, boxB);
      assert.ok(overlap);
      assert.deepEqual(overlap.min, [0.4, 0.4, 0.4]);
      assert.deepEqual(overlap.max, [0.6, 0.6, 0.6]);

      const disjointBox: CropBox = { min: [0.7, 0.7, 0.7], max: [0.9, 0.9, 0.9] };
      const noOverlap = intersectCropBoxes(boxA, disjointBox);
      assert.equal(noOverlap, null);
    });

    it("expandCropBoxWithMargin expands bounds with clamping", () => {
      const box: CropBox = { min: [0.2, 0.2, 0.2], max: [0.8, 0.8, 0.8] };
      const expanded = expandCropBoxWithMargin(box, 0.1);
      assert.ok(Math.abs(expanded.min[0] - 0.1) < 1e-5);
      assert.ok(Math.abs(expanded.max[0] - 0.9) < 1e-5);

      // Margin exceeding boundary clamps at 0 and 1
      const bigExpanded = expandCropBoxWithMargin(box, 0.5);
      assert.deepEqual(bigExpanded.min, [0, 0, 0]);
      assert.deepEqual(bigExpanded.max, [1, 1, 1]);
    });

    it("worldBoundsFromCropBox maps normalized box to world millimeters", () => {
      const crop: CropBox = { min: [0.25, 0.5, 0.0], max: [0.75, 1.0, 0.5] };
      const wb = worldBoundsFromCropBox(crop, [0, 0, 0], [100, 200, 300]);
      assert.deepEqual(wb.min, [25, 100, 0]);
      assert.deepEqual(wb.max, [75, 200, 150]);
    });
  });

  describe("voxelBoundsFromCropBox & cropBoxFromVoxelBounds", () => {
    const dims = { width: 100, height: 100, depth: 50 };

    it("computes exact integer voxel bounding box", () => {
      const crop: CropBox = { min: [0.25, 0.1, 0.4], max: [0.75, 0.8, 0.9] };
      const vb = voxelBoundsFromCropBox(crop, dims);

      assert.equal(vb.startX, 25);
      assert.equal(vb.endX, 75);
      assert.equal(vb.width, 50);

      assert.equal(vb.startY, 10);
      assert.equal(vb.endY, 80);
      assert.equal(vb.height, 70);

      assert.equal(vb.startZ, 20);
      assert.equal(vb.endZ, 45);
      assert.equal(vb.depth, 25);
    });

    it("roundtrips between voxel bounds and CropBox", () => {
      const origCrop: CropBox = { min: [0.2, 0.3, 0.4], max: [0.8, 0.7, 0.6] };
      const vb = voxelBoundsFromCropBox(origCrop, dims);
      const converted = cropBoxFromVoxelBounds(vb, dims);

      assert.ok(Math.abs(converted.min[0] - origCrop.min[0]) < 1e-4);
      assert.ok(Math.abs(converted.min[1] - origCrop.min[1]) < 1e-4);
      assert.ok(Math.abs(converted.min[2] - origCrop.min[2]) < 1e-4);
      assert.ok(Math.abs(converted.max[0] - origCrop.max[0]) < 1e-4);
      assert.ok(Math.abs(converted.max[1] - origCrop.max[1]) < 1e-4);
      assert.ok(Math.abs(converted.max[2] - origCrop.max[2]) < 1e-4);
    });

    it("ensures at least 1 voxel in each dimension for degenerate box", () => {
      const degen: CropBox = { min: [0.5, 0.5, 0.5], max: [0.5, 0.5, 0.5] };
      const vb = voxelBoundsFromCropBox(degen, dims);
      assert.ok(vb.width >= 1);
      assert.ok(vb.height >= 1);
      assert.ok(vb.depth >= 1);
    });
  });

  describe("extractSubVolume (3x-5x RAM Reduction & Spatial Fidelity)", () => {
    const origVol = createSyntheticVolume(60, 60, 40, [0.2, 0.2, 0.5], [-6, -6, -10]);

    it("throws when source volume is disposed or has null data", () => {
      const disposedVol: CbctVoxelVolume = {
        ...origVol,
        isDisposed: true,
        data: null,
      };
      assert.throws(() => {
        extractSubVolume(disposedVol, NO_CROP);
      }, /Cannot extract sub-volume/);
    });

    it("extracts full volume identically under NO_CROP", () => {
      const sub = extractSubVolume(origVol, NO_CROP);
      assert.equal(sub.dimensions.width, origVol.dimensions.width);
      assert.equal(sub.dimensions.height, origVol.dimensions.height);
      assert.equal(sub.dimensions.depth, origVol.dimensions.depth);
      assert.deepEqual(sub.spacingMm, origVol.spacingMm);
      assert.deepEqual(sub.originMm, origVol.originMm);
      assert.deepEqual(sub.physicalSizeMm, origVol.physicalSizeMm);
      assert.equal(sub.data!.length, origVol.data!.length);
      assert.equal(sub.minHU, origVol.minHU);
      assert.equal(sub.maxHU, origVol.maxHU);
    });

    it("extracts quadrant sub-volume with 4x-5x RAM reduction and exact voxel values", () => {
      // Focus on Quadrant 1 (X: 0.5..1.0, Y: 0..0.8, Z: 0.5..1.0)
      const crop: CropBox = {
        min: [0.5, 0.0, 0.5],
        max: [1.0, 0.8, 1.0],
      };

      const memoryEstimate = estimateSubVolumeMemory(origVol, crop);
      // Original: 60 * 60 * 40 = 144,000 voxels (288 KB)
      // Sub: 30 * 48 * 20 = 28,800 voxels (57.6 KB) -> 5.0x reduction factor (80% savings)
      assert.equal(memoryEstimate.originalVoxels, 144000);
      assert.equal(memoryEstimate.subVoxels, 28800);
      assert.ok(memoryEstimate.reductionFactor >= 4.5);
      assert.ok(memoryEstimate.savingsPercent >= 75);

      const sub = extractSubVolume(origVol, crop, {
        idPrefix: "q1-subvol",
        computeActualHURange: true,
      });

      assert.equal(sub.dimensions.width, 30);
      assert.equal(sub.dimensions.height, 48);
      assert.equal(sub.dimensions.depth, 20);
      assert.equal(sub.data!.length, 28800);

      // Verify spatial origin recalibration
      // startX = 30 -> offset: 30 * 0.2 = 6.0 mm -> subOriginX = -6 + 6.0 = 0.0 mm
      // startY = 0  -> offset: 0 * 0.2 = 0.0 mm  -> subOriginY = -6 + 0.0 = -6.0 mm
      // startZ = 20 -> offset: 20 * 0.5 = 10.0 mm -> subOriginZ = -10 + 10.0 = 0.0 mm
      assert.ok(Math.abs(sub.originMm.x - 0.0) < 1e-5);
      assert.ok(Math.abs(sub.originMm.y - (-6.0)) < 1e-5);
      assert.ok(Math.abs(sub.originMm.z - 0.0) < 1e-5);

      // Verify physical size
      assert.ok(Math.abs(sub.physicalSizeMm.x - (30 * 0.2)) < 1e-5);
      assert.ok(Math.abs(sub.physicalSizeMm.y - (48 * 0.2)) < 1e-5);
      assert.ok(Math.abs(sub.physicalSizeMm.z - (20 * 0.5)) < 1e-5);

      // Verify every voxel value in subData matches source volume at offset
      const W = origVol.dimensions.width;
      const H = origVol.dimensions.height;
      const subW = sub.dimensions.width;
      const subH = sub.dimensions.height;

      const startX = 30;
      const startY = 0;
      const startZ = 20;

      for (let kz = 0; kz < sub.dimensions.depth; kz++) {
        for (let ky = 0; ky < subH; ky++) {
          for (let kx = 0; kx < subW; kx++) {
            const subIdx = kz * (subW * subH) + ky * subW + kx;
            const srcX = startX + kx;
            const srcY = startY + ky;
            const srcZ = startZ + kz;
            const srcIdx = srcZ * (W * H) + srcY * W + srcX;
            assert.equal(
              sub.data![subIdx],
              origVol.data![srcIdx],
              `Voxel mismatch at sub (${kx},${ky},${kz}) vs src (${srcX},${srcY},${srcZ})`,
            );
          }
        }
      }
    });

    it("preserves metadata including window level/width and rescale values", () => {
      const sub = extractSubVolume(origVol, { min: [0.1, 0.1, 0.1], max: [0.5, 0.5, 0.5] });
      assert.equal(sub.defaultWindowWidth, origVol.defaultWindowWidth);
      assert.equal(sub.defaultWindowLevel, origVol.defaultWindowLevel);
      assert.equal(sub.rescaleSlope, origVol.rescaleSlope);
      assert.equal(sub.rescaleIntercept, origVol.rescaleIntercept);
      assert.equal(sub.isDisposed, false);
    });
  });

  describe("Clinical Dental Anatomical Presets", () => {
    it("all dental presets are valid normalized crop boxes", () => {
      for (const [name, preset] of Object.entries(DENTAL_CROP_PRESETS)) {
        const norm = normalizeCropBox(preset);
        assert.deepEqual(norm, preset, `Preset ${name} should already be normalized`);
        for (let a = 0; a < 3; a++) {
          assert.ok(preset.min[a] >= 0 && preset.min[a] <= 1, `${name} min[${a}] out of range`);
          assert.ok(preset.max[a] >= 0 && preset.max[a] <= 1, `${name} max[${a}] out of range`);
          assert.ok(preset.min[a] <= preset.max[a], `${name} min > max on axis ${a}`);
        }
      }
    });

    it("extracting with QUADRANT_1 and MANDIBLE presets succeeds and isolates ROI", () => {
      const vol = createSyntheticVolume(80, 80, 60);

      const maxillaVol = extractSubVolume(vol, DENTAL_CROP_PRESETS.MAXILLA);
      assert.ok(maxillaVol.dimensions.depth < vol.dimensions.depth);
      assert.ok(maxillaVol.data!.length < vol.data!.length);

      const q1Vol = extractSubVolume(vol, DENTAL_CROP_PRESETS.QUADRANT_1);
      const est = estimateSubVolumeMemory(vol, DENTAL_CROP_PRESETS.QUADRANT_1);
      assert.ok(est.reductionFactor > 3.0, "Quadrant 1 should achieve >3x RAM reduction");
      assert.equal(q1Vol.data!.length, est.subVoxels);
    });
  });
});
