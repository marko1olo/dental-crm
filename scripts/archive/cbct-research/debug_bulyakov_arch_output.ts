import { readFileSync } from "node:fs";
import { buildVolumeFromMultiFrameDicom } from "../apps/web/src/components/radiology/dicomMultiFrameLoader";
import { findOcclusalZPlane, extractAxialMIPSlab } from "../apps/web/src/components/radiology/cbctAutoArchEngine";
import { detectHonestDentalArch, extractEnamelBeadsDistanceTransform } from "../apps/web/src/components/radiology/cbctHonestArchBlobEngine";

async function main() {
	const p = "C:\\Users\\Admin\\Downloads\\Облако Mail\\Буляков Н.З. 29.08.2026г. ОЧ.dcm";
	const buf = readFileSync(p);
	const arrayBuf = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
	const vol = await buildVolumeFromMultiFrameDicom(arrayBuf);
	
	const zMand = findOcclusalZPlane(vol, "mandible");
	console.log(`Bulyakov Mandible Z = ${zMand.toFixed(2)} mm`);
	const slab = extractAxialMIPSlab(vol, zMand, 1.0);
	const arch = detectHonestDentalArch(slab, "mandible", 14.0);

	console.log("Bulyakov Mandible Anchors:");
	for (const a of arch.anchors) {
		console.log(`  Anchor ${a.toothFdi}: pos=(${a.positionMm.x}, ${a.positionMm.y}) HU=${(a as any).peakHU}`);
	}
	console.log("Missing:", arch.missingTeethFdi);
	console.log("Present:", arch.presentTeethFdi);

	const zMax = findOcclusalZPlane(vol, "maxilla");
	console.log(`\nBulyakov Maxilla Z = ${zMax.toFixed(2)} mm`);
	const slabMax = extractAxialMIPSlab(vol, zMax, 1.0);
	const archMax = detectHonestDentalArch(slabMax, "maxilla", 14.0);
	console.log("Bulyakov Maxilla Anchors:");
	for (const a of archMax.anchors) {
		console.log(`  Anchor ${a.toothFdi}: pos=(${a.positionMm.x}, ${a.positionMm.y}) HU=${(a as any).peakHU}`);
	}
	console.log("Missing:", archMax.missingTeethFdi);
	console.log("Present:", archMax.presentTeethFdi);
}

main().catch(console.error);
