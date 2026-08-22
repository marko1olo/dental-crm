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
	patientId: string;
	patientFullName: string;
	patientBirthDate?: string | undefined;
	clinicName?: string | undefined;
	doctorFullName?: string | undefined;
	studyDate?: string | undefined; // YYYYMMDD
	studyTime?: string | undefined; // HHMMSS
	modality?: "DX" | "IO" | "SC" | undefined;
	toothCode?: string | undefined;
	scaleMmPerPixel?: number | undefined;
	studyInstanceUid?: string | undefined;
	seriesInstanceUid?: string | undefined;
	sopInstanceUid?: string | undefined;
}

/**
 * Generates valid DICOM standard Root UID prefix + timestamp-random unique identifier.
 */
export function generateDicomUid(type = "1"): string {
	const root = "1.2.826.0.1.3680043.10"; // Dente CRM sub-tree
	const now = Date.now();
	const rand = Math.floor(Math.random() * 899999 + 100000);
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
class DicomByteBuilder {
	private chunks: Uint8Array[] = [];
	private totalLength = 0;

	public appendBytes(bytes: Uint8Array): void {
		this.chunks.push(bytes);
		this.totalLength += bytes.length;
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

	// Group 0002: File Meta Information
	builder.appendString(
		0x0002,
		0x0002,
		"UI",
		"1.2.840.10008.5.1.4.1.1.7", // Secondary Capture Image Storage
	);
	builder.appendString(0x0002, 0x0003, "UI", sopUid);
	builder.appendString(
		0x0002,
		0x0010,
		"UI",
		"1.2.840.10008.1.2.1", // Explicit VR Little Endian
	);

	// Group 0008: General Study & Equipment
	builder.appendString(0x0008, 0x0016, "UI", "1.2.840.10008.5.1.4.1.1.7");
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

	// Group 0010: Patient
	builder.appendString(0x0010, 0x0010, "PN", patientNameLatin);
	builder.appendString(0x0010, 0x0020, "LO", meta.patientId || "PATIENT-001");
	if (meta.patientBirthDate) {
		builder.appendString(0x0010, 0x0030, "DA", meta.patientBirthDate);
	}

	// Group 0020: Relationship
	builder.appendString(0x0020, 0x000d, "UI", studyUid);
	builder.appendString(0x0020, 0x000e, "UI", seriesUid);
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
