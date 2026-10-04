import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { and, desc, eq, inArray, isNull, lte, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	appointments,
	bonusTransactions,
	chairs,
	communicationTasks,
	crmLeads,
	denteTelegramBotConfigs,
	denteTelegramChatLinks,
	familyGroups,
	patientBonusBalances,
	patientReferralCodes,
	patientReferrals,
	patients,
	users,
	visits,
} from "../../db/schema.js";
import { wsBroker } from "../websocketBroker.js";

// ============================================================================
// ТИПЫ И ИНТЕРФЕЙСЫ TELEGRAM WEBAPP & ЛОЯЛЬНОСТИ
// ============================================================================

export type TelegramWebAppUser = {
	id: number;
	first_name: string;
	last_name?: string;
	username?: string;
	language_code?: string;
	is_premium?: boolean;
};

export type TelegramWebAppValidationResult = {
	isValid: boolean;
	user: TelegramWebAppUser | null;
	authDate: Date | null;
	queryId: string | null;
	rawParams: Record<string, string>;
	error?: string;
};

export type ReferralRewardConfig = {
	refereeWelcomeBonusRub: number; // default: 1000 ₽
	referrerBonusRub: number;       // default: 500 ₽
	campaignName: string;
};

export const DEFAULT_REFERRAL_CONFIG: ReferralRewardConfig = {
	refereeWelcomeBonusRub: 1000,
	referrerBonusRub: 500,
	campaignName: "Приведи друга — стоматология DENTE",
};

export type ReferralStartResult = {
	success: boolean;
	isNewReferral: boolean;
	referrerPatientId: string | null;
	referrerName: string | null;
	refereePatientId: string | null;
	refereeBonusRub: number;
	referrerBonusRub: number;
	welcomeMessage: string;
	webAppUrl: string;
	errorMessage?: string | undefined;
};

export type FamilyMemberItem = {
	patientId: string;
	fullName: string;
	birthDate: string | null;
	phone: string | null;
	relation: "self" | "child" | "spouse" | "parent" | "other";
	activeBonusPoints: number;
	upcomingAppointmentsCount: number;
};

export type FamilyProfileResult = {
	familyGroupId: string | null;
	familyGroupName: string;
	headPatientId: string | null;
	familyBalanceRub: number;
	members: FamilyMemberItem[];
};

export type ChurnCandidateItem = {
	patientId: string;
	fullName: string;
	phone: string | null;
	telegramChatId: string | null;
	monthsSinceLastVisit: number;
	lastVisitDate: string | null;
	lastDoctorName: string | null;
	inviteText: string;
	personalDiscountPercent: number;
};

export type NpsFeedbackInput = {
	appointmentId: string;
	score: number; // 1 to 5 (or 1 to 10)
	comment?: string | undefined;
	telegramChatId?: string | number | undefined;
};

export type NpsFeedbackResult = {
	appointmentId: string;
	normalizedScore: number; // 1-5
	routeDestination: "external_review" | "service_recovery_alert";
	replyMessage: string;
	yandexMapsUrl: string | null;
	twoGisUrl: string | null;
	taskCreatedId: string | null;
};

export type ToothComplaintInput = {
	toothNumber: number; // FDI 11-48
	symptom: string;     // Острая боль, Ноет, Скол, Кровоточивость, и т.д.
	painIntensity?: number | undefined; // 1-5
	notes?: string | undefined;
	urgency?: "cito" | "routine" | undefined;
};

export type WebAppBookingInput = {
	doctorId: string;
	date: string; // YYYY-MM-DD
	time: string; // HH:mm
	serviceName?: string | undefined;
	familyMemberPatientId?: string | undefined;
	complaintNotes?: string | undefined;
};

// ============================================================================
// ОСНОВНОЙ СЕРВИС: TELEGRAM REFERRAL & LOYALTY SERVICE
// ============================================================================

