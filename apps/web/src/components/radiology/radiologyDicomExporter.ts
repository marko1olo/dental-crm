/**
 * radiologyDicomExporter.ts — Канонический многоформатный движок экспорта радиовизиографии (JPEG, PNG, DICOM Part 10 SC / IO .dcm).
 *
 * Архитектурные стандарты:
 * - Мандат 8b: Sweet Spot 240–300 строк.
 * - Мандат 8e: Автономия врача (0 блокировок при экспорте снимка).
 * - DICOM Part 10 Explicit VR Little Endian byte stream purity.
 */

export interface DicomMetadataInput {
	patientId?: string | undefined;
	patientFullName?: string | undefined;
	patientBirthDate?: string | undefined;
	patientSex?: "M" | "F" | "O" | undefined;
	clinicName?: string | undefined;
	doctorFullName?: string | undefined;
	studyDate?: string | undefined;
	studyTime?: string | undefined;
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

export function generateDicomUid(type = "1"): string {
	const root = "1.2.826.0.1.3680043.10";
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
	return text.split("").map((ch) => map[ch] ?? ch).join("");
}

export function exportCanvasToJpeg(canvas: HTMLCanvasElement, quality = 0.95): string {
	return canvas.toDataURL("image/jpeg", quality);
}

export function exportCanvasToPng(canvas: HTMLCanvasElement): string {
	return canvas.toDataURL("image/png");
}

export function triggerBinaryDownload(
	data: Uint8Array | Blob,
	filename: string,
	mimeType = "application/dicom",
): void {
	if (typeof window === "undefined") return;
	const blob = data instanceof Blob ? data : new Blob([data as BlobPart], { type: mimeType });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export class DicomByteBuilder {
	private chunks: Uint8Array[] = [];
	private totalLength = 0;

	public appendBytes(bytes: Uint8Array): void {
		this.chunks.push(bytes);
		this.totalLength += bytes.length;
	}

	public appendRawBytesTag(group: number, element: number, vr: string, data: Uint8Array): void {
		let raw = data;
		if (raw.length % 2 !== 0) {
			const p = new Uint8Array(raw.length + 1);
			p.set(raw, 0);
			raw = p;
		}
		const isExt = vr === "OB" || vr === "OW" || vr === "OF" || vr === "SQ" || vr === "UT" || vr === "UN";
		const header = new Uint8Array(isExt ? 12 : 8);
		const view = new DataView(header.buffer);
		view.setUint16(0, group, true);
		view.setUint16(2, element, true);
		header[4] = vr.charCodeAt(0);
		header[5] = vr.charCodeAt(1);
		if (isExt) view.setUint32(8, raw.length, true);
		else view.setUint16(6, raw.length, true);
		this.appendBytes(header);
		this.appendBytes(raw);
	}

	public appendString(group: number, element: number, vr: string, val: string): void {
		let bytes = new TextEncoder().encode(val);
		if (bytes.length % 2 !== 0) {
			const p = new Uint8Array(bytes.length + 1);
			p.set(bytes, 0);
			p[bytes.length] = vr === "UI" ? 0 : 32;
			bytes = p;
		}
		const isExt = vr === "OB" || vr === "OW" || vr === "OF" || vr === "SQ" || vr === "UT" || vr === "UN";
		const header = new Uint8Array(isExt ? 12 : 8);
		const view = new DataView(header.buffer);
		view.setUint16(0, group, true);
		view.setUint16(2, element, true);
		header[4] = vr.charCodeAt(0);
		header[5] = vr.charCodeAt(1);
		if (isExt) view.setUint32(8, bytes.length, true);
		else view.setUint16(6, bytes.length, true);
		this.appendBytes(header);
		this.appendBytes(bytes);
	}

	public appendUint16(group: number, element: number, vr: string, val: number): void {
		const h = new Uint8Array(8);
		const v = new DataView(h.buffer);
		v.setUint16(0, group, true);
		v.setUint16(2, element, true);
		h[4] = vr.charCodeAt(0);
		h[5] = vr.charCodeAt(1);
		v.setUint16(6, 2, true);
		const d = new Uint8Array(2);
		new DataView(d.buffer).setUint16(0, val, true);
		this.appendBytes(h);
		this.appendBytes(d);
	}

	public appendUint32(group: number, element: number, vr: string, val: number): void {
		const h = new Uint8Array(8);
		const v = new DataView(h.buffer);
		v.setUint16(0, group, true);
		v.setUint16(2, element, true);
		h[4] = vr.charCodeAt(0);
		h[5] = vr.charCodeAt(1);
		v.setUint16(6, 4, true);
		const d = new Uint8Array(4);
		new DataView(d.buffer).setUint32(0, val, true);
		this.appendBytes(h);
		this.appendBytes(d);
	}

	public appendPixelData(group: number, element: number, pixelBytes: Uint8Array): void {
		let raw = pixelBytes;
		if (raw.length % 2 !== 0) {
			const p = new Uint8Array(raw.length + 1);
			p.set(raw, 0);
			raw = p;
		}
		const h = new Uint8Array(12);
		const v = new DataView(h.buffer);
		v.setUint16(0, group, true);
		v.setUint16(2, element, true);
		h[4] = "O".charCodeAt(0);
		h[5] = "B".charCodeAt(0);
		v.setUint32(8, raw.length, true);
		this.appendBytes(h);
		this.appendBytes(raw);
	}

	public appendPixelData16(group: number, element: number, pixelWords: Uint16Array): void {
		const byteLen = pixelWords.length * 2;
		const raw = new Uint8Array(pixelWords.buffer, pixelWords.byteOffset, byteLen);
		const h = new Uint8Array(12);
		const v = new DataView(h.buffer);
		v.setUint16(0, group, true);
		v.setUint16(2, element, true);
		h[4] = "O".charCodeAt(0);
		h[5] = "W".charCodeAt(0);
		v.setUint32(8, byteLen, true);
		this.appendBytes(h);
		this.appendBytes(raw);
	}

	public toUint8Array(): Uint8Array {
		const res = new Uint8Array(this.totalLength);
		let off = 0;
		for (const chunk of this.chunks) {
			res.set(chunk, off);
			off += chunk.length;
		}
		return res;
	}
}

export function buildFileMetaInformationBlock(
	sopClassUid: string,
	sopInstanceUid: string,
	transferSyntaxUid = "1.2.840.10008.1.2.1",
): Uint8Array {
	const metaContent = new DicomByteBuilder();
	metaContent.appendRawBytesTag(0x0002, 0x0001, "OB", new Uint8Array([0x00, 0x01]));
	metaContent.appendString(0x0002, 0x0002, "UI", sopClassUid);
	metaContent.appendString(0x0002, 0x0003, "UI", sopInstanceUid);
	metaContent.appendString(0x0002, 0x0010, "UI", transferSyntaxUid);
	metaContent.appendString(0x0002, 0x0012, "UI", "1.2.826.0.1.3680043.10.100.1");
	metaContent.appendString(0x0002, 0x0013, "SH", "DENTE_RVG_1_0");

	const metaBytes = metaContent.toUint8Array();
	const group0002 = new DicomByteBuilder();
	group0002.appendUint32(0x0002, 0x0000, "UL", metaBytes.length);
	group0002.appendBytes(metaBytes);
	return group0002.toUint8Array();
}

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
