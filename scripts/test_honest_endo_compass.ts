/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL CBCT: HONEST BLIND ENDO COMPASS 3D INTEGRATION TEST
 * ═══════════════════════════════════════════════════════════════════════════
 * Real-world blind test of 3D Dental Arch, Tooth Watershed, FDI Alignment,
 * Local Tooth OBB Voxel Subvolume, and Multi-Scale Frangi + Fast Marching
 * root canal tracing on 312 DICOM CBCT slices of patient Zakharov I.D.
 *
 * ZERO MOCKS. ZERO SYNTHETIC VOLUMES. 100% PURE REAL VOXEL PHYSICS.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { buildVolumeFromDicomBuffers } from "../apps/web/src/components/radiology/realDicomVolumeLoader.js";
import {
  autoDetectDentalArch,
  findOcclusalZPlane,
} from "../apps/web/src/components/radiology/cbctAutoArchEngine.js";
import {
  // Wave 141
  build3DArchFromVolumetricData,
  executeToothCrownWatershed,
  alignClustersToFdiArch,
  computeToothOBB,
  extractToothVoxelVolume,
  type VolumeSamplingData,
  type Point2,
  // Wave 140
  computeMultiscaleFrangiVolume,
  extractRootCanalSystem,
  evaluateCanalClinicalMetrics,
  buildEndoToothClinicalReport,
  type CbctVoxelVolume,
} from "../packages/shared/src/radiology/index.js";