export class TelegramReferralLoyaltyService {
	/**
	 * Криптографическая валидация Telegram.WebApp.initData (HMAC-SHA-256).
	 * Соответствует официальному протоколу Telegram Bot API:
	 * 1. Распарсить key-value пары строки initData.
	 * 2. Исключить параметр hash.
	 * 3. Отсортировать ключи по алфавиту и соединить через '\n' как "key=value".
	 * 4. secret_key = HMAC_SHA256("WebAppData", botToken).
	 * 5. check_hash = HMAC_SHA256(secret_key, data_check_string).hex().
	 */
	static validateTelegramWebAppData(
		initDataString: string,
		botToken: string,
		options: { maxAgeSeconds?: number; allowDevBypass?: boolean } = {},
	): TelegramWebAppValidationResult {
		const trimmed = (initDataString || "").trim();
		if (!trimmed) {
			return {
				isValid: false,
				user: null,
				authDate: null,
				queryId: null,
				rawParams: {},
				error: "Пустая строка initData",
			};
		}

		try {
			const searchParams = new URLSearchParams(trimmed);
			const hash = searchParams.get("hash");
			if (!hash) {
				return {
					isValid: false,
					user: null,
					authDate: null,
					queryId: null,
					rawParams: {},
					error: "Отсутствует параметр hash",
				};
			}

			const rawParams: Record<string, string> = {};
			const dataCheckPairs: string[] = [];

			const sortedKeys = Array.from(searchParams.keys())
				.filter((k) => k !== "hash")
				.sort();

			for (const key of sortedKeys) {
				const val = searchParams.get(key) ?? "";
				rawParams[key] = val;
				dataCheckPairs.push(`${key}=${val}`);
			}

			const dataCheckString = dataCheckPairs.join("\n");

			// Telegram WebApp Secret Key: HMAC_SHA256("WebAppData", botToken)
			const secretKey = createHmac("sha256", "WebAppData")
				.update(botToken)
				.digest();

			const calculatedHash = createHmac("sha256", secretKey)
				.update(dataCheckString)
				.digest("hex");

			let hashesMatch = false;
			try {
				hashesMatch = timingSafeEqual(
					Buffer.from(calculatedHash, "hex"),
					Buffer.from(hash, "hex"),
				);
			} catch {
				hashesMatch = false;
			}

			// Разбор данных пользователя
			let user: TelegramWebAppUser | null = null;
			if (rawParams.user) {
				try {
					user = JSON.parse(rawParams.user) as TelegramWebAppUser;
				} catch {
					user = null;
				}
			}

			// Разбор даты авторизации
			let authDate: Date | null = null;
			if (rawParams.auth_date) {
				const seconds = Number.parseInt(rawParams.auth_date, 10);
				if (!Number.isNaN(seconds) && seconds > 0) {
					authDate = new Date(seconds * 1000);
				}
			}

			// Проверка устаревания (по умолчанию 86400с = 24 часа)
			const maxAge = options.maxAgeSeconds ?? 86400;
			if (authDate && maxAge > 0) {
				const ageSeconds = (Date.now() - authDate.getTime()) / 1000;
				if (ageSeconds > maxAge && !options.allowDevBypass) {
					return {
						isValid: false,
						user,
						authDate,
						queryId: rawParams.query_id || null,
						rawParams,
						error: `Срок действия сессии Telegram WebApp истек (${Math.round(ageSeconds / 60)} мин. назад)`,
					};
				}
			}

			if (!hashesMatch && !options.allowDevBypass) {
				return {
					isValid: false,
					user,
					authDate,
					queryId: rawParams.query_id || null,
					rawParams,
					error: "Недействительная криптографическая подпись Telegram WebApp",
				};
			}

			return {
				isValid: true,
				user,
				authDate,
				queryId: rawParams.query_id || null,
				rawParams,
			};
		} catch (err) {
			return {
				isValid: false,
				user: null,
				authDate: null,
				queryId: null,
				rawParams: {},
				error: err instanceof Error ? err.message : "Ошибка валидации initData",
			};
		}
	}

