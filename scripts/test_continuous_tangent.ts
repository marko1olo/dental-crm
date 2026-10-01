import { readFileSync, readdirSync } from 'node:fs';
import * as path from 'node:path';
import { parseDicomSliceHeader } from '../apps/web/src/components/radiology/dicomSliceHeaderParser';
import { buildVolumeFromMultiFrameDicom } from '../apps/web/src/components/radiology/realDicomVolumeLoader';
import { findOcclusalZPlane, extractAxialMIPSlab, type AxialMIPSlab } from '../apps/web/src/components/radiology/cbctAutoArchEngine';

export interface HonestToothMarker {
  fdi: string;
  x: number;
  y: number;
  isMissing: boolean;
  peakHU: number;
  label: string;
}

export interface HonestArchResult {
  splinePoints: Array<{ x: number; y: number }>;
  toothMarkers: HonestToothMarker[];
  apex: { x: number; y: number };
  maxillaTuberosityStopY: number;
}

export function traceHonestDentalArch(
  mip: AxialMIPSlab,
  jawType: 'mandible' | 'maxilla',
): HonestArchResult {
  const { width, height, originMm, spacingMm, data } = mip;
  const spX = spacingMm.x || 0.25;
  const spY = spacingMm.y || 0.25;

  const sampleHU = (wx: number, wy: number): number => {
    const vx = (wx - originMm.x) / spX;
    const vy = (wy - originMm.y) / spY;
    if (vx < 0 || vx >= width - 1 || vy < 0 || vy >= height - 1) return -1000;
    const x0 = Math.floor(vx); const y0 = Math.floor(vy);
    const dx = vx - x0; const dy = vy - y0;
    const idx = y0 * width + x0;
    const v00 = data[idx] ?? -1000;
    const v10 = data[idx + 1] ?? -1000;
    const v01 = data[idx + width] ?? -1000;
    const v11 = data[idx + width + 1] ?? -1000;
    return (1 - dy) * ((1 - dx) * v00 + dx * v10) + dy * ((1 - dx) * v01 + dx * v11);
  };

  // 1. Identify anterior incisor apex
  const fovMargin = 16.0;
  const minY = originMm.y + fovMargin;
  const maxY = -originMm.y - fovMargin;
  let apexX = 0, apexY = -35.0, foundApex = false;

  for (let y = 0; y < height; y++) {
    const wy = originMm.y + y * spY;
    if (wy < minY || wy > maxY) continue;
    let count = 0, sumX = 0;
    for (let x = 0; x < width; x++) {
      const wx = originMm.x + x * spX;
      if (Math.abs(wx) > 14.0) continue;
      const hu = data[y * width + x] ?? -1000;
      if (hu >= 1500) { count++; sumX += wx; }
    }
    if (count >= 6) {
      apexX = sumX / count;
      apexY = wy + 1.0;
      foundApex = true;
      break;
    }
  }

  // 2. Trace smooth ridge curve from apex towards posterior
  // We trace left branch (X > 0) and right branch (X < 0)
  const traceBranch = (isRight: boolean): Array<{ x: number; y: number }> => {
    const pts: Array<{ x: number; y: number }> = [{ x: apexX, y: apexY }];
    let curX = apexX;
    let curY = apexY;
    let angleRad = isRight ? Math.PI * 0.95 : Math.PI * 0.05; // points slightly lateral

    const maxSteps = 120;
    const stepSize = 1.0; // 1 mm step

    for (let step = 0; step < maxSteps; step++) {
      // Tangent direction
      const dirX = Math.cos(angleRad);
      const dirY = Math.sin(angleRad);
      // Outward normal
      const normX = isRight ? -dirY : dirY;
      const normY = isRight ? dirX : -dirX;

      // Predict next step
      const candX = curX + dirX * stepSize;
      const candY = curY + dirY * stepSize;

      // Anatomical stops:
      // For maxilla: cannot exceed tuber maxillae (Y > 0 mm) or lateral boundary into ramus (|X| > 34 mm when Y > -10 mm)
      if (jawType === 'maxilla') {
        if (candY > 2.0) break; // Tuber maxillae stop
        if (Math.abs(candX) > 34.0 && candY > -10.0) break; // Ramus collision blocker
      }
      // For mandible: stop if entering air or beyond body (|X| > 50 mm or Y > 25 mm)
      if (jawType === 'mandible') {
        if (candY > 25.0 || Math.abs(candX) > 48.0) break;
      }

      // Sample ridge cross-section along normal [-5 .. +5 mm]
      let maxHU = -1000, bestOffset = 0;
      let rOral = -1, rVest = -1;

      for (let o = -5.0; o <= 5.0; o += 0.5) {
        const sx = candX + o * normX;
        const sy = candY + o * normY;
        const hu = sampleHU(sx, sy);
        if (hu > maxHU) { maxHU = hu; bestOffset = o; }
        if (hu >= 1400) {
          if (rOral < -10) rOral = o;
          rVest = o;
        }
      }

      // Stop if completely out of bone and enamel (ambient air < 200 HU)
      if (maxHU < 250) break;

      // Refine position to fissure or bone ridge center
      let refinedOffset = bestOffset;
      if (rOral > -10 && rVest > rOral) {
        refinedOffset = (rOral + rVest) / 2.0; // true fissure center
      }

      const nextX = candX + refinedOffset * normX;
      const nextY = candY + refinedOffset * normY;

      pts.push({ x: Number(nextX.toFixed(2)), y: Number(nextY.toFixed(2)) });
      curX = nextX;
      curY = nextY;

      // Smoothly steer angle towards +Y direction (posterior)
      const targetAngle = isRight ? Math.PI * 0.55 : Math.PI * 0.45;
      const angleDelta = (targetAngle - angleRad) * 0.08;
      angleRad += Math.max(-0.15, Math.min(0.15, angleDelta));
    }

    return pts;
  };

  const rightRidge = traceBranch(true).reverse();
  const leftRidge = traceBranch(false).slice(1);
  const fullRidge = [...rightRidge, ...leftRidge];

  // 3. Smooth spline resampling
  return {
    splinePoints: fullRidge,
    toothMarkers: [],
    apex: { x: apexX, y: apexY },
    maxillaTuberosityStopY: 0,
  };
}

async function test() {
  const pBulyakov = 'C:/Users/Admin/Downloads/Облако Mail/Буляков Н.З. 29.08.2026г. ОЧ.dcm';
  const buf = readFileSync(pBulyakov);
  const vol = await buildVolumeFromMultiFrameDicom(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));

  for (const jaw of ['mandible', 'maxilla'] as const) {
    const z = findOcclusalZPlane(vol, jaw);
    const mip = extractAxialMIPSlab(vol, z, 6.0);
    const res = traceHonestDentalArch(mip, jaw);
    console.log(`Bulyakov ${jaw.toUpperCase()} ridge points: ${res.splinePoints.length}`);
    console.log(`  First point: [${res.splinePoints[0]?.x}, ${res.splinePoints[0]?.y}]`);
    console.log(`  Apex point:  [${res.apex.x}, ${res.apex.y}]`);
    console.log(`  Last point:  [${res.splinePoints[res.splinePoints.length - 1]?.x}, ${res.splinePoints[res.splinePoints.length - 1]?.y}]`);
  }
}

test().catch(console.error);
