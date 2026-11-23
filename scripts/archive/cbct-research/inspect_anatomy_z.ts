import { readFileSync } from "node:fs";
import path from "node:path";

const manifestPath = path.resolve("apps/web/public/radiology/demo_cbct/manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const validSlices = manifest.slices.filter(
	(s: string) => readFileSync(path.resolve("apps/web/public/radiology/demo_cbct", s)).byteLength >= 720000
);

const width = 600;
const height = 600;
const depth = validSlices.length;
const sliceCount = width * height;

// Let's inspect slice 10 (Z near start), slice 150 (Z near center), slice 300 (Z near end)
function sampleSliceSummary(sliceIdx: number) {
	const buf = readFileSync(path.resolve("apps/web/public/radiology/demo_cbct", validSlices[sliceIdx]));
	const raw = new Uint16Array(buf.buffer, buf.byteOffset + buf.byteLength - sliceCount * 2, sliceCount);
	let airCount = 0;
	let boneCount = 0;
	let toothCount = 0;
	for (let i = 0; i < sliceCount; i++) {
		const hu = raw[i] - 1000;
		if (hu < -600) airCount++;
		if (hu >= 800) boneCount++;
		if (hu >= 2000) toothCount++;
	}
	const zMm = -depth * 0.25 * 0.5 + sliceIdx * 0.25;
	console.log(`Slice ${sliceIdx} (${validSlices[sliceIdx]}, Z = ${zMm.toFixed(1)} mm): air=${airCount}, bone=${boneCount}, tooth=${toothCount}`);
}

sampleSliceSummary(10);
sampleSliceSummary(60);
sampleSliceSummary(120);
sampleSliceSummary(180);
sampleSliceSummary(240);
sampleSliceSummary(300);
