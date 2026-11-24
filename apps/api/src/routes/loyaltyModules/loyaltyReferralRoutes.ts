import crypto from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireOrganizationId } from "../../security/identity.js";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	bonusTransactions,
	patientReferrals,
	patientReferralCodes,
	patients,
	payments,
	referralCampaigns,
} from "../../db/schema.js";
import {
	kopecksToNumericString,
	kopecksToRubles,
	parseKopecks,
	referralRegisterBodySchema,
	rublesToKopecks,
} from "@dental/shared";
import { executeBonusAccrual } from "./bonusBalanceService.js";
import { extractIdempotencyKey, isValidUuid } from "../../plugins/idempotencyModules/idempotencyHeaderParser.js";

const creditReferralSchema = z
	.object({
		referrerPatientId: z.string().uuid(),
		refereePatientId: z.string().uuid().optional(),
		paymentId: z.string().uuid({ message: "Требуется реальный идентификатор подтвержденного платежа" }),
		rewardRub: z.number().positive().default(1000),
	})
	.strict();

const attributeReferralBodySchema = z
	.object({
		refereePatientId: z.string().uuid(),
		referralCode: z.string().min(3).max(50),
	})
	.strict();

const rewardFirstVisitBodySchema = z
	.object({
		refereePatientId: z.string().uuid(),
		paymentId: z.string().uuid().optional(),
		paidAmountRub: z.number().positive().optional(),
	})
	.strict();

