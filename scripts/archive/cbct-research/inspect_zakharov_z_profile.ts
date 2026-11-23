import { readFileSync } from "node:fs";
import path from "node:path";
import { computeOcclusalDensityProfile, findOcclusalZPlane } from "../apps/web/src/components/radiology/cbctAutoArchEngine.ts";

const manifestPath = path.resolve("apps/web/public/radiology/demo_cbct/manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const slices = manifest.slices;

const validSlices = slices.filter((s: string) => {
	const filePath = path.resolve("apps/web/public/radiology/demo_cbct", s);
	return readFileSync(filePath).byteLength >= 720000;
});

const width = 600;
const height = 600;
const depth = validSlices.length;
const sliceCount = width * height;
const voxelData = new Int16Array(width * height * depth);

for (let z = 0; z < depth; z++) {
	const filePath = path.resolve("apps/web/public/radiology/demo_cbct", validSlices[z]);
	const fileBuffer = readFileSync(filePath);
	const rawOffset = fileBuffer.byteLength - sliceCount * 2;
	const raw = new Uint16Array(fileBuffer.buffer, fileBuffer.byteOffset + rawOffset, sliceCount);
	const base = z * sliceCount;
	for (let i = 0; i < sliceCount; i++) {
		voxelData[base + i] = (raw[i] || 0) - 1000;
	}
}

const pixelSpacing = 0.25;
const sliceThickness = 0.25;
const physicalDepthMm = depth * sliceThickness;

const volume: any = {
	dimensions: { width, height, depth },
	spacingMm: { x: pixelSpacing, y: pixelSpacing, z: sliceThickness },
	originMm: {
		x: -width * pixelSpacing * 0.5,
		y: -height * pixelSpacing * 0.5,
		z: -physicalDepthMm * 0.5,
	},
	data: voxelData,
	isDisposed: false,
};

console.log("Origin Z:", volume.originMm.z, "Max Z:", volume.originMm.z + depth * sliceThickness);

const profile = computeOcclusalDensityProfile(volume, 2, 2);

console.log("\n--- Top 15 Enamel Integral Slices ---");
const sortedEnamel = [...profile].sort((a, b) => b.smoothedEnamel - a.smoothedEnamel);
for (let i = 0; i < 15; i++) {
	const p = sortedEnamel[i];
	console.log(`zIdx: ${p.zIndex} (slice: ${validSlices[p.zIndex]}), zMm: ${p.zMm} mm, smoothedEnamel: ${Math.round(p.smoothedEnamel)}, rawEnamel: ${Math.round(p.enamelIntegral)}, bone: ${Math.round(p.boneIntegral)}`);
}

console.log("\n--- Z Profile Summary every 10 slices ---");
for (let z = 0; z < depth; z += 10) {
	const p = profile[z];
	console.log(`zIdx: ${p.zIndex}, zMm: ${p.zMm.toFixed(2)} mm | enamel: ${Math.round(p.smoothedEnamel)} | bone: ${Math.round(p.smoothedBone)} | cancellous: ${Math.round(p.smoothedCancellous)}`);
}

const detectedMandibleZ = findOcclusalZPlane(volume, "mandible");
const detectedMaxillaZ = findOcclusalZPlane(volume, "maxilla");
console.log(`\nDetected Mandible Z: ${detectedMandibleZ} mm`);
console.log(`Detected Maxilla Z: ${detectedMaxillaZ} mm`);