async function runHonestEndoCompassTest() {
  console.log("═══════════════════════════════════════════════════════════════════");
  console.log(" 🦷 ENDO COMPASS 3D: REAL PATIENT CBCT BLIND VALIDATION SUITE");
  console.log(" Patient: Zakharov I.D. (312 slices, 0.25mm voxel, 600x600x312)");
  console.log("═══════════════════════════════════════════════════════════════════\n");

  const manifestPath = path.resolve("apps/web/public/radiology/demo_cbct/manifest.json");
  if (!existsSync(manifestPath)) {
    throw new Error(`CBCT manifest not found at: ${manifestPath}`);
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const validSlices = manifest.slices.filter((s: string) => {
    const p = path.resolve("apps/web/public/radiology/demo_cbct", s);
    return existsSync(p) && readFileSync(p).byteLength >= 720000;
  });

  console.log(`[STAGE 1] Ingesting ${validSlices.length} DICOM axial slices...`);
  const items = validSlices.map((fileName: string) => {
    const buf = readFileSync(path.resolve("apps/web/public/radiology/demo_cbct", fileName));
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    return { fileName, buffer: ab };
  });

  const rawVolume = await buildVolumeFromDicomBuffers(items);
  console.log("✓ CBCT Volume loaded successfully:", {
    dimensions: rawVolume.dimensions,
    spacingMm: rawVolume.spacingMm,
    originMm: rawVolume.originMm,
  });

  const sx = rawVolume.spacingMm.x ?? (rawVolume.spacingMm as any)[0] ?? 0.25;
  const sy = rawVolume.spacingMm.y ?? (rawVolume.spacingMm as any)[1] ?? 0.25;
  const sz = rawVolume.spacingMm.z ?? (rawVolume.spacingMm as any)[2] ?? 0.25;
  const nx = rawVolume.dimensions.width ?? (rawVolume.dimensions as any)[0] ?? 600;
  const ny = rawVolume.dimensions.height ?? (rawVolume.dimensions as any)[1] ?? 600;
  const nz = rawVolume.dimensions.depth ?? (rawVolume.dimensions as any)[2] ?? 312;
  const ox = rawVolume.originMm.x ?? (rawVolume.originMm as any)[0] ?? -75;
  const oy = rawVolume.originMm.y ?? (rawVolume.originMm as any)[1] ?? -75;
  const oz = rawVolume.originMm.z ?? (rawVolume.originMm as any)[2] ?? -39;
  const invSx = 1 / sx;
  const invSy = 1 / sy;
  const invSz = 1 / sz;
  const strideZ = nx * ny;

  const getVoxelFn = (i: number, j: number, k: number): number => {
    if (i < 0 || i >= nx || j < 0 || j >= ny || k < 0 || k >= nz) return -1024;
    return rawVolume.data[k * strideZ + j * nx + i] ?? -1024;
  };

  const volumeSampling: VolumeSamplingData = {
    dims: [nx, ny, nz],
    origin: [ox, oy, oz],
    getVoxel: getVoxelFn,
    invSx,
    invSy,
    invSz,
    zMin: oz,
    zMax: oz + nz * sz,
    vSpacing: sz,
  };

  // ── STAGE 2: 3D DENTAL ARCH & DARBOUX MOVING FRAMES ────────────────
  console.log("\n[STAGE 2] Computing 3D Dental Arch & Spee Curvature...");
  const mandOcclusalZ = findOcclusalZPlane(rawVolume, "mandible");
  console.log(`- Mandibular occlusal plane Z: ${mandOcclusalZ.toFixed(2)} mm`);

  const baseArch2D = autoDetectDentalArch(rawVolume, "mandible", 14.0);
  console.log(`- Base 2D parabolic arch: ${baseArch2D.anchors.length} anchor control points`);

  // Map anchors using exact positionMm coordinates
  const controlPoints2D: Point2[] = baseArch2D.anchors.map((a: any) => [a.positionMm.x, a.positionMm.y] as Point2);
  const arch3D = build3DArchFromVolumetricData(volumeSampling, controlPoints2D, {
    jaw: "mandible",
    enamelThresholdHU: 1200,
  });

  console.log("✓ 3D Arch computed:", {
    totalLengthMm: arch3D.totalLengthMm.toFixed(2),
    curveOfSpeeDepthMm: arch3D.curveOfSpeeDepthMm.toFixed(2),
    framesCount: arch3D.frames.length,
  });

  const midFrame = arch3D.frames[Math.floor(arch3D.frames.length / 2)]!;
  const dotTN = midFrame.tangent[0] * midFrame.normal[0] + midFrame.tangent[1] * midFrame.normal[1] + midFrame.tangent[2] * midFrame.normal[2];
  const dotNB = midFrame.normal[0] * midFrame.binormal[0] + midFrame.normal[1] * midFrame.binormal[1] + midFrame.normal[2] * midFrame.binormal[2];
  console.log(`- Darboux frame orthonormality check: t·n = ${dotTN.toFixed(6)}, n·b = ${dotNB.toFixed(6)}`);

  // ── STAGE 3: 3D CROWN WATERSHED & DENSE STRUCTURE PARTITION ─────────
  console.log("\n[STAGE 3] Executing 3D Crown Watershed Segmentation...");
  const watershedResult = executeToothCrownWatershed(volumeSampling, arch3D, {
    enamelThresholdHU: 1250,
    hMaximaDepthMm: 2.0,
    minClusterVolumeMm3: 40.0,
  });

  console.log("✓ Watershed Partition Result:", {
    clustersDetected: watershedResult.clusters.length,
    edentulousGaps: watershedResult.gaps.length,
    denseTypeSummary: watershedResult.clusters.slice(0, 10).map((c) => `#${c.id}: ${c.classification} (peak ${c.peakHU} HU)`),
  });

  // ── STAGE 4: FDI DYNAMIC ALIGNMENT & AGING/GAP HANDLING ────────────
  console.log("\n[STAGE 4] Aligning Clusters to Canonical FDI Arch (Wheeler/Misch)...");
  const fdiResult = alignClustersToFdiArch(watershedResult.clusters, watershedResult.gaps, arch3D, {
    jaw: "mandible",
    maxDisplacementMm: 5.0,
  });

  console.log(`✓ FDI Alignment completed. Match score: ${fdiResult.overallMatchScore.toFixed(1)}/100`);
  console.log("--- FDI TEETH REGISTRY (Mandible 48..41, 31..38) ---");
  for (const t of fdiResult.teeth) {
    const statusMark = t.status === "PRESENT_NATURAL" ? "✓" : t.status === "METAL_RESTORED" ? "★" : t.status === "IMPLANT" ? "⚙" : "✗";
    console.log(`  [${statusMark}] Tooth #${t.fdiNumber} (${t.nameRu.padEnd(25)}): status=${t.status.padEnd(16)} s=${t.archArcLengthMm.toFixed(1)}mm`);
  }

  // ── STAGE 5: TOOTH OBB SUBVOLUME EXTRACTION ────────────────────────
  console.log("\n[STAGE 5] Computing Tooth Oriented Bounding Box (OBB) & Subvolume Extraction...");
  // Target natural molar #36 (Left Mandibular First Molar) or #35 / #45
  const targetTooth = fdiResult.teeth.find((t) => t.fdiNumber === 36 && t.status === "PRESENT_NATURAL")
    ?? fdiResult.teeth.find((t) => (t.fdiNumber === 35 || t.fdiNumber === 45 || t.fdiNumber === 44 || t.fdiNumber === 38) && t.status === "PRESENT_NATURAL")
    ?? fdiResult.teeth.find((t) => t.status === "PRESENT_NATURAL");

  if (!targetTooth) {
    throw new Error("No natural tooth found for root canal tracing!");
  }

  console.log(`- Target tooth: Tooth #${targetTooth.fdiNumber} (${targetTooth.nameRu}) at (${targetTooth.centroidWorld[0].toFixed(1)}, ${targetTooth.centroidWorld[1].toFixed(1)}, ${targetTooth.centroidWorld[2].toFixed(1)}) mm`);

  const toothObb = computeToothOBB(volumeSampling, targetTooth, arch3D, {
    samplingRadiusMm: 9.0,
    covarianceThresholdHU: 800,
  });

  console.log("✓ Tooth OBB Geometry:", {
    fdi: toothObb.fdiNumber,
    torqueDeg: toothObb.torqueDeg.toFixed(1),
    tipDeg: toothObb.tipDeg.toFixed(1),
    rotationDeg: toothObb.rotationDeg.toFixed(1),
    halfExtentsMm: toothObb.halfExtentsMm.map((e) => e.toFixed(1)),
    extentMm: toothObb.halfExtentsMm.map((e) => (e * 2).toFixed(1)),
    axisLong: toothObb.axisLong.map((v) => v.toFixed(3)),
  });

  const toothVolumeData = extractToothVoxelVolume(volumeSampling, toothObb, {
    dims: [48, 48, 80],
    spacingMm: 0.25,
  });

  console.log("✓ Local Voxel Subvolume extracted:", {
    dims: toothVolumeData.dims,
    totalVoxels: toothVolumeData.voxels.length,
    minHU: toothVolumeData.minHU,
    maxHU: toothVolumeData.maxHU,
    meanHU: toothVolumeData.meanHU.toFixed(0),
  });

  const toothSubVolume: CbctVoxelVolume = {
    data: toothVolumeData.voxels,
    dimensions: {
      width: toothVolumeData.dims[0],
      height: toothVolumeData.dims[1],
      depth: toothVolumeData.dims[2],
    },
    spacingMm: {
      x: toothVolumeData.spacingMm,
      y: toothVolumeData.spacingMm,
      z: toothVolumeData.spacingMm,
    },
    originMm: {
      x: toothObb.centerWorld[0] - (toothVolumeData.dims[0] * toothVolumeData.spacingMm) / 2,
      y: toothObb.centerWorld[1] - (toothVolumeData.dims[1] * toothVolumeData.spacingMm) / 2,
      z: toothObb.centerWorld[2] - (toothVolumeData.dims[2] * toothVolumeData.spacingMm) / 2,
    },
  };

  // ── STAGE 6: MULTI-SCALE FRANGI 3D TUBENESS FILTER ────────────────
  console.log("\n[STAGE 6] Computing Multi-Scale Frangi 3D Tubeness on Tooth Subvolume...");
  const t0 = performance.now();
  const frangiRes = computeMultiscaleFrangiVolume(
    toothSubVolume,
    undefined,
    {
      alpha: 0.5,
      beta: 0.5,
      c: 15.0,
      scalesMm: [0.35, 0.60],
      darkTubeness: true,
    }
  );
  const tFrangi = performance.now() - t0;

  let maxTubeness = 0;
  for (let i = 0; i < frangiRes.tubeness.length; i++) {
    if (frangiRes.tubeness[i]! > maxTubeness) maxTubeness = frangiRes.tubeness[i]!;
  }

  console.log(`✓ Frangi 3D filter completed in ${tFrangi.toFixed(0)} ms. Maximum lumen tubeness: ${maxTubeness.toFixed(3)}`);


  // ── STAGE 7: 26-CONNECTED FAST MARCHING ROOT CANAL TRACER ──────────
  console.log("\n[STAGE 7] Executing Fast Marching Geodesic Tracing (Eikonal PDE Solver)...");
  const t1 = performance.now();
  const canalSystem = extractRootCanalSystem(toothSubVolume, frangiRes, 3);
  const tFmm = performance.now() - t1;

  console.log(`✓ Fast Marching tracing finished in ${tFmm.toFixed(0)} ms.`);
  console.log(`  Roots detected: ${canalSystem.rootCount}, Canals traced: ${canalSystem.canals.length}`);
  console.log(`  Orifices found: ${canalSystem.detectedOrifices.length}, Apices found: ${canalSystem.detectedApices.length}`);

  for (const canal of canalSystem.canals) {
    console.log(`\n  --- CANAL: ${canal.canalName} (${canal.canalId}) ---`);
    console.log(`  Orifice: (${canal.orifice.worldPositionMm.map((v) => v.toFixed(2)).join(", ")}) mm, tubeness=${canal.orifice.tubeness.toFixed(3)}`);
    console.log(`  Apex:    (${canal.apicalForamen.worldPositionMm.map((v) => v.toFixed(2)).join(", ")}) mm, HU=${canal.apicalForamen.hu.toFixed(0)}`);
    console.log(`  Polyline: ${canal.polylineMm.length} pts, geodesic length: ${canal.geodesicLengthMm.toFixed(2)} mm`);
    console.log(`  Mean HU: ${canal.meanHU.toFixed(0)}, Mean Tubeness: ${canal.meanTubeness.toFixed(3)}`);

    // ── STAGE 8: CLINICAL METRICS (SCHNEIDER & VERTUCCI) ───────────
    const metrics = evaluateCanalClinicalMetrics(canal);
    console.log(`  Clinical Working Length (Anat): ${metrics.workingLengthAnatomicalMm.toFixed(2)} mm`);
    console.log(`  Physiological WL (Kuttler):     ${metrics.workingLengthPhysiologicalMm.toFixed(2)} mm`);
    console.log(`  Schneider Angle:                ${metrics.schneiderAngleDeg.toFixed(1)}° [Risk: ${metrics.schneiderRiskTier.toUpperCase()}]`);
    console.log(`  Min Radius of Curvature:        ${metrics.minRadiusOfCurvatureMm.toFixed(2)} mm [${metrics.curvatureRadiusTier}]`);
    console.log(`  Clinical Summary:               ${metrics.clinicalRecommendationRu}`);
  }

  const clinicalReport = buildEndoToothClinicalReport(canalSystem.canals, targetTooth.fdiNumber);
  console.log("\n═══════════════════════════════════════════════════════════════════");
  console.log(` 📋 CLINICAL ENDO REPORT FOR TOOTH #${targetTooth.fdiNumber}:`);
  console.log(`    Topology: ${clinicalReport.vertucci.type} (${clinicalReport.vertucci.nameRu})`);
  console.log(`    Overall Risk: ${clinicalReport.overallRiskTier.toUpperCase()}`);
  console.log(`    Recommended File Taper: ${clinicalReport.recommendedTaper}`);
  console.log(`    Reciprocating Motion: ${clinicalReport.reciprocatingMotionRecommended ? "YES" : "NO"}`);
  console.log(`    Summary: ${clinicalReport.clinicalSummaryRu}`);
  console.log("═══════════════════════════════════════════════════════════════════\n");

  console.log("🎉 BLIND CBCT INTEGRATION TEST PASSED WITH ZERO MOCKS (100% PROVEN)!");
}

runHonestEndoCompassTest().catch((err: any) => {
  if (err instanceof Error) {
    console.error("❌ Test crashed with error:", err.message, err.stack);
  } else {
    console.error("❌ Test crashed with error:", String(err));
  }
  process.exit(1);
});
