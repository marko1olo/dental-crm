/**
 * VisiographDicomExporter.ts
 *
 * Multi-format radiological export engine:
 * 1. High-resolution JPEG (quality-controlled) & Lossless PNG export.
 * 2. DICOM Part 10 Secondary Capture (SC) binary builder (.dcm) with:
 *    - 128-byte preamble + "DICM" magic header.
 *    - Explicit VR Little Endian encoding.
 *    - Medical tags (PatientName, PatientID, StudyUID, Modality DX/IO, PixelSpacing, BurnedInAnnotation).
 *    - Uncompressed RGB PixelData payload.
 * 3. Client-side file download triggering.
 */

export interface DicomMetadataInput {
	patientId?: string | undefined;
	patientFullName?: string | undefined;
	patientBirthDate?: string | undefined;
	patientSex?: "M" | "F" | "O" | undefined;
	clinicName?: string | undefined;
	doctorFullName?: string | undefined;
	studyDate?: string | undefined; // YYYYMMDD
	studyTime?: string | undefined; // HHMMSS
	modality?: "DX" | "IO" | "SC" | undefined;
	bodyPartExamined?: string | undefined;
	toothCode?: string | undefined;
	scaleMmPerPixel?: number | undefined;
	studyInstanceUid?: string | undefined;
	seriesInstanceUid?: string | undefined;
	sopInstanceUid?: string | undefined;
	windowCenter?: number | undefined;
	windowWidth?: number | undefined;
}

export interface DicomIntraoral16Input extends DicomMetadataInput {
	width: number;
	height: number;
	pixelData16: Uint16Array;
	bitsAllocated?: number | undefined;
	bitsStored?: number | undefined;
	highBit?: number | undefined;
}

/**
 * Generates valid DICOM standard Root UID prefix + timestamp-random unique identifier.
 */
export function generateDicomUid(type = "1"): string {
	const root = "1.2.826.0.1.3680043.10"; // Dente CRM sub-tree
	const now = Date.now();
	let rand = 100001;
	if (typeof crypto !== "undefined" && crypto.getRandomValues) {
		const buf = new Uint32Array(1);
		crypto.getRandomValues(buf);
		const val = buf[0] ?? 0;
		rand = 100000 + (val % 900000);
	}
	return `${root}.${type}.${now}.${rand}`;
}

/**
 * Transliterates Russian Cyrillic names into Latin for standard DICOM PN tags.
 */
export function transliterateCyrillicToLatin(text: string): string {
	const map: Record<string, string> = {
		А: "A", Б: "B", В: "V", Г: "G", Д: "D", Е: "E", Ё: "E", Ж: "Zh", З: "Z",
		И: "I", Й: "Y", К: "K", Л: "L", М: "M", Н: "N", О: "O", П: "P", Р: "R",
		С: "S", Т: "T", У: "U", Ф: "F", Х: "Kh", Ц: "Ts", Ч: "Ch", Ш: "Sh", Щ: "Shch",
		Ъ: "", Ы: "Y", Ь: "", Э: "E", Ю: "Yu", Я: "Ya",
		а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
		и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
		с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch",
		ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
	};

	return text
		.split("")
		.map((ch) => map[ch] ?? ch)
		.join("");
}

/**
 * Helper to build an Explicit VR DICOM element byte sequence.
 */
export class DicomByteBuilder {
	private chunks: Uint8Array[] = [];
	private totalLength = 0;

	public appendBytes(bytes: Uint8Array): void {
		this.chunks.push(bytes);
		this.totalLength += bytes.length;
	}

