/**
 * packages/shared/src/finance/loyaltySchemas.ts
 *
 * Canonical Loyalty Program Zod Validation Schemas (SSOT).
 * Governed by Mandate 8b (Integer Math), Mandate 8e, and [LOY-01] Strict Coverage Ceiling.
 */

import { z } from "zod";

export const redeemPointsBodySchema = z.object({
	patientId: z.string().uuid(),
	invoiceId: z.string().uuid().optional().nullable(),
	invoiceAmountRub: z.number().positive().finite().multipleOf(0.01),
	pointsToRedeem: z.number().positive().finite().multipleOf(0.01),
	/**
	 * [LOY-01] allowFullCoverage defaults strictly to FALSE.
	 * 100% coverage requires an explicit doctor/executive override.
	 */
	allowFullCoverage: z.boolean().optional().default(false),
	clientMutationId: z.string().optional(),
	description: z.string().default("Списание баллов в счет оплаты лечения"),
});

export type RedeemPointsBody = z.infer<typeof redeemPointsBodySchema>;

export const manualAccrueBodySchema = z.object({
	patientId: z.string().uuid(),
	amountPoints: z.number().positive().finite().multipleOf(0.01),
	description: z.string().min(1),
	expiresInDays: z.number().int().positive().optional().default(180),
});

export type ManualAccrueBody = z.infer<typeof manualAccrueBodySchema>;

export const accrueCashbackBodySchema = z.object({
	patientId: z.string().uuid(),
	paidAmountRub: z.number().positive().finite().multipleOf(0.01),
	invoiceId: z.string().uuid().optional().nullable(),
	paymentId: z.string().uuid().optional().nullable(),
	cashbackPercent: z.number().nonnegative().finite().max(100).optional().default(3.0),
	pointRateRub: z.number().positive().finite().multipleOf(0.01).optional().default(1.0),
	description: z.string().optional().default("Кэшбэк за оплату стоматологических услуг"),
	expiresInDays: z.number().int().positive().optional().default(180),
});

export type AccrueCashbackBody = z.infer<typeof accrueCashbackBodySchema>;

export const familyDebitBodySchema = z.object({
	sponsorPatientId: z.string().uuid(),
	targetPatientId: z.string().uuid(),
	pointsToDebit: z.number().positive().finite().multipleOf(0.01),
	description: z.string().default("Списание из семейного кошелька"),
});

export type FamilyDebitBody = z.infer<typeof familyDebitBodySchema>;

export const referralRegisterBodySchema = z.object({
	referrerPatientId: z.string().uuid(),
	invitedPatientName: z.string().min(2),
	invitedPatientPhone: z.string().optional(),
	rewardRub: z.number().positive().finite().multipleOf(0.01).default(1000),
	note: z.string().optional(),
});

export type ReferralRegisterBody = z.infer<typeof referralRegisterBodySchema>;
