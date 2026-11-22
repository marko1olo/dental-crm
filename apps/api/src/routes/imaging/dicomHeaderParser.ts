/**
 * dicomHeaderParser.ts — Facade re-exporting canonical DICOM header parser from dicomParsing SSOT.
 */
export {
	parseDicomHeader,
	emptyDicomHeaderMetadata,
	extractDicomMetadata,
	parseDicomUnsignedInt,
	updateDicomEstimatedPixelBytes,
	assignDicomHeaderValue,
	type DicomImageMetadata,
} from "./dicomParsing.js";
