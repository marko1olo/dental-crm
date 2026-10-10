/**
 * dicomStudyIngestService.ts — Канонический фасад сквозного приема и сохранения DICOM-исследований.
 *
 * Реализация декомпозирована в модульный DAG ./ingest/:
 * - types.ts: контракты опций, результатов импорта и дескрипторов срезов
 * - metadataParser.ts: разбор тегов DICOM, классификация модальности и журнал доз СанПиН 2.6.1.1192-03
 * - patientAutoBinder.ts: авто-связывание и 1-клик перепривязка пациентов (Мандат 8e)
 * - studyIngestCore.ts: сохранение в PACS, дедупликация по SOPInstanceUID и запись в PostgreSQL 18
 */

export type {
	DicomIngestMetadata,
	EnsureStudyRecordParams,
	ImagingSourceKindValue,
	ImagingStudyKindValue,
	IngestBatchResult,
	IngestDicomOptions,
	IngestDicomResult,
	IngestModalityKind,
	ParsedSliceBufferItem,
	PatientBindingResult,
	PatientResolutionInput,
} from "./ingest/index.js";

export {
	bindPatientFromDicomMetadata,
	classifyDicomModality,
	cleanDicomString,
	DicomStudyIngestService,
	dicomStudyIngestService,
	ensureSeriesRecord,
	ensureStudyRecord,
	formatStudyDimensions,
	formatStudyVoxelSpacing,
	formatTechnicalDoseNote,
	mapDicomToSanpinStudyType,
	mapModalityKindToStudyKind,
	mirrorIntraoralXrayScan,
	parseDicomIngestBuffer,
	parseStudyCapturedAtDate,
	parseUniqueDicomSlices,
	rebindStudyToPatient,
	recordSanpinRadiationDose,
	resolveOrAutoCreatePatientForDicom,
	sanitizeDicomUidForPath,
	syncExistingStudyPatientBinding,
	unbindStudy,
} from "./ingest/index.js";
