import type { Patient } from "@dental/shared";

export interface GetPatientsOptions {
	includeMerged?: boolean | undefined;
	search?: string | undefined;
	limit?: number | undefined;
	offset?: number | undefined;
}

export interface PatientConsentRecordInput {
	templateKey?: string | undefined;
	code?: string | undefined;
	title?: string | undefined;
	fullTextContent?: string | undefined;
	patientName?: string | undefined;
	birthDate?: string | undefined;
	passport?: string | undefined;
	doctorName?: string | undefined;
	clinicName?: string | undefined;
	diagnosisIcd?: string | undefined;
	toothNumbers?: string | undefined;
	signatureSvg: string;
	signaturePngBase64?: string | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: vector math points
	vectorData?: any;
	integrityHash: string;
	signedAt?: string | undefined;
	verificationMethod?: string | undefined;
	smsOtpCode?: string | null | undefined;
	attachedToForm043u?: boolean | undefined;
	visitId?: string | null | undefined;
}

export type CreatePatientSafeResult =
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	{ type: "duplicate"; duplicate: any } | { type: "success"; patient: Patient };