	public appendRawBytesTag(
		group: number,
		element: number,
		vr: string,
		data: Uint8Array,
	): void {
		let rawBytes = data;
		if (rawBytes.length % 2 !== 0) {
			const padded = new Uint8Array(rawBytes.length + 1);
			padded.set(rawBytes, 0);
			padded[rawBytes.length] = 0;
			rawBytes = padded;
		}

		const isExtendedVR =
			vr === "OB" ||
			vr === "OW" ||
			vr === "OF" ||
			vr === "SQ" ||
			vr === "UT" ||
			vr === "UN";
		const headerLen = isExtendedVR ? 12 : 8;
		const header = new Uint8Array(headerLen);
		const view = new DataView(header.buffer);

		view.setUint16(0, group, true);
		view.setUint16(2, element, true);
		header[4] = vr.charCodeAt(0);
		header[5] = vr.charCodeAt(1);

		if (isExtendedVR) {
			view.setUint16(6, 0, true); // Reserved
			view.setUint32(8, rawBytes.length, true);
		} else {
			view.setUint16(6, rawBytes.length, true);
		}

		this.appendBytes(header);
		this.appendBytes(rawBytes);
	}

	public appendString(
		group: number,
		element: number,
		vr: string,
		val: string,
	): void {
		let strBytes = new TextEncoder().encode(val);
		// Pad to even length per DICOM standard
		if (strBytes.length % 2 !== 0) {
			const padded = new Uint8Array(strBytes.length + 1);
			padded.set(strBytes, 0);
			padded[strBytes.length] = vr === "UI" ? 0 : 32; // Space pad or 0 pad for UI
			strBytes = padded;
		}

		const isExtendedVR =
			vr === "OB" ||
			vr === "OW" ||
			vr === "OF" ||
			vr === "SQ" ||
			vr === "UT" ||
			vr === "UN";
		const headerLen = isExtendedVR ? 12 : 8;
		const header = new Uint8Array(headerLen);
		const view = new DataView(header.buffer);

		view.setUint16(0, group, true);
		view.setUint16(2, element, true);
		header[4] = vr.charCodeAt(0);
		header[5] = vr.charCodeAt(1);

		if (isExtendedVR) {
			view.setUint16(6, 0, true); // Reserved
			view.setUint32(8, strBytes.length, true);
		} else {
			view.setUint16(6, strBytes.length, true);
		}

		this.appendBytes(header);
		this.appendBytes(strBytes);
	}

	public appendUint16(
		group: number,
		element: number,
		vr: string,
		val: number,
	): void {
		const header = new Uint8Array(8);
		const view = new DataView(header.buffer);
		view.setUint16(0, group, true);
		view.setUint16(2, element, true);
		header[4] = vr.charCodeAt(0);
		header[5] = vr.charCodeAt(1);
		view.setUint16(6, 2, true); // Length 2 bytes

		const data = new Uint8Array(2);
		new DataView(data.buffer).setUint16(0, val, true);

		this.appendBytes(header);
		this.appendBytes(data);
	}

	public appendUint32(
		group: number,
		element: number,
		vr: string,
		val: number,
	): void {
		const header = new Uint8Array(8);
		const view = new DataView(header.buffer);
		view.setUint16(0, group, true);
		view.setUint16(2, element, true);
		header[4] = vr.charCodeAt(0);
		header[5] = vr.charCodeAt(1);
		view.setUint16(6, 4, true); // Length 4 bytes

		const data = new Uint8Array(4);
		new DataView(data.buffer).setUint32(0, val, true);

		this.appendBytes(header);
		this.appendBytes(data);
	}

	public appendPixelData(
		group: number,
		element: number,
		pixelBytes: Uint8Array,
	): void {
		let rawBytes = pixelBytes;
		if (rawBytes.length % 2 !== 0) {
			const padded = new Uint8Array(rawBytes.length + 1);
			padded.set(rawBytes, 0);
			rawBytes = padded;
		}

		const header = new Uint8Array(12);
		const view = new DataView(header.buffer);
		view.setUint16(0, group, true);
		view.setUint16(2, element, true);
		header[4] = "O".charCodeAt(0);
		header[5] = "B".charCodeAt(0);
		view.setUint16(6, 0, true);
		view.setUint32(8, rawBytes.length, true);

		this.appendBytes(header);
		this.appendBytes(rawBytes);
	}

