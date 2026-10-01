import { readFileSync, readdirSync } from 'node:fs';
import * as path from 'node:path';
import { parseDicomSliceHeader } from '../apps/web/src/components/radiology/dicomSliceHeaderParser';
import { buildVolumeFromDicomBuffers } from '../apps/web/src/components/radiology/realDicomVolumeLoader';
import { findOcclusalZPlane, extractAxialMIPSlab, type AxialMIPSlab } from '../apps/web/src/components/radiology/cbctAutoArchEngine';

const MAND_FDI = ["48", "47", "46", "45", "44", "43", "42", "41", "31", "32", "33", "34", "35", "36", "37", "38"];
const MAX_FDI = ["18", "17", "16", "15", "14", "13", "12", "11", "21", "22", "23", "24", "25", "26", "27", "28"];

// Canonical cumulative distances in mm from incisor midline to tooth centers
const CUM_DIST_MAND = [58.0, 48.0, 38.0, 29.5, 22.0, 15.0, 8.5, 2.8]; // 48..41 (right to mid)
const CUM_DIST_MAX = [57.5, 48.0, 38.0, 29.5, 22.0, 15.5, 8.5, 4.2];  // 18..11 (right to mid)

export function evaluateHonestTeethOnArch(
  mip: AxialMIPSlab,
  ridgePoints: Array<{ x: number; y: number }>,
  apex: { x: number; y: number },
  jawType: 'mandible' | 'maxilla'
) {
  const fdiList = jawType === 'mandible' ? MAND_FDI : MAX_FDI;
  const cumDists = jawType === 'mandible' ? CUM_DIST_MAND : CUM_DIST_MAX;

  // Split ridge into right and left branches from apex
  let apexIdx = 0, minDist = Infinity;
  for (let i = 0; i < ridgePoints.length; i++) {
    const d = Math.hypot(ridgePoints[i]!.x - apex.x, ridgePoints[i]!.y - apex.y);
    if (d < minDist) { minDist = d; apexIdx = i; }
  }

  const rightRidge = ridgePoints.slice(0, apexIdx + 1).reverse(); // apex is at 0, moving right
  const leftRidge = ridgePoints.slice(apexIdx); // apex is at 0, moving left

  const getPointAtDist = (branch: Array<{ x: number; y: number }>, targetD: number) => {
    let curD = 0;
    for (let i = 0; i < branch.length - 1; i++) {
      const segLen = Math.hypot(branch[i+1]!.x - branch[i]!.x, branch[i+1]!.y - branch[i]!.y);
      if (curD + segLen >= targetD) {
        const t = (targetD - curD) / segLen;
        return {
          x: branch[i]!.x + t * (branch[i+1]!.x - branch[i]!.x),
          y: branch[i]!.y + t * (branch[i+1]!.y - branch[i]!.y),
        };
      }
      curD += segLen;
    }
    return branch[branch.length - 1]!;
  };

  const sampleHU = (wx: number, wy: number): number => {
    const vx = (wx - mip.originMm.x) / (mip.spacingMm.x || 0.25);
    const vy = (wy - mip.originMm.y) / (mip.spacingMm.y || 0.25);
    if (vx < 0 || vx >= mip.width - 1 || vy < 0 || vy >= mip.height - 1) return -1000;
    const x0 = Math.floor(vx); const y0 = Math.floor(vy);
    const idx = y0 * mip.width + x0;
    return mip.data[idx] ?? -1000;
  };

  const teethOut: Array<{
    fdi: string;
    x: number;
    y: number;
    isMissing: boolean;
    peakHU: number;
  }> = [];

  // 1. Right quadrant (48..41 / 18..11)
  for (let i = 0; i < 8; i++) {
    const fdi = fdiList[i]!;
    const dTarget = cumDists[7 - i]!; // 48 is furthest, 41 is closest
    const ridgePt = getPointAtDist(rightRidge, dTarget);

    // Search for enamel peak within +/- 3.5 mm window
    let maxHU = -1000, bestX = ridgePt.x, bestY = ridgePt.y;
    let enamelCount = 0;
    for (let dx = -3.5; dx <= 3.5; dx += 0.5) {
      for (let dy = -3.5; dy <= 3.5; dy += 0.5) {
        const hu = sampleHU(ridgePt.x + dx, ridgePt.y + dy);
        if (hu > maxHU) { maxHU = hu; bestX = ridgePt.x + dx; bestY = ridgePt.y + dy; }
        if (hu >= 1500) enamelCount++;
      }
    }

    const isMissing = enamelCount < 4 || maxHU < 1400;
    teethOut.push({
      fdi,
      x: isMissing ? Number(ridgePt.x.toFixed(2)) : Number(bestX.toFixed(2)),
      y: isMissing ? Number(ridgePt.y.toFixed(2)) : Number(bestY.toFixed(2)),
      isMissing,
      peakHU: maxHU,
    });
  }

  // 2. Left quadrant (31..38 / 21..28)
  for (let i = 0; i < 8; i++) {
    const fdi = fdiList[8 + i]!;
    const dTarget = cumDists[i]!; // 31/21 is closest, 38/28 is furthest
    const ridgePt = getPointAtDist(leftRidge, dTarget);

    let maxHU = -1000, bestX = ridgePt.x, bestY = ridgePt.y;
    let enamelCount = 0;
    for (let dx = -3.5; dx <= 3.5; dx += 0.5) {
      for (let dy = -3.5; dy <= 3.5; dy += 0.5) {
        const hu = sampleHU(ridgePt.x + dx, ridgePt.y + dy);
        if (hu > maxHU) { maxHU = hu; bestX = ridgePt.x + dx; bestY = ridgePt.y + dy; }
        if (hu >= 1500) enamelCount++;
      }
    }

    const isMissing = enamelCount < 4 || maxHU < 1400;
    teethOut.push({
      fdi,
      x: isMissing ? Number(ridgePt.x.toFixed(2)) : Number(bestX.toFixed(2)),
      y: isMissing ? Number(ridgePt.y.toFixed(2)) : Number(bestY.toFixed(2)),
      isMissing,
      peakHU: maxHU,
    });
  }

  return teethOut;
}

async function testZakharov() {
  const demoDir = path.resolve('apps/web/public/radiology/demo_cbct');
  const manifest = JSON.parse(readFileSync(path.join(demoDir, 'manifest.json'), 'utf8'));
  const items = manifest.slices.map((sliceName: string) => {
    const buf = readFileSync(path.join(demoDir, sliceName));
    return {
      buffer: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
      fileName: sliceName,
    };
  });

  const vol = await buildVolumeFromDicomBuffers(items);
  const zMax = findOcclusalZPlane(vol, 'maxilla');
  const mip = extractAxialMIPSlab(vol, zMax, 6.0);

  // Import traceHonestDentalArch logic
  const { traceHonestDentalArch } = await import('./test_continuous_tangent');
  const arch = traceHonestDentalArch(mip, 'maxilla');
  const teeth = evaluateHonestTeethOnArch(mip, arch.splinePoints, arch.apex, 'maxilla');

  console.log(`\n=== ZAKHAROV MAXILLA HONEST TEETH AUDIT ===`);
  for (const t of teeth) {
    console.log(`Tooth ${t.fdi}: [${t.x}, ${t.y}] -> ${t.isMissing ? 'ОТСУТСТВУЕТ (ДЕФЕКТ АДЕНТИИ)' : 'ПРИСУТСТВУЕТ (ЭМАЛЬ)'} (peak HU: ${t.peakHU})`);
  }
}

testZakharov().catch(console.error);
