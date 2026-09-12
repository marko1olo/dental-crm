import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  catmullRom,
  interpolateArchCurve,
  totalArcLength,
  resampleByArcLength,
  computeCurveNormals,
  offsetCurve,
  buildUniformCurve,
  generateDefaultArchCurve,
  generateDefaultArchWithLandmarks,
  trilinearInterpolation,
  createVolumeSamplingData,
  buildPanoramicReformation,
  generatePanoramic,
  crossSectionFrame,
  computeParaxialCrossSection,
  formatPanoramicCprReportA4,
  AIR_HU,
  point2Schema,
  archToothLandmarkSchema,
  volumeSamplingInputSchema,
  panoramicReformationParamsSchema,
  paraxialCrossSectionParamsSchema,
  type Point2,
  type VolumeSamplingInput,
  type PanoramicReformationResult,
} from "../cprPanoramicEngine.js";

describe("Wave 134: CBCT CPR Panoramic Reformation & Arch Curve Engine", () => {
  // ───────────────────────────────────────────────────────────────────────────
  // 1. Dental Arch Spline Mathematics
  // ───────────────────────────────────────────────────────────────────────────
  describe("Dental Arch Spline Mathematics", () => {
    it("evaluates Catmull-Rom spline segment at boundary and intermediate parameters", () => {
      const p0: Point2 = [0, 0];
      const p1: Point2 = [10, 0];
      const p2: Point2 = [20, 10];
      const p3: Point2 = [30, 10];

      const start = catmullRom(p0, p1, p2, p3, 0);
      assert.ok(Math.abs(start[0] - 10) < 1e-6);
      assert.ok(Math.abs(start[1] - 0) < 1e-6);

      const end = catmullRom(p0, p1, p2, p3, 1);
      assert.ok(Math.abs(end[0] - 20) < 1e-6);
      assert.ok(Math.abs(end[1] - 10) < 1e-6);

      const mid = catmullRom(p0, p1, p2, p3, 0.5);
      assert.ok(mid[0] > 10 && mid[0] < 20);
      assert.ok(mid[1] > 0 && mid[1] < 10);
    });

    it("interpolates control points smoothly and preserves endpoints", () => {
      const cps: Point2[] = [
        [-50, 40],
        [-30, -10],
        [0, -30],
        [30, -10],
        [50, 40],
      ];

      const curve = interpolateArchCurve(cps, 20);
      assert.strictEqual(curve.length, (cps.length - 1) * 20 + 1);

      const first = curve[0];
      const last = curve[curve.length - 1];
      assert.ok(first && Math.abs(first[0] - -50) < 1e-6 && Math.abs(first[1] - 40) < 1e-6);
      assert.ok(last && Math.abs(last[0] - 50) < 1e-6 && Math.abs(last[1] - 40) < 1e-6);

      // Degenerate cases
      assert.deepStrictEqual(interpolateArchCurve([]), []);
      assert.deepStrictEqual(interpolateArchCurve([[10, 20]]), [[10, 20]]);
    });

    it("calculates accurate Euclidean arc length", () => {
      const line: Point2[] = [
        [0, 0],
        [30, 0],
        [30, 40],
      ];
      // 30 + 40 = 70 mm
      const len = totalArcLength(line);
      assert.strictEqual(len, 70);

      assert.strictEqual(totalArcLength([]), 0);
      assert.strictEqual(totalArcLength([[10, 10]]), 0);
    });

    it("resamples polyline uniformly by arc length", () => {
      // Non-uniform polyline: short segment (10mm) followed by long segment (90mm), total = 100mm
      const raw: Point2[] = [
        [0, 0],
        [10, 0],
        [100, 0],
      ];
      const numSamples = 11; // step should be 100 / 10 = 10mm
      const resampled = resampleByArcLength(raw, numSamples);

      assert.strictEqual(resampled.length, numSamples);
      for (let i = 0; i < numSamples; i++) {
        const pt = resampled[i];
        assert.ok(pt);
        const expectedX = i * 10;
        assert.ok(Math.abs(pt[0] - expectedX) < 1e-3, `Sample ${i} x was ${pt[0]}, expected ${expectedX}`);
        assert.ok(Math.abs(pt[1] - 0) < 1e-3);
      }

      // Step lengths between consecutive samples must be equal
      for (let i = 1; i < resampled.length; i++) {
        const p1 = resampled[i];
        const p0 = resampled[i - 1];
        assert.ok(p1 && p0);
        const d = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
        assert.ok(Math.abs(d - 10) < 1e-3);
      }
    });

    it("computes orthogonal unit normals with CW rotation in XY plane", () => {
      // Straight line along +X: tangent is [1, 0], normal rotated 90 CW is [0, 1]
      const horizontalLine: Point2[] = [
        [0, 0],
        [50, 0],
        [100, 0],
      ];
      const normals = computeCurveNormals(horizontalLine);
      assert.strictEqual(normals.length, 3);
      normals.forEach((n) => {
        assert.ok(Math.abs(n[0] - 0) < 1e-6);
        assert.ok(Math.abs(n[1] - 1) < 1e-6);
        const mag = Math.hypot(n[0], n[1]);
        assert.ok(Math.abs(mag - 1) < 1e-6);
      });

      // Straight line along -Y: tangent is [0, -1], normal rotated 90 CW is [1, 0]
      const verticalLine: Point2[] = [
        [0, 100],
        [0, 50],
        [0, 0],
      ];
      const vNormals = computeCurveNormals(verticalLine);
      vNormals.forEach((n) => {
        assert.ok(Math.abs(n[0] - 1) < 1e-6);
        assert.ok(Math.abs(n[1] - 0) < 1e-6);
      });
    });

    it("generates parallel offset curves correctly", () => {
      const curve: Point2[] = [
        [0, 0],
        [10, 0],
      ];
      const normals: Point2[] = [
        [0, 1],
        [0, 1],
      ];
      const distance = 5.0;
      const offset = offsetCurve(curve, normals, distance);

      assert.strictEqual(offset.length, 2);
      const o0 = offset[0];
      const o1 = offset[1];
      assert.ok(o0 && Math.abs(o0[0] - 0) < 1e-6 && Math.abs(o0[1] - 5) < 1e-6);
      assert.ok(o1 && Math.abs(o1[0] - 10) < 1e-6 && Math.abs(o1[1] - 5) < 1e-6);
    });

    it("builds a complete uniform curve with normals and total arc length", () => {
      const cps: Point2[] = [
        [-40, 30],
        [0, -20],
        [40, 30],
      ];
      const { curve, normals, arcLen } = buildUniformCurve(cps, 50);

      assert.strictEqual(curve.length, 50);
      assert.strictEqual(normals.length, 50);
      assert.ok(arcLen > 100);
      normals.forEach((n) => {
        const len = Math.hypot(n[0], n[1]);
        assert.ok(Math.abs(len - 1) < 1e-4);
      });
    });

    it("generates standard U-shaped dental arch and anatomical tooth landmarks", () => {
      const center: Point2 = [100, 100];
      const size: Point2 = [200, 200];

      const arch = generateDefaultArchCurve(center, size);
      assert.strictEqual(arch.length, 9);

      // Central incisor must be at center X and most anterior (-Y)
      const midline = arch[4];
      assert.ok(midline);
      assert.strictEqual(midline[0], 100);
      assert.ok(midline[1] < 100);

      // Symmetry check across X midline
      const rightWisdom = arch[0];
      const leftWisdom = arch[8];
      assert.ok(rightWisdom && leftWisdom);
      assert.strictEqual(rightWisdom[1], leftWisdom[1]);
      assert.ok(Math.abs(center[0] - rightWisdom[0] - (leftWisdom[0] - center[0])) < 1e-6);

      // Maxilla & Mandible landmarks
      const maxilla = generateDefaultArchWithLandmarks(center, size, "maxilla");
      assert.strictEqual(maxilla.controlPoints.length, 9);
      assert.strictEqual(maxilla.landmarks.length, 14);
      assert.strictEqual(maxilla.landmarks[0]?.fdiToothNumber, 17);
      assert.strictEqual(maxilla.landmarks[6]?.fdiToothNumber, 11);
      assert.strictEqual(maxilla.landmarks[7]?.fdiToothNumber, 21);
      assert.strictEqual(maxilla.landmarks[13]?.fdiToothNumber, 27);

      const mandible = generateDefaultArchWithLandmarks(center, size, "mandible");
      assert.strictEqual(mandible.landmarks.length, 14);
      assert.strictEqual(mandible.landmarks[0]?.fdiToothNumber, 47);
      assert.strictEqual(mandible.landmarks[6]?.fdiToothNumber, 41);
      assert.strictEqual(mandible.landmarks[7]?.fdiToothNumber, 31);
      assert.strictEqual(mandible.landmarks[13]?.fdiToothNumber, 37);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Trilinear Voxel Interpolation & Volume Data Adapter
  // ───────────────────────────────────────────────────────────────────────────
  describe("Trilinear Voxel Interpolation & Volume Adapter", () => {
    it("interpolates scalar values within a 3D unit grid correctly", () => {
      // 2x2x2 grid with linear gradient along X
      const dims: [number, number, number] = [2, 2, 2];
      const getVoxel = (i: number, _j: number, _k: number) => (i === 0 ? 100 : 200);

      // Corner at (0, 0, 0)
      const v0 = trilinearInterpolation(getVoxel, dims, 0, 0, 0);
      assert.strictEqual(v0, 100);

      // Corner at (1, 0, 0)
      const v1 = trilinearInterpolation(getVoxel, dims, 1, 0, 0);
      assert.ok(Math.abs(v1 - 200) < 1e-3);

      // Center (0.5, 0.5, 0.5)
      const vMid = trilinearInterpolation(getVoxel, dims, 0.5, 0.5, 0.5);
      assert.strictEqual(vMid, 150);
    });

    it("returns air sentinel (-1024 HU) for out-of-bounds queries", () => {
      const dims: [number, number, number] = [4, 4, 4];
      const getVoxel = () => 500;

      assert.strictEqual(trilinearInterpolation(getVoxel, dims, -1, 2, 2), AIR_HU);
      assert.strictEqual(trilinearInterpolation(getVoxel, dims, 2, 5, 2), AIR_HU);
      assert.strictEqual(trilinearInterpolation(getVoxel, dims, 2, 2, -0.5), AIR_HU);
    });

    it("clamps samples on outermost boundary to avoid edge artifacts", () => {
      const dims: [number, number, number] = [4, 4, 4];
      const getVoxel = () => 800;

      // Exactly at dims - 1 boundary
      const edge = trilinearInterpolation(getVoxel, dims, 3, 3, 3);
      assert.strictEqual(edge, 800);
    });

    it("creates normalized VolumeSamplingData from VolumeSamplingInput with TypedArray", () => {
      const dims: [number, number, number] = [4, 4, 4];
      const raw = new Int16Array(64);
      raw.fill(350);

      const input: VolumeSamplingInput = {
        dimensions: dims,
        spacing: [0.5, 0.5, 1.0],
        origin: [0, 0, 10],
        data: raw,
      };

      const vol = createVolumeSamplingData(input);
      assert.deepStrictEqual(vol.dims, dims);
      assert.strictEqual(vol.getVoxel(1, 1, 1), 350);
      assert.strictEqual(vol.invSx, 2.0);
      assert.strictEqual(vol.invSy, 2.0);
      assert.strictEqual(vol.invSz, 1.0);
      assert.strictEqual(vol.zMin, 10);
      assert.strictEqual(vol.zMax, 13); // 10 + (4 - 1) * 1.0
      assert.strictEqual(vol.vSpacing, 1.0);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Panoramic CPR Volume Reformation (OPG View)
  // ───────────────────────────────────────────────────────────────────────────
  describe("Panoramic CPR Volume Reformation", () => {
    function createSyntheticDentalVolume() {
      // 50x50x20 volume (0.5mm x 0.5mm x 1.0mm), origin at [0, 0, 0]
      const dims: [number, number, number] = [50, 50, 20];
      const data = new Int16Array(50 * 50 * 20);
      data.fill(-1000); // Air background

      // Create a dense U-shaped mandible bone structure (+1000 HU)
      for (let z = 2; z < 18; z++) {
        for (let y = 5; y < 45; y++) {
          for (let x = 5; x < 45; x++) {
            // Horseshoe band: distance to arc center
            const dx = x - 25;
            const dy = y - 25;
            const dist = Math.hypot(dx, dy);
            if (dist >= 14 && dist <= 18 && y <= 35) {
              const idx = z * (50 * 50) + y * 50 + x;
              data[idx] = 1200; // Cortical bone
            }
          }
        }
      }

      return {
        dimensions: dims,
        spacing: [0.5, 0.5, 1.0] as [number, number, number],
        origin: [0, 0, 0] as [number, number, number],
        data,
      };
    }

    it("reforms panoramic 2D slice in MIP mode extracting maximum bone density", () => {
      const vol = createSyntheticDentalVolume();
      const controlPoints: Point2[] = [
        [5, 15],
        [15, 8],
        [25, 6],
        [35, 8],
        [45, 15],
      ];

      const result = buildPanoramicReformation({
        volume: vol,
        controlPoints,
        slabThicknessMm: 6.0,
        projection: "MIP",
        resolutionMm: 0.5,
      });

      assert.ok(result !== null);
      assert.ok(result.width > 30);
      assert.strictEqual(result.height, 20);
      assert.strictEqual(result.projection, "MIP");
      assert.ok(result.maxHU >= 1000, `Expected maxHU >= 1000, got ${result.maxHU}`);
      assert.strictEqual(result.pixelData.length, result.width * result.height);
    });

    it("reforms panoramic 2D slice in Average projection mode", () => {
      const vol = createSyntheticDentalVolume();
      const controlPoints: Point2[] = [
        [5, 15],
        [15, 8],
        [25, 6],
        [35, 8],
        [45, 15],
      ];

      const result = generatePanoramic({
        volume: vol,
        controlPoints,
        slabThicknessMm: 4.0,
        projection: "Average",
        resolutionMm: 0.5,
      });

      assert.ok(result !== null);
      assert.strictEqual(result.projection, "Average");
      // Average should be between air (-1000) and bone (+1200)
      assert.ok(result.meanHU > -1000 && result.meanHU < 1200);
    });

    it("reforms panoramic 2D slice in MinIP projection mode", () => {
      const vol = createSyntheticDentalVolume();
      const controlPoints: Point2[] = [
        [5, 15],
        [25, 6],
        [45, 15],
      ];

      const result = buildPanoramicReformation({
        volume: vol,
        controlPoints,
        slabThicknessMm: 4.0,
        projection: "MinIP",
      });

      assert.ok(result !== null);
      assert.strictEqual(result.projection, "MinIP");
      assert.ok(result.minHU <= -900);
    });

    it("rejects degenerate control points (<2 points)", () => {
      const vol = createSyntheticDentalVolume();
      assert.strictEqual(buildPanoramicReformation({ volume: vol, controlPoints: [] }), null);
      assert.strictEqual(buildPanoramicReformation({ volume: vol, controlPoints: [[10, 10]] }), null);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Paraxial Cross-Section Reformation
  // ───────────────────────────────────────────────────────────────────────────
  describe("Paraxial Cross-Section Reformation", () => {
    it("computes cross-section coordinate frame with tilt clamping", () => {
      const cps: Point2[] = [
        [0, 20],
        [20, 0],
        [40, 20],
      ];
      // Test tilt clamped to [-30, 30]
      const frame = crossSectionFrame(cps, 0.5, 45, 0, 50);
      assert.ok(frame !== null);
      assert.ok(frame.point);
      assert.ok(frame.normal);
      assert.ok(frame.tangent);
      assert.strictEqual(frame.origin[2], 25); // mid-Z = (0 + 50) / 2

      // eU is orthogonal to Z axis
      assert.strictEqual(frame.eU[2], 0);

      // Normal length = 1
      const nLen = Math.hypot(frame.normal[0], frame.normal[1]);
      assert.ok(Math.abs(nLen - 1) < 1e-4);
    });

    it("samples paraxial cross-section slice with tilted vertical axis", () => {
      const dims: [number, number, number] = [60, 60, 30];
      const data = new Int16Array(60 * 60 * 30);
      data.fill(-1000);

      // Place a bone cylinder (+1500 HU) at position (30, 10)
      for (let z = 5; z < 25; z++) {
        for (let y = 5; y < 15; y++) {
          for (let x = 25; x < 35; x++) {
            data[z * (60 * 60) + y * 60 + x] = 1500;
          }
        }
      }

      const cps: Point2[] = [
        [10, 30],
        [30, 10],
        [50, 30],
      ];

      const crossSection = computeParaxialCrossSection({
        volume: { dimensions: dims, spacing: [1.0, 1.0, 1.0], data },
        controlPoints: cps,
        positionNormalized: 0.5, // Exactly at (30, 10)
        tiltDeg: 10,
        widthMm: 15,
        resolutionMm: 0.5,
      });

      assert.ok(crossSection !== null);
      assert.strictEqual(crossSection.positionNormalized, 0.5);
      assert.strictEqual(crossSection.tiltDeg, 10);
      assert.strictEqual(crossSection.width, 30); // 15mm / 0.5mm = 30
      assert.strictEqual(crossSection.height, 30); // 30 slices
      assert.ok(crossSection.maxHU >= 1000, `Expected maxHU >= 1000, got ${crossSection.maxHU}`);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Regulatory Form 043/u A4 Protocol
  // ───────────────────────────────────────────────────────────────────────────
  describe("Regulatory Form 043/u A4 Protocol", () => {
    it("generates complete Russian Form 043/u protocol with mandatory sections", () => {
      const mockResult: PanoramicReformationResult = {
        pixelData: new Float32Array(200 * 50),
        width: 200,
        height: 50,
        horizontalSpacingMm: 0.45,
        verticalSpacingMm: 1.0,
        zMinMm: 0.0,
        zMaxMm: 49.0,
        arcLengthMm: 90.0,
        slabThicknessMm: 5.0,
        projection: "MIP",
        numSlabSamples: 5,
        minHU: -1000,
        maxHU: 1850,
        meanHU: 220,
      };

      const protocol = formatPanoramicCprReportA4({
        patientFullName: "Иванов Иван Иванович",
        birthDate: "15.04.1985",
        cardRecordNumber: "СТ-2026/09",
        studyDate: "12.09.2026 10:30",
        doctorFullName: "Петрова Анна Сергеевна",
        clinicName: "Клиника Цифровой Стоматологии ДЕНТЕ",
        panoramicResult: mockResult,
        jawType: "mandible",
        paraxialResults: [
          {
            toothNumber: 46,
            positionNormalized: 0.12,
            tiltDeg: 4.5,
            boneHeightMm: 14.2,
            ridgeWidthMm: 7.8,
            notes: "Костное ложе под имплантат D1",
          },
          {
            toothNumber: 36,
            positionNormalized: 0.88,
            tiltDeg: -3.0,
            boneHeightMm: 13.8,
            ridgeWidthMm: 8.1,
            notes: "Костное ложе под имплантат D2",
          },
        ],
        radiologistConclusion: "Патологических изменений костной ткани нижней челюсти не выявлено. Объем кости достаточен для дентальной имплантации.",
        recommendations: "Консультация хирурга-имплантолога, изготовление навигационного хирургического шаблона.",
      });

      assert.ok(protocol.includes("ФОРМА 043/У"));
      assert.ok(protocol.includes("Иванов Иван Иванович"));
      assert.ok(protocol.includes("СТ-2026/09"));
      assert.ok(protocol.includes("Петрова Анна Сергеевна"));
      assert.ok(protocol.includes("Клиника Цифровой Стоматологии ДЕНТЕ"));
      assert.ok(protocol.includes("Нижняя челюсть"));
      assert.ok(protocol.includes("90.0 мм"));
      assert.ok(protocol.includes("5.0 мм"));
      assert.ok(protocol.includes("MIP"));
      assert.ok(protocol.includes("46"));
      assert.ok(protocol.includes("36"));
      assert.ok(protocol.includes("Костное ложе под имплантат D1"));
      assert.ok(protocol.includes("Консультация хирурга-имплантолога"));
    });

    it("strictly contains ZERO emojis (Mandate 8d, p. 7 audit via Unicode Regex)", () => {
      const mockResult: PanoramicReformationResult = {
        pixelData: new Float32Array(10),
        width: 5,
        height: 2,
        horizontalSpacingMm: 0.5,
        verticalSpacingMm: 1.0,
        zMinMm: 0,
        zMaxMm: 10,
        arcLengthMm: 50,
        slabThicknessMm: 3,
        projection: "Average",
        numSlabSamples: 3,
        minHU: -1000,
        maxHU: 500,
        meanHU: -200,
      };

      const protocol = formatPanoramicCprReportA4({
        patientFullName: "Смирнова Елена Викторовна",
        studyDate: "12.09.2026",
        doctorFullName: "Сидоров В.В.",
        panoramicResult: mockResult,
      });

      const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;
      assert.strictEqual(
        emojiRegex.test(protocol),
        false,
        "EMOJI DETECTED in Form 043/u CPR protocol! Strictly prohibited by Mandate 8d, p. 7.",
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. Zod Schema Contracts & Validation
  // ───────────────────────────────────────────────────────────────────────────
  describe("Zod Schema Contracts", () => {
    it("validates point2Schema and volumeSamplingInputSchema", () => {
      assert.doesNotThrow(() => point2Schema.parse([12.5, -45.2]));
      assert.throws(() => point2Schema.parse([12.5]));
      assert.throws(() => point2Schema.parse(["12.5", 45.2]));

      assert.doesNotThrow(() =>
        volumeSamplingInputSchema.parse({
          dimensions: [100, 100, 50],
          spacing: [0.5, 0.5, 1.0],
          origin: [0, 0, 0],
        }),
      );

      assert.throws(() =>
        volumeSamplingInputSchema.parse({
          dimensions: [-100, 100, 50], // Negative dimensions
          spacing: [0.5, 0.5, 1.0],
        }),
      );
    });

    it("validates archToothLandmarkSchema and paraxialCrossSectionParamsSchema", () => {
      assert.doesNotThrow(() =>
        archToothLandmarkSchema.parse({
          fdiToothNumber: 46,
          nameRu: "Первый моляр справа",
          positionNormalized: 0.12,
          point: [25, 30],
        }),
      );

      assert.throws(() =>
        archToothLandmarkSchema.parse({
          fdiToothNumber: 99, // Invalid tooth number
          nameRu: "Invalid",
          positionNormalized: 1.5,
          point: [0, 0],
        }),
      );

      assert.doesNotThrow(() =>
        paraxialCrossSectionParamsSchema.parse({
          controlPoints: [
            [0, 0],
            [10, 10],
          ],
          positionNormalized: 0.5,
          tiltDeg: -20,
          widthMm: 20,
        }),
      );

      assert.throws(() =>
        paraxialCrossSectionParamsSchema.parse({
          controlPoints: [[0, 0]], // Less than 2 control points
          positionNormalized: 0.5,
        }),
      );
    });

    it("validates panoramicReformationParamsSchema with defaults", () => {
      const parsed = panoramicReformationParamsSchema.parse({
        controlPoints: [
          [0, 0],
          [50, 50],
        ],
      });
      assert.strictEqual(parsed.slabThicknessMm, 5);
      assert.strictEqual(parsed.projection, "MIP");
      assert.strictEqual(parsed.resolutionMm, 0.4);
    });
  });
});
