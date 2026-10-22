/**
 * cdaTypes.ts — TypeScript Interfaces for CDA R2 Dental SEMD & Payloads
 */

import type { EgiszDentalSemdCode } from "../remdXml/egiszRemdPresets";

export interface EgiszClinicInfo {
	clinicName: string;
	clinicOid: string;
	clinicOgrn: string;
	clinicInn: string;
	clinicKpp?: string | undefined;
	clinicAddress: string;
	clinicPhone: string;
	clinicEmail?: string | undefined;
	chiefDoctorName?: string | undefined;
	chiefDoctorSnils?: string | undefined;
}

export interface EgiszDoctorInfo {
	doctorFullName: string;
	doctorSnils: string;
	doctorPosition: string;
	doctorPositionCode: string;
	doctorPhone?: string | undefined;
	doctorEmail?: string | undefined;
}

export interface EgiszPatientInfo {
	patientId: string;
	cardNumber: string;
	patientFullName: string;
	patientSnils?: string | undefined;
	patientBirthDate: string;
	patientGender: "male" | "female" | "other" | string;
	patientPolisOms?: string | undefined;
	patientPassport?: string | undefined;
	patientAddress?: string | undefined;
	patientPhone?: string | undefined;
	patientEmail?: string | undefined;
}

export interface EgiszProcedureItem {
	code: string;
	name: string;
	tooth?: number | string | undefined;
	surfaces?: string[] | undefined;
	quantity?: number | undefined;
	completedAt?: string | Date | undefined;
}

export interface EgiszDiagnosisItem {
	icd10Code: string;
	icd10Name: string;
	diagnosisName?: string | undefined;
	isPrimary: boolean;
	tooth?: number | string | undefined;
	surfaces?: string[] | undefined;
	clinicalDescription?: string | undefined;
}

export interface GostSignatureInfo {
	signatureBase64: string;
	certificateSerialNumber: string;
	certificateSubject: string;
	certificateIssuer?: string | undefined;
	validFrom?: string | undefined;
	validTo?: string | undefined;
	signedAt: string;
	algorithmOid: string;
	digestAlgorithmOid: string;
	signatureValueHex?: string | undefined;
}

export interface EgiszDentalCdaPayload {
	docTypeCode: EgiszDentalSemdCode | "101" | "102" | "105" | "302" | "303" | "108" | "130";
	documentUuid?: string | undefined;
	documentVersion?: number | undefined;
	encounterDate?: string | Date | undefined;
	clinic: EgiszClinicInfo;
	doctor: EgiszDoctorInfo;
	patient: EgiszPatientInfo;
	complaints: string;
	anamnesisMorbi?: string | undefined;
	anamnesisVitae?: string | undefined;
	toothStates: Record<number, string>;
	toothSurfaces?: Record<number, string[]> | undefined;
	diagnoses: EgiszDiagnosisItem[];
	procedures: EgiszProcedureItem[];
	treatmentProtocolDescription?: string | undefined;
	recommendations: string;
	nextVisitDate?: string | Date | undefined;
	chiefDoctorSignature?: boolean | undefined;
	doctorSignature?: GostSignatureInfo | undefined;
	moSignature?: GostSignatureInfo | undefined;
	clinicSignature?: GostSignatureInfo | undefined;
}

export type { FnsTaxPaymentItem, FnsTaxCertificatePayload } from "./fnsTaxTypes";
