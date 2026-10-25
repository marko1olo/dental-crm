/**
 * VisiographDicomSecondaryCapture.ts
 * Generates standard Part 10 DICOM Secondary Capture Image (.dcm) from Canvas.
 */

import { type DicomMetadataInput, generateDicomUid, transliterateCyrillicToLatin } from "./VisiographDicomTypes";
import { DicomByteBuilder } from "./VisiographDicomByteBuilder";
import { buildFileMetaInformationBlock } from "./VisiographDicomMetaBlock";

export function createDicomSecondaryCaptureFile(
	canvas: HTMLCanvasElement,
	meta: DicomMetadataInput,
): Uint8Array {
	const width = canvas.width || 800;
	const height = canvas.height || 600;
	const ctx = canvas.getContext("2d", { willReadFrequently: true });
	const rgbaData = ctx ? ctx.getImageData(0, 0, width, height).data : new Uint8ClampedArray(width * height * 4);

	const rgbBytes = new Uint8Array(width * height * 3);
	let srcIdx = 0;
	let dstIdx = 0;
	for (let i = 0; i < width * height; i++) {
		rgbBytes[dstIdx] = rgbaData[srcIdx] ?? 0;
		rgbBytes[dstIdx + 1] = rgbaData[srcIdx + 1] ?? 0;
		rgbBytes[dstIdx + 2] = rgbaData[srcIdx + 2] ?? 0;
		srcIdx += 4;
		dstIdx += 3;
	}

	const builder = new DicomByteBuilder();
	builder.appendBytes(new Uint8Array(128));
	builder.appendBytes(new TextEncoder().encode("DICM"));

	const studyUid = meta.studyInstanceUid || generateDicomUid("2");
	const seriesUid = meta.seriesInstanceUid || generateDicomUid("3");
	const sopUid = meta.sopInstanceUid || generateDicomUid("4");
	const sopClassUid = "1.2.840.10008.5.1.4.1.1.7";

	const now = new Date();
	const studyDateStr = meta.studyDate || `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
	const studyTimeStr = meta.studyTime || `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;

	const patientNameLatin = transliterateCyrillicToLatin(meta.patientFullName || "UNKNOWN^PATIENT");
	const doctorNameLatin = transliterateCyrillicToLatin(meta.doctorFullName || "D-r Petrov");

	builder.appendBytes(buildFileMetaInformationBlock(sopClassUid, sopUid));

	// Group 0008
	builder.appendString(0x0008, 0x0005, "CS", "ISO_IR 192");
	builder.appendString(0x0008, 0x0008, "CS", "DERIVED\\SECONDARY");
	builder.appendString(0x0008, 0x0016, "UI", sopClassUid);
	builder.appendString(0x0008, 0x0018, "UI", sopUid);
	builder.appendString(0x0008, 0x0020, "DA", studyDateStr);
	builder.appendString(0x0008, 0x0030, "TM", studyTimeStr);
	builder.appendString(0x0008, 0x0060, "CS", meta.modality || "IO");
	builder.appendString(0x0008, 0x0070, "LO", "DENTE DENTAL PACS");
	builder.appendString(0x0008, 0x0080, "LO", meta.clinicName || "DENTE CLINIC");
	builder.appendString(0x0008, 0x0090, "PN", doctorNameLatin);
	builder.appendString(0x0008, 0x1030, "LO", meta.toothCode ? `Intraoral Radiography Tooth ${meta.toothCode}` : "Intraoral Radiography");
	builder.appendString(0x0008, 0x1050, "PN", doctorNameLatin);

	// Group 0010
	builder.appendString(0x0010, 0x0010, "PN", patientNameLatin);
	builder.appendString(0x0010, 0x0020, "LO", meta.patientId || "PATIENT-001");
	if (meta.patientBirthDate) builder.appendString(0x0010, 0x0030, "DA", meta.patientBirthDate);
	if (meta.patientSex) builder.appendString(0x0010, 0x0040, "CS", meta.patientSex);

	// Group 0018 & 0020
	builder.appendString(0x0018, 0x0015, "CS", meta.bodyPartExamined || "TEETH");
	builder.appendString(0x0018, 0x1000, "LO", "DENTE-IO-SENSOR");
	builder.appendString(0x0018, 0x1020, "LO", "Dente CRM 2.0");
	builder.appendString(0x0020, 0x000d, "UI", studyUid);
	builder.appendString(0x0020, 0x000e, "UI", seriesUid);
	builder.appendString(0x0020, 0x0010, "SH", "1");
	builder.appendString(0x0020, 0x0011, "IS", "1");
	builder.appendString(0x0020, 0x0013, "IS", "1");

	// Group 0028 & 7FE0
	builder.appendUint16(0x0028, 0x0002, "US", 3);
	builder.appendString(0x0028, 0x0004, "CS", "RGB");
	builder.appendUint16(0x0028, 0x0006, "US", 0);
	builder.appendUint16(0x0028, 0x0010, "US", height);
	builder.appendUint16(0x0028, 0x0011, "US", width);
	if (meta.scaleMmPerPixel && meta.scaleMmPerPixel > 0) {
		builder.appendString(0x0028, 0x0030, "DS", `${meta.scaleMmPerPixel.toFixed(5)}\\${meta.scaleMmPerPixel.toFixed(5)}`);
	}
	builder.appendUint16(0x0028, 0x0100, "US", 8);
	builder.appendUint16(0x0028, 0x0101, "US", 8);
	builder.appendUint16(0x0028, 0x0102, "US", 7);
	builder.appendUint16(0x0028, 0x0103, "US", 0);
	builder.appendString(0x0028, 0x0301, "CS", "YES");
	builder.appendPixelData(0x7fe0, 0x0010, rgbBytes);

	return builder.toUint8Array();
}
