import { calculateCashbackPoints, calculateMaxRedeemablePoints } from "@dental/shared";
import { and, desc, eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireClinicalReadAccess } from "../accessGuard.js";
import { requireOrganizationId } from "../security/identity.js";
import { db } from "../db/client.js";
import { withTenantCtx } from "../db/rls.js";
import {
	bonusTransactions,
	loyaltyPrograms,
	patientBonusBalances,
	patients,
} from "../db/schema.js";

const redeemPointsBodySchema = z.object({
	patientId: z.string().uuid(),
	invoiceId: z.string().uuid().optional().nullable(),
	invoiceAmountRub: z.number().positive(),
	pointsToRedeem: z.number().positive(),
	clientMutationId: z.string().optional(),
	description: z.string().default("Списание баллов в счет оплаты лечения"),
});

const manualAccrueBodySchema = z.object({
	patientId: z.string().uuid(),
	amountPoints: z.number().positive(),
	description: z.string().min(1),
	expiresInDays: z.number().int().positive().optional().default(180),
});

export async function registerLoyaltyRoutes(app: FastifyInstance) {
	/**
	 * Получение баланса баллов и текущего уровня лояльности пациента.
	 */
	app.get(
		"/api/loyalty/balance/:patientId",
		async (request, reply) => {
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const { patientId } = request.params as { patientId: string };

			return withTenantCtx(orgId, async () => {
				const [patient] = await db
					.select({ id: patients.id, fullName: patients.fullName })
					.from(patients)
					.where(and(eq(patients.organizationId, orgId), eq(patients.id, patientId)))
					.limit(1);

				if (!patient) {
					return reply.status(404).send({ message: "Пациент не найден" });
				}

				const [balance] = await db
					.select()
					.from(patientBonusBalances)
					.where(
						and(
							eq(patientBonusBalances.organizationId, orgId),
							eq(patientBonusBalances.patientId, patientId),
						),
					)
					.limit(1);

				const activePoints = Number(balance?.activePoints ?? 0);
				const pendingPoints = Number(balance?.pendingPoints ?? 0);
				const lifetimeEarned = Number(balance?.lifetimeEarnedPoints ?? 0);
				const lifetimeSpent = Number(balance?.lifetimeSpentPoints ?? 0);

				return reply.send({
					patientId,
					patientName: patient.fullName,
					activePoints,
					pendingPoints,
					lifetimeEarnedPoints: lifetimeEarned,
					lifetimeSpentPoints: lifetimeSpent,
					tier: "bronze",
					cashbackPercent: 3.0,
					maxInvoiceCoveragePercent: 30.0,
					pointRateRub: 1.0,
				});
			});
		},
	);

	/**
	 * История начислений и списаний баллов пациента.
	 */
	app.get(
		"/api/loyalty/transactions/:patientId",
		async (request, reply) => {
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const { patientId } = request.params as { patientId: string };

			return withTenantCtx(orgId, async () => {
				const rows = await db
					.select()
					.from(bonusTransactions)
					.where(
						and(
							eq(bonusTransactions.organizationId, orgId),
							eq(bonusTransactions.patientId, patientId),
						),
					)
					.orderBy(desc(bonusTransactions.createdAt))
					.limit(100);

				return reply.send({
					patientId,
					transactions: rows.map((r) => ({
						id: r.id,
						amountPoints: Number(r.amountPoints),
						balanceAfterPoints: Number(r.balanceAfterPoints),
						type: r.type,
						description: r.description,
						expiresAt: r.expiresAt?.toISOString() || null,
						createdAt: r.createdAt.toISOString(),
					})),
				});
			});
		},
	);

	/**
	 * Ручное начисление баллов пациенту (подарок, компенсация, приветственный бонус).
	 */
	app.post(
		"/api/loyalty/accrue",
		async (request, reply) => {
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const parsed = manualAccrueBodySchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.status(400).send({
					message: "Некорректные параметры начисления",
					errors: parsed.error.format(),
				});
			}

			const { patientId, amountPoints, description, expiresInDays } = parsed.data;

			return withTenantCtx(orgId, async () => {
				const expiresAt = new Date();
				expiresAt.setDate(expiresAt.getDate() + expiresInDays);

				// Upsert patient bonus balance
				const [existingBalance] = await db
					.select()
					.from(patientBonusBalances)
					.where(
						and(
							eq(patientBonusBalances.organizationId, orgId),
							eq(patientBonusBalances.patientId, patientId),
						),
					)
					.limit(1);

				const currentActive = Number(existingBalance?.activePoints ?? 0);
				const currentLifetime = Number(existingBalance?.lifetimeEarnedPoints ?? 0);
				const newActive = Number((currentActive + amountPoints).toFixed(2));
				const newLifetime = Number((currentLifetime + amountPoints).toFixed(2));

				if (existingBalance) {
					await db
						.update(patientBonusBalances)
						.set({
							activePoints: String(newActive),
							lifetimeEarnedPoints: String(newLifetime),
							updatedAt: new Date(),
						})
						.where(
							and(
								eq(patientBonusBalances.organizationId, orgId),
								eq(patientBonusBalances.patientId, patientId),
							),
						);
				} else {
					await db.insert(patientBonusBalances).values({
						organizationId: orgId,
						patientId,
						activePoints: String(newActive),
						lifetimeEarnedPoints: String(newLifetime),
					});
				}

				const [txRecord] = await db
					.insert(bonusTransactions)
					.values({
						organizationId: orgId,
						patientId,
						amountPoints: String(amountPoints),
						balanceAfterPoints: String(newActive),
						type: "accrual_manual_admin",
						description,
						expiresAt,
						unspentPoints: String(amountPoints),
					})
					.returning();

				return reply.status(201).send({
					success: true,
					activePoints: newActive,
					transaction: {
						id: txRecord?.id || "manual-accrual",
						amountPoints,
						balanceAfterPoints: newActive,
						description,
					},
				});
			});
		},
	);

	/**
	 * Списание баллов в счет оплаты счета (Redemption).
	 */
	app.post(
		"/api/loyalty/redeem",
		async (request, reply) => {
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const parsed = redeemPointsBodySchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.status(400).send({
					message: "Некорректные параметры списания баллов",
					errors: parsed.error.format(),
				});
			}

			const {
				patientId,
				invoiceId,
				invoiceAmountRub,
				pointsToRedeem,
				clientMutationId,
				description,
			} = parsed.data;

			return withTenantCtx(orgId, async () => {
				const [balance] = await db
					.select()
					.from(patientBonusBalances)
					.where(
						and(
							eq(patientBonusBalances.organizationId, orgId),
							eq(patientBonusBalances.patientId, patientId),
						),
					)
					.limit(1);

				const activePoints = Number(balance?.activePoints ?? 0);
				const coverage = calculateMaxRedeemablePoints(invoiceAmountRub, activePoints);

				if (pointsToRedeem > coverage.maxAllowedPoints) {
					return reply.status(400).send({
						message: `Превышен лимит списания баллов. Максимально допустимо: ${coverage.maxAllowedPoints} баллов (30% чека).`,
						maxAllowedPoints: coverage.maxAllowedPoints,
					});
				}

				const currentLifetimeSpent = Number(balance?.lifetimeSpentPoints ?? 0);
				const newActivePoints = Number((activePoints - pointsToRedeem).toFixed(2));
				const newLifetimeSpent = Number(
					(currentLifetimeSpent + pointsToRedeem).toFixed(2),
				);

				await db
					.update(patientBonusBalances)
					.set({
						activePoints: String(newActivePoints),
						lifetimeSpentPoints: String(newLifetimeSpent),
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(patientBonusBalances.organizationId, orgId),
							eq(patientBonusBalances.patientId, patientId),
						),
					);

				const [txRecord] = await db
					.insert(bonusTransactions)
					.values({
						organizationId: orgId,
						patientId,
						amountPoints: String(-pointsToRedeem),
						balanceAfterPoints: String(newActivePoints),
						type: "redemption_payment",
						relatedInvoiceId: invoiceId || null,
						clientMutationId: clientMutationId || null,
						description,
					})
					.returning();

				return reply.status(200).send({
					success: true,
					redeemedPoints: pointsToRedeem,
					discountRub: pointsToRedeem, // 1 point = 1 RUB
					remainingInvoicePaymentRub: Number(
						(invoiceAmountRub - pointsToRedeem).toFixed(2),
					),
					newActivePoints,
					transactionId: txRecord?.id || "redemption",
				});
			});
		},
	);
}
