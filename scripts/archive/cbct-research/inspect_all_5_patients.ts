import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { parseDicomSliceHeader } from "../apps/web/src/components/radiology/dicomSliceHeaderParser.js";
import { parseMultiFrameDicomHeader, isMultiFrameDicom } from "../apps/web/src/components/radiology/dicomMultiFrameLoader.js";

interface PatientDatasetInfo {
	name: string;
	type: "multiframe" | "series";
	path: string;
}

const datasets: PatientDatasetInfo[] = [
	{
		name: "Буляков Н.З.",
		type: "multiframe",
		path: "C:\\Users\\Admin\\Downloads\\Облако Mail\\Буляков Н.З. 29.08.2026г. ОЧ.dcm",
	},
	{
		name: "Захаров И.Д.",
		type: "series",
		path: "apps/web/public/radiology/demo_cbct",
	},
	{
		name: "Сумарокова И.О.",
		type: "series",
		path: "C:\\Users\\Admin\\Downloads\\_Organized_Downloads\\08_Проекты_и_Папки\\Медицина_и_Снимки\\Сумарокова Ирина Олеговна\\Data\\1.2.250.1.90.3.3703714412.20260727125355.4924.34",
	},
	{
		name: "Барабаш С.В.",
		type: "series",
		path: "C:\\Users\\Admin\\Downloads\\_Organized_Downloads\\08_Проекты_и_Папки\\Медицина_и_Снимки\\BARABASH_SVETLANA_VIKTOROVNA_09141256\\BARABASH_SVETLANA_VIKTOROVNA_09141256\\Data",
	},
	{
		name: "Амирова Н.Н.",
		type: "series",
		path: "C:\\Users\\Admin\\Downloads\\_Organized_Downloads\\08_Проекты_и_Папки\\Медицина_и_Снимки\\АМИРОВА НАДЕЖДА НИКОЛАЕВНА КТ 2.5-2.6 22.06.2026\\АМИРОВА НАДЕЖДА НИКОЛАЕВНА КТ 2.5-2.6 22.06.2026\\20260622_112915_98\\CT",
	},
];

for (const ds of datasets) {
	console.log(`\n=================== PATIENT: ${ds.name} ===================`);
	if (ds.type === "multiframe") {
		const buf = readFileSync(ds.path);
		const arrayBuf = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
		const isMF = isMultiFrameDicom(arrayBuf);
		const mfHeader = parseMultiFrameDicomHeader(arrayBuf);
		console.log({
			isMultiFrame: isMF,
			rows: mfHeader.rows,
			cols: mfHeader.cols,
			numberOfFrames: mfHeader.numberOfFrames,
			bitsStored: mfHeader.bitsStored,
			pixelRepresentation: mfHeader.pixelRepresentation,
			pixelSpacing: mfHeader.pixelSpacing,
			sliceThickness: mfHeader.sliceThickness,
			rescaleSlope: mfHeader.rescaleSlope,
			rescaleIntercept: mfHeader.rescaleIntercept,
			pixelDataByteOffset: mfHeader.pixelDataByteOffset,
		});
	} else {
		const files = readdirSync(ds.path).filter((f) => {
			const full = path.join(ds.path, f);
			return statSync(full).isFile() && (f.toLowerCase().endsWith(".dcm") || !f.includes("."));
		});
		console.log(`Found ${files.length} slice files.`);
		if (files.length > 0) {
			const samplePath = path.join(ds.path, files[0]!);
			const buf = readFileSync(samplePath);
			const arrayBuf = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
			const header = parseDicomSliceHeader(arrayBuf);
			console.log("First slice header:", {
				fileName: files[0],
				rows: header.rows,
				cols: header.cols,
				bitsStored: header.bitsStored,
				pixelRepresentation: header.pixelRepresentation,
				pixelSpacing: header.pixelSpacing,
				sliceThickness: header.sliceThickness,
				rescaleSlope: header.rescaleSlope,
				rescaleIntercept: header.rescaleIntercept,
				transferSyntaxUid: header.transferSyntaxUid,
				imageOrientationPatient: header.imageOrientationPatient,
				imagePositionPatient: header.imagePositionPatient,
			});
		}
	}
}
