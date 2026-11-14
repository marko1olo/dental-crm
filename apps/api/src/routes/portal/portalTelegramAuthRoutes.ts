import { createHmac, timingSafeEqual } from "node:crypto";
import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { namedDevelopmentModeActive, requireAuthTokenSecret } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { withSuperuserBypass, withTenantCtx } from "../../db/rls.js";
import { organizations, patients, portalOtpCodes } from "../../db/schema.js";
import { bookingVerificationEngine } from "../publicBooking/smsVerificationAndSpamGate.js";
import { signToken, verifyCredential } from "../../utils/cryptoHelper.js";
import { normalizePatientAdministrativeProfile } from "../../utils/patientAdministrativeProfile.js";
import { PORTAL_TOKEN_KIND, PORTAL_TOKEN_TTL_SECONDS } from "./types.js";

export interface TelegramInitDataUser {
	id: number;
	first_name: string;
	last_name?: string;
	username?: string;
	language_code?: string;
}

/**
 * Validates Telegram WebApp initData HMAC-SHA256 signature
 */
export function validateTelegramWebAppData(
	initData: string,
	botToken: string,
): { isValid: boolean; user?: TelegramInitDataUser | undefined; authDate?: number | undefined } {
	if (!initData || !botToken) return { isValid: false };

	try {
		const params = new URLSearchParams(initData);
		const hash = params.get("hash");
		if (!hash) return { isValid: false };

		params.delete("hash");
		const dataCheckString = Array.from(params.entries())
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([key, val]) => `${key}=${val}`)
			.join("\n");

		const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
		const calculatedHash = createHmac("sha256", secretKey)
			.update(dataCheckString)
			.digest("hex");

		if (
			calculatedHash.length !== hash.length ||
			!timingSafeEqual(Buffer.from(calculatedHash), Buffer.from(hash))
		) {
			return { isValid: false };
		}

		const userJson = params.get("user");
		const user = userJson ? (JSON.parse(userJson) as TelegramInitDataUser) : undefined;
		const authDate = params.get("auth_date")
			? Number.parseInt(params.get("auth_date") || "0", 10)
			: undefined;

		return {
			isValid: true,
			...(user ? { user } : {}),
			...(authDate !== undefined ? { authDate } : {}),
		};
	} catch {
		return { isValid: false };
	}
}

const telegramAuthBodySchema = z.object({
	initData: z.string().min(1, "initData is required"),
	organizationId: z.string().uuid("organizationId must be a valid UUID"),
	phone: z.string().max(30).optional(),
	verificationCode: z.string().max(10).optional(),
});

