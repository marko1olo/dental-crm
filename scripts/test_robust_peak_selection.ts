import { readFileSync } from "node:fs";
import path from "node:path";
import { buildVolumeFromMultiFrameDicom } from "../apps/web/src/components/radiology/dicomMultiFrameLoader";
import { computeOcclusalDensityProfile } from "../apps/web/src/components/radiology/cbctAutoArchEngine";

function testFindZ(profile: any[], jawType: string) {
	const findPeaks = (signalExtractor: (p: any) => number, minRelativeThreshold = 0.25) => {
		let maxVal = 0;
		for (const p of profile) {
			const val = signalExtractor(p);
			if (val > maxVal) maxVal = val;
		}
		if (maxVal < 10) return [];
		const threshold = maxVal * minRelativeThreshold;
		const peaks: any[] = [];
		for (let i = 1; i < profile.length - 1; i++) {
			const prev = signalExtractor(profile[i - 1]!);
			const cur = signalExtractor(profile[i]!);
			const next = signalExtractor(profile[i + 1]!);
			if (cur >= prev && cur >= next && cur >= threshold) {
				peaks.push({ zIndex: profile[i]!.zIndex, zMm: profile[i]!.zMm, score: cur });
			}
		}
		return peaks;
	};

	let minEnamelZ = Infinity;
	let maxEnamelZ = -Infinity;
	for (const p of profile) {
		if (p.smoothedEnamel >= 1000) {
			if (p.zMm < minEnamelZ) minEnamelZ = p.zMm;
			if (p.zMm > maxEnamelZ) maxEnamelZ = p.zMm;
		}
	}
	const enamelSpanMm = maxEnamelZ >= minEnamelZ ? maxEnamelZ - minEnamelZ : 0;

	const rawEnamelPeaks = findPeaks((p) => p.smoothedEnamel, 0.3);
	const sortedByScore = [...rawEnamelPeaks].sort((a, b) => b.score - a.score);
	let dualArches: any[] = [];

	if (sortedByScore.length >= 2) {
		const top1 = sortedByScore[0]!;
		const top2 = sortedByScore.slice(1).find((p) => Math.abs(p.zMm - top1.zMm) >= 14.0 && p.score >= top1.score * 0.45);
		if (top2) {
			dualArches = [top1, top2].sort((a, b) => a.zMm - b.zMm);
		}
	}

	if (dualArches.length === 2) {
		return jawType === "mandible" ? dualArches[0]!.zMm : dualArches[1]!.zMm;
	} else if (sortedByScore.length === 1 && enamelSpanMm < 8.0) {
		return sortedByScore[0]!.zMm;
	}

	// Bite plane multi-slice
	let maxVal = 0;
	let biteZ = 0.0;
	for (const p of profile) {
		if (p.smoothedEnamel > maxVal) {
			maxVal = p.smoothedEnamel;
			biteZ = p.zMm;
		}
	}
	return biteZ + (jawType === "mandible" ? 7.0 : -4.5);
}

async function testZakharov() {
	const manifestPath = path.resolve("apps/web/public/radiology/demo_cbct/manifest.json");
	const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
	const validSlices = manifest.slices.filter(
		(s: string) => readFileSync(path.resolve("apps/web/public/radiology/demo_cbct", s)).byteLength >= 720000
	);
	const width = 600, height = 600, depth = validSlices.length;
	const voxelData = new Int16Array(width * height * depth);
	for (let z = 0; z < depth; z++) {
		const buf = readFileSync(path.resolve("apps/web/public/radiology/demo_cbct", validSlices[z]));
		const raw = new Uint16Array(buf.buffer, buf.byteOffset + buf.byteLength - width * height * 2, width * height);
		for (let i = 0; i < width * height; i++) voxelData[z * width * height + i] = (raw[i] || 0) - 1000;
	}
	const vol: any = {
		dimensions: { width, height, depth },
		spacingMm: { x: 0.25, y: 0.25, z: 0.25 },
		originMm: { x: -75, y: -75, z: -depth * 0.25 * 0.5 },
		data: voxelData,
		isDisposed: false,
	};
	const prof = computeOcclusalDensityProfile(vol);
	console.log("Zakharov Z (mandible):", testFindZ(prof, "mandible"));
	console.log("Zakharov Z (maxilla):", testFindZ(prof, "maxilla"));
}

async function testBulyakov() {
	const filePath = "C:\\Users\\Admin\\Downloads\\Облако Mail\\Буляков Н.З. 29.08.2026г. ОЧ.dcm";
	const rawBuf = readFileSync(filePath);
	const arrayBuf = rawBuf.buffer.slice(rawBuf.byteOffset, rawBuf.byteOffset + rawBuf.byteLength);
	const vol = await buildVolumeFromMultiFrameDicom(arrayBuf);
	const prof = computeOcclusalDensityProfile(vol);
	console.log("Bulyakov Z (mandible):", testFindZ(prof, "mandible"));
	console.log("Bulyakov Z (maxilla):", testFindZ(prof, "maxilla"));
}

async function main() {
	await testZakharov();
	await testBulyakov();
}

main().catch(console.error);
