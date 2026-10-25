/**
 * VisiographDicomTypes.ts
 * DICOM metadata inputs, Cyrillic transliteration, and download triggers.
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
