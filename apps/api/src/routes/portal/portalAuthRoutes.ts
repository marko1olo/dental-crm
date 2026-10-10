import { and, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { requireAuthTokenSecret } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import { patients, portalOtpCodes } from "../../db/schema.js";
import {
	resolveChannelCredentials,
	sendThroughChannel,
} from "../../services/communications/channelRouter.js";
import {
	normalizeRussianMsisdn,
	readSmsCredentialsFromEnv,
} from "../../smsTransport.js";
import {
	hashCredential,
	signToken,
	verifyCredential,
	verifyToken,
} from "../../utils/cryptoHelper.js";
import {
	findUniquePatientByPhone,
	isIssuanceThrottled,
	otpIpRequestCounts,
	otpPhoneRequestCounts,
	portalRevokedBeforeByPatient,
	revokedPortalTokens,
} from "./portalAuthStore.js";
import {
	developerLogFallbackAllowed,
	generateNumericCode,
	readPortalOtpPolicy,
	renderOtpMessage,
} from "./portalUtils.js";
import {
	OTP_MAX_REQUESTS_PER_IP,
	OTP_MAX_REQUESTS_PER_PHONE,
	OTP_RATE_LIMIT_WINDOW_MS,
	PORTAL_TOKEN_KIND,
	PORTAL_TOKEN_TTL_SECONDS,
} from "./types.js";

export async function registerPortalAuthRoutes(server: FastifyInstance): Promise<void> {
	// 1. Send OTP (защищен составным лимитером по связке IP + phone_number)
	server.post<{ Body: { phone?: unknown; organizationId?: unknown } }>(
		"/auth/send-otp",
		{
			config: {
				rateLimit: {
					max: 5,
					timeWindow: "1 minute",
					hook: "preHandler",
					keyGenerator: (req: FastifyRequest) => {
						const ip = req.ip ?? "unknown";
						const body = req.body as { phone?: unknown } | undefined;
						const rawPhone =
							typeof body?.phone === "string"
								? body.phone.trim().replace(/\D/g, "")
								: "";
						const phoneSuffix =
							rawPhone.length >= 10 ? rawPhone.slice(-10) : (rawPhone || "no-phone");
						return `portal-otp|${ip}|${phoneSuffix}`;
					},
				},
			},
		},
		async (request, reply) => {
			const policy = readPortalOtpPolicy();
			const rawPhone =
				typeof request.body?.phone === "string"
					? request.body.phone.trim()
					: "";
			const targetOrgId =
				typeof request.body?.organizationId === "string"
					? request.body.organizationId.trim()
					: undefined;
			if (!rawPhone) {
				reply.status(400);
				return { error: "PhoneRequired", message: "Укажите номер телефона." };
			}

			const smsConfigured = readSmsCredentialsFromEnv() !== null;
			/*
			 * Ветка для разработки. Условия, при которых она допустима, выполнены
			 * все три: она достижима ТОЛЬКО при явно названном режиме разработки
			 * (NODE_ENV=development либо test — см. developerLogFallbackAllowed
			 * выше; пустой и незнакомый NODE_ENV её больше не открывают), код в
			 * ней генерируется на каждый запрос тем же CSPRNG (никаких «0000»), и
			 * о её срабатывании громко пишется в журнал сервера. Код уходит ТОЛЬКО
			 * в журнал — в теле HTTP-ответа его нет даже здесь.
			 */
			const developerLogFallback =
				!smsConfigured && developerLogFallbackAllowed();

			/*
			 * Ответ, одинаковый для «пациент найден», «такого номера нет»,
			 * «номер принадлежит двум карточкам» и «код только что отправляли».
			 * Все поля — константы настройки сервера, они не зависят от того, что
			 * лежит в базе. Иначе публичный маршрут работает справочником: «есть ли
			 * у этой клиники пациент с таким телефоном» — а это медицинская тайна.
			 */
			const neutralAccepted = {
				status: "accepted" as const,
				message:
					"Если номер зарегистрирован в клинике, мы отправили на него код для входа.",
				codeLength: policy.codeLength,
				expiresInSeconds: policy.ttlSeconds,
				resendAfterSeconds: policy.resendCooldownSeconds,
				delivery: developerLogFallback
					? ("developer_log" as const)
					: ("sms" as const),
			};

			// Защита от брутфорса и флуд-атак на оператора связи (IP и Phone Rate Limiting)
			const rawIp =
				(request.headers["x-forwarded-for"] as string) ||
				request.ip ||
				request.socket?.remoteAddress ||
				"127.0.0.1";
			const clientIp =
				typeof rawIp === "string" ? rawIp.split(",")[0]?.trim() || "127.0.0.1" : "127.0.0.1";

			const rateLimitBypassed = process.env.DENTE_PORTAL_OTP_BYPASS_RATE_LIMIT === "1";

			if (!rateLimitBypassed) {
				const nowMs = Date.now();
				const hasExplicitForwardedIp = Boolean(request.headers["x-forwarded-for"]);
				const isDevLoopback =
					developerLogFallbackAllowed() &&
					!hasExplicitForwardedIp &&
					(clientIp === "127.0.0.1" || clientIp === "::1" || clientIp === "unknown");

				const effectiveMaxIp = isDevLoopback ? 100 : OTP_MAX_REQUESTS_PER_IP;
				const effectiveMaxPhone = isDevLoopback ? 100 : OTP_MAX_REQUESTS_PER_PHONE;

				const ipEntry = otpIpRequestCounts.get(clientIp);
				if (ipEntry && nowMs <= ipEntry.resetAt && ipEntry.count >= effectiveMaxIp) {
					reply.status(429);
					return {
						error: "TooManyRequests",
						message:
							"Слишком много запросов на отправку СМС с вашего IP-адреса. Пожалуйста, подождите 10 минут перед следующей попыткой.",
					};
				}
				if (!ipEntry || nowMs > ipEntry.resetAt) {
					otpIpRequestCounts.set(clientIp, { count: 1, resetAt: nowMs + OTP_RATE_LIMIT_WINDOW_MS });
				} else {
					ipEntry.count++;
				}

				const digits = rawPhone.replace(/\D/g, "");
				const phoneSuffix = digits.length >= 10 ? digits.slice(-10) : digits;
				const phoneEntry = otpPhoneRequestCounts.get(phoneSuffix);
				if (phoneEntry && nowMs <= phoneEntry.resetAt && phoneEntry.count >= effectiveMaxPhone) {
					// Не разглашаем факт блокировки номера, но защищаем баланс оператора:
					// возвращаем нейтральный статус 202 без отправки SMS
					reply.status(202);
					return neutralAccepted;
				}
				if (!phoneEntry || nowMs > phoneEntry.resetAt) {
					otpPhoneRequestCounts.set(phoneSuffix, { count: 1, resetAt: nowMs + OTP_RATE_LIMIT_WINDOW_MS });
				} else {
					phoneEntry.count++;
				}
			}

			if (!smsConfigured && !developerLogFallback) {
				request.log.error(
					{
						requiredEnv: [
							"DENTE_SMS_PROVIDER",
							"учётные данные выбранного SMS-провайдера",
						],
					},
					"Вход пациента в личный кабинет отклонён: SMS-шлюз не настроен в окружении сервера",
				);
				reply.status(503);
				return {
					error: "OtpDeliveryNotConfigured",
					message:
						"Вход в личный кабинет по коду из СМС сейчас не работает: клиника не подключила отправку СМС. Позвоните в клинику — записаться на приём и узнать план лечения можно у администратора.",
				};
			}

			const patient = await findUniquePatientByPhone(rawPhone, targetOrgId);
			if (!patient) {
				reply.status(202);
				return neutralAccepted;
			}

			const now = new Date();

			const throttledBeforeHashing = await withTenantCtx(
				patient.organizationId,
				async () =>
					isIssuanceThrottled(patient.organizationId, patient.id, policy, now),
			);
			if (throttledBeforeHashing) {
				reply.status(202);
				return neutralAccepted;
			}

			const code = generateNumericCode(policy.codeLength);
			const codeHash = await hashCredential(code);

			const issuance = await withTenantCtx(patient.organizationId, async () => {
				if (
					await isIssuanceThrottled(
						patient.organizationId,
						patient.id,
						policy,
						now,
					)
				) {
					return { throttled: true as const, issuedId: null };
				}

				// Уборка старья по этому же пациенту: без неё таблица растёт вечно.
				await db
					.delete(portalOtpCodes)
					.where(
						and(
							eq(portalOtpCodes.organizationId, patient.organizationId),
							eq(portalOtpCodes.patientId, patient.id),
							lt(
								portalOtpCodes.createdAt,
								new Date(now.getTime() - policy.retentionSeconds * 1000),
							),
						),
					);

				// Прежние действующие коды гасятся.
				await db
					.update(portalOtpCodes)
					.set({ consumedAt: now })
					.where(
						and(
							eq(portalOtpCodes.organizationId, patient.organizationId),
							eq(portalOtpCodes.patientId, patient.id),
							isNull(portalOtpCodes.consumedAt),
						),
					);

				const inserted = await db
					.insert(portalOtpCodes)
					.values({
						organizationId: patient.organizationId,
						patientId: patient.id,
						codeHash,
						channel: developerLogFallback ? "developer_log" : "sms",
						deliveryStatus: "pending",
						expiresAt: new Date(now.getTime() + policy.ttlSeconds * 1000),
					})
					.returning({ id: portalOtpCodes.id });
				return {
					throttled: false as const,
					issuedId: inserted[0]?.id ?? null,
				};
			});

			if (issuance.throttled) {
				reply.status(202);
				return neutralAccepted;
			}
			const issuedId = issuance.issuedId;
			if (!issuedId) {
				reply.status(500);
				return {
					error: "OtpNotIssued",
					message: "Не удалось выдать код входа. Повторите попытку.",
				};
			}

			if (developerLogFallback) {
				request.log.warn(
					{ portalOtpDeveloperCode: code, patientId: patient.id },
					"РЕЖИМ РАЗРАБОТКИ: SMS-шлюз не настроен, одноразовый код входа в личный кабинет выведен в журнал сервера и никому не отправлен. При NODE_ENV=production эта ветка недостижима.",
				);
				await withTenantCtx(patient.organizationId, async () => {
					await db
						.update(portalOtpCodes)
						.set({ deliveryStatus: "sent" })
						.where(
							and(
								eq(portalOtpCodes.id, issuedId),
								eq(portalOtpCodes.organizationId, patient.organizationId),
							),
						);
				});
				reply.status(202);
				return neutralAccepted;
			}

			const msisdn = normalizeRussianMsisdn(patient.phone);
			const credentials = await withTenantCtx(
				patient.organizationId,
				async () => resolveChannelCredentials(patient.organizationId),
			);

			const delivery =
				msisdn === null
					? {
							ok: false as const,
							errorClass: "recipient_unavailable" as const,
							errorMessage:
								"Номер в карточке пациента не приводится к формату оператора.",
						}
					: await sendThroughChannel(
							{
								channel: "sms",
								recipientAddress: msisdn,
								subject: null,
								body: renderOtpMessage(policy, code),
								idempotencyKey: `portal-otp:${issuedId}`,
							},
							credentials,
						);

			if (!delivery.ok) {
				await withTenantCtx(patient.organizationId, async () => {
					await db
						.update(portalOtpCodes)
						.set({
							deliveryStatus: "failed",
							deliveryErrorClass: delivery.errorClass,
						})
						.where(
							and(
								eq(portalOtpCodes.id, issuedId),
								eq(portalOtpCodes.organizationId, patient.organizationId),
							),
						);
				});
				request.log.error(
					{ patientId: patient.id, errorClass: delivery.errorClass },
					"Код входа в личный кабинет не отправлен: шлюз отказал",
				);
				reply.status(delivery.errorClass === "not_configured" ? 503 : 502);
				return {
					error: "OtpDeliveryFailed",
					errorClass: delivery.errorClass,
					message: `Не удалось отправить код: ${delivery.errorMessage}`,
				};
			}

			await withTenantCtx(patient.organizationId, async () => {
				await db
					.update(portalOtpCodes)
					.set({ deliveryStatus: "sent" })
					.where(
						and(
							eq(portalOtpCodes.id, issuedId),
							eq(portalOtpCodes.organizationId, patient.organizationId),
						),
					);
			});
			reply.status(202);
			return neutralAccepted;
		},
	);

	// 2. Verify OTP
	server.post<{ Body: { phone?: unknown; code?: unknown; organizationId?: unknown } }>(
		"/auth/verify-otp",
		async (request, reply) => {
			const invalidOtp = {
				error: "InvalidOtp",
				message: "Неверный или истёкший код. Запросите новый код.",
			};

			const rawPhone =
				typeof request.body?.phone === "string"
					? request.body.phone.trim()
					: "";
			const code =
				typeof request.body?.code === "string" ? request.body.code.trim() : "";
			const targetOrgId =
				typeof request.body?.organizationId === "string"
					? request.body.organizationId.trim()
					: undefined;
			if (!rawPhone || !code) {
				reply.status(400);
				return {
					error: "PhoneAndCodeRequired",
					message: "Укажите номер телефона и код из SMS.",
				};
			}

			const policy = readPortalOtpPolicy();
			const patient = await findUniquePatientByPhone(rawPhone, targetOrgId);
			if (!patient) {
				reply.status(401);
				return invalidOtp;
			}

			const now = new Date();

			const candidate = await withTenantCtx(
				patient.organizationId,
				async () => {
					const active = await db
						.select({
							id: portalOtpCodes.id,
							codeHash: portalOtpCodes.codeHash,
						})
						.from(portalOtpCodes)
						.where(
							and(
								eq(portalOtpCodes.organizationId, patient.organizationId),
								eq(portalOtpCodes.patientId, patient.id),
								eq(portalOtpCodes.deliveryStatus, "sent"),
								isNull(portalOtpCodes.consumedAt),
								gte(portalOtpCodes.expiresAt, now),
							),
						)
						.orderBy(desc(portalOtpCodes.createdAt))
						.limit(1);
					const found = active[0];
					if (!found) return null;

					const counted = await db
						.update(portalOtpCodes)
						.set({ attemptCount: sql`${portalOtpCodes.attemptCount} + 1` })
						.where(
							and(
								eq(portalOtpCodes.id, found.id),
								eq(portalOtpCodes.organizationId, patient.organizationId),
							),
						)
						.returning({ attemptCount: portalOtpCodes.attemptCount });
					const attemptNumber =
						counted[0]?.attemptCount ?? policy.maxAttempts + 1;

					if (attemptNumber > policy.maxAttempts) {
						await db
							.update(portalOtpCodes)
							.set({ consumedAt: now })
							.where(
								and(
									eq(portalOtpCodes.id, found.id),
									eq(portalOtpCodes.organizationId, patient.organizationId),
									isNull(portalOtpCodes.consumedAt),
								),
							);
						return null;
					}
					return found;
				},
			);
			if (!candidate) {
				reply.status(401);
				return invalidOtp;
			}

			if (!(await verifyCredential(code, candidate.codeHash))) {
				reply.status(401);
				return invalidOtp;
			}

			const consumed = await withTenantCtx(patient.organizationId, async () =>
				db
					.update(portalOtpCodes)
					.set({ consumedAt: now })
					.where(
						and(
							eq(portalOtpCodes.id, candidate.id),
							eq(portalOtpCodes.organizationId, patient.organizationId),
							isNull(portalOtpCodes.consumedAt),
						),
					)
					.returning({ id: portalOtpCodes.id }),
			);
			if (consumed.length !== 1) {
				reply.status(401);
				return invalidOtp;
			}

			const token = signToken(
				{
					sub: patient.id,
					organizationId: patient.organizationId,
					kind: PORTAL_TOKEN_KIND,
				},
				requireAuthTokenSecret(),
				PORTAL_TOKEN_TTL_SECONDS,
			);

			return { success: true, token, patientId: patient.id };
		},
	);

	// 2.1. Logout / Session Revocation (Protected)
	server.post("/auth/logout", async (request, reply) => {
		const authHeader = request.headers.authorization;
		if (!authHeader?.startsWith("Bearer ")) {
			reply.status(401);
			return { error: "Unauthorized", message: "Токен авторизации не предоставлен." };
		}

		const token = authHeader.slice("Bearer ".length).trim();
		if (!token) {
			reply.status(401);
			return { error: "Unauthorized", message: "Токен авторизации не предоставлен." };
		}

		if (revokedPortalTokens.has(token)) {
			reply.status(401);
			return { error: "SessionRevoked", message: "Сессия уже завершена." };
		}

		const payload = verifyToken(token, requireAuthTokenSecret());
		if (
			!payload ||
			payload.kind !== PORTAL_TOKEN_KIND ||
			typeof payload.sub !== "string" ||
			typeof payload.organizationId !== "string"
		) {
			reply.status(401);
			return { error: "InvalidToken", message: "Недействительный токен сессии." };
		}

		const patientId = payload.sub;
		const organizationId = payload.organizationId;
		const nowSeconds = Math.floor(Date.now() / 1000);
		const nowIso = new Date().toISOString();

		// Revoke in-memory active token and record revocation threshold for patient
		revokedPortalTokens.add(token);
		portalRevokedBeforeByPatient.set(patientId, nowSeconds);

		// Record revocation timestamp in patient's administrative profile for audit trails
		await withTenantCtx(organizationId, async () => {
			const [patientRow] = await db
				.select({ administrativeProfile: patients.administrativeProfile })
				.from(patients)
				.where(and(eq(patients.id, patientId), eq(patients.organizationId, organizationId)))
				.limit(1);

			if (patientRow) {
				const currentProfile =
					(patientRow.administrativeProfile as Record<string, unknown> | null) || {};
				await db
					.update(patients)
					.set({
						administrativeProfile: {
							...currentProfile,
							portalSessionRevokedAt: nowIso,
						} as any,
						updatedAt: new Date(),
					})
					.where(and(eq(patients.id, patientId), eq(patients.organizationId, organizationId)));
			}
		});

		return {
			success: true,
			message: "Сессия успешно завершена.",
			revokedAt: nowIso,
		};
	});
}
