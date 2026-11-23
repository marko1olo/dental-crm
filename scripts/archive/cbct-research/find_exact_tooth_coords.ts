import { readFileSync } from "node:fs";
import path from "node:path";
import { sampleVoxelTrilinearHU } from "../apps/web/src/components/radiology/cbctMprMath";

const manifest = JSON.parse(readFileSync("apps/web/public/radiology/demo_cbct/manifest.json", "utf8"));
const validSlices = manifest.slices.filter((s: string) => readFileSync(path.resolve("apps/web/public/radiology/demo_cbct", s)).byteLength >= 720000);
const wZ = 600, hZ = 600, dZ = validSlices.length;
const sliceCountZ = wZ * hZ;
const voxelsZ = new Int16Array(sliceCountZ * dZ);
for (let z = 0; z < dZ; z++) {
  const buf = readFileSync(path.resolve("apps/web/public/radiology/demo_cbct", validSlices[z]));
  const raw = new Uint16Array(buf.buffer, buf.byteOffset + buf.byteLength - sliceCountZ * 2, sliceCountZ);
  const base = z * sliceCountZ;
  for (let i = 0; i < sliceCountZ; i++) voxelsZ[base + i] = (raw[i] || 0) - 1000;
}
const spZ = 0.25;
const volZ = {
  dimensions: { width: wZ, height: hZ, depth: dZ },
  spacingMm: { x: spZ, y: spZ, z: spZ },
  originMm: { x: -wZ * spZ * 0.5, y: -hZ * spZ * 0.5, z: -dZ * spZ * 0.5 },
  data: voxelsZ
};

// Search around tooth 46 (X from -34 to -26, Y from -28 to -20, Z from -6 to 2)
let best46 = { x: -30, y: -24, z: -2, maxHU: -1000 };
for (let x = -34; x <= -26; x += 0.5) {
  for (let y = -28; y <= -20; y += 0.5) {
    for (let z = -6; z <= 2; z += 0.5) {
      const vx = (x - volZ.originMm.x) / spZ;
      const vy = (y - volZ.originMm.y) / spZ;
      const vz = (z - volZ.originMm.z) / spZ;
      const hu = sampleVoxelTrilinearHU(vx, vy, vz, volZ as any);
      if (hu > best46.maxHU) best46 = { x, y, z, maxHU: hu };
    }
  }
}
console.log("Tooth 46 peak:", best46);

// Search around tooth 36 (X from 26 to 34, Y from -28 to -20, Z from -6 to 2)
let best36 = { x: 30, y: -24, z: -2, maxHU: -1000 };
for (let x = 26; x <= 34; x += 0.5) {
  for (let y = -28; y <= -20; y += 0.5) {
    for (let z = -6; z <= 2; z += 0.5) {
      const vx = (x - volZ.originMm.x) / spZ;
      const vy = (y - volZ.originMm.y) / spZ;
      const vz = (z - volZ.originMm.z) / spZ;
      const hu = sampleVoxelTrilinearHU(vx, vy, vz, volZ as any);
      if (hu > best36.maxHU) best36 = { x, y, z, maxHU: hu };
    }
  }
}
console.log("Tooth 36 peak:", best36);

// Search around tooth 11 (X from -6 to 6, Y from -54 to -44, Z from 0 to 6)
let best11 = { x: -2, y: -48, z: 2, maxHU: -1000 };
for (let x = -6; x <= 6; x += 0.5) {
  for (let y = -54; y <= -44; y += 0.5) {
    for (let z = 0; z <= 6; z += 0.5) {
      const vx = (x - volZ.originMm.x) / spZ;
      const vy = (y - volZ.originMm.y) / spZ;
      const vz = (z - volZ.originMm.z) / spZ;
      const hu = sampleVoxelTrilinearHU(vx, vy, vz, volZ as any);
      if (hu > best11.maxHU) best11 = { x, y, z, maxHU: hu };
    }
  }
}
console.log("Tooth 11 peak:", best11);

// Search around tooth 26 defect ridge (X from 30 to 36, Y from -30 to -22, Z from 2 to 10)
let best26 = { x: 33, y: -26, z: 6, maxHU: -1000 };
for (let x = 30; x <= 36; x += 0.5) {
  for (let y = -30; y <= -22; y += 0.5) {
    for (let z = 2; z <= 10; z += 0.5) {
      const vx = (x - volZ.originMm.x) / spZ;
      const vy = (y - volZ.originMm.y) / spZ;
      const vz = (z - volZ.originMm.z) / spZ;
      const hu = sampleVoxelTrilinearHU(vx, vy, vz, volZ as any);
      if (hu > best26.maxHU) best26 = { x, y, z, maxHU: hu };
    }
  }
}
console.log("Tooth 26 defect ridge peak:", best26);
