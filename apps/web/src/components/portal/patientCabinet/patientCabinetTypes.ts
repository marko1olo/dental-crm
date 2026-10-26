/**
 * Patient Personal Portal & SMS/OTP Cabinet Types
 * (DOMAIN: PORTAL PATIENT CABINET - LAYER 0 TYPES)
 */

import type { PatientToothInfo } from "../PatientFriendlyOdontogram.js";

export interface SbpBankMember {
	readonly id: string;
	readonly nameRu: string;
	readonly schemaPrefix: string;
	readonly brandColorHex: string;
	readonly popular: boolean;
}

export interface SbpQrPayload {
	readonly qrId: string;
	readonly invoiceNumber: string;
	readonly amountRub: number;
	readonly amountKopecks: number;
	readonly recipientLegalName: string;
	readonly recipientInn: string;
	readonly recipientAccount: string;
	readonly bankBic: string;
	readonly paymentPurpose: string;
	readonly sbpNspkPayloadString: string;
	readonly qrSvg: string;
	readonly expiresAtIso: string;
	readonly availableBanks: readonly SbpBankMember[];
}

export interface InvoiceServiceItem {
	readonly code: string;
	readonly titleRu: string;
	readonly quantity: number;
	readonly priceRub: number;
	readonly totalRub: number;
	readonly toothFdi?: string | undefined;
	readonly id?: string | undefined;
	readonly qty?: number | undefined;
	readonly categoryGroup?: string | undefined;
	readonly toothNumber?: string | undefined;
}

export interface PatientInvoiceItem {
	readonly id: string;
	readonly invoiceNumber: string;
	readonly issueDateIso: string;
	readonly dueDateIso?: string | undefined;
	readonly dateIso?: string | undefined;
	readonly titleRu: string;
	readonly totalAmountRub: number;
	readonly paidAmountRub: number;
	readonly remainingAmountRub: number;
	readonly status: "paid" | "unpaid" | "partially_paid" | "cancelled";
	readonly paymentMethod?: "sbp" | "card_online" | "pos_terminal" | "cash" | undefined;
	readonly paidAtIso?: string | undefined;
	readonly fiscalReceiptNumber?: string | undefined;
	readonly fiscalReceiptUrl?: string | undefined;
	readonly items: readonly InvoiceServiceItem[];
	readonly sbpPayload?: SbpQrPayload | undefined;
}

export interface PatientAppointment {
	readonly id: string;
	readonly dateIso: string;
	readonly timeRu: string;
	readonly doctorId: string;
	readonly doctorName: string;
	readonly doctorSpecialtyRu: string;
	readonly doctorAvatarUrl?: string | undefined;
	readonly roomNumber: string;
	readonly clinicName: string;
	readonly clinicAddressRu: string;
	readonly titleRu: string;
	readonly status: "scheduled" | "confirmed" | "completed" | "cancelled" | "reschedule_requested";
	readonly priceRub?: number | undefined;
	readonly reminderSent: boolean;
	readonly reminderChannel?: "sms" | "whatsapp" | "push" | undefined;
	readonly preparationInstructionsRu?: readonly string[] | undefined;
	readonly cancellationReason?: string | undefined;
}

export interface TreatmentPlanStage {
	readonly id: string;
	readonly orderIndex: number;
	readonly titleRu: string;
	readonly categoryRu: "Диагностика" | "Терапия" | "Хирургия" | "Ортопедия" | "Ортодонтия" | "Гигиена";
	readonly teethFdi: readonly string[];
	readonly costRub: number;
	readonly status: "completed" | "in_progress" | "planned";
	readonly procedures: readonly string[];
	readonly targetDateRu?: string | undefined;
	readonly estimatedVisitsCount?: number | undefined;
}
