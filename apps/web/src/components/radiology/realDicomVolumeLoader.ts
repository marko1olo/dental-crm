/**
 * realDicomVolumeLoader.ts — Фасад модуля промышленного загрузчика серий DICOM (Мандат 8b <= 120 строк).
 */

export * from "./dicomLoader/realDicomTypes";
export * from "./dicomLoader/realDicomJpegDecoder";
export * from "./dicomLoader/realDicomSliceOrganizer";
export * from "./dicomLoader/realDicomVoxelIngestion";
export * from "./dicomLoader/realDicomZipLoader";
export * from "./dicomLoader/realDicomWebClient";

export {
	isMultiFrameDicom,
	buildVolumeFromMultiFrameDicom,
	parseMultiFrameDicomHeader,
	decodeDicomString,
	type MultiFrameDicomHeader,
} from "./dicomMultiFrameLoader";
export {
	parseDicomSliceHeader,
	computeSliceNormalDistance,
	extractCalibratedVoxelHU,
	decodeSliceVoxels,
	isLocalizerOrScoutSlice,
	DICOM_TRANSFER_SYNTAX,
	isValidTransferSyntax,
	isEncapsulatedTransferSyntax,
	type ParsedDicomSliceHeader,
	type DicomSliceEntry,
} from "./dicomSliceHeaderParser";
export { generateProgressiveLodVolume } from "./dicomProgressiveLod";