	public appendPixelData16(
		group: number,
		element: number,
		pixelWords: Uint16Array,
	): void {
		const byteLen = pixelWords.length * 2;
		const rawBytes = new Uint8Array(
			pixelWords.buffer,
			pixelWords.byteOffset,
			byteLen,
		);

		const header = new Uint8Array(12);
		const view = new DataView(header.buffer);
		view.setUint16(0, group, true);
		view.setUint16(2, element, true);
		header[4] = "O".charCodeAt(0);
		header[5] = "W".charCodeAt(0);
		view.setUint16(6, 0, true);
		view.setUint32(8, byteLen, true);

		this.appendBytes(header);
		this.appendBytes(rawBytes);
	}

	public toUint8Array(): Uint8Array {
		const result = new Uint8Array(this.totalLength);
		let offset = 0;
		for (const chunk of this.chunks) {
			result.set(chunk, offset);
			offset += chunk.length;
		}
		return result;
	}
}

/**
 * Builds standard Group 0002 File Meta Information block including Group Length (0002,0000).
 */
export function buildFileMetaInformationBlock(
	sopClassUid: string,
	sopInstanceUid: string,
	transferSyntaxUid = "1.2.840.10008.1.2.1",
): Uint8Array {
	const metaContent = new DicomByteBuilder();
	// (0002, 0001) FileMetaInformationVersion OB [0x00, 0x01]
	metaContent.appendRawBytesTag(0x0002, 0x0001, "OB", new Uint8Array([0x00, 0x01]));
	// (0002, 0002) MediaStorageSOPClassUID UI
	metaContent.appendString(0x0002, 0x0002, "UI", sopClassUid);
	// (0002, 0003) MediaStorageSOPInstanceUID UI
	metaContent.appendString(0x0002, 0x0003, "UI", sopInstanceUid);
	// (0002, 0010) TransferSyntaxUID UI
	metaContent.appendString(0x0002, 0x0010, "UI", transferSyntaxUid);
	// (0002, 0012) ImplementationClassUID UI (Dente CRM Root)
	metaContent.appendString(0x0002, 0x0012, "UI", "1.2.826.0.1.3680043.10.100.1");
	// (0002, 0013) ImplementationVersionName SH
	metaContent.appendString(0x0002, 0x0013, "SH", "DENTE_RVG_1_0");

	const metaBytes = metaContent.toUint8Array();
	const group0002 = new DicomByteBuilder();
	// (0002, 0000) FileMetaInformationGroupLength UL
	group0002.appendUint32(0x0002, 0x0000, "UL", metaBytes.length);
	group0002.appendBytes(metaBytes);

	return group0002.toUint8Array();
}

/**
 * Creates standard Part 10 compliant DICOM Secondary Capture Image (.dcm) from an HTML5 Canvas.
 */
