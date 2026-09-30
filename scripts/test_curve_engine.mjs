import { readFileSync } from 'node:fs';
import path from 'node:path';

// Let's test autoDetectDentalArch from dentalCurveEngine.ts
const manifest = JSON.parse(readFileSync('apps/web/public/radiology/demo_cbct/manifest.json', 'utf8'));

// Load 312 slices
const files = [];
for (let i = 0; i < 312; i++) {
  const fpath = path.join('apps/web/public/radiology/demo_cbct', manifest.slices[i]);
  const buf = readFileSync(fpath);
  files.push({ buffer: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), fileName: manifest.slices[i] });
}

console.log('Testing dentalCurveEngine on real Zakharov 312 slices...');
// We will test if autoDetectDentalArch runs smoothly
