import { readFileSync } from 'node:fs';
import path from 'node:path';
import { autoDetectDentalArch, findOcclusalZPlane } from '../apps/web/src/components/radiology/dentalCurveEngine.ts';

// Recreate volume in memory
const manifest = JSON.parse(readFileSync('apps/web/public/radiology/demo_cbct/manifest.json', 'utf8'));

console.log('Loading slices...');
const files = [];
for (let i = 0; i < 312; i++) {
  const fpath = path.join('apps/web/public/radiology/demo_cbct', manifest.slices[i]);
  const buf = readFileSync(fpath);
  files.push(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}

console.log('Building test volume...');
const width = 600;
const height = 600;
const depth = 312;
const voxelData = new Int16Array(width * height * depth);
const sliceVoxelCount = width * height;

for (let z = 0; z < depth; z++) {
  const buf = files[z];
  const raw = new Uint16Array(buf, 4850, sliceVoxelCount);
  const baseIdx = z * sliceVoxelCount;
  for (let i = 0; i < sliceVoxelCount; i++) {
    voxelData[baseIdx + i] = raw[i] - 1000;
  }
}

const testVolume = {
  id: 'test-zakharov',
  dimensions: { width, height, depth },
  spacingMm: { x: 0.25, y: 0.25, z: 0.25 },
  originMm: { x: -75, y: -75, z: -39 },
  physicalSizeMm: { x: 150, y: 150, z: 78 },
  data: voxelData,
  minHU: -1000,
  maxHU: 3095,
  rescaleSlope: 1.0,
  rescaleIntercept: -1000,
  defaultWindowWidth: 4400,
  defaultWindowLevel: 1300,
  isDisposed: false,
};

console.log('Testing findOcclusalZPlane...');
const t0 = Date.now();
const z = findOcclusalZPlane(testVolume, 'mandible');
console.log('findOcclusalZPlane result:', z, 'in', Date.now() - t0, 'ms');

console.log('Testing autoDetectDentalArch...');
const t1 = Date.now();
const arch = autoDetectDentalArch(testVolume, 'mandible');
console.log('autoDetectDentalArch result in', Date.now() - t1, 'ms, anchors:', arch.anchors.length, 'arcLength:', arch.totalArcLengthMm);
