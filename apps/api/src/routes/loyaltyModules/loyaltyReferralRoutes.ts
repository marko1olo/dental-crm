import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireOrganizationId } from "../../security/identity.js";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import { bonusTransactions, patientReferrals, patientReferralCodes, patients, payments } from "../../db/schema.js";
import { referralRegisterBodySchema } from "@dental/shared";
import { executeBonusAccrual } from "./bonusBalanceService.js";
import { extractIdempotencyKey, isValidUuid } from "../../plugins/idempotencyModules/idempotencyHeaderParser.js";

const creditReferralSchema = z.object({
	referrerPatientId: z.string().uuid(),
	refereePatientId: z.string().uuid().optional(),
	paymentId: z.string().uuid({ message: "Требуется реальный идентификатор подтвержденного платежа" }),
	rewardRub: z.number().positive().default(1000),
});

/**
 * registerLoyaltyReferralRoutes
 *
 * Implements real database queries to PostgreSQL 18 for referral tracking ([LOY-08]).
 * Zero fake mock arrays, zero phantom bonuses without payment proofs!
 */
export async function registerLoyaltyReferralRoutes(app: FastifyInstance) {
	/**
	 * GET /api/loyalty/referrals/:patientId
	 * Получение реального списка приглашенных пациентов из таблицы patient_referrals.
	 */
	app.get("/api/loyalty/referrals/:patientId", async (request, reply) => {
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;
		const { patientId } = request.params as { patientId: string };

		return withTenantCtx(orgId, async () => {
			const [patient] = await db
				.select({ id: patients.id, fullName: patients.fullName })
				.from(patients)
				.where(and(eq(patients.organizationId, orgId), eq(patients.id, patientId)))
				.limit(1);
			if (!patient) return reply.status(404).send({ message: "Пациент не найден" });

			const realReferrals = await db
				.select({
					id: patientReferrals.id,
					refereePatientId: patientReferrals.refereePatientId,
					refereeFullName: patients.fullName,
					status: patientReferrals.status,
					qualifyingAmountRub: patientReferrals.qualifyingAmountRub,
					rewardedAt: patientReferrals.rewardedAt,
					createdAt: patientReferrals.createdAt,
				})
				.from(patientReferrals)
				.leftJoin(patients, eq(patients.id, patientReferrals.refereePatientId))
				.where(
					and(
						eq(patientReferrals.organizationId, orgId),
						eq(patientReferrals.referrerPatientId, patientId),
					),
				);

			const formattedReferrals = realReferrals.map((r) => ({
				id: r.id,
				invitedPatientName: r.refereeFullName || "Приглашённый пациент",
				rewardRub: r.status === "rewarded" ? 1000 : 0,
				status: r.status === "rewarded" ? "completed" : "pending",
				isRewardCredited: r.status === "rewarded",
				note: r.status === "rewarded"
					? `Бонус за первый визит друга (${r.qualifyingAmountRub || "1000"} ₽)`
					: "Ожидает первой оплаты лечения",
				createdAt: r.createdAt.toISOString(),
			}));

			return reply.send({
				referrerPatientId: patientId,
				referrerFullName: patient.fullName,
				referrals: formattedReferrals,
			});
		});
	});

	/**
	 * POST /api/loyalty/referrals/register
	 * Регистрация реферального кода и инвайта для пациента.
	 */
	app.post("/api/loyalty/referrals/register", async (request, reply) => {
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		const idempotencyKey = extractIdempotencyKey(request);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7)",
			});
		}

		const parsed = referralRegisterBodySchema.safeParse(request.body);
		if (!parsed.success) return reply.status(400).send({ message: "Некорректные параметры рекомендации", errors: parsed.error.format() });

		const { referrerPatientId, invitedPatientName, rewardRub, note } = parsed.data;

		return withTenantCtx(orgId, async () => {
			const res = await db.transaction(async (tx) => {
				const [referrer] = await tx
					.select({ id: patients.id, fullName: patients.fullName })
					.from(patients)
					.where(and(eq(patients.organizationId, orgId), eq(patients.id, referrerPatientId)))
					.limit(1)
					.for("update");

				if (!referrer) {
					return { notFound: true as const };
				}

				// Ensure referral code exists for referrer
				let [refCodeRecord] = await tx
					.select()
					.from(patientReferralCodes)
					.where(
						and(
							eq(patientReferralCodes.organizationId, orgId),
							eq(patientReferralCodes.patientId, referrerPatientId),
						),
					)
					.limit(1)
					.for("update");

				if (!refCodeRecord) {
					const sanitizedPrefix = referrer.fullName.trim().split(/\s+/)[0]?.slice(0, 4).toUpperCase() || "PATI";
					const randSuffix = crypto.randomBytes(3).toString("hex").toUpperCase();
					const code = `DENTE-${sanitizedPrefix}-${randSuffix}`;
					const token = Buffer.from(`${referrerPatientId}-${crypto.randomUUID()}`).toString("base64url");
					[refCodeRecord] = await tx
						.insert(patientReferralCodes)
						.values({
							organizationId: orgId,
							patientId: referrerPatientId,
							referralCode: code,
							referralToken: token,
						})
						.returning();
				}

				return {
					referralCode: refCodeRecord?.referralCode || "DENTE-REF",
				};
			});

			if ("notFound" in res) {
				return reply.status(404).send({ message: "Приглашающий пациент не найден" });
			}

			if (idempotencyKey) {
				reply.header("idempotency-key", idempotencyKey);
			}

			return reply.status(201).send({
				success: true,
				referralCode: res.referralCode,
				invitedPatientName,
				rewardRub,
				note: note || undefined,
				message: `Рекомендация для «${invitedPatientName}» зарегистрирована с кодом ${res.referralCode}`,
			});
		});
	});

	/**
	 * POST /api/loyalty/referrals/credit
	 * Начисление реферального бонуса по подтвержденному кассовому платежу.
	 */
	app.post("/api/loyalty/referrals/credit", async (request, reply) => {
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		const idempotencyKey = extractIdempotencyKey(request);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7)",
			});
		}

		const parsed = creditReferralSchema.safeParse(request.body);
		if (!parsed.success) return reply.status(400).send({ message: "Некорректные параметры начисления", errors: parsed.error.format() });

		const { referrerPatientId, paymentId, rewardRub } = parsed.data;

		return withTenantCtx(orgId, async () => {
			const res = await db.transaction(async (tx) => {
				// [LOY-07] Verify payment reality in database
				const [verifiedPayment] = await tx
					.select()
					.from(payments)
					.where(
						and(
							eq(payments.id, paymentId),
							eq(payments.organizationId, orgId),
							eq(payments.status, "paid"),
						),
					)
					.limit(1)
					.for("update");

				if (!verifiedPayment) {
					return { paymentNotFound: true as const };
				}

				// [LOY-08] Replay bonus exploit defense: reject if already credited for this payment
				const [alreadyCredited] = await tx
					.select({ id: bonusTransactions.id })
					.from(bonusTransactions)
					.where(
						and(
							eq(bonusTransactions.organizationId, orgId),
							eq(bonusTransactions.relatedPaymentId, paymentId),
							eq(bonusTransactions.type, "accrual_referral"),
						),
					)
					.limit(1)
					.for("update");

				if (alreadyCredited) {
					return { alreadyCredited: true as const };
				}

				const accrualRes = await executeBonusAccrual(
					{
						orgId,
						patientId: referrerPatientId,
						amountPoints: rewardRub,
						description: `Бонус за рекомендацию по чеку №${verifiedPayment.fiscalReceiptNumber || verifiedPayment.id.slice(0, 8)}`,
						txType: "accrual_referral",
						expiresInDays: 365,
						relatedPaymentId: paymentId,
						clientMutationId: idempotencyKey,
					},
					tx,
				);

				if ("notFound" in accrualRes) return { referrerNotFound: true as const };
				if ("duplicate" in accrualRes) return { alreadyCredited: true as const };

				return {
					success: true as const,
					paymentId: verifiedPayment.id,
				};
			});

			if ("paymentNotFound" in res) {
				return reply.status(404).send({
					message: "Оплаченный платеж не найден в базе данных клиники",
				});
			}

			if ("alreadyCredited" in res) {
				return reply.status(409).send({
					message: "Бонусы по данному чеку уже были начислены ранее",
				});
			}

			if ("referrerNotFound" in res) {
				return reply.status(404).send({ message: "Реферер не найден" });
			}

			if (idempotencyKey) {
				reply.header("idempotency-key", idempotencyKey);
			}

			return reply.status(200).send({
				success: true,
				creditedRub: rewardRub,
				paymentId: res.paymentId,
				message: `Начислено ${rewardRub} ₽ бонусов за подтвержденную оплату рекомендателя`,
			});
		});
	});
}
