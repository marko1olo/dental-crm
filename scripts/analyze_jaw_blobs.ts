import { readFileSync, readdirSync } from 'node:fs';
import * as path from 'node:path';
import { parseDicomSliceHeader } from '../apps/web/src/components/radiology/dicomSliceHeaderParser';
import { buildVolumeFromMultiFrameDicom } from '../apps/web/src/components/radiology/realDicomVolumeLoader';
import { findOcclusalZPlane, extractAxialMIPSlab, type AxialMIPSlab } from '../apps/web/src/components/radiology/cbctAutoArchEngine';

interface Blob {
  x: number; // world mm
  y: number; // world mm
  pixelCount: number;
  maxHU: number;
  meanHU: number;
}

// Connected Component Labeling on thresholded MIP
function extractEnamelBlobs(mip: AxialMIPSlab, minHU = 1500, minPixels = 20): Blob[] {
  const { width, height, originMm, spacingMm, data } = mip;
  const labels = new Int32Array(width * height);
  let curLabel = 0;

  // Simple BFS / Flood Fill for connected components
  const blobs: Array<{ sumX: number; sumY: number; count: number; maxHU: number; sumHU: number }> = [];

  const maxCylinderR = Math.min(Math.abs(originMm.x), Math.abs(originMm.y)) - 14.0;

  for (let y = 0; y < height; y++) {
    const wy = originMm.y + y * spacingMm.y;
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (labels[idx] !== 0) continue;
      const hu = data[idx] ?? -1000;
      if (hu < minHU) continue;

      const wx = originMm.x + x * spacingMm.x;
      if (Math.hypot(wx, wy) > maxCylinderR) continue;

      // New component
      curLabel++;
      let q = [idx];
      labels[idx] = curLabel;
      let sumX = 0;
      let sumY = 0;
      let count = 0;
      let maxH = hu;
      let sumH = 0;

      while (q.length > 0) {
        const nextQ: number[] = [];
        for (const curr of q) {
          const cy = Math.floor(curr / width);
          const cx = curr % width;
          const cwx = originMm.x + cx * spacingMm.x;
          const cwy = originMm.y + cy * spacingMm.y;
          const chu = data[curr] ?? -1000;

          sumX += cwx;
          sumY += cwy;
          count++;
          sumH += chu;
          if (chu > maxH) maxH = chu;

          // 4-neighbors
          const neighbors = [
            cy > 0 ? curr - width : -1,
            cy < height - 1 ? curr + width : -1,
            cx > 0 ? curr - 1 : -1,
            cx < width - 1 ? curr + 1 : -1,
          ];

          for (const nb of neighbors) {
            if (nb >= 0 && labels[nb] === 0) {
              const nhu = data[nb] ?? -1000;
              if (nhu >= minHU) {
                const nby = Math.floor(nb / width);
                const nbx = nb % width;
                const nbwx = originMm.x + nbx * spacingMm.x;
                const nbwy = originMm.y + nby * spacingMm.y;
                if (Math.hypot(nbwx, nbwy) <= maxCylinderR) {
                  labels[nb] = curLabel;
                  nextQ.push(nb);
                }
              }
            }
          }
        }
        q = nextQ;
      }

      if (count >= minPixels) {
        blobs.push({ sumX, sumY, count, maxHU: maxH, sumHU: sumH });
      }
    }
  }

  return blobs.map((b) => ({
    x: Number((b.sumX / b.count).toFixed(2)),
    y: Number((b.sumY / b.count).toFixed(2)),
    pixelCount: b.count,
    maxHU: b.maxHU,
    meanHU: Math.round(b.sumHU / b.count),
  }));
}

async function analyze() {
  // 1. Zakharov Maxilla
  const dirZakharov = path.resolve('apps/web/public/radiology/demo_cbct');
  const files = readdirSync(dirZakharov).filter((f) => f.endsWith('.dcm')).sort();
  files.reverse(); // canonical
  const f0 = parseDicomSliceHeader(readFileSync(path.join(dirZakharov, files[0]!)).buffer);
  const w = f0.cols; const h = f0.rows; const d = files.length;
  const data = new Int16Array(w * h * d);
  const sliceVoxels = w * h;
  for (let z = 0; z < d; z++) {
    const buf = readFileSync(path.join(dirZakharov, files[z]!));
    const hdr = parseDicomSliceHeader(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
    const off = hdr.pixelDataByteOffset;
    const raw = new Uint16Array(buf.buffer.slice(buf.byteOffset + off, buf.byteOffset + off + sliceVoxels * 2));
    const base = z * sliceVoxels;
    for (let i = 0; i < sliceVoxels; i++) data[base + i] = (raw[i]! & 0xfff) - 1000;
  }
  const volZakharov = {
    data, dimensions: { width: w, height: h, depth: d },
    spacingMm: { x: 0.25, y: 0.25, z: 0.125 },
    originMm: { x: -75, y: -75, z: 0 },
    defaultWindowWidth: 3500, defaultWindowLevel: 800, isDisposed: false
  };

  const zMax = findOcclusalZPlane(volZakharov, 'maxilla');
  const mipMax = extractAxialMIPSlab(volZakharov, zMax, 6.0);
  const blobsMax = extractEnamelBlobs(mipMax, 1500, 20);
  console.log('=== ZAKHAROV MAXILLA BLOBS (Z = ' + zMax + ' mm) ===');
  console.log('Total enamel blobs found:', blobsMax.length);
  // Sort by X
  blobsMax.sort((a, b) => a.x - b.x);
  for (const b of blobsMax) {
    console.log(`  Blob at X = ${b.x} mm, Y = ${b.y} mm (pixels: ${b.pixelCount}, maxHU: ${b.maxHU})`);
  }
}

analyze().catch(console.error);
