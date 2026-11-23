import { readFileSync, readdirSync } from 'node:fs';
import * as path from 'node:path';
import { parseDicomSliceHeader } from '../apps/web/src/components/radiology/dicomSliceHeaderParser';

async function main() {
  const dirZakharov = path.resolve('apps/web/public/radiology/demo_cbct');
  const files = readdirSync(dirZakharov).filter((f) => f.endsWith('.dcm')).sort();
  files.reverse(); // canonical
  const f0 = parseDicomSliceHeader(readFileSync(path.join(dirZakharov, files[0]!)).buffer);
  const w = f0.cols; const h = f0.rows; const d = files.length;
  const sliceVoxels = w * h;

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  let enamelCount = 0;

  for (let z = 0; z < d; z += 5) {
    const buf = readFileSync(path.join(dirZakharov, files[z]!));
    const hdr = parseDicomSliceHeader(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
    const off = hdr.pixelDataByteOffset;
    const raw = new Uint16Array(buf.buffer.slice(buf.byteOffset + off, buf.byteOffset + off + sliceVoxels * 2));
    for (let y = 0; y < h; y += 4) {
      for (let x = 0; x < w; x += 4) {
        const hu = (raw[y * w + x]! & 0xfff) - 1000;
        if (hu >= 1500) {
          enamelCount++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          if (z < minZ) minZ = z;
          if (z > maxZ) maxZ = z;
        }
      }
    }
  }

  console.log(`Zakharov volume voxel bounds of HU >= 1500:`);
  console.log(`  X voxel range: [${minX} .. ${maxX}] out of ${w} (centerX = ${w/2})`);
  console.log(`  Y voxel range: [${minY} .. ${maxY}] out of ${h} (centerY = ${h/2})`);
  console.log(`  Z slice range: [${minZ} .. ${maxZ}] out of ${d}`);
}

main().catch(console.error);
