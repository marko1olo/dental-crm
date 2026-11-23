import { readFileSync } from "node:fs";
import path from "node:path";
import { buildVolumeFromDicomBuffers } from "../apps/web/src/components/radiology/realDicomVolumeLoader.ts";
import { autoDetectDentalArch, findOcclusalZPlane } from "../apps/web/src/components/radiology/cbctAutoArchEngine.ts";

async function test() {
	const manifestPath = path.resolve("apps/web/public/radiology/demo_cbct/manifest.json");
	const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
	const validSlices = manifest.slices.filter(
		(s: string) => readFileSync(path.resolve("apps/web/public/radiology/demo_cbct", s)).byteLength >= 720000
	);

	console.log(`Loading ${validSlices.length} slices via buildVolumeFromDicomBuffers...`);
	const items = validSlices.map((fileName: string) => {
		const buf = readFileSync(path.resolve("apps/web/public/radiology/demo_cbct", fileName));
		const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
		return { fileName, buffer: ab };
	});

	const volume = await buildVolumeFromDicomBuffers(items);
	console.log("Volume loaded:", {
		dimensions: volume.dimensions,
		spacingMm: volume.spacingMm,
		originMm: volume.originMm,
	});

	const mandZ = findOcclusalZPlane(volume, "mandible");
	const maxZ = findOcclusalZPlane(volume, "maxilla");
	console.log(`Detected Mandible Z: ${mandZ} mm, Maxilla Z: ${maxZ} mm`);

	const maxArch = autoDetectDentalArch(volume, "maxilla", 14.0);
	console.log(`Maxilla Arch:`, {
		anchorsCount: maxArch.anchors.length,
		arcLengthMm: maxArch.totalArcLengthMm,
		planeZMm: maxArch.planeZMm,
	});
}

test().catch(console.error);
