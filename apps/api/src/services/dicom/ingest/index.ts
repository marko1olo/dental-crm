/**
 * index.ts — Публичный контракт модульного DAG приема и сохранения DICOM-исследований.
 */

export type {
	DicomIngestMetadata,
	ImagingSourceKindValue,
	ImagingStudyKindValue,
	IngestBatchResult,
	IngestDicomOptions,
	IngestDicomResult,
	IngestModalityKind,
	ParsedSliceBufferItem,
	PatientBindingResult,
	PatientResolutionInput,
} from "./types.js";

export {
	classifyDicomModality,
	cleanDicomString,
	formatStudyDimensions,
	formatStudyVoxelSpacing,
	formatTechnicalDoseNote,
	mapDicomToSanpinStudyType,
	mapModalityKindToStudyKind,
	parseDicomIngestBuffer,
	parseStudyCapturedAtDate,
	parseUniqueDicomSlices,
	recordSanpinRadiationDose,
	sanitizeDicomUidForPath,
} from "./metadataParser.js";

export {
	bindPatientFromDicomMetadata,
	type EnsureStudyRecordParams,
	ensureSeriesRecord,
	ensureStudyRecord,
	mirrorIntraoralXrayScan,
	rebindStudyToPatient,
	resolveOrAutoCreatePatientForDicom,
	syncExistingStudyPatientBinding,
	unbindStudy,
} from "./patientAutoBinder.js";

export {
	DicomStudyIngestService,
	dicomStudyIngestService,
} from "./studyIngestCore.js";
