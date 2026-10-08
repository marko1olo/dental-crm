/**
 * packages/shared/src/billing/billingTypes.ts
 *
 * DENTE Dental CRM — Cash Register & 54-FZ Billing Types.
 * Strictly adheres to Mandate 8e (Doctor & Cashier Autonomy: zero disabled buttons, no forced individual INN),
 * Mandate 8i (Fiscal Accuracy to the single kopeck), and Mandate 8n (Solo Doctor & Small Clinic).
 */

import { z } from "zod";

export type CheckoutPaymentMethod =
	| "cash"
	| "card"
	| "sbp"
	| "deposit"
	| "family_deposit"
	| "split";

export type ReceiptDeliveryMode =
	| "paper_print"
	| "electronic_sms"
	| "electronic_email"
	| "both";

export interface CashRegisterCheckoutPayload {
	readonly organizationId?: string | undefined;
	readonly invoiceId?: string | undefined;
	readonly visitId?: string | undefined;
	readonly patientId: string;
	readonly patientName: string;
	readonly patientPhone?: string | undefined;
	readonly patientEmail?: string | undefined;
	readonly totalDueRub: number;
	readonly totalDueKopecks: number;
	readonly paymentMethod: CheckoutPaymentMethod;
	readonly deliveryMode: ReceiptDeliveryMode;
	readonly isElectronicReceiptOnly: boolean;
	readonly cashTenderedRub?: number | undefined;
	readonly cashChangeRub?: number | undefined;
	readonly clientMutationId: string;
	readonly cashierFullName: string;
	readonly doctorFullName?: string | undefined;
	readonly clinicLegalName: string;
	readonly note?: string | undefined;
	readonly timestampIso: string;
}

export interface SplitPaymentBreakdown {
	readonly cashRub: number;
	readonly cardRub: number;
	readonly sbpRub: number;
	readonly depositRub: number;
	readonly familyDepositRub: number;
	readonly totalRub: number;
	readonly totalKopecks: number;
	readonly remainingRub: number;
	readonly isBalanced: boolean;
}

export interface DepositTopupPayload {
	readonly patientId: string;
	readonly patientName: string;
	readonly patientPhone?: string | undefined;
	readonly patientEmail?: string | undefined;
	readonly amountRub: number;
	readonly amountKopecks: number;
	readonly paymentMethod: "cash" | "card" | "sbp" | "bank_transfer";
	readonly deliveryMode: ReceiptDeliveryMode;
	readonly isFamilyShared: boolean;
	readonly sponsorPatientId?: string | undefined;
	readonly clientMutationId: string;
	readonly cashierFullName: string;
	readonly clinicLegalName: string;
	readonly note?: string | undefined;
	readonly timestampIso: string;
}

export const checkoutPaymentMethodSchema = z.enum([
	"cash",
	"card",
	"sbp",
	"deposit",
	"family_deposit",
	"split",
]);

export const receiptDeliveryModeSchema = z.enum([
	"paper_print",
	"electronic_sms",
	"electronic_email",
	"both",
]);

export const cashRegisterCheckoutSchema = z.object({
	organizationId: z.string().optional(),
	invoiceId: z.string().optional(),
	visitId: z.string().optional(),
	patientId: z.string().min(1, "Пациент обязателен"),
	patientName: z.string().min(1, "Имя пациента обязательно"),
	patientPhone: z.string().optional(),
	patientEmail: z.string().optional(),
	totalDueRub: z.number().min(0, "Сумма не может быть отрицательной"),
	totalDueKopecks: z.number().int().min(0),
	paymentMethod: checkoutPaymentMethodSchema,
	deliveryMode: receiptDeliveryModeSchema,
	isElectronicReceiptOnly: z.boolean(),
	cashTenderedRub: z.number().optional(),
	cashChangeRub: z.number().optional(),
	clientMutationId: z.string().min(1, "Ключ операции обязателен"),
	cashierFullName: z.string().min(1, "ФИО кассира обязательно"),
	doctorFullName: z.string().optional(),
	clinicLegalName: z.string().min(1),
	note: z.string().optional(),
	timestampIso: z.string(),
});
