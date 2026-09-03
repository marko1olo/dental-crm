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
	patientInvoices,
	patients,
} from "../db/schema.js";

const redeemPointsBodySchema = z.object({
	patientId: z.string().uuid(),
	invoiceId: z.string().uuid().optional().nullable(),
	invoiceAmountRub: z.number().positive(),
	pointsToRedeem: z.number().positive(),
	allowFullCoverage: z.boolean().optional().default(true),
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

				const result = await db.transaction(async (tx) => {
					// Verify patient exists and lock row to prevent race conditions
					const [patient] = await tx
						.select({ id: patients.id, fullName: patients.fullName })
						.from(patients)
						.where(and(eq(patients.organizationId, orgId), eq(patients.id, patientId)))
						.limit(1)
						.for("update");

					if (!patient) {
						return { notFound: true as const };
					}

					// Lock and retrieve patient bonus balance row
					const [existingBalance] = await tx
						.select()
						.from(patientBonusBalances)
						.where(
							and(
								eq(patientBonusBalances.organizationId, orgId),
								eq(patientBonusBalances.patientId, patientId),
							),
						)
						.limit(1)
						.for("update");

					const currentActive = Number(existingBalance?.activePoints ?? 0);
					const currentLifetime = Number(existingBalance?.lifetimeEarnedPoints ?? 0);
					const newActive = Number((currentActive + amountPoints).toFixed(2));
					const newLifetime = Number((currentLifetime + amountPoints).toFixed(2));

					if (existingBalance) {
						await tx
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
						await tx.insert(patientBonusBalances).values({
							organizationId: orgId,
							patientId,
							activePoints: String(newActive),
							lifetimeEarnedPoints: String(newLifetime),
						});
					}

					const [txRecord] = await tx
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

					return {
						success: true as const,
						activePoints: newActive,
						transaction: {
							id: txRecord?.id || "manual-accrual",
							amountPoints,
							balanceAfterPoints: newActive,
							description,
						},
					};
				});

				if ("notFound" in result) {
					return reply.status(404).send({ message: "Пациент не найден" });
				}

				return reply.status(201).send(result);
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
				const result = await db.transaction(async (tx) => {
					// Verify patient exists and lock row
					const [patient] = await tx
						.select({ id: patients.id })
						.from(patients)
						.where(and(eq(patients.organizationId, orgId), eq(patients.id, patientId)))
						.limit(1)
						.for("update");

					if (!patient) {
						return { notFound: true as const };
					}

					// Lock patient balance row to prevent double spending
					const [balance] = await tx
						.select()
						.from(patientBonusBalances)
						.where(
							and(
								eq(patientBonusBalances.organizationId, orgId),
								eq(patientBonusBalances.patientId, patientId),
							),
						)
						.limit(1)
						.for("update");

					// Validate invoice if provided to prevent fraud
					let effectiveInvoiceAmountRub = invoiceAmountRub;
					if (invoiceId) {
						const [invoice] = await tx
							.select()
							.from(patientInvoices)
							.where(
								and(
									eq(patientInvoices.id, invoiceId),
									eq(patientInvoices.organizationId, orgId),
								),
							)
							.for("update")
							.limit(1);

						if (!invoice || invoice.patientId !== patientId) {
							return {
								invalidInvoice: true as const,
								message:
									"Счёт на оплату не найден или принадлежит другому пациенту",
								code: 404,
							};
						}
						if (invoice.status === "paid" || invoice.status === "refunded") {
							return {
								invalidInvoice: true as const,
								message:
									"Нельзя списать баллы в счет уже оплаченного или отмененного счета",
								code: 409,
							};
						}
						effectiveInvoiceAmountRub = Number(invoice.totalRub);
					}

					const activePoints = Number(balance?.activePoints ?? 0);
					const maxCoveragePercent = parsed.data.allowFullCoverage !== false ? 100 : 30;
					const coverage = calculateMaxRedeemablePoints(
						effectiveInvoiceAmountRub,
						activePoints,
						maxCoveragePercent,
					);

					if (pointsToRedeem > coverage.maxAllowedPoints) {
						return {
							limitExceeded: true as const,
							maxAllowedPoints: coverage.maxAllowedPoints,
						};
					}

					if (pointsToRedeem > activePoints) {
						return {
							insufficientPoints: true as const,
							activePoints,
						};
					}

					const currentLifetimeSpent = Number(balance?.lifetimeSpentPoints ?? 0);
					const newActivePoints = Number((activePoints - pointsToRedeem).toFixed(2));
					const newLifetimeSpent = Number(
						(currentLifetimeSpent + pointsToRedeem).toFixed(2),
					);

					await tx
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

					const [txRecord] = await tx
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

					return {
						success: true as const,
						redeemedPoints: pointsToRedeem,
						discountRub: pointsToRedeem, // 1 point = 1 RUB
						remainingInvoicePaymentRub: Number(
							(effectiveInvoiceAmountRub - pointsToRedeem).toFixed(2),
						),
						newActivePoints,
						transactionId: txRecord?.id || "redemption",
					};
				});

				if ("notFound" in result) {
					return reply.status(404).send({ message: "Пациент не найден" });
				}

				if ("invalidInvoice" in result) {
					const statusCode = typeof result.code === "number" ? result.code : 400;
					return reply.status(statusCode).send({ message: result.message });
				}

				if ("limitExceeded" in result) {
					return reply.status(400).send({
						message: `Превышена допустимая сумма списания баллов (максимально допустимо: ${result.maxAllowedPoints} баллов).`,
						maxAllowedPoints: result.maxAllowedPoints,
					});
				}

				if ("insufficientPoints" in result) {
					return reply.status(400).send({
						message: `Недостаточно бонусных баллов (доступно: ${result.activePoints}).`,
						activePoints: result.activePoints,
					});
				}

				return reply.status(200).send(result);
			});
		},
	);
}
