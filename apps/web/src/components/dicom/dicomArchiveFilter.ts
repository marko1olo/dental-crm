/**
 * dicomArchiveFilter.ts
 * Pure DICOM slice identification, OS junk exclusion, and DICOMDIR filtering.
 *
 * Tomographs like KaVo Instrumentarium OP300 and CyberMed OnDemand3D (as well as
 * NewTom, Planmeca, and Carestream) package a DICOMDIR directory index file inside
 * the CBCT ZIP archive. This file has a valid 128-byte preamble followed by "DICM",
 * but contains NO slice PixelData (tag 7FE0,0010).
 *
 * If passed to Cornerstone or MPR viewport slice renderers, it causes unhandled exceptions
 * and crashes during 3D volume reconstruction.
 *
 * Per Mandate 8e (Doctor Autonomy & Reliability), DICOMDIR index files and non-image
 * companion files must be cleanly skipped so doctor workflows never fail.
 */

/**
 * Returns true if filename represents a DICOMDIR directory index file.
 * Case-insensitive match on name containing "DICOMDIR".
 */
export function isDicomdirEntry(filename: string): boolean {
	return filename.toUpperCase().includes("DICOMDIR");
}

/**
 * Checks if a byte buffer or filename represents a valid DICOM image slice.
 * Standard DICOM has 128-byte preamble followed by "DICM" magic string.
 * Non-preamble DICOM or raw files identified by .dcm/.dicom extensions.
 * Rejects OS artifacts and DICOMDIR directory index files.
 */
export function isDicomEntry(filename: string, byteArray: Uint8Array): boolean {
	const lower = filename.toLowerCase();
	if (
		lower.includes("__macosx") ||
		lower.includes("/._") ||
		lower.startsWith("._") ||
		lower.endsWith(".ds_store") ||
		lower.endsWith("thumbs.db") ||
		lower.endsWith("desktop.ini")
	) {
		return false;
	}

	// Skip DICOMDIR index directory files (KaVo OP300, CyberMed OnDemand3D, etc.).
	// DICOMDIR contains the "DICM" magic header but no PixelData (7FE0,0010),
	// which causes slice image viewports and 3D volume reconstruction to crash.
	if (isDicomdirEntry(filename)) {
		return false;
	}

	if (byteArray.length >= 132) {
		const dicmPrefix = String.fromCharCode(
			byteArray[128] ?? 0,
			byteArray[129] ?? 0,
			byteArray[130] ?? 0,
			byteArray[131] ?? 0,
		);
		if (dicmPrefix === "DICM") {
			return true;
		}
	}

	if (lower.endsWith(".dcm") || lower.endsWith(".dicom")) {
		return byteArray.length > 32;
	}

	// DICOM without preamble typically begins with Group 0x0002 or Group 0x0008 tag
	if (byteArray.length >= 4) {
		const tagGroup = (byteArray[0] ?? 0) | ((byteArray[1] ?? 0) << 8);
		if (tagGroup === 0x0002 || tagGroup === 0x0008) {
			return true;
		}
	}

	return false;
}

/**
 * Filters a list of filenames or entry paths from a ZIP archive or folder,
 * removing DICOMDIR and OS metadata entries.
 */
export function filterDicomArchiveEntries(filenames: string[]): string[] {
	return filenames.filter(
		(name) =>
			!isDicomdirEntry(name) &&
			!name.toLowerCase().includes("__macosx") &&
			!name.startsWith("._") &&
			!name.includes("/._") &&
			!name.toLowerCase().endsWith(".ds_store") &&
			!name.toLowerCase().endsWith("thumbs.db") &&
			!name.toLowerCase().endsWith("desktop.ini"),
	);
}
