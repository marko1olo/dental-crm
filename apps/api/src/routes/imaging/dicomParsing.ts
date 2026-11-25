/**
 * dicomParsing.ts — Канонический фасад (barrel SSOT) разбора DICOM/КЛКТ снимков.
 * Реализация декомпозирована по доменным модулям `dicomParsingModules/`.
 */
export {
	isDicomArchivePath,
	isDicomArchiveVirtualEntryPath,
	isZipArchivePath,
	isDicomLikeEntry,
	isDicomPixelPath,
	hasDicomMagicAsync,
	hasDicomMagic,
	hasDicomPreamble,
	isDicomHeaderCandidatePath,
	readFilePrefixAsync,
	readFilePrefix,
	redactDicomPreviewText,
	redactDicomPreviewWarnings,
	emptyDicomFirstFramePreview,
} from "./dicomParsingModules/dicomFileIoAndSafety.js";

export {
	cleanDicomText,
	normalizeDicomDate,
	formatDicomDateToIso,
	parseDicomUnsignedInt,
	readDicomUs,
	readDicomDsNumber,
	uncompressedLittleEndianTransferSyntaxes,
	dicomTransferSyntaxIsSupported,
} from "./dicomParsingModules/dicomTagCoreReader.js";

export {
	emptyDicomHeaderMetadata,
	updateDicomEstimatedPixelBytes,
	assignDicomHeaderValue,
	parseDicomHeader,
	extractDicomMetadata,
	buildUnsupportedDicomResponse,
	buildDicomPreviewRgba,
	createDicomPixelSampler,
	type DicomFirstFramePixelParse,
	type DicomImageMetadata,
} from "./dicomParsingModules/dicomMetadataAndPreview.js";

export {
	parseDicomFile,
	scanDicomSeriesFolder,
	type ParsedDicomMetadata,
	type DicomSeriesScanSummary,
} from "./dicomParsingModules/dicomSeriesScanner.js";
