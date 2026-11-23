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

// Inspect tooth 46 slice vertical profile
const cX = -26.0, cY = -23.0, cZ = -8.0;
const nX = 0.84, nY = 0.54;
const spMm = 0.15;
const hPx = 227;

console.log("=== Tooth 46 Central Column Profile (py = 0 to 226) ===");
for (let py = 20; py < hPx - 20; py += 5) {
  const vMm = (hPx / 2 - py) * spMm;
  const curZ = cZ + vMm;
  const vz = (curZ - volZ.originMm.z) / spZ;
  const vx = (cX - volZ.originMm.x) / spZ;
  const vy = (cY - volZ.originMm.y) / spZ;
  const hu = sampleVoxelTrilinearHU(vx, vy, vz, volZ as any);
  console.log(`py = ${py}, Z = ${curZ.toFixed(1)} mm, HU = ${Math.round(hu)}`);
}
