import { readFileSync, readdirSync } from 'node:fs';
import * as path from 'node:path';
import { parseDicomSliceHeader } from '../apps/web/src/components/radiology/dicomSliceHeaderParser';
import { findOcclusalZPlane, extractAxialMIPSlab } from '../apps/web/src/components/radiology/cbctAutoArchEngine';

async function main() {
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

  const zMax = 20.88; // Known maxillary enamel plane
  const mip = extractAxialMIPSlab(volZakharov, zMax, 6.0);

  // Group high HU by quadrants: Q1 (X < 0) and Q2 (X > 0)
  let q1Max = -1000, q2Max = -1000;
  let q1Count1200 = 0, q2Count1200 = 0;
  let q1Count1500 = 0, q2Count1500 = 0;

  for (let y = 0; y < mip.height; y++) {
    const wy = mip.originMm.y + y * mip.spacingMm.y;
    for (let x = 0; x < mip.width; x++) {
      const wx = mip.originMm.x + x * mip.spacingMm.x;
      const hu = mip.data[y * mip.width + x] ?? -1000;
      if (wx < 0) {
        if (hu > q1Max) q1Max = hu;
        if (hu >= 1200) q1Count1200++;
        if (hu >= 1500) q1Count1500++;
      } else {
        if (hu > q2Max) q2Max = hu;
        if (hu >= 1200) q2Count1200++;
        if (hu >= 1500) q2Count1500++;
      }
    }
  }

  console.log(`Zakharov Maxilla at Z = ${zMax} mm:`);
  console.log(`  Q1 (Right, X < 0): max HU = ${q1Max}, >= 1200 HU: ${q1Count1200}, >= 1500 HU: ${q1Count1500}`);
  console.log(`  Q2 (Left, X > 0): max HU = ${q2Max}, >= 1200 HU: ${q2Count1200}, >= 1500 HU: ${q2Count1500}`);
}

main().catch(console.error);
