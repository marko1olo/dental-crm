import type {
	DicomWebAuthMode,
	DicomWebConnectorCheckRequest,
	DicomWebConnectorStatus,
} from "@dental/shared";

export type {
	DicomWebAuthMode,
	DicomWebConnectorCheckRequest,
	DicomWebConnectorStatus,
};

/**
 * Стандартные DICOM-теги (DICOM PS3.6 Data Dictionary)
 */
export const DICOM_TAGS = {
	SpecificCharacterSet: "00080005",
	StudyDate: "00080020",
	StudyTime: "00080030",
	AccessionNumber: "00080050",
	Modality: "00080060",
	Manufacturer: "00080070",
	ReferringPhysicianName: "00080090",
	StudyDescription: "00081030",
	SeriesDescription: "0008103E",
	PatientName: "00100010",
	PatientID: "00100020",
	PatientBirthDate: "00100030",
	PatientSex: "00100040",
	StudyInstanceUID: "0020000D",
	SeriesInstanceUID: "0020000E",
	StudyID: "00200010",
	SeriesNumber: "00200011",
	InstanceNumber: "00200013",
	SOPClassUID: "00080016",
	SOPInstanceUID: "00080018",
	NumberOfFrames: "00280008",
	Rows: "00280010",
	Columns: "00280011",
	BitsAllocated: "00280100",
	PixelSpacing: "00280030",
} as const;

export type DicomTagKey = keyof typeof DICOM_TAGS;

export interface QidoStudyQuery {
	PatientID?: string;
	PatientName?: string;
	StudyDate?: string;
	Modality?: string;
	StudyInstanceUID?: string;
	limit?: number;
	offset?: number;
}

export interface QidoSeriesQuery {
	SeriesInstanceUID?: string;
	Modality?: string;
	SeriesNumber?: number | string;
	limit?: number;
}

export interface WadoFrameRequest {
	studyInstanceUid: string;
	seriesInstanceUid: string;
	sopInstanceUid: string;
	frameNumber?: number;
	organizationId?: string;
}

export interface WadoRetrieveResult {
	ok: boolean;
	contentType: string;
	data?: Uint8Array;
	error?: string;
	status: number;
}

export type BlockedIpv4Range = {
	readonly cidr: string;
	readonly base: number;
	readonly mask: number;
	readonly why: string;
};

export type BlockedIpv6Range = {
	readonly cidr: string;
	readonly base: Uint8Array;
	readonly bits: number;
	readonly why: string;
};

export type TargetSafety =
	| { readonly ok: true }
	| { readonly ok: false; readonly reason: string };
