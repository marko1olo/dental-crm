import { readFileSync } from "node:fs";
import { buildVolumeFromMultiFrameDicom } from "../apps/web/src/components/radiology/dicomMultiFrameLoader";
import { computeOcclusalDensityProfile } from "../apps/web/src/components/radiology/cbctAutoArchEngine";

async function inspect(filePath: string) {
	console.log(`\n=== Inspecting: ${filePath} ===`);
	const rawBuf = readFileSync(filePath);
	const arrayBuf = rawBuf.buffer.slice(rawBuf.byteOffset, rawBuf.byteOffset + rawBuf.byteLength);
	const vol = await buildVolumeFromMultiFrameDicom(arrayBuf);
	console.log(`Dims: ${vol.dimensions.width}x${vol.dimensions.height}x${vol.dimensions.depth}`);
	console.log(`Origin:`, vol.originMm);
	console.log(`Spacing:`, vol.spacingMm);

	const profile = computeOcclusalDensityProfile(vol);
	console.log(`Profile length: ${profile.length}`);

	// Find top 5 enamel slices
	const sorted = [...profile].sort((a, b) => b.enamelIntegral - a.enamelIntegral);
	console.log("Top 5 Enamel Z levels:");
	for (let i = 0; i < Math.min(5, sorted.length); i++) {
		const s = sorted[i]!;
		console.log(`  zIdx: ${s.zIndex}, zMm: ${s.zMm.toFixed(2)}, enamel: ${s.enamelIntegral}, bone: ${s.boneIntegral}`);
	}

	// Find top 5 bone slices
	const sortedBone = [...profile].sort((a, b) => b.boneIntegral - a.boneIntegral);
	console.log("Top 5 Bone Z levels:");
	for (let i = 0; i < Math.min(5, sortedBone.length); i++) {
		const s = sortedBone[i]!;
		console.log(`  zIdx: ${s.zIndex}, zMm: ${s.zMm.toFixed(2)}, enamel: ${s.enamelIntegral}, bone: ${s.boneIntegral}`);
	}
}

async function main() {
	await inspect("C:\\Users\\Admin\\Downloads\\Облако Mail\\Буляков Н.З. 29.08.2026г. ОЧ.dcm");
	await inspect("C:\\Users\\Admin\\Downloads\\Облако Mail\\Буляков Н.З. 29.08.2026г. сек38-48.dcm");
}

main().catch(console.error);
