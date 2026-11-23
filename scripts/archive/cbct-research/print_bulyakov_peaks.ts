import { readFileSync } from "node:fs";
import { buildVolumeFromMultiFrameDicom } from "../apps/web/src/components/radiology/dicomMultiFrameLoader";
import { computeOcclusalDensityProfile } from "../apps/web/src/components/radiology/cbctAutoArchEngine";

async function main() {
	const filePath = "C:\\Users\\Admin\\Downloads\\Облако Mail\\Буляков Н.З. 29.08.2026г. ОЧ.dcm";
	const rawBuf = readFileSync(filePath);
	const arrayBuf = rawBuf.buffer.slice(rawBuf.byteOffset, rawBuf.byteOffset + rawBuf.byteLength);
	const vol = await buildVolumeFromMultiFrameDicom(arrayBuf);

	const profile = computeOcclusalDensityProfile(vol);
	
	let maxVal = 0;
	for (const p of profile) if (p.smoothedEnamel > maxVal) maxVal = p.smoothedEnamel;
	console.log(`Max smoothedEnamel: ${maxVal}`);

	const threshold = maxVal * 0.2;
	console.log(`Threshold (20%): ${threshold}`);

	for (let i = 1; i < profile.length - 1; i++) {
		const prev = profile[i - 1]!.smoothedEnamel;
		const cur = profile[i]!.smoothedEnamel;
		const next = profile[i + 1]!.smoothedEnamel;
		if (cur >= prev && cur >= next && cur >= threshold) {
			console.log(`Peak at zIdx ${profile[i]!.zIndex}, zMm ${profile[i]!.zMm.toFixed(2)}, score ${cur}`);
		}
	}
}

main().catch(console.error);
