import {
	nonNegativeMoneyRubSchema,
	positiveMoneyRubSchema,
} from "@dental/shared";
import { z } from "zod";

export const familyPaymentSchema = z.object({
	organizationId: z.string().uuid().optional(),
	patientId: z.string().uuid(),
	familyGroupId: z.string().uuid(),
	payerPatientId: z.string().uuid().optional(),
	serviceId: z.string().uuid().optional(),
	catalogItemId: z.string().uuid().optional(),
	discountRub: nonNegativeMoneyRubSchema.optional(),
	discountPercent: z.number().min(0).max(100).refine((val) => typeof val === "number" && Number.isFinite(val) && !Number.isNaN(val)).optional(),
	amountRub: positiveMoneyRubSchema,
	documentId: z.string().uuid().optional(),
	visitId: z.string().uuid().optional(),
	clientMutationId: z.string().min(1).max(128).optional(),
});

export const familyRefundSchema = z.object({
	familyGroupId: z.string().uuid(),
	amountRub: positiveMoneyRubSchema,
	patientId: z.string().uuid().optional(),
	cashBoxId: z.string().uuid().optional(),
	operatorId: z.string().uuid().optional(),
	method: z.enum(["cash", "card", "bank_transfer", "other"]).default("cash"),
	reason: z.string().trim().max(500).optional(),
	clientMutationId: z.string().min(1).max(128).optional(),
});

export const familyTopupSchema = z.object({
	familyGroupId: z.string().uuid(),
	amountRub: positiveMoneyRubSchema.refine((value) => value <= 10_000_000, {
		message: "сумма одного пополнения не может превышать 10 000 000 ₽",
	}),
	patientId: z.string().uuid(),
	method: z.enum(["cash", "card", "bank_transfer", "online", "other"]).default("cash"),
	comment: z.string().trim().max(500).optional(),
	clientMutationId: z.string().min(1).max(128).optional(),
});

export const createFamilyGroupSchema = z.object({
	name: z.string().min(1),
	headPatientId: z.string().uuid().optional(),
});

export const updateFamilyGroupSchema = z.object({
	name: z.string().min(1).optional(),
	headPatientId: z.string().uuid().nullable().optional(),
});

export class FamilyFinanceError extends Error {
	constructor(
		message: string,
		public statusCode: number,
	) {
		super(message);
		this.name = "FamilyFinanceError";
	}
}
