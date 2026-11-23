import { readFileSync, statSync } from "node:fs";
import { parseMultiFrameDicomHeader, isMultiFrameDicom } from "../apps/web/src/components/radiology/dicomMultiFrameLoader";

const files = [
	"C:\\Users\\Admin\\Downloads\\Облако Mail\\Буляков Н.З. 29.08.2026г. ОЧ.dcm",
	"C:\\Users\\Admin\\Downloads\\Облако Mail\\Буляков Н.З. 29.08.2026г. сек38-48.dcm",
];

for (const f of files) {
	console.log(`\n=== Checking: ${f} ===`);
	try {
		const stat = statSync(f);
		console.log(`File size: ${(stat.size / 1024 / 1024).toFixed(2)} MB`);
		
		// Read first 64KB for header parsing or whole buffer
		const buf = readFileSync(f);
		const arrayBuf = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
		
		const isMulti = isMultiFrameDicom(arrayBuf);
		console.log(`isMultiFrameDicom: ${isMulti}`);
		
		const header = parseMultiFrameDicomHeader(arrayBuf);
		console.log("Header parsed:", {
			rows: header.rows,
			cols: header.cols,
			numberOfFrames: header.numberOfFrames,
			bitsAllocated: header.bitsAllocated,
			pixelSpacing: header.pixelSpacing,
			sliceThickness: header.sliceThickness,
			rescaleSlope: header.rescaleSlope,
			rescaleIntercept: header.rescaleIntercept,
			transferSyntaxUid: header.transferSyntaxUid,
			isEncapsulated: header.isEncapsulated,
		});
	} catch (e: any) {
		console.error("Error inspecting file:", e.message);
	}
}
