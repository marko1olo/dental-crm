/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL MEDICAL HTML / CSS PRINT RENDERERS — TYPES (Layer 0)
 * Data transfer contracts and payload interfaces for statutory medical forms
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type { FullForm043uPayload } from "../forms043u.js";
export type { OrthodonticCard043_1uPayload } from "../forms043_1u.js";
export type { DailyDentistDiary037uPayload } from "../forms037u.js";
export type { SummaryDentistStatement039uPayload } from "../forms039u.js";
export type { MedicalCardExtract003vuPayload } from "../forms003vu.js";
export type { RadiationDoseSheetPayload } from "../radiationDoseSheet.js";
export type {
	Form107_1uPayload,
	Form148_1u88Payload,
	Form148_1u04lPayload,
} from "../forms107_1u.js";
export type { RadiologyReferralPayload } from "../formsRadiologyReferral.js";

/** Метаданные клиники и организации для официальных бланков */
export interface ClinicPrintOrganizationMeta {
	fullName?: string;
	address?: string;
	ogrn?: string;
	inn?: string;
	kpp?: string;
	medicalLicenseNumber?: string;
	medicalLicenseDate?: string;
	medicalLicenseIssuer?: string;
	phone?: string;
	website?: string;
}

/** Реквизиты пациента для печатных форм */
export interface PatientPrintMeta {
	fullName?: string;
	birthDate?: string;
	gender?: "male" | "female" | string;
	phone?: string;
	address?: string;
	snils?: string;
	passport?: string;
	medicalCardNumber?: string;
}

/** Электронная цифровая подпись врача (УКЭП) */
export interface UkepDigitalSignaturePayload {
	doctorFullName?: string;
	doctorSnils?: string;
	certificateSerialNumber?: string;
	certificateThumbprint?: string;
	certificateIssuer?: string;
	certificateValidFrom?: string;
	certificateValidTo?: string;
	signedAt?: string;
	signatureAlgorithm?: string;
	egiszDocumentId?: string;
	cryptoSignaturePkcs7?: string;
	qrVerificationUrl?: string;
}

/** Опции рендеринга печатных медицинских форм */
export interface ClinicalPrintRenderOptions {
	watermarkText?: string;
	withStampAndSignature?: boolean;
	qrVerificationUrl?: string;
	locale?: "ru-RU";
}
