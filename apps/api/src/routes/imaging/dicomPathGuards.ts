/**
 * dicomPathGuards.ts — Facade re-exporting canonical path guards and normalization from dicomParsing SSOT.
 */
export {
	isDicomArchivePath,
	isDicomArchiveVirtualEntryPath,
	isZipArchivePath,
	isDicomLikeEntry,
	isDicomPixelPath,
	hasDicomMagic,
	isDicomHeaderCandidatePath,
	readFilePrefix,
	cleanDicomText,
	normalizeDicomDate,
} from "./dicomParsing.js";
