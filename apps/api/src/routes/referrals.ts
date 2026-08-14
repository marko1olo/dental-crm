import { and, desc, eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireOrganizationId } from "../security/identity.js";
import { db } from "../db/client.js";
import { withTenantCtx } from "../db/rls.js";
import {
	bonusTransactions,
	patientBonusBalances,
	patientReferralCodes,
	patientReferrals,
	patients,
	referralCampaigns,
} from "../db/schema.js";

const attributeReferralBodySchema = z.object({
	refereePatientId: z.string().uuid(),
	referralCode: z.string().min(3).max(50),
});

const rewardFirstVisitBodySchema = z.object({
	refereePatientId: z.string().uuid(),
	paymentId: z.string().uuid().optional(),
	paidAmountRub: z.number().positive(),
});

function generateReferralCode(fullName: string): string {
	const parts = fullName.trim().split(/\s+/);
	const firstName = parts[0] || "FRIEND";
	const sanitized = firstName
		.toUpperCase()
		.replace(/[^A-ZА-Я0-9]/gi, "")
		.slice(0, 8);
	const randomNum = Math.floor(1000 + Math.random() * 9000);
	return `DENTE-${sanitized || "FRIEND"}-${randomNum}`;
}

export async function registerReferralRoutes(app: FastifyInstance) {
	/**
	 * Получение или создание персонального реферального кода пациента и ссылки для отправки в WhatsApp / Telegram.
	 */
	app.get(
		"/api/referrals/my-code/:patientId",
		async (request, reply) => {
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const { patientId } = request.params as { patientId: string };

			return withTenantCtx(orgId, async () => {
				const [patient] = await db
					.select({ id: patients.id, fullName: patients.fullName, phone: patients.phone })
					.from(patients)
					.where(and(eq(patients.organizationId, orgId), eq(patients.id, patientId)))
					.limit(1);

				if (!patient) {
					return reply.status(404).send({ message: "Пациент не найден" });
				}

				let [refRecord] = await db
					.select()
					.from(patientReferralCodes)
					.where(
						and(
							eq(patientReferralCodes.organizationId, orgId),
							eq(patientReferralCodes.patientId, patientId),
						),
					)
					.limit(1);

				if (!refRecord) {
					const code = generateReferralCode(patient.fullName);
					const token = Buffer.from(`${patientId}-${Date.now()}`).toString("base64url");
					[refRecord] = await db
						.insert(patientReferralCodes)
						.values({
							organizationId: orgId,
							patientId,
							referralCode: code,
							referralToken: token,
						})
						.returning();
				}

				const refCode = refRecord?.referralCode || `DENTE-${patientId.slice(0, 6).toUpperCase()}`;
				const refToken = refRecord?.referralToken || "";
				const inviteUrl = `https://dente.pro/invite/${refCode}`;
				const shareText = `Привет! Дарю тебе 500 ₽ на первый визит в стоматологию DENTE. Запишись по ссылке: ${inviteUrl}`;

				return reply.send({
					patientId,
					referralCode: refCode,
					referralToken: refToken,
					inviteUrl,
					shareText,
					stats: {
						clickCount: refRecord?.clickCount ?? 0,
						signupCount: refRecord?.signupCount ?? 0,
						convertedCount: refRecord?.convertedCount ?? 0,
					},
				});
			});
		},
	);

	/**
	 * Привязка нового пациента к пригласившему (Реферальная атрибуция).
	 */
	app.post(
		"/api/referrals/attribute",
		async (request, reply) => {
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const parsed = attributeReferralBodySchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.status(400).send({
					message: "Некорректные параметры атрибуции",
					errors: parsed.error.format(),
				});
			}

			const { refereePatientId, referralCode } = parsed.data;

			return withTenantCtx(orgId, async () => {
				const [codeRecord] = await db
					.select()
					.from(patientReferralCodes)
					.where(
						and(
							eq(patientReferralCodes.organizationId, orgId),
							eq(patientReferralCodes.referralCode, referralCode.trim().toUpperCase()),
						),
					)
					.limit(1);

				if (!codeRecord) {
					return reply.status(404).send({ message: "Реферальный код не найден" });
				}

				if (codeRecord.patientId === refereePatientId) {
					return reply.status(400).send({
						message: "Нельзя применить собственный реферальный код",
					});
				}

				// Check if already attributed
				const [existingReferral] = await db
					.select()
					.from(patientReferrals)
					.where(
						and(
							eq(patientReferrals.organizationId, orgId),
							eq(patientReferrals.refereePatientId, refereePatientId),
						),
					)
					.limit(1);

				if (existingReferral) {
					return reply.status(409).send({
						message: "Пациент уже привязан к реферальной программе",
					});
				}

				// Check if referrer has a parent referrer (Tier 2)
				const [parentReferrer] = await db
					.select()
					.from(patientReferrals)
					.where(
						and(
							eq(patientReferrals.organizationId, orgId),
							eq(patientReferrals.refereePatientId, codeRecord.patientId),
						),
					)
					.limit(1);

				const [referral] = await db
					.insert(patientReferrals)
					.values({
						organizationId: orgId,
						referrerPatientId: codeRecord.patientId,
						parentReferrerPatientId: parentReferrer?.referrerPatientId || null,
						refereePatientId,
						status: "registered",
					})
					.returning();

				// Increment code signup count
				await db
					.update(patientReferralCodes)
					.set({ signupCount: sql`${patientReferralCodes.signupCount} + 1` })
					.where(eq(patientReferralCodes.id, codeRecord.id));

				return reply.status(201).send({
					success: true,
					referralId: referral?.id || "referral-attributed",
					referrerPatientId: codeRecord.patientId,
				});
			});
		},
	);

	/**
	 * Начисление реферального бонуса при первой оплате приглашённого пациента.
	 */
	app.post(
		"/api/referrals/reward-first-visit",
		async (request, reply) => {
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const parsed = rewardFirstVisitBodySchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.status(400).send({
					message: "Некорректные параметры вознаграждения",
					errors: parsed.error.format(),
				});
			}

			const { refereePatientId, paymentId, paidAmountRub } = parsed.data;

			return withTenantCtx(orgId, async () => {
				const [referral] = await db
					.select()
					.from(patientReferrals)
					.where(
						and(
							eq(patientReferrals.organizationId, orgId),
							eq(patientReferrals.refereePatientId, refereePatientId),
							eq(patientReferrals.status, "registered"),
						),
					)
					.limit(1);

				if (!referral) {
					return reply.status(404).send({
						message: "Активная реферальная привязка со статусом 'registered' не найдена",
					});
				}

				const minSpend = 1500;
				if (paidAmountRub < minSpend) {
					return reply.status(200).send({
						rewarded: false,
						message: `Сумма первого чека (${paidAmountRub} ₽) меньше порога активации бонуса (${minSpend} ₽)`,
					});
				}

				// Award Level 1 Referrer (+1000 points)
				const referrerL1Points = 1000;
				const [ref1Balance] = await db
					.select()
					.from(patientBonusBalances)
					.where(
						and(
							eq(patientBonusBalances.organizationId, orgId),
							eq(patientBonusBalances.patientId, referral.referrerPatientId),
						),
					)
					.limit(1);

				const currentL1Active = Number(ref1Balance?.activePoints ?? 0);
				const currentL1Lifetime = Number(ref1Balance?.lifetimeEarnedPoints ?? 0);
				const newL1Active = Number((currentL1Active + referrerL1Points).toFixed(2));
				const newL1Lifetime = Number((currentL1Lifetime + referrerL1Points).toFixed(2));

				if (ref1Balance) {
					await db
						.update(patientBonusBalances)
						.set({
							activePoints: String(newL1Active),
							lifetimeEarnedPoints: String(newL1Lifetime),
							updatedAt: new Date(),
						})
						.where(eq(patientBonusBalances.id, ref1Balance.id));
				} else {
					await db.insert(patientBonusBalances).values({
						organizationId: orgId,
						patientId: referral.referrerPatientId,
						activePoints: String(newL1Active),
						lifetimeEarnedPoints: String(newL1Lifetime),
					});
				}

				await db.insert(bonusTransactions).values({
					organizationId: orgId,
					patientId: referral.referrerPatientId,
					amountPoints: String(referrerL1Points),
					balanceAfterPoints: String(newL1Active),
					type: "accrual_referral_l1",
					relatedPaymentId: paymentId || null,
					relatedReferralId: referral.id,
					description: "Бонус за первую оплату лечения приглашённого друга (+1000 ₽)",
					unspentPoints: String(referrerL1Points),
				});

				// Award Level 2 Referrer (+300 points) if exists
				if (referral.parentReferrerPatientId) {
					const referrerL2Points = 300;
					const [ref2Balance] = await db
						.select()
						.from(patientBonusBalances)
						.where(
							and(
								eq(patientBonusBalances.organizationId, orgId),
								eq(patientBonusBalances.patientId, referral.parentReferrerPatientId),
							),
						)
						.limit(1);

					const currentL2Active = Number(ref2Balance?.activePoints ?? 0);
					const currentL2Lifetime = Number(ref2Balance?.lifetimeEarnedPoints ?? 0);
					const newL2Active = Number((currentL2Active + referrerL2Points).toFixed(2));
					const newL2Lifetime = Number((currentL2Lifetime + referrerL2Points).toFixed(2));

					if (ref2Balance) {
						await db
							.update(patientBonusBalances)
							.set({
								activePoints: String(newL2Active),
								lifetimeEarnedPoints: String(newL2Lifetime),
								updatedAt: new Date(),
							})
							.where(eq(patientBonusBalances.id, ref2Balance.id));
					} else {
						await db.insert(patientBonusBalances).values({
							organizationId: orgId,
							patientId: referral.parentReferrerPatientId,
							activePoints: String(newL2Active),
							lifetimeEarnedPoints: String(newL2Lifetime),
						});
					}

					await db.insert(bonusTransactions).values({
						organizationId: orgId,
						patientId: referral.parentReferrerPatientId,
						amountPoints: String(referrerL2Points),
						balanceAfterPoints: String(newL2Active),
						type: "accrual_referral_l2",
						relatedPaymentId: paymentId || null,
						relatedReferralId: referral.id,
						description: "Бонус 2-го уровня за визит друга вашего друга (+300 ₽)",
						unspentPoints: String(referrerL2Points),
					});
				}

				// Update referral status to rewarded
				await db
					.update(patientReferrals)
					.set({
						status: "rewarded",
						qualifyingPaymentId: paymentId || null,
						qualifyingAmountRub: String(paidAmountRub),
						rewardedAt: new Date(),
						updatedAt: new Date(),
					})
					.where(eq(patientReferrals.id, referral.id));

				return reply.status(200).send({
					success: true,
					rewarded: true,
					referrerTier1RewardedPoints: referrerL1Points,
					referrerTier2RewardedPoints: referral.parentReferrerPatientId ? 300 : 0,
				});
			});
		},
	);
}
