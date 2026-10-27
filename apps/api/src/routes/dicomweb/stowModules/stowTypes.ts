import {
	TAG_PATIENT_NAME,
	TAG_PATIENT_ID,
	TAG_PATIENT_BIRTH_DATE,
	cleanDicomPatientName,
	parseDicomBufferForStow,
	stripMultipartWrapperFromBuffer,
} from "../../dicomwebHelpers.js";

export {
	TAG_PATIENT_NAME,
	TAG_PATIENT_ID,
	TAG_PATIENT_BIRTH_DATE,
	cleanDicomPatientName,
	parseDicomBufferForStow,
	stripMultipartWrapperFromBuffer,
};

export interface StowStoreResult {
	studyUid: string;
	seriesUid: string;
	sopInstanceUid: string;
	storagePath: string;
	studyId: string;
	seriesId: string;
	instanceId: string;
	patientId: string | null;
	matchMethod: string;
	bindingStatus: string;
	bindingConfidence: number;
}
