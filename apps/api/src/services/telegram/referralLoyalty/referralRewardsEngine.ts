/**
 * referralRewardsEngine.ts
 *
 * Layer 2: Referral bonus disburser, cashback transactions ledger,
 * anti-self-referral validation, and /start ref_... onboarding pipeline.
 */

import { createHash } from "node:crypto";
import { rublesToKopecks } from "@dental/shared";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { onTenantTxCommit, withTenantCtx, type TenantDb } from "../../../db/rls.js";
import {
	denteTelegramChatLinks,
	patientReferralCodes,
	patientReferrals,
	patients,
} from "../../../db/schema.js";
import { executeBonusAccrual } from "../../../routes/loyaltyModules/bonusBalanceService.js";
import { wsBroker } from "../../websocketBroker.js";
import {
	DEFAULT_REFERRAL_CONFIG,
	type ReferralRewardConfig,
	type ReferralStartResult,
} from "./types.js";

/**
 * Начисление бонусных баллов пациенту с фиксацией транзакции в журнале.
 * Делегирует в канонический SSOT executeBonusAccrual с расчетом unspentPoints, expiresAt и целочисленных копеек.
 */
export async function awardBonusPoints(
	organizationId: string,
	patientId: string,
	amountPoints: number,
	description: string,
	transactionType = "accrual",
	dbClient: TenantDb | typeof db = db,
): Promise<number> {
	const txClient = dbClient !== db ? (dbClient as TenantDb) : undefined;
	const res = await executeBonusAccrual(
		{
			orgId: organizationId,
			patientId,
			amountPoints,
			description,
			txType: transactionType,
			expiresInDays: 180,
		},
		txClient,
	);

	if ("notFound" in res) {
		throw new Error(`Пациент ${patientId} не найден для начисления бонусов`);
	}

	return res.activePoints;
}

/**
 * Обработка входа нового пациента / друга по реферальной ссылке `/start ref_...`.
 * - Проверяет пригласившего пациента в базе.
 * - Начисляет приветственный бонус другу (1 000 ₽) в CRM.
 * - Начисляет кэшбэк-баллы пригласившему (+500 ₽).
 * - Возвращает текст поздравления и кнопку вызова Telegram WebApp.
 */