export async function registerPortalTelegramAuthRoutes(server: FastifyInstance): Promise<void> {
	// Telegram Mini-App Direct Auth (/api/portal/auth/telegram-webapp)
	server.post<{
		Body: {
			initData?: string;
			organizationId?: string;
			phone?: string;
			verificationCode?: string;
		};
	}>("/auth/telegram-webapp", async (request, reply) => {
		const parsed = telegramAuthBodySchema.safeParse(request.body);
		if (!parsed.success) {
			reply.status(400);
			return {
				error: "ValidationError",
				message: "Некорректные параметры запроса авторизации Telegram WebApp.",
				details: parsed.error.issues,
			};
		}

		const initData = parsed.data.initData.trim();
		const orgId = parsed.data.organizationId.trim();
		const phone = parsed.data.phone?.trim();
		const verificationCode = parsed.data.verificationCode?.trim();

		const botToken = process.env.TELEGRAM_BOT_TOKEN || process.env.DENTE_TELEGRAM_BOT_TOKEN;
		if (!botToken) {
			reply.status(503);
			return {
				error: "ConfigurationError",
				message: "Telegram Bot Token is not configured on server",
			};
		}
		const validation = validateTelegramWebAppData(initData, botToken);

		const isDev = namedDevelopmentModeActive();
		if (!validation.isValid && !isDev) {
			reply.status(401);
			return {
				error: "Unauthorized",
				message: "Недействительная подпись Telegram WebApp.",
			};
		}

		const org = await withSuperuserBypass(async () => {
			const [row] = await db
				.select({ id: organizations.id })
				.from(organizations)
				.where(eq(organizations.id, orgId))
				.limit(1);
			return row;
		});

		if (!org) {
			reply.status(404);
			return {
				error: "OrganizationNotFound",
				message: "Организация с указанным идентификатором не найдена.",
			};
		}

		return withTenantCtx(orgId, async () => {
			let foundPatient: typeof patients.$inferSelect | undefined;
			const callerTelegramId = validation.user?.id ? String(validation.user.id) : null;

			if (phone) {
				const [p] = await db
					.select()
					.from(patients)
					.where(and(eq(patients.organizationId, orgId), eq(patients.phone, phone)))
					.limit(1);
				foundPatient = p;

				if (foundPatient) {
					const adminProfile = (foundPatient.administrativeProfile as Record<string, unknown> | null) || {};
					const boundTelegramId = adminProfile.telegramUserId ? String(adminProfile.telegramUserId) : null;

					// BOLA/IDOR Guard [POR-01]: запрет несанкционированного захвата медкарты по чужому номеру телефона
					if (boundTelegramId && boundTelegramId !== callerTelegramId) {
						reply.status(403);
						return {
							error: "AccountMismatch",
							message: "Указанный номер телефона привязан к другому Telegram-аккаунту.",
						};
					}

					// [POR-04] Если Telegram ещё не привязан — требуем валидный код верификации (SMS OTP)
					if (!boundTelegramId) {
						if (!verificationCode) {
							reply.status(403);
							return {
								error: "VerificationRequired",
								message: "Для первой привязки Telegram-аккаунта к медкарте требуется проверочный SMS-код.",
							};
						}

						let isOtpValid = false;
						const now = new Date();

						// 1. Проверяем в PostgreSQL portal_otp_codes (каноническое персистентное хранилище)
						try {
							const activeOtps = await db
								.select({
									id: portalOtpCodes.id,
									codeHash: portalOtpCodes.codeHash,
								})
								.from(portalOtpCodes)
								.where(
									and(
										eq(portalOtpCodes.organizationId, orgId),
										eq(portalOtpCodes.patientId, foundPatient.id),
										eq(portalOtpCodes.deliveryStatus, "sent"),
										isNull(portalOtpCodes.consumedAt),
										gte(portalOtpCodes.expiresAt, now),
									),
								)
								.orderBy(desc(portalOtpCodes.createdAt))
								.limit(1);

							if (activeOtps.length > 0 && activeOtps[0]) {
								const candidate = activeOtps[0];
								if (await verifyCredential(verificationCode, candidate.codeHash)) {
									isOtpValid = true;
									await db
										.update(portalOtpCodes)
										.set({ consumedAt: now })
										.where(eq(portalOtpCodes.id, candidate.id));
								}
							}
						} catch {
							// fallback to in-memory check below
						}

						// 2. Если в БД не найден или сбой соединения — fallback на bookingVerificationEngine
						if (!isOtpValid) {
							const otpCheck = bookingVerificationEngine.verifyPhoneOtp(phone, verificationCode);
							if (otpCheck.valid) {
								isOtpValid = true;
							}
						}

						if (!isOtpValid) {
							reply.status(403);
							return {
								error: "VerificationFailed",
								message: "Неверный или истёкший проверочный SMS-код.",
							};
						}

						// Фиксируем проверенную привязку Telegram ID к пациенту
						if (callerTelegramId) {
							await db
								.update(patients)
								.set({
									administrativeProfile: normalizePatientAdministrativeProfile({
										...(foundPatient.administrativeProfile ?? {}),
										telegramUserId: callerTelegramId,
										telegramUsername: validation.user?.username ?? null,
									}),
									updatedAt: new Date(),
								})
								.where(eq(patients.id, foundPatient.id));
						}
					}
				}
			}

			if (!foundPatient && validation.user?.id) {
				const [p] = await db
					.select()
					.from(patients)
					.where(
						and(
							eq(patients.organizationId, orgId),
							sql`${patients.administrativeProfile}->>'telegramUserId' = ${String(validation.user.id)}`,
						),
					)
					.limit(1);
				foundPatient = p;
			}

			if (!foundPatient) {
				reply.status(404);
				return {
					error: "PatientNotFound",
					message: "Пациент с указанными реквизитами не найден в клинике.",
				};
			}

			const token = signToken(
				{
					sub: foundPatient.id,
					organizationId: orgId,
					kind: PORTAL_TOKEN_KIND,
				},
				requireAuthTokenSecret(),
				PORTAL_TOKEN_TTL_SECONDS,
			);

			return {
				success: true,
				token,
				patientId: foundPatient.id,
				patientName: foundPatient.fullName,
			};
		});
	});
}