	/**
	 * Генерация персональной реферальной ссылки для пациента:
	 * https://t.me/ClinicBot?start=ref_PATIENT_ID
	 */
	static generateReferralLink(
		botUsername: string,
		patientId: string,
		referralCode?: string,
	): {
		deepLink: string;
		referralCode: string;
		shareText: string;
	} {
		const sanitizedBot = botUsername.replace(/^@/, "").trim() || "DenteClinicBot";
		const code = referralCode?.trim() || `ref_${patientId}`;
		const deepLink = `https://t.me/${sanitizedBot}?start=${encodeURIComponent(code)}`;
		const shareText =
			`Привет! Дарю тебе 1 000 ₽ на визит к стоматологу в клинику DENTE. ` +
			`Комплексная гигиена или осмотр с КТ со скидкой. Запишись прямо в боте: ${deepLink}`;

		return {
			deepLink,
			referralCode: code,
			shareText,
		};
	}

	/**
	 * Обработка входа нового пациента / друга по реферальной ссылке `/start ref_...`.
	 * - Проверяет пригласившего пациента в базе.
	 * - Начисляет приветственный бонус другу (1 000 ₽) в CRM.
	 * - Начисляет кэшбэк-баллы пригласившему (+500 ₽).
	 * - Возвращает текст поздравления и кнопку вызова Telegram WebApp.
	 */
	static async processReferralStart(
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
		return withTenantCtx(organizationId, async () => {
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
				const [p] = await db
					.select()
					.from(patients)
					.where(and(eq(patients.organizationId, organizationId), eq(patients.id, identifier)))
					.limit(1);
				referrerPatient = p;
			}

			// Если не найден по прямому UUID, ищем в patientReferralCodes
			if (!referrerPatient) {
				const [codeRecord] = await db
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
					const [p] = await db
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
			const [existingChatLink] = await db
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
				const [p] = await db
					.select()
					.from(patients)
					.where(and(eq(patients.organizationId, organizationId), eq(patients.id, existingChatLink.subjectId)))
					.limit(1);
				refereePatient = p;
			}

			// Если не нашли по связке, но есть телефон:
			if (!refereePatient && refereeProfile?.phone) {
				const [p] = await db
					.select()
					.from(patients)
					.where(and(eq(patients.organizationId, organizationId), eq(patients.phone, refereeProfile.phone.trim())))
					.limit(1);
				refereePatient = p;
			}

			// Если все еще нет — регистрируем нового пациента
			if (!refereePatient) {
				const newFullName = refereeProfile?.fullName?.trim() || `Гость Telegram (@${refereeProfile?.username || chatIdStr})`;
				const [created] = await db
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
					await db.insert(denteTelegramChatLinks).values({
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
			const [existingReferral] = await db
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
				// Создаем запись в patient_referrals
				await db.insert(patientReferrals).values({
					organizationId,
					referrerPatientId: referrerId,
					refereePatientId: refereeId,
					status: "registered",
					qualifyingAmountRub: String(config.refereeWelcomeBonusRub),
				});

				// Начисляем приветственные 1 000 ₽ другу
				await TelegramReferralLoyaltyService.awardBonusPoints(
					organizationId,
					refereeId,
					config.refereeWelcomeBonusRub,
					`Приветственный бонус по приглашению от ${referrerPatient.fullName}`,
					"welcome_bonus",
				);

				// Начисляем кэшбэк +500 ₽ пригласившему
				await TelegramReferralLoyaltyService.awardBonusPoints(
					organizationId,
					referrerId,
					config.referrerBonusRub,
					`Кэшбэк за приглашение друга (${refereePatient.fullName})`,
					"referral_reward",
				);

				// Обновляем статистику в кодах
				await db
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

				// Отправляем WebSocket уведомление в CRM
				wsBroker.broadcastToOrganization(organizationId, {
					type: "referral_attributed",
					organizationId,
					payload: {
						referrerPatientId: referrerId,
						referrerName: referrerPatient.fullName,
						refereePatientId: refereeId,
						refereeName: refereePatient.fullName,
						bonusAwardedRub: config.refereeWelcomeBonusRub,
					},
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

	/**
	 * Начисление бонусных баллов пациенту с фиксацией транзакции в журнале.
	 */
	static async awardBonusPoints(
		organizationId: string,
		patientId: string,
		amountPoints: number,
		description: string,
		transactionType = "accrual",
	): Promise<number> {
		return withTenantCtx(organizationId, async () => {
			const [balance] = await db
				.select()
				.from(patientBonusBalances)
				.where(
					and(
						eq(patientBonusBalances.organizationId, organizationId),
						eq(patientBonusBalances.patientId, patientId),
					),
				)
				.limit(1);

			const currentActive = balance ? Number(balance.activePoints || 0) : 0;
			const currentLifetime = balance ? Number(balance.lifetimeEarnedPoints || 0) : 0;
			const newActive = currentActive + amountPoints;
			const newLifetime = currentLifetime + amountPoints;

			if (balance) {
				await db
					.update(patientBonusBalances)
					.set({
						activePoints: String(newActive),
						lifetimeEarnedPoints: String(newLifetime),
						updatedAt: new Date(),
					})
					.where(eq(patientBonusBalances.id, balance.id));
			} else {
				await db.insert(patientBonusBalances).values({
					organizationId,
					patientId,
					activePoints: String(newActive),
					lifetimeEarnedPoints: String(newLifetime),
				});
			}

			await db.insert(bonusTransactions).values({
				organizationId,
				patientId,
				type: "accrual",
				amountPoints: String(amountPoints),
				balanceAfterPoints: String(newActive),
				description,
			});

			return newActive;
		});
	}

	/**
	 * Получение семейного профиля и переключение между членами семьи.
	 * Родитель может видеть всех своих детей и подтверждать записи в 1 клик.
	 */
	static async getFamilyProfile(
		organizationId: string,
		patientId: string,
	): Promise<FamilyProfileResult> {
		return withTenantCtx(organizationId, async () => {
			const [primary] = await db
				.select()
				.from(patients)
				.where(and(eq(patients.organizationId, organizationId), eq(patients.id, patientId)))
				.limit(1);

			if (!primary) {
				return {
					familyGroupId: null,
					familyGroupName: "Личный профиль",
					headPatientId: null,
					familyBalanceRub: 0,
					members: [],
				};
			}

			let groupMembers: Array<typeof patients.$inferSelect> = [primary];
			let familyGroupRecord: typeof familyGroups.$inferSelect | undefined;

			if (primary.familyGroupId) {
				const [fg] = await db
					.select()
					.from(familyGroups)
					.where(and(eq(familyGroups.organizationId, organizationId), eq(familyGroups.id, primary.familyGroupId)))
					.limit(1);
				familyGroupRecord = fg;

				const allInGroup = await db
					.select()
					.from(patients)
					.where(
						and(
							eq(patients.organizationId, organizationId),
							eq(patients.familyGroupId, primary.familyGroupId),
						),
					);
				if (allInGroup.length > 0) {
					groupMembers = allInGroup;
				}
			}

			// Собираем членов семьи
			const memberItems: FamilyMemberItem[] = [];

			for (const m of groupMembers) {
				const [bonus] = await db
					.select({ active: patientBonusBalances.activePoints })
					.from(patientBonusBalances)
					.where(and(eq(patientBonusBalances.organizationId, organizationId), eq(patientBonusBalances.patientId, m.id)))
					.limit(1);

				const upcomingAppointments = await db
					.select({ id: appointments.id })
					.from(appointments)
					.where(
						and(
							eq(appointments.organizationId, organizationId),
							eq(appointments.patientId, m.id),
							sql`${appointments.status} IN ('scheduled', 'confirmed')`,
						),
					);

				const isPrimary = m.id === primary.id;
				// Эвристика определения ребенка по возрасту (если дата рождения есть и возраст < 18)
				let isChild = false;
				if (m.birthDate) {
					const birth = new Date(m.birthDate);
					const age = (Date.now() - birth.getTime()) / (365.25 * 24 * 3600 * 1000);
					if (age < 18) isChild = true;
				}

				memberItems.push({
					patientId: m.id,
					fullName: m.fullName,
					birthDate: m.birthDate,
					phone: m.phone,
					relation: isPrimary ? "self" : isChild ? "child" : "spouse",
					activeBonusPoints: bonus ? Number(bonus.active) : 0,
					upcomingAppointmentsCount: upcomingAppointments.length,
				});
			}

			return {
				familyGroupId: familyGroupRecord?.id || null,
				familyGroupName: familyGroupRecord?.name || familyGroupRecord?.groupName || `Семья (${primary.fullName.split(" ")[0]})`,
				headPatientId: familyGroupRecord?.headPatientId || primary.id,
				familyBalanceRub: familyGroupRecord ? Number(familyGroupRecord.balance || 0) : 0,
				members: memberItems,
			};
		});
	}

	/**
	 * Подтверждение или перенос записи ребенка/члена семьи в 1 клик родителем.
	 */
	static async confirmFamilyAppointment(
		organizationId: string,
		parentPatientId: string,
		appointmentId: string,
	): Promise<{ success: boolean; appointmentId: string; message: string }> {
		return withTenantCtx(organizationId, async () => {
			const familyProfile = await TelegramReferralLoyaltyService.getFamilyProfile(organizationId, parentPatientId);
			const allowedPatientIds = familyProfile.members.map((m) => m.patientId);

			const [appt] = await db
				.select()
				.from(appointments)
				.where(and(eq(appointments.organizationId, organizationId), eq(appointments.id, appointmentId)))
				.limit(1);

			if (!appt) {
				return { success: false, appointmentId, message: "Запись на приём не найдена." };
			}

			if (!appt.patientId || !allowedPatientIds.includes(appt.patientId)) {
				return {
					success: false,
					appointmentId,
					message: "У вас нет прав подтверждать запись для пациента не из вашей семейной группы.",
				};
			}

			await db
				.update(appointments)
				.set({
					status: "confirmed",
				})
				.where(eq(appointments.id, appointmentId));

			wsBroker.broadcastToOrganization(organizationId, {
				type: "appointment_confirmed_by_family",
				organizationId,
				payload: {
					appointmentId,
					parentPatientId,
					patientId: appt.patientId,
				},
			});

			return {
				success: true,
				appointmentId,
				message: "Запись успешно подтверждена родительским профилем.",
			};
		});
	}

	/**
	 * СМАРТ-РЕАНИМАЦИЯ ОТТОКА (RETENTION RADAR):
	 * Поиск пациентов, которые не были на приеме 6+ месяцев (стандарт гигиены СтАР).
	 * Формирование персонализированного ненавязчивого приглашения в бот с персональной скидкой.
	 */
	static async findChurnCandidates(
		organizationId: string,
		options: { minMonths?: number; limit?: number } = {},
	): Promise<ChurnCandidateItem[]> {
		return withTenantCtx(organizationId, async () => {
			const minMonths = options.minMonths ?? 6;
			const limit = options.limit ?? 50;

			// Дата отсечки: ровно minMonths месяцев назад
			const cutoffDate = new Date();
			cutoffDate.setMonth(cutoffDate.getMonth() - minMonths);

			// Находим пациентов, у которых был завершенный визит до cutoffDate и нет будущих записей
			const candidates = await db
				.select({
					patientId: patients.id,
					fullName: patients.fullName,
					phone: patients.phone,
					lastVisitDate: sql<string>`MAX(${visits.createdAt})`,
					doctorName: sql<string>`MAX(${users.fullName})`,
				})
				.from(patients)
				.innerJoin(visits, eq(visits.patientId, patients.id))
				.leftJoin(appointments, eq(visits.appointmentId, appointments.id))
				.leftJoin(users, eq(appointments.doctorUserId, users.id))
				.where(and(eq(patients.organizationId, organizationId), eq(patients.status, "active")))
				.groupBy(patients.id, patients.fullName, patients.phone)
				.having(sql`MAX(${visits.createdAt}) <= ${cutoffDate.toISOString()}`)
				.limit(limit);

			const results: ChurnCandidateItem[] = [];

			for (const c of candidates) {
				// Проверяем, нет ли будущих запланированных приёмов
				const [futureAppt] = await db
					.select({ id: appointments.id })
					.from(appointments)
					.where(
						and(
							eq(appointments.organizationId, organizationId),
							eq(appointments.patientId, c.patientId),
							sql`${appointments.status} IN ('scheduled', 'confirmed')`,
						),
					)
					.limit(1);

				if (futureAppt) continue; // Пациент уже записан на будущее, пропускаем

				// Ищем telegram chat link
				const [tgLink] = await db
					.select({ chatId: denteTelegramChatLinks.chatFingerprint })
					.from(denteTelegramChatLinks)
					.where(
						and(
							eq(denteTelegramChatLinks.organizationId, organizationId),
							eq(denteTelegramChatLinks.subjectId, c.patientId),
							eq(denteTelegramChatLinks.status, "active"),
						),
					)
					.limit(1);

				const lastDate = c.lastVisitDate ? new Date(c.lastVisitDate) : new Date();
				const monthsElapsed = Math.max(
					minMonths,
					Math.floor((Date.now() - lastDate.getTime()) / (30.4375 * 24 * 3600 * 1000)),
				);

				const firstName = c.fullName.split(" ")[0] || "Уважаемый пациент";
				const doc = c.doctorName || "вашего лечащего врача";

				const inviteText = [
					`🦷 <b>Плановый профилактический осмотр и гигиена</b>`,
					``,
					`Здравствуйте, <b>${firstName}</b>!`,
					`Прошло уже <b>${monthsElapsed} месяцев</b> с вашего визита к доктору <b>${doc}</b>.`,
					``,
					`По клиническому стандарту Стоматологической Ассоциации России (СтАР), для сохранения здоровья десен и гарантии на установленные пломбы необходимо проходить профессиональную гигиену раз в 6 месяцев.`,
					``,
					`🎁 Для вас действует <b>персональная скидка 20%</b> на комплексную гигиену Air-Flow + ультразвук.`,
					`Нажмите кнопку ниже, чтобы выбрать удобное время в 1 тап:`,
				].join("\n");

				results.push({
					patientId: c.patientId,
					fullName: c.fullName,
					phone: c.phone,
					telegramChatId: tgLink?.chatId || null,
					monthsSinceLastVisit: monthsElapsed,
					lastVisitDate: c.lastVisitDate,
					lastDoctorName: c.doctorName,
					inviteText,
					personalDiscountPercent: 20,
				});
			}

			return results;
		});
	}

	/**
	 * Опрос NPS / индекс лояльности после завершенного визита.
	 * При оценке 5/5: направляет на Яндекс.Карты / 2GIS для внешнего отзыва.
	 * При оценке 1-4: регистрирует тревогу в CRM и задачу начмеду/управляющему.
	 */
	static async handleNpsFeedback(
		organizationId: string,
		input: NpsFeedbackInput,
		clinicSettings?: { yandexMapsUrl?: string; twoGisUrl?: string; clinicName?: string },
	): Promise<NpsFeedbackResult> {
		return withTenantCtx(organizationId, async () => {
			const rawScore = Number(input.score);
			// Нормализуем к 1-5 (если прислали 1-10: 9-10 -> 5, 7-8 -> 4, 5-6 -> 3, и т.д.)
			const normalizedScore = rawScore > 5 ? Math.min(5, Math.max(1, Math.round(rawScore / 2))) : Math.min(5, Math.max(1, Math.round(rawScore)));

			const [appt] = await db
				.select({
					id: appointments.id,
					patientId: appointments.patientId,
					doctorId: appointments.doctorUserId,
					patientName: patients.fullName,
					doctorName: users.fullName,
				})
				.from(appointments)
				.leftJoin(patients, eq(appointments.patientId, patients.id))
				.leftJoin(users, eq(appointments.doctorUserId, users.id))
				.where(and(eq(appointments.organizationId, organizationId), eq(appointments.id, input.appointmentId)))
				.limit(1);

			const clinicName = clinicSettings?.clinicName || "DENTE";
			const yandexUrl = clinicSettings?.yandexMapsUrl || "https://yandex.ru/maps/";
			const twoGisUrl = clinicSettings?.twoGisUrl || "https://2gis.ru/";

			let createdTaskId: string | null = null;

			if (normalizedScore === 5) {
				// 5/5 — Высшая лояльность: направляем на внешние картографические сервисы
				const replyMessage = [
					`⭐️⭐️⭐️⭐️⭐️ <b>Огромное спасибо за высшую оценку!</b>`,
					``,
					`Мы невероятно рады, что ваш визит в ${clinicName} прошел комфортно и безболезненно. ` +
					`Для нашей команды и доктора ${appt?.doctorName || ""} это лучшая награда!`,
					``,
					`Пожалуйста, уделите 30 секунд и поделитесь вашим отзывом на Яндекс.Картах или 2ГИС — ` +
					`это очень помогает новым пациентам найти хорошего стоматолога:`,
				].join("\n");

				return {
					appointmentId: input.appointmentId,
					normalizedScore: 5,
					routeDestination: "external_review",
					replyMessage,
					yandexMapsUrl: yandexUrl,
					twoGisUrl: twoGisUrl,
					taskCreatedId: null,
				};
			}

			// 1–4 — Сигнал для сервисной службы / главного врача (Service Recovery)
			if (appt?.patientId) {
				const [createdTask] = await db
					.insert(communicationTasks)
					.values({
						organizationId,
						patientId: appt.patientId,
						appointmentId: appt.id,
						assignedRole: "head_doctor",
						channel: "telegram",
						intent: "general",
						status: "queued",
						priority: "high",
						dueAt: new Date(),
						title: `🚨 Служба заботы: Низкая оценка визита (${normalizedScore}/5)`,
						body: `Пациент ${appt.patientName || "Без имени"} поставил оценку ${normalizedScore}/5 после визита к доктору ${appt.doctorName || "Врач"}. ` +
							(input.comment ? `Комментарий пациента: "${input.comment}".` : "Комментарий не оставлен.") +
							` Срочно связаться для разбора клинической или сервисной ситуации!`,
						workflowCode: "nps_service_recovery",
					})
					.returning();

				createdTaskId = createdTask?.id || null;

				// WebSocket оповещение
				wsBroker.broadcastToOrganization(organizationId, {
					type: "nps_recovery_alert",
					organizationId,
					payload: {
						appointmentId: appt.id,
						patientId: appt.patientId,
						patientName: appt.patientName,
						score: normalizedScore,
						comment: input.comment,
						taskId: createdTaskId,
					},
				});
			}

			const replyMessage = [
				`🙏 <b>Спасибо за вашу честную обратную связь!</b>`,
				``,
				`Нам очень жаль, если визит оставил какие-либо неприятные впечатления. В клинике ${clinicName} качество лечения и комфорт каждого пациента стоят на первом месте.`,
				``,
				`Мы уже передали ваш сигнал главному врачу и службе заботы о пациентах. ` +
				`Управляющий свяжется с вами в течение 15 минут, чтобы во всем детально разобраться и помочь.`,
			].join("\n");

			return {
				appointmentId: input.appointmentId,
				normalizedScore,
				routeDestination: "service_recovery_alert",
				replyMessage,
				yandexMapsUrl: null,
				twoGisUrl: null,
				taskCreatedId: createdTaskId,
			};
		});
	}

	/**
	 * Приём жалобы на конкретный зуб из интерактивной 3D/2D формулы WebApp:
	 * («Беспокоит зуб 16», острая боль / скол / ноет) -> передача в CRM.
	 */
	static async submitToothComplaint(
		organizationId: string,
		patientId: string,
		complaint: ToothComplaintInput,
	): Promise<{ success: boolean; leadId?: string | undefined; taskId?: string | undefined; message: string }> {
		return withTenantCtx(organizationId, async () => {
			const [patient] = await db
				.select({ id: patients.id, fullName: patients.fullName, phone: patients.phone })
				.from(patients)
				.where(and(eq(patients.organizationId, organizationId), eq(patients.id, patientId)))
				.limit(1);

			if (!patient) {
				return { success: false, message: "Пациент не найден." };
			}

			const isEmergency = complaint.urgency === "cito" || (complaint.painIntensity && complaint.painIntensity >= 4);

			// Создаем задачу для регистратуры
			const [task] = await db
				.insert(communicationTasks)
				.values({
					organizationId,
					patientId,
					assignedRole: "administrator",
					channel: "telegram",
					intent: "general",
					status: "queued",
					priority: isEmergency ? "urgent" : "high",
					dueAt: new Date(),
					title: `🦷 Жалоба из Telegram WebApp: Зуб ${complaint.toothNumber}`,
					body: `Пациент ${patient.fullName} (${patient.phone || "тел. не указан"}) отметил жалобу в Pocket Clinic:\n` +
						`• Зуб: ${complaint.toothNumber}\n` +
						`• Симптом: ${complaint.symptom}\n` +
						`• Интенсивность боли: ${complaint.painIntensity || 3}/5\n` +
						(complaint.notes ? `• Заметка пациента: "${complaint.notes}"` : ""),
					workflowCode: "telegram_webapp_tooth_complaint",
				})
				.returning();

			// Оповещаем CRM
			wsBroker.broadcastToOrganization(organizationId, {
				type: "telegram_tooth_complaint_received",
				organizationId,
				payload: {
					patientId,
					patientName: patient.fullName,
					toothNumber: complaint.toothNumber,
					symptom: complaint.symptom,
					isEmergency,
					taskId: task?.id,
				},
			});

			return {
				success: true,
				leadId: undefined,
				taskId: task?.id,
				message: `Жалоба по зубу ${complaint.toothNumber} передана врачу и регистратуре клиники.`,
			};
		});
	}

	/**
	 * Запись на прием в 1 тап из Telegram WebApp календаря.
	 */
	static async bookAppointmentFromWebApp(
		organizationId: string,
		patientId: string,
		booking: WebAppBookingInput,
	): Promise<{ success: boolean; appointmentId: string; message: string }> {
		return withTenantCtx(organizationId, async () => {
			const targetPatientId = booking.familyMemberPatientId || patientId;

			const [targetPatient] = await db
				.select({ id: patients.id, fullName: patients.fullName })
				.from(patients)
				.where(and(eq(patients.organizationId, organizationId), eq(patients.id, targetPatientId)))
				.limit(1);

			if (!targetPatient) {
				return { success: false, appointmentId: "", message: "Пациент для записи не найден." };
			}

			// Вычисляем время начала и окончания
			const startDateTime = new Date(`${booking.date}T${booking.time}:00`);
			const endDateTime = new Date(startDateTime.getTime() + 45 * 60_000); // 45 минут дефолт

			// Находим первое кресло клиники
			const [chair] = await db
				.select({ id: chairs.id })
				.from(chairs)
				.where(eq(chairs.organizationId, organizationId))
				.limit(1);

			const [createdAppt] = await db
				.insert(appointments)
				.values({
					organizationId,
					patientId: targetPatientId,
					doctorUserId: booking.doctorId,
					chairId: chair?.id,
					startsAt: startDateTime,
					endsAt: endDateTime,
					status: "planned",
					comment: booking.complaintNotes
						? `Запись через Telegram WebApp: ${booking.complaintNotes}`
						: `Запись через Telegram WebApp на ${booking.serviceName || "Консультация стоматолога"}`,
				})
				.returning();

			if (!createdAppt) {
				return { success: false, appointmentId: "", message: "Не удалось создать запись в расписании." };
			}

			wsBroker.broadcastToOrganization(organizationId, {
				type: "appointment_created_via_telegram_webapp",
				organizationId,
				payload: {
					appointmentId: createdAppt.id,
					patientId: targetPatientId,
					patientName: targetPatient.fullName,
					doctorId: booking.doctorId,
					startTime: startDateTime.toISOString(),
				},
			});

			return {
				success: true,
				appointmentId: createdAppt.id,
				message: `Запись на ${booking.date} в ${booking.time} успешно создана! Ждем вас в клинике.`,
			};
		});
	}
}
