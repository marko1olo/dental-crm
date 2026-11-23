import { readFileSync } from "node:fs";
import { buildVolumeFromMultiFrameDicom } from "../apps/web/src/components/radiology/dicomMultiFrameLoader";
import {
	findOcclusalZPlane,
	computeOcclusalDensityProfile,
} from "../apps/web/src/components/radiology/cbctAutoArchEngine";

async function main() {
	const filePath = "C:\\Users\\Admin\\Downloads\\Облако Mail\\Буляков Н.З. 29.08.2026г. ОЧ.dcm";
	const rawBuf = readFileSync(filePath);
	const arrayBuf = rawBuf.buffer.slice(rawBuf.byteOffset, rawBuf.byteOffset + rawBuf.byteLength);
	const vol = await buildVolumeFromMultiFrameDicom(arrayBuf);

	const mandZ = findOcclusalZPlane(vol, "mandible");
	const maxZ = findOcclusalZPlane(vol, "maxilla");
	console.log(`findOcclusalZPlane -> Mandible: ${mandZ} mm, Maxilla: ${maxZ} mm`);
}

main().catch(console.error);
