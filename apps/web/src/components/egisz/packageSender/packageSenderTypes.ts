/**
 * packageSenderTypes.ts — Interfaces and payload types for EGISZ REMD and FNS transmission.
 * Mandate 8b compliant (<= 120 lines).
 */

import type {
	EgiszClinicInfo,
	EgiszDentalCdaPayload,
	EgiszDentalSemdCode,
	EgiszDoctorInfo,
	EgiszPatientInfo,
	GostSignatureInfo,
} from "../egiszRemdEngine";

export interface PackageZipExportOptions {
	readonly filenamePrefix: string;
	readonly generatedXml: string;
	readonly doctorSigBase64?: string | undefined;
	readonly moSigBase64?: string | undefined;
	readonly registrationInfo?: unknown | undefined;
}

export interface BuildDeferredRemdOptions {
	readonly docType: "cda_semd" | "fns_tax";
	readonly semdDocCode: EgiszDentalSemdCode;
	readonly patient: EgiszPatientInfo;
	readonly doctor: EgiszDoctorInfo;
	readonly clinic: EgiszClinicInfo;
	readonly semdPayload: EgiszDentalCdaPayload;
	readonly taxPatientName: string;
	readonly taxPatientSnils: string;
}

export interface SubmitCdaPackageOptions {
	readonly semdPayload: EgiszDentalCdaPayload;
	readonly generatedXml: string;
	readonly doctorSig?: GostSignatureInfo | undefined;
	readonly moSig?: GostSignatureInfo | undefined;
}

export interface SubmitFnsTaxOptions {
	readonly patientId: string;
	readonly visitId: string;
}
