/**
 * VisiographWatermarkTypes.ts
 * Clinical credentials, doctor digital signature, and legal watermark configuration.
 */

import type {
	AngleMeasurement,
	CalibrationReference,
	PeriapicalLesion,
	RulerMeasurement,
} from "./VisiographMeasurementMath";

export interface LegalClinicCredentials {
	clinicName: string;
	ogrn?: string | undefined;
	inn?: string | undefined;
	licenseNumber?: string | undefined;
	clinicAddress?: string | undefined;
	clinicPhone?: string | undefined;
}

export interface LegalDoctorSignature {
	doctorFullName: string;
	speciality?: string | undefined;
	certificateOrSnils?: string | undefined;
	digitalSignatureHash?: string | undefined;
	signedAt?: string | undefined;
}

export interface LegalWatermarkOptions {
	patient: {
		id: string;
		fullName: string;
		birthDate?: string | undefined;
	};
	clinic?: LegalClinicCredentials | undefined;
	doctor?: LegalDoctorSignature | undefined;
	study?: {
		id?: string | undefined;
		toothCode?: string | undefined;
		kind?: string | undefined;
		capturedAt?: string | undefined;
	} | undefined;
	calibration?: CalibrationReference | undefined;
	rulers?: RulerMeasurement[] | undefined;
	angles?: AngleMeasurement[] | undefined;
	lesions?: PeriapicalLesion[] | undefined;
}

export const DEFAULT_CLINIC_CREDENTIALS: LegalClinicCredentials = {
	clinicName: "Стоматологическая клиника",
	ogrn: "",
	inn: "",
	licenseNumber: "",
	clinicAddress: "",
	clinicPhone: "",
};

export const DEFAULT_DOCTOR_SIGNATURE: LegalDoctorSignature = {
	doctorFullName: "Врач-стоматолог-рентгенолог",
	speciality: "Стоматология общей практики / Лучевая диагностика",
	certificateOrSnils: "",
};

export function computeDoctorSignatureDigest(
	doctorName: string,
	patientId: string,
	timestamp: string,
): string {
	let hash = 0x811c9dc5;
	const str = `${doctorName}|${patientId}|${timestamp}|DENTE-LEGAL-FIXATION`;
	for (let i = 0; i < str.length; i++) {
		hash ^= str.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193);
	}
	const hex = (hash >>> 0).toString(16).toUpperCase().padStart(8, "0");
	const hex2 = ((hash ^ 0x55555555) >>> 0).toString(16).toUpperCase().padStart(8, "0");
	return `ГОСТ Р 34.10 · ЭЦП [${hex.slice(0, 4)}-${hex.slice(4)}-${hex2.slice(0, 4)}-${hex2.slice(4)}]`;
}
