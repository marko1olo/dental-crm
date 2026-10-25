import { z } from "zod";

export const redeemPointsBodySchema = z.object({
	patientId: z.string().uuid(),
	invoiceId: z.string().uuid().optional().nullable(),
	invoiceAmountRub: z.number().positive(),
	pointsToRedeem: z.number().positive(),
	allowFullCoverage: z.boolean().optional().default(true),
	clientMutationId: z.string().optional(),
	description: z.string().default("Списание баллов в счет оплаты лечения"),
});

export const manualAccrueBodySchema = z.object({
	patientId: z.string().uuid(),
	amountPoints: z.number().positive(),
	description: z.string().min(1),
	expiresInDays: z.number().int().positive().optional().default(180),
});

export const accrueCashbackBodySchema = z.object({
	patientId: z.string().uuid(),
	paidAmountRub: z.number().positive(),
	invoiceId: z.string().uuid().optional().nullable(),
	paymentId: z.string().uuid().optional().nullable(),
	cashbackPercent: z.number().nonnegative().optional().default(3.0),
	pointRateRub: z.number().positive().optional().default(1.0),
	description: z.string().optional().default("Кэшбэк за оплату стоматологических услуг"),
	expiresInDays: z.number().int().positive().optional().default(180),
});

export const familyDebitBodySchema = z.object({
	sponsorPatientId: z.string().uuid(),
	targetPatientId: z.string().uuid(),
	pointsToDebit: z.number().positive(),
	description: z.string().default("Списание из семейного кошелька"),
});

export const referralRegisterBodySchema = z.object({
	referrerPatientId: z.string().uuid(),
	invitedPatientName: z.string().min(2),
	invitedPatientPhone: z.string().optional(),
	rewardRub: z.number().positive().default(1000),
	note: z.string().optional(),
});
