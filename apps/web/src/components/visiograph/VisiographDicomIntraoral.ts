/**
 * VisiographDicomIntraoral.ts
 * Generates standard Part 10 DICOM Digital Intra-Oral X-Ray Image (.dcm) from 16-bit raw sensor buffer.
 */

import { type DicomIntraoral16Input, generateDicomUid, transliterateCyrillicToLatin } from "./VisiographDicomTypes";
import { DicomByteBuilder } from "./VisiographDicomByteBuilder";
import { buildFileMetaInformationBlock } from "./VisiographDicomMetaBlock";

export function createDicomIntraoral16File(input: DicomIntraoral16Input): Uint8Array {
	const { width, height, pixelData16 } = input;
	const builder = new DicomByteBuilder();
	builder.appendBytes(new Uint8Array(128));
	builder.appendBytes(new TextEncoder().encode("DICM"));

	const studyUid = input.studyInstanceUid || generateDicomUid("2");
	const seriesUid = input.seriesInstanceUid || generateDicomUid("3");
	const sopUid = input.sopInstanceUid || generateDicomUid("4");
	const sopClassUid = "1.2.840.10008.5.1.4.1.1.1.3";

	const now = new Date();
	const studyDateStr = input.studyDate || `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
	const studyTimeStr = input.studyTime || `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;

	const patientNameLatin = transliterateCyrillicToLatin(input.patientFullName || "UNKNOWN^PATIENT");
	const doctorNameLatin = transliterateCyrillicToLatin(input.doctorFullName || "D-r Petrov");

	builder.appendBytes(buildFileMetaInformationBlock(sopClassUid, sopUid));

	// Group 0008
	builder.appendString(0x0008, 0x0005, "CS", "ISO_IR 192");
	builder.appendString(0x0008, 0x0008, "CS", "ORIGINAL\\PRIMARY");
	builder.appendString(0x0008, 0x0016, "UI", sopClassUid);
	builder.appendString(0x0008, 0x0018, "UI", sopUid);
	builder.appendString(0x0008, 0x0020, "DA", studyDateStr);
	builder.appendString(0x0008, 0x0030, "TM", studyTimeStr);
	builder.appendString(0x0008, 0x0060, "CS", input.modality || "IO");
	builder.appendString(0x0008, 0x0070, "LO", "DENTE DENTAL PACS");
	builder.appendString(0x0008, 0x0080, "LO", input.clinicName || "DENTE CLINIC");
	builder.appendString(0x0008, 0x0090, "PN", doctorNameLatin);
	builder.appendString(0x0008, 0x1030, "LO", input.toothCode ? `Intraoral Radiography Tooth ${input.toothCode}` : "Intraoral Radiography");
	builder.appendString(0x0008, 0x1050, "PN", doctorNameLatin);

	// Group 0010
	builder.appendString(0x0010, 0x0010, "PN", patientNameLatin);
	builder.appendString(0x0010, 0x0020, "LO", input.patientId || "PATIENT-001");
	if (input.patientBirthDate) builder.appendString(0x0010, 0x0030, "DA", input.patientBirthDate);
	if (input.patientSex) builder.appendString(0x0010, 0x0040, "CS", input.patientSex);

	// Group 0018 & 0020
	builder.appendString(0x0018, 0x0015, "CS", input.bodyPartExamined || "TEETH");
	builder.appendString(0x0018, 0x1000, "LO", "DENTE-IO-SENSOR");
	builder.appendString(0x0018, 0x1020, "LO", "Dente CRM 2.0");
	builder.appendString(0x0020, 0x000d, "UI", studyUid);
	builder.appendString(0x0020, 0x000e, "UI", seriesUid);
	builder.appendString(0x0020, 0x0010, "SH", "1");
	builder.appendString(0x0020, 0x0011, "IS", "1");
	builder.appendString(0x0020, 0x0013, "IS", "1");

	// Group 0028 & 7FE0
	builder.appendUint16(0x0028, 0x0002, "US", 1);
	builder.appendString(0x0028, 0x0004, "CS", "MONOCHROME2");
	builder.appendUint16(0x0028, 0x0010, "US", height);
	builder.appendUint16(0x0028, 0x0011, "US", width);
	const scale = input.scaleMmPerPixel || 0.02;
	builder.appendString(0x0028, 0x0030, "DS", `${scale.toFixed(5)}\\${scale.toFixed(5)}`);
	builder.appendUint16(0x0028, 0x0100, "US", input.bitsAllocated ?? 16);
	builder.appendUint16(0x0028, 0x0101, "US", input.bitsStored ?? 12);
	builder.appendUint16(0x0028, 0x0102, "US", input.highBit ?? 11);
	builder.appendUint16(0x0028, 0x0103, "US", 0);
	builder.appendString(0x0028, 0x0301, "CS", "NO");
	builder.appendString(0x0028, 0x1050, "DS", String(input.windowCenter ?? 2048));
	builder.appendString(0x0028, 0x1051, "DS", String(input.windowWidth ?? 4096));
	builder.appendPixelData16(0x7fe0, 0x0010, pixelData16);

	return builder.toUint8Array();
}
