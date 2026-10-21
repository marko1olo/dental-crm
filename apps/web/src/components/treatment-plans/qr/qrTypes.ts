/**
 * apps/web/src/components/treatment-plans/qr/qrTypes.ts
 *
 * Типы данных генератора QR-кодов планов лечения.
 */

export type QrErrorCorrectionLevel = "L" | "M" | "Q" | "H";

export interface PlanVerificationQrPayloadData {
	readonly planId: string;
	readonly planNumber: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly doctorFullName: string;
	readonly totalAmountRub: number;
	readonly tierTitle: string;
	readonly clinicName: string;
	readonly clinicInn: string;
	readonly clinicLicense: string;
	readonly agreedAtIso?: string;
	readonly baseUrl?: string;
}

export interface QrMatrixResult {
	readonly size: number;
	readonly modules: readonly (readonly boolean[])[];
	readonly payload: string;
}
