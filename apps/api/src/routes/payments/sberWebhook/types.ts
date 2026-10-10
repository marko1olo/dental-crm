import { z } from "zod";

export type SberPosTransactionStatus =
	| "WAITING_FOR_CARD"
	| "AUTHORIZED"
	| "SETTLED"
	| "FAILED"
	| "REVERSED"
	| "REFUNDED";

export const initiateSberPosPaymentSchema = z.object({
	patientId: z.string().uuid("Идентификатор пациента должен быть корректным UUID"),
	amountKopecks: z
		.number()
		.int()
		.positive("Сумма оплаты должна быть строго больше нуля в копейках"),
	terminalId: z.string().trim().min(1).default("POS-TERM-01"),
	paymentMethodType: z.enum(["pos_card", "sberpay_qr"]).default("pos_card"),
	visitId: z.string().uuid().optional().nullable(),
	documentId: z.string().uuid().optional().nullable(),
	invoiceId: z.string().uuid().optional().nullable(),
	clientMutationId: z.string().trim().min(1).optional().nullable(),
	serviceTitle: z.string().trim().max(128).optional().nullable(),
	medicalServiceCode804n: z.string().trim().max(32).optional().nullable(),
});

export type InitiateSberPosPaymentInput = z.infer<
	typeof initiateSberPosPaymentSchema
>;

export const executeSberPosTransactionSchema = z.object({
	terminalId: z.string().trim().min(1).default("POS-TERM-01"),
	operation: z.string().trim().default("sale"),
	amountKopecks: z.number().int().min(0).default(0),
	orderId: z.string().trim().optional(),
	originalRrn: z.string().trim().optional(),
	originalAuthCode: z.string().trim().optional(),
	patientId: z.string().uuid().optional(),
	visitId: z.string().uuid().optional(),
	invoiceId: z.string().uuid().optional(),
});