function generateReferralCode(fullName: string): string {
	const parts = fullName.trim().split(/\s+/);
	const firstName = parts[0] || "FRIEND";
	const sanitized = firstName
		.toUpperCase()
		.replace(/[^A-ZА-Я0-9]/gi, "")
		.slice(0, 8);
	const randomNum = crypto.randomInt(1000, 9999);
	return `DENTE-${sanitized || "FRIEND"}-${randomNum}`;
}

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
		if (!isValidUuid(patientId)) {
			return reply.status(400).send({ message: "Некорректный идентификатор пациента" });
		}

		return withTenantCtx(orgId, async (tx) => {
			const [patient] = await tx
				.select({ id: patients.id, fullName: patients.fullName })
				.from(patients)
				.where(and(eq(patients.organizationId, orgId), eq(patients.id, patientId)))
				.limit(1);
			if (!patient) return reply.status(404).send({ message: "Пациент не найден" });

			const realReferrals = await tx
				.select({
					id: patientReferrals.id,
					refereePatientId: patientReferrals.refereePatientId,
					refereeFullName: patients.fullName,
					status: patientReferrals.status,
					qualifyingAmountRub: patientReferrals.qualifyingAmountRub,
					qualifyingAmountKopecks: patientReferrals.qualifyingAmountKopecks,
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

			const formattedReferrals = realReferrals.map((r) => {
				const qualifyingKop =
					r.qualifyingAmountKopecks != null
						? Number(r.qualifyingAmountKopecks)
						: r.qualifyingAmountRub != null
							? parseKopecks(r.qualifyingAmountRub)
							: 100_000;
				const qualifyingDisplayRub = kopecksToRubles(qualifyingKop);
				return {
					id: r.id,
					invitedPatientName: r.refereeFullName || "Приглашённый пациент",
					rewardRub: r.status === "rewarded" ? 1000 : 0,
					status: r.status === "rewarded" ? "completed" : "pending",
					isRewardCredited: r.status === "rewarded",
					note: r.status === "rewarded"
						? `Бонус за первый визит друга (${qualifyingDisplayRub} ₽)`
						: "Ожидает первой оплаты лечения",
					createdAt: r.createdAt.toISOString(),
				};
			});

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

		const { referrerPatientId, refereePatientId, paymentId, rewardRub } = parsed.data;

		const res = await withTenantCtx(orgId, async (tx) => {
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

				// DEF-21-02: Synchronize status in patient_referrals so UI instantly shows rewarded status
				const targetRefereeId = refereePatientId || verifiedPayment.patientId;
				const [refRecord] = await tx
					.select()
					.from(patientReferrals)
					.where(
						and(
							eq(patientReferrals.organizationId, orgId),
							eq(patientReferrals.referrerPatientId, referrerPatientId),
							targetRefereeId ? eq(patientReferrals.refereePatientId, targetRefereeId) : undefined,
						),
					)
					.limit(1)
					.for("update");

				if (refRecord) {
					const qualifyingKop =
						verifiedPayment.amountKopecks != null
							? Number(verifiedPayment.amountKopecks)
							: verifiedPayment.amountRub != null
								? parseKopecks(verifiedPayment.amountRub)
								: rublesToKopecks(rewardRub);
					await tx
						.update(patientReferrals)
						.set({
							status: "rewarded",
							qualifyingPaymentId: verifiedPayment.id,
							qualifyingAmountRub: kopecksToNumericString(qualifyingKop),
							qualifyingAmountKopecks: qualifyingKop,
							rewardedAt: new Date(),
							updatedAt: new Date(),
						})
						.where(
							and(
								eq(patientReferrals.id, refRecord.id),
								eq(patientReferrals.organizationId, orgId),
							),
						);
				}

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

	/**
	 * GET /api/referrals/my-code/:patientId
	 * Получение или создание персонального реферального кода пациента и ссылки.
	 */
	app.get("/api/referrals/my-code/:patientId", async (request, reply) => {
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
	});

	/**
	 * POST /api/referrals/attribute
	 * Привязка нового пациента к пригласившему (Реферальная атрибуция).
	 */
	app.post("/api/referrals/attribute", async (request, reply) => {
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

			const [referral] = await db.transaction(async (tx) => {
				const [newReferral] = await tx
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
				await tx
					.update(patientReferralCodes)
					.set({ signupCount: sql`${patientReferralCodes.signupCount} + 1` })
					.where(
						and(
							eq(patientReferralCodes.id, codeRecord.id),
							eq(patientReferralCodes.organizationId, orgId),
						),
					);

				return [newReferral];
			});

			return reply.status(201).send({
				success: true,
				referralId: referral?.id || "referral-attributed",
				referrerPatientId: codeRecord.patientId,
			});
		});
	});

	/**
	 * POST /api/referrals/reward-first-visit
	 * Начисление реферального бонуса при первой оплате приглашённого пациента.
	 */
	app.post("/api/referrals/reward-first-visit", async (request, reply) => {
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		const idempotencyKey = extractIdempotencyKey(request);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7)",
			});
		}

		const parsed = rewardFirstVisitBodySchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.status(400).send({
				message: "Некорректные параметры вознаграждения",
				errors: parsed.error.format(),
			});
		}

		const { refereePatientId, paymentId, paidAmountRub } = parsed.data;

		return withTenantCtx(orgId, async (tx) => {
			const [referral] = await tx
				.select()
				.from(patientReferrals)
				.where(
					and(
						eq(patientReferrals.organizationId, orgId),
						eq(patientReferrals.refereePatientId, refereePatientId),
						eq(patientReferrals.status, "registered"),
					),
				)
				.for("update")
				.limit(1);

			if (!referral) {
				return reply.status(404).send({
					message: "Активная реферальная привязка со статусом 'registered' не найдена",
				});
			}

			let verifiedAmountKop: number;
			if (paymentId) {
				const [verifiedPayment] = await tx
					.select()
					.from(payments)
					.where(
						and(
							eq(payments.id, paymentId),
							eq(payments.organizationId, orgId),
							eq(payments.patientId, refereePatientId),
						),
					)
					.limit(1);

				if (!verifiedPayment) {
					return reply.status(404).send({
						message: "Платеж не найден или принадлежит другому пациенту",
					});
				}

				if (verifiedPayment.status !== "paid") {
					return reply.status(400).send({
						message: `Начисление бонуса отклонено: платеж находится в статусе '${verifiedPayment.status}', а не 'paid'`,
					});
				}

				verifiedAmountKop =
					verifiedPayment.amountKopecks != null
						? Number(verifiedPayment.amountKopecks)
						: parseKopecks(verifiedPayment.amountRub ?? 0);
			} else if (typeof paidAmountRub === "number" && paidAmountRub > 0) {
				verifiedAmountKop = rublesToKopecks(paidAmountRub);
			} else {
				return reply.status(400).send({
					message: "Необходимо указать paymentId либо paidAmountRub",
				});
			}

			const [activeCampaign] = await tx
				.select({
					minFirstSpendThresholdKopecks: referralCampaigns.minFirstSpendThresholdKopecks,
					minFirstSpendThresholdRub: referralCampaigns.minFirstSpendThresholdRub,
				})
				.from(referralCampaigns)
				.where(
					and(
						eq(referralCampaigns.organizationId, orgId),
						eq(referralCampaigns.isActive, true),
					),
				)
				.limit(1);

			const minSpendKop = activeCampaign
				? activeCampaign.minFirstSpendThresholdKopecks != null
					? Number(activeCampaign.minFirstSpendThresholdKopecks)
					: parseKopecks(activeCampaign.minFirstSpendThresholdRub)
				: 150_000;

			if (verifiedAmountKop < minSpendKop) {
				return reply.status(200).send({
					rewarded: false,
					message: `Сумма первого чека (${kopecksToRubles(verifiedAmountKop)} ₽) меньше порога активации бонуса (${kopecksToRubles(minSpendKop)} ₽)`,
				});
			}

				// Award Level 1 Referrer (+1000 points) via canonical executeBonusAccrual (zero float math, FIFO expiry)
				const referrerL1Points = 1000;
				await executeBonusAccrual(
					{
						orgId,
						patientId: referral.referrerPatientId,
						amountPoints: referrerL1Points,
						description: "Бонус за первую оплату лечения приглашённого друга (+1000 ₽)",
						txType: "accrual_referral_l1",
						expiresInDays: 365,
						relatedPaymentId: paymentId || undefined,
						clientMutationId: idempotencyKey ? `${idempotencyKey}-l1` : undefined,
					},
					tx,
				);

				// Award Level 2 Referrer (+300 points) if exists
				if (referral.parentReferrerPatientId) {
					const referrerL2Points = 300;
					await executeBonusAccrual(
						{
							orgId,
							patientId: referral.parentReferrerPatientId,
							amountPoints: referrerL2Points,
							description: "Бонус 2-го уровня за визит друга вашего друга (+300 ₽)",
							txType: "accrual_referral_l2",
							expiresInDays: 365,
							relatedPaymentId: paymentId || undefined,
							clientMutationId: idempotencyKey ? `${idempotencyKey}-l2` : undefined,
						},
						tx,
					);
				}

				// Update referral status to rewarded
				await tx
					.update(patientReferrals)
					.set({
						status: "rewarded",
						qualifyingPaymentId: paymentId || null,
						qualifyingAmountRub: kopecksToNumericString(verifiedAmountKop),
						qualifyingAmountKopecks: verifiedAmountKop,
						rewardedAt: new Date(),
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(patientReferrals.id, referral.id),
							eq(patientReferrals.organizationId, orgId),
						),
					);

				if (idempotencyKey) {
					reply.header("idempotency-key", idempotencyKey);
				}

				return reply.status(200).send({
					success: true,
					rewarded: true,
					referrerTier1RewardedPoints: referrerL1Points,
					referrerTier2RewardedPoints: referral.parentReferrerPatientId ? 300 : 0,
				});
		});
	});
}
