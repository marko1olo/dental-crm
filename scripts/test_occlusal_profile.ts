import { readFileSync } from "node:fs";
import path from "node:path";
import { computeOcclusalDensityProfile, findOcclusalZPlane } from "../apps/web/src/components/radiology/cbctAutoArchEngine.ts";

const manifestPath = path.resolve("apps/web/public/radiology/demo_cbct/manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const validSlices = manifest.slices.filter((s: string) => readFileSync(path.resolve("apps/web/public/radiology/demo_cbct", s)).byteLength >= 720000);

const width = 600;
const height = 600;
const depth = validSlices.length;
const sliceCount = width * height;
const voxelData = new Int16Array(sliceCount * depth);

console.log(`Loading ${depth} slices...`);
for (let z = 0; z < depth; z++) {
	const buf = readFileSync(path.resolve("apps/web/public/radiology/demo_cbct", validSlices[z]));
	const raw = new Uint16Array(buf.buffer, buf.byteOffset + buf.byteLength - sliceCount * 2, sliceCount);
	const base = z * sliceCount;
	for (let i = 0; i < sliceCount; i++) {
		voxelData[base + i] = (raw[i] || 0) - 1000;
	}
}

const volume: any = {
	dimensions: { width, height, depth },
	spacingMm: { x: 0.25, y: 0.25, z: 0.25 },
	originMm: { x: -75, y: -75, z: -depth * 0.25 * 0.5 },
	data: voxelData,
	isDisposed: false,
};

const profile = computeOcclusalDensityProfile(volume);
console.log(`Computed density profile for ${profile.length} slices.`);

// Inspect top enamel slices
const sortedByEnamel = [...profile].sort((a, b) => b.smoothedEnamel - a.smoothedEnamel);
console.log("Top 10 Enamel Slices:");
for (let i = 0; i < Math.min(10, sortedByEnamel.length); i++) {
	const p = sortedByEnamel[i]!;
	console.log(`Slice ${p.zIndex}: zMm = ${p.zMm} mm, smoothedEnamel = ${Math.round(p.smoothedEnamel)}, smoothedBone = ${Math.round(p.smoothedBone)}`);
}

const zMan = findOcclusalZPlane(volume, "mandible");
const zMax = findOcclusalZPlane(volume, "maxilla");
console.log(`\nfindOcclusalZPlane: Mandible = ${zMan} mm, Maxilla = ${zMax} mm`);