export async function processReferralStart(
	organizationId: string,
	refereeTelegramChatId: string | number,
	startPayload: string,
	refereeProfile?: {
		fullName?: string | undefined;
		phone?: string | undefined;
		username?: string | undefined;
	} | undefined,
	config: ReferralRewardConfig = DEFAULT_REFERRAL_CONFIG,
): Promise<ReferralStartResult> {
	return await withTenantCtx(organizationId, async (tx) => {
		const payload = startPayload.trim();
		// Ожидаем payload формата: ref_PATIENT_ID или ref_REFERRAL_CODE или refPATIENT_ID
		const refMatch = payload.match(/^ref_?(.+)$/i);
		if (!refMatch) {
			return {
				success: false,
				isNewReferral: false,
				referrerPatientId: null,
				referrerName: null,
				refereePatientId: null,
				refereeBonusRub: 0,
				referrerBonusRub: 0,
				welcomeMessage: "Некорректный реферальный параметр.",
				webAppUrl: "",
				errorMessage: "Некорректный реферальный код",
			};
		}

		const identifier = (refMatch?.[1] || "").trim();

		// 1. Ищем пригласившего пациента: либо по прямому patientId, либо по таблице patientReferralCodes
		let referrerPatient: typeof patients.$inferSelect | undefined;

		// Пробуем как UUID
		const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
		if (isUuid) {
			const [p] = await tx
				.select()
				.from(patients)
				.where(and(eq(patients.organizationId, organizationId), eq(patients.id, identifier)))
				.limit(1);
			referrerPatient = p;
		}

		// Если не найден по прямому UUID, ищем в patientReferralCodes
		if (!referrerPatient) {
			const [codeRecord] = await tx
				.select()
				.from(patientReferralCodes)
				.where(
					and(
						eq(patientReferralCodes.organizationId, organizationId),
						eq(patientReferralCodes.referralCode, identifier.toUpperCase()),
					),
				)
				.limit(1);

			if (codeRecord) {
				const [p] = await tx
					.select()
					.from(patients)
					.where(and(eq(patients.organizationId, organizationId), eq(patients.id, codeRecord.patientId)))
					.limit(1);
				referrerPatient = p;
			}
		}

		if (!referrerPatient) {
			return {
				success: false,
				isNewReferral: false,
				referrerPatientId: null,
				referrerName: null,
				refereePatientId: null,
				refereeBonusRub: 0,
				referrerBonusRub: 0,
				welcomeMessage: "Пригласивший пациент не найден в базе клиники.",
				webAppUrl: "",
				errorMessage: "Пригласивший пациент не найден",
			};
		}

		const referrerId = referrerPatient.id;
		const referrerName = referrerPatient.fullName.split(" ")[0] || "Ваш друг";

		// 2. Ищем или создаем карточку приглашенного друга
		let refereePatient: typeof patients.$inferSelect | undefined;
		const chatIdStr = String(refereeTelegramChatId);

		// Ищем по telegram chat link
		const chatFingerprint = createHash("sha256").update(chatIdStr).digest("hex").slice(0, 32);
		const [existingChatLink] = await tx
			.select()
			.from(denteTelegramChatLinks)
			.where(
				and(
					eq(denteTelegramChatLinks.organizationId, organizationId),
					eq(denteTelegramChatLinks.chatFingerprint, chatFingerprint),
				),
			)
			.limit(1);

		if (existingChatLink?.subjectType === "patient" && existingChatLink.subjectId) {
			const [p] = await tx
				.select()
				.from(patients)
				.where(and(eq(patients.organizationId, organizationId), eq(patients.id, existingChatLink.subjectId)))
				.limit(1);
			refereePatient = p;
		}

		// Если не нашли по связке, но есть телефон:
		if (!refereePatient && refereeProfile?.phone) {
			const [p] = await tx
				.select()
				.from(patients)
				.where(and(eq(patients.organizationId, organizationId), eq(patients.phone, refereeProfile.phone.trim())))
				.limit(1);
			refereePatient = p;
		}

		// Если все еще нет — регистрируем нового пациента
		if (!refereePatient) {
			const newFullName = refereeProfile?.fullName?.trim() || `Гость Telegram (@${refereeProfile?.username || chatIdStr})`;
			const [created] = await tx
				.insert(patients)
				.values({
					organizationId,
					fullName: newFullName,
					phone: refereeProfile?.phone || null,
				})
				.returning();
			refereePatient = created;

			// Привязываем telegram chat link
			if (refereePatient) {
				await tx.insert(denteTelegramChatLinks).values({
					organizationId,
					chatFingerprint,
					subjectType: "patient",
					subjectId: refereePatient.id,
					status: "active",
				});
			}
		}

		if (!refereePatient) {
			return {
				success: false,
				isNewReferral: false,
				referrerPatientId: referrerId,
				referrerName,
				refereePatientId: null,
				refereeBonusRub: 0,
				referrerBonusRub: 0,
				welcomeMessage: "Ошибка создания профиля приглашенного.",
				webAppUrl: "",
				errorMessage: "Не удалось создать профиль",
			};
		}

		const refereeId = refereePatient.id;

		// Проверка на попытку пригласить самого себя
		if (referrerId === refereeId) {
			return {
				success: false,
				isNewReferral: false,
				referrerPatientId: referrerId,
				referrerName,
				refereePatientId: refereeId,
				refereeBonusRub: 0,
				referrerBonusRub: 0,
				welcomeMessage: "Вы не можете применить собственную реферальную ссылку.",
				webAppUrl: "",
				errorMessage: "Самореферал запрещен",
			};
		}

		// 3. Проверяем, не был ли этот друг уже зарегистрирован по реферальной программе
		const [existingReferral] = await tx
			.select()
			.from(patientReferrals)
			.where(
				and(
					eq(patientReferrals.organizationId, organizationId),
					eq(patientReferrals.refereePatientId, refereeId),
				),
			)
			.limit(1);

		let isNew = false;
		if (!existingReferral) {
			isNew = true;
			// Создаем запись в patient_referrals в текущей транзакции withTenantCtx
			await tx.insert(patientReferrals).values({
				organizationId,
				referrerPatientId: referrerId,
				refereePatientId: refereeId,
				status: "completed",
				qualifyingAmountRub: String(config.refereeWelcomeBonusRub),
				qualifyingAmountKopecks: rublesToKopecks(config.refereeWelcomeBonusRub),
			});

			// Начисляем приветственные 1 000 ₽ другу
			await awardBonusPoints(
				organizationId,
				refereeId,
				config.refereeWelcomeBonusRub,
				`Приветственный бонус по приглашению от ${referrerPatient.fullName}`,
				"accrual",
				tx,
			);

			// Начисляем кэшбэк +500 ₽ пригласившему
			await awardBonusPoints(
				organizationId,
				referrerId,
				config.referrerBonusRub,
				`Кэшбэк за приглашение друга (${refereePatient.fullName})`,
				"accrual",
				tx,
			);

			// Обновляем статистику в кодах
			await tx
				.update(patientReferralCodes)
				.set({
					signupCount: sql`${patientReferralCodes.signupCount} + 1`,
					convertedCount: sql`${patientReferralCodes.convertedCount} + 1`,
				})
				.where(
					and(
						eq(patientReferralCodes.organizationId, organizationId),
						eq(patientReferralCodes.patientId, referrerId),
					),
				);

			const referrerFullName = referrerPatient.fullName;
			const refereeFullName = refereePatient.fullName;
			onTenantTxCommit(() => {
				wsBroker.broadcastToOrganization(organizationId, {
					type: "referral_attributed",
					organizationId,
					payload: {
						referrerPatientId: referrerId,
						referrerName: referrerFullName,
						refereePatientId: refereeId,
						refereeName: refereeFullName,
						bonusAwardedRub: config.refereeWelcomeBonusRub,
					},
				});
			});
		}

		const webAppUrl = `https://clinic.dente.pro/#/portal/tgapp?org=${encodeURIComponent(organizationId)}&patientId=${encodeURIComponent(refereeId)}`;

		const welcomeMessage = [
			`🎁 <b>Добро пожаловать в стоматологию DENTE!</b>`,
			``,
			`Ваш друг <b>${referrerName}</b> подарил вам персональный бонус <b>${config.refereeWelcomeBonusRub.toLocaleString("ru-RU")} ₽</b> на первый визит!`,
			``,
			`✨ Бонус уже начислен на ваш баланс и может быть использован на:`,
			`• Комплексную чистку зубов (ультразвук + Air-Flow)`,
			`• Профилактический осмотр и диагностику с визиографом`,
			`• Лечение кариеса и эстетическую реставрацию`,
			``,
			`Нажмите кнопку ниже, чтобы открыть интерактивное мини-приложение: отметить беспокоящий зуб на 3D/2D формуле или выбрать свободное окно в онлайн-календаре.`,
		].join("\n");

		return {
			success: true,
			isNewReferral: isNew,
			referrerPatientId: referrerId,
			referrerName,
			refereePatientId: refereeId,
			refereeBonusRub: config.refereeWelcomeBonusRub,
			referrerBonusRub: config.referrerBonusRub,
			welcomeMessage,
			webAppUrl,
		};
	});
}