export function createDicomSecondaryCaptureFile(
	canvas: HTMLCanvasElement,
	meta: DicomMetadataInput,
): Uint8Array {
	const width = canvas.width || 800;
	const height = canvas.height || 600;

	const ctx = canvas.getContext("2d", { willReadFrequently: true });
	let rgbaData: Uint8ClampedArray;
	if (ctx) {
		rgbaData = ctx.getImageData(0, 0, width, height).data;
	} else {
		rgbaData = new Uint8ClampedArray(width * height * 4);
	}

	// Convert RGBA to RGB (3 bytes per pixel)
	const rgbBytes = new Uint8Array(width * height * 3);
	let srcIdx = 0;
	let dstIdx = 0;
	for (let i = 0; i < width * height; i++) {
		rgbBytes[dstIdx] = rgbaData[srcIdx] ?? 0; // R
		rgbBytes[dstIdx + 1] = rgbaData[srcIdx + 1] ?? 0; // G
		rgbBytes[dstIdx + 2] = rgbaData[srcIdx + 2] ?? 0; // B
		srcIdx += 4;
		dstIdx += 3;
	}

	const builder = new DicomByteBuilder();

	// 1. 128 bytes preamble + "DICM" prefix
	const preamble = new Uint8Array(128);
	builder.appendBytes(preamble);
	const dicmMagic = new TextEncoder().encode("DICM");
	builder.appendBytes(dicmMagic);

	const studyUid = meta.studyInstanceUid || generateDicomUid("2");
	const seriesUid = meta.seriesInstanceUid || generateDicomUid("3");
	const sopUid = meta.sopInstanceUid || generateDicomUid("4");
	const sopClassUid = "1.2.840.10008.5.1.4.1.1.7"; // Secondary Capture Image Storage

	const now = new Date();
	const studyDateStr =
		meta.studyDate ||
		`${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
	const studyTimeStr =
		meta.studyTime ||
		`${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;

	const patientNameLatin = transliterateCyrillicToLatin(
		meta.patientFullName || "UNKNOWN^PATIENT",
	);
	const doctorNameLatin = transliterateCyrillicToLatin(
		meta.doctorFullName || "D-r Petrov",
	);

	// Group 0002: File Meta Information with Group Length
	builder.appendBytes(buildFileMetaInformationBlock(sopClassUid, sopUid));

	// Group 0008: General Study & Equipment
	builder.appendString(0x0008, 0x0005, "CS", "ISO_IR 192"); // UTF-8 Character Set
	builder.appendString(0x0008, 0x0008, "CS", "DERIVED\\SECONDARY"); // ImageType
	builder.appendString(0x0008, 0x0016, "UI", sopClassUid);
	builder.appendString(0x0008, 0x0018, "UI", sopUid);
	builder.appendString(0x0008, 0x0020, "DA", studyDateStr);
	builder.appendString(0x0008, 0x0030, "TM", studyTimeStr);
	builder.appendString(0x0008, 0x0060, "CS", meta.modality || "IO");
	builder.appendString(0x0008, 0x0070, "LO", "DENTE DENTAL PACS");
	builder.appendString(
		0x0008,
		0x0080,
		"LO",
		meta.clinicName || "DENTE CLINIC",
	);
	builder.appendString(0x0008, 0x0090, "PN", doctorNameLatin);
	const studyDesc = meta.toothCode
		? `Intraoral Radiography Tooth ${meta.toothCode}`
		: "Intraoral Radiography";
	builder.appendString(0x0008, 0x1030, "LO", studyDesc);
	builder.appendString(0x0008, 0x1050, "PN", doctorNameLatin);

	// Group 0010: Patient
	builder.appendString(0x0010, 0x0010, "PN", patientNameLatin);
	builder.appendString(0x0010, 0x0020, "LO", meta.patientId || "PATIENT-001");
	if (meta.patientBirthDate) {
		builder.appendString(0x0010, 0x0030, "DA", meta.patientBirthDate);
	}
	if (meta.patientSex) {
		builder.appendString(0x0010, 0x0040, "CS", meta.patientSex);
	}

	// Group 0018: Acquisition & Anatomical Parameters
	builder.appendString(0x0018, 0x0015, "CS", meta.bodyPartExamined || "TEETH");
	builder.appendString(0x0018, 0x1000, "LO", "DENTE-IO-SENSOR");
	builder.appendString(0x0018, 0x1020, "LO", "Dente CRM 2.0");

	// Group 0020: Relationship
	builder.appendString(0x0020, 0x000d, "UI", studyUid);
	builder.appendString(0x0020, 0x000e, "UI", seriesUid);
	builder.appendString(0x0020, 0x0010, "SH", "1");
	builder.appendString(0x0020, 0x0011, "IS", "1");
	builder.appendString(0x0020, 0x0013, "IS", "1");

	// Group 0028: Image Pixel
	builder.appendUint16(0x0028, 0x0002, "US", 3); // SamplesPerPixel = 3 (RGB)
	builder.appendString(0x0028, 0x0004, "CS", "RGB"); // PhotometricInterpretation
	builder.appendUint16(0x0028, 0x0006, "US", 0); // PlanarConfiguration = 0 (interleaved)
	builder.appendUint16(0x0028, 0x0010, "US", height); // Rows
	builder.appendUint16(0x0028, 0x0011, "US", width); // Columns

	if (meta.scaleMmPerPixel && meta.scaleMmPerPixel > 0) {
		const spacingStr = `${meta.scaleMmPerPixel.toFixed(5)}\\${meta.scaleMmPerPixel.toFixed(5)}`;
		builder.appendString(0x0028, 0x0030, "DS", spacingStr);
	}

	builder.appendUint16(0x0028, 0x0100, "US", 8); // BitsAllocated
	builder.appendUint16(0x0028, 0x0101, "US", 8); // BitsStored
	builder.appendUint16(0x0028, 0x0102, "US", 7); // HighBit
	builder.appendUint16(0x0028, 0x0103, "US", 0); // PixelRepresentation (unsigned)
	builder.appendString(0x0028, 0x0301, "CS", "YES"); // BurnedInAnnotation

	// Group 7FE0: Pixel Data
	builder.appendPixelData(0x7fe0, 0x0010, rgbBytes);

	return builder.toUint8Array();
}

/**
 * Creates standard Part 10 compliant DICOM Digital Intra-Oral X-Ray Image (.dcm)
 * from 16-bit / 12-bit native sensor exposure pixel buffer.
 */
export function createDicomIntraoral16File(
	input: DicomIntraoral16Input,
): Uint8Array {
	const { width, height, pixelData16 } = input;
	const builder = new DicomByteBuilder();

	// 1. 128 bytes preamble + "DICM" prefix
	const preamble = new Uint8Array(128);
	builder.appendBytes(preamble);
	const dicmMagic = new TextEncoder().encode("DICM");
	builder.appendBytes(dicmMagic);

	const studyUid = input.studyInstanceUid || generateDicomUid("2");
	const seriesUid = input.seriesInstanceUid || generateDicomUid("3");
	const sopUid = input.sopInstanceUid || generateDicomUid("4");
	// Digital Intra-Oral X-Ray Image Storage - For Presentation
	const sopClassUid = "1.2.840.10008.5.1.4.1.1.1.3";

	const now = new Date();
	const studyDateStr =
		input.studyDate ||
		`${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
	const studyTimeStr =
		input.studyTime ||
		`${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;

	const patientNameLatin = transliterateCyrillicToLatin(
		input.patientFullName || "UNKNOWN^PATIENT",
	);
	const doctorNameLatin = transliterateCyrillicToLatin(
		input.doctorFullName || "D-r Petrov",
	);

	// Group 0002: File Meta Information
	builder.appendBytes(buildFileMetaInformationBlock(sopClassUid, sopUid));

	// Group 0008: General Study & Equipment
	builder.appendString(0x0008, 0x0005, "CS", "ISO_IR 192");
	builder.appendString(0x0008, 0x0008, "CS", "ORIGINAL\\PRIMARY");
	builder.appendString(0x0008, 0x0016, "UI", sopClassUid);
	builder.appendString(0x0008, 0x0018, "UI", sopUid);
	builder.appendString(0x0008, 0x0020, "DA", studyDateStr);
	builder.appendString(0x0008, 0x0030, "TM", studyTimeStr);
	builder.appendString(0x0008, 0x0060, "CS", input.modality || "IO");
	builder.appendString(0x0008, 0x0070, "LO", "DENTE DENTAL PACS");
	builder.appendString(
		0x0008,
		0x0080,
		"LO",
		input.clinicName || "DENTE CLINIC",
	);
	builder.appendString(0x0008, 0x0090, "PN", doctorNameLatin);
	const studyDesc = input.toothCode
		? `Intraoral Radiography Tooth ${input.toothCode}`
		: "Intraoral Radiography";
	builder.appendString(0x0008, 0x1030, "LO", studyDesc);
	builder.appendString(0x0008, 0x1050, "PN", doctorNameLatin);

	// Group 0010: Patient
	builder.appendString(0x0010, 0x0010, "PN", patientNameLatin);
	builder.appendString(0x0010, 0x0020, "LO", input.patientId || "PATIENT-001");
	if (input.patientBirthDate) {
		builder.appendString(0x0010, 0x0030, "DA", input.patientBirthDate);
	}
	if (input.patientSex) {
		builder.appendString(0x0010, 0x0040, "CS", input.patientSex);
	}

	// Group 0018: Acquisition & Anatomical Parameters
	builder.appendString(0x0018, 0x0015, "CS", input.bodyPartExamined || "TEETH");
	builder.appendString(0x0018, 0x1000, "LO", "DENTE-IO-SENSOR");
	builder.appendString(0x0018, 0x1020, "LO", "Dente CRM 2.0");

	// Group 0020: Relationship
	builder.appendString(0x0020, 0x000d, "UI", studyUid);
	builder.appendString(0x0020, 0x000e, "UI", seriesUid);
	builder.appendString(0x0020, 0x0010, "SH", "1");
	builder.appendString(0x0020, 0x0011, "IS", "1");
	builder.appendString(0x0020, 0x0013, "IS", "1");

	// Group 0028: Image Pixel
	builder.appendUint16(0x0028, 0x0002, "US", 1); // SamplesPerPixel = 1 (Grayscale)
	builder.appendString(0x0028, 0x0004, "CS", "MONOCHROME2"); // PhotometricInterpretation
	builder.appendUint16(0x0028, 0x0010, "US", height); // Rows
	builder.appendUint16(0x0028, 0x0011, "US", width); // Columns

	const scale = input.scaleMmPerPixel || 0.02; // Standard 0.020 mm/pixel
	const spacingStr = `${scale.toFixed(5)}\\${scale.toFixed(5)}`;
	builder.appendString(0x0028, 0x0030, "DS", spacingStr);

	const bitsAllocated = input.bitsAllocated ?? 16;
	const bitsStored = input.bitsStored ?? 12;
	const highBit = input.highBit ?? 11;

	builder.appendUint16(0x0028, 0x0100, "US", bitsAllocated); // BitsAllocated = 16
	builder.appendUint16(0x0028, 0x0101, "US", bitsStored); // BitsStored = 12
	builder.appendUint16(0x0028, 0x0102, "US", highBit); // HighBit = 11
	builder.appendUint16(0x0028, 0x0103, "US", 0); // PixelRepresentation (unsigned)
	builder.appendString(0x0028, 0x0301, "CS", "NO"); // BurnedInAnnotation

	// Window Center and Window Width (VOI LUT)
	const windowCenter = input.windowCenter ?? 2048;
	const windowWidth = input.windowWidth ?? 4096;
	builder.appendString(0x0028, 0x1050, "DS", String(windowCenter));
	builder.appendString(0x0028, 0x1051, "DS", String(windowWidth));

	// Group 7FE0: Pixel Data (OW)
	builder.appendPixelData16(0x7fe0, 0x0010, pixelData16);

	return builder.toUint8Array();
}

/**
 * Exports canvas to high-quality JPEG Data URI.
 */
export function exportCanvasToJpeg(
	canvas: HTMLCanvasElement,
	quality = 0.95,
): string {
	return canvas.toDataURL("image/jpeg", quality);
}

/**
 * Exports canvas to lossless PNG Data URI.
 */
export function exportCanvasToPng(canvas: HTMLCanvasElement): string {
	return canvas.toDataURL("image/png");
}

/**
 * Initiates browser file download for a binary blob or Uint8Array.
 */
export function triggerBinaryDownload(
	data: Uint8Array | Blob,
	filename: string,
	mimeType = "application/dicom",
): void {
	if (typeof window === "undefined") return;

	const blob =
		data instanceof Blob ? data : new Blob([data as BlobPart], { type: mimeType });
	const url = URL.createObjectURL(blob);

	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);

	setTimeout(() => URL.revokeObjectURL(url), 5000);
}
