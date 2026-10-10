/**
 * types.ts — Типы и интерфейсы подсистемы сквозного приема и сохранения DICOM-исследований.
 */

import type {
	DicomIngestMetadata,
	IngestModalityKind,
} from "../dicomIngestMetadataParser.js";
import type {
	PatientBindingResult,
	PatientResolutionInput,
} from "../dicomPatientAutoBinder.js";

export type {
	DicomIngestMetadata,
	IngestModalityKind,
	PatientBindingResult,
	PatientResolutionInput,
};

export type ImagingStudyKindValue =
	| "periapical"
	| "bitewing"
	| "opg"
	| "ceph"
	| "cbct"
	| "photo"
	| "other";

export type ImagingSourceKindValue =
	| "manual_upload"
	| "dicom_file"
	| "dicomweb"
	| "pacs"
	| "twain_wia"
	| "sensor_bridge"
	| "folder_watch";

export interface IngestDicomOptions {
	organizationId: string;
	visitId?: string | null | undefined;
	doctorId?: string | null | undefined;
	sourceKind?: ImagingSourceKindValue | undefined;
	sourceName?: string | undefined;
	autoCreateDraftIfNotFound?: boolean | undefined;
	toothCode?: string | null | undefined;
	region?: string | null | undefined;
}

export interface IngestDicomResult {
	studyId: string;
	seriesId: string;
	instanceId: string;
	xrayScanId: string | null;
	patientId: string | null;
	patientFullName: string | null;
	studyInstanceUid: string;
	seriesInstanceUid: string;
	sopInstanceUid: string;
	modality: string;
	modalityKind: IngestModalityKind;
	studyKind: ImagingStudyKindValue;
	storagePath: string;
	fileSizeBytes: number;
	bindingStatus: string;
	bindingConfidence: number;
	isNewPatientCreated: boolean;
	isDuplicate: boolean;
	metadata: DicomIngestMetadata;
}

export interface IngestBatchResult {
	studyId: string;
	seriesId: string;
	patientId: string | null;
	patientFullName: string | null;
	studyInstanceUid: string;
	seriesInstanceUid: string;
	modalityKind: IngestModalityKind;
	studyKind: ImagingStudyKindValue;
	totalSlicesReceived: number;
	newSlicesInserted: number;
	duplicateSlicesSkipped: number;
	totalFileSizeBytes: number;
	bindingStatus: string;
	bindingConfidence: number;
	isNewPatientCreated: boolean;
	metadata: DicomIngestMetadata;
}

export interface ParsedSliceBufferItem {
	buffer: Buffer;
	metadata: DicomIngestMetadata;
}
