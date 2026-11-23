import { readFileSync } from "node:fs";
import path from "node:path";
import { parseDicomSliceHeader } from "../apps/web/src/components/radiology/realDicomVolumeLoader.ts";

const buf1 = readFileSync(path.resolve("apps/web/public/radiology/demo_cbct/I0000001.dcm"));
const b1 = buf1.buffer.slice(buf1.byteOffset, buf1.byteOffset + buf1.byteLength);
const h1 = parseDicomSliceHeader(b1);
console.log("I0000001:", {
	instanceNumber: h1.instanceNumber,
	imagePositionPatient: h1.imagePositionPatient,
	sliceLocationZ: h1.sliceLocationZ,
});

const buf312 = readFileSync(path.resolve("apps/web/public/radiology/demo_cbct/I0000312.dcm"));
const b312 = buf312.buffer.slice(buf312.byteOffset, buf312.byteOffset + buf312.byteLength);
const h312 = parseDicomSliceHeader(b312);
console.log("I0000312:", {
	instanceNumber: h312.instanceNumber,
	imagePositionPatient: h312.imagePositionPatient,
	sliceLocationZ: h312.sliceLocationZ,
});
