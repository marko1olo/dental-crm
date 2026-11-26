import { and, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { requireAuthTokenSecret } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { withSuperuserBypass, withTenantCtx } from "../../db/rls.js";
import { organizations, patients, portalOtpCodes } from "../../db/schema.js";
import { readSmsCredentialsFromEnv } from "../../smsTransport.js";
import {
	hashCredential,
	signToken,
	verifyCredential,
	verifyToken,
} from "../../utils/cryptoHelper.js";
import { normalizePatientAdministrativeProfile } from "../../utils/patientAdministrativeProfile.js";
import {
	dispatchPortalOtpSms,
	findPatientsByPhone,
	findPendingRegistrationOtp,
	findUniquePatientByPhone,
	getPendingRegistrationOtpKey,
	hashPortalToken,
	isIssuanceThrottled,
	markPortalOtpDeliveryStatus,
	otpIpRequestCounts,
	otpPhoneRequestCounts,
	pendingRegistrationOtpStore,
	persistRevokedToken,
	portalRevokedBeforeByPatient,
	revokedPortalTokenHashes,
	revokedPortalTokens,
	setPendingRegistrationOtpAttemptOrConsumed,
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
	sendOtpBodySchema,
	verifyOtpBodySchema,
} from "./types.js";

function getPortalOtpRateLimitKey(req: FastifyRequest, prefix: string): string {
	const ip = req.ip ?? "unknown";
	const body = req.body as { phone?: unknown } | undefined;
	const rawPhone = typeof body?.phone === "string" ? body.phone.trim().replace(/\D/g, "") : "";
	const phoneSuffix = rawPhone.length >= 10 ? rawPhone.slice(-10) : (rawPhone || "no-phone");
	return `${prefix}|${ip}|${phoneSuffix}`;
}

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
					keyGenerator: (req: FastifyRequest) => getPortalOtpRateLimitKey(req, "portal-otp"),
				},
			},
		},
		async (request, reply) => {
			const parsedBody = sendOtpBodySchema.safeParse(request.body ?? {});
			if (!parsedBody.success) {
				reply.status(400);
				return {
					error: "ValidationError",
					message: "Некорректные параметры запроса отправки кода.",
					details: parsedBody.error.format(),
				};
			}
			const policy = readPortalOtpPolicy();
			const rawPhone = parsedBody.data.phone?.trim() ?? "";
			const targetOrgId = parsedBody.data.organizationId?.trim() || undefined;
			if (!rawPhone) {
				reply.status(400);
				return { error: "PhoneRequired", message: "Укажите номер телефона." };
			}

			const smsConfigured = readSmsCredentialsFromEnv() !== null;
			// Ветка разработки: только при явном NODE_ENV=development/test, код выводится в журнал
			const developerLogFallback = !smsConfigured && developerLogFallbackAllowed();

			// Нейтральный ответ, одинаковый для существующего и несуществующего пациента (152-ФЗ)
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

			const rateLimitBypassed =
				process.env.DENTE_PORTAL_OTP_BYPASS_RATE_LIMIT === "1" &&
				process.env.NODE_ENV !== "production";

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
				// Авторизация нового пациента: генерируем OTP и отправляем SMS/лог с кодом для первичной регистрации
				let effectiveOrgId: string | null = null;
				if (
					targetOrgId &&
					/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetOrgId)
				) {
					const [matchedOrg] = await withSuperuserBypass(async (tx) =>
						tx
							.select({ id: organizations.id })
							.from(organizations)
							.where(eq(organizations.id, targetOrgId))
							.limit(1),
					);
					if (matchedOrg) {
						effectiveOrgId = matchedOrg.id;
					}
				}
				if (!effectiveOrgId) {
					// Мультитенантность: запрещено привязывать нового пациента к случайной клинике через LIMIT 1!
					// Для регистрации нового пациента в ЛК требуется явный organizationId клиники.
					reply.status(202);
					return neutralAccepted;
				}

				const phoneDigits = rawPhone.replace(/\D/g, "");
				const phoneSuffix = phoneDigits.length >= 10 ? phoneDigits.slice(-10) : phoneDigits;
				const pendingKey = getPendingRegistrationOtpKey(phoneSuffix, effectiveOrgId);
				const existingPending = pendingRegistrationOtpStore.get(pendingKey);
				const now = new Date();

				if (
					existingPending &&
					existingPending.expiresAt.getTime() > now.getTime() &&
					now.getTime() - (existingPending.expiresAt.getTime() - policy.ttlSeconds * 1000) <
						policy.resendCooldownSeconds * 1000
				) {
					reply.status(202);
					return neutralAccepted;
				}

				const regCode = generateNumericCode(policy.codeLength);
				const regCodeHash = await hashCredential(regCode);
				const otpExpiresAt = new Date(now.getTime() + policy.ttlSeconds * 1000);

				const [insertedRegOtp] = await withTenantCtx(effectiveOrgId, async (tx) =>
					tx
						.insert(portalOtpCodes)
						.values({
							organizationId: effectiveOrgId,
							patientId: null,
							phone: phoneSuffix,
							codeHash: regCodeHash,
							channel: developerLogFallback ? "developer_log" : "sms",
							deliveryStatus: "pending",
							expiresAt: otpExpiresAt,
							attemptCount: 0,
						})
						.returning({ id: portalOtpCodes.id }),
				);
				const regOtpId = insertedRegOtp?.id;

				pendingRegistrationOtpStore.set(pendingKey, {
					phoneSuffix,
					rawPhone,
					codeHash: regCodeHash,
					organizationId: effectiveOrgId,
					expiresAt: otpExpiresAt,
					attemptCount: 0,
				});

				if (developerLogFallback) {
					await markPortalOtpDeliveryStatus(effectiveOrgId, regOtpId, "sent");
					request.log.warn(
						{ portalOtpDeveloperCode: regCode, rawPhone, isNewPatientRegistration: true },
						"РЕЖИМ РАЗРАБОТКИ: SMS-шлюз не настроен, одноразовый код для регистрации нового пациента в личном кабинете выведен в журнал сервера и никому не отправлен.",
					);
					reply.status(202);
					return neutralAccepted;
				}

				const delivery = await dispatchPortalOtpSms({
					organizationId: effectiveOrgId,
					otpId: regOtpId,
					rawPhone,
					invalidPhoneMessage: "Номер в запросе не приводится к формату оператора.",
					messageBody: renderOtpMessage(policy, regCode),
					idempotencyKey: `portal-reg-otp:${regOtpId ?? phoneSuffix}:${otpExpiresAt.getTime()}`,
				});

				if (!delivery.ok) {
					pendingRegistrationOtpStore.delete(pendingKey);
					request.log.error(
						{ rawPhone, errorClass: delivery.errorClass },
						"Код регистрации нового пациента в личный кабинет не отправлен: шлюз отказал",
					);
					reply.status(delivery.errorClass === "not_configured" ? 503 : 502);
					return {
						error: "OtpDeliveryFailed",
						errorClass: delivery.errorClass,
						message: `Не удалось отправить код: ${delivery.errorMessage}`,
					};
				}

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

			const issuance = await withTenantCtx(patient.organizationId, async (tx) => {
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
				await tx
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
				await tx
					.update(portalOtpCodes)
					.set({ consumedAt: now })
					.where(
						and(
							eq(portalOtpCodes.organizationId, patient.organizationId),
							eq(portalOtpCodes.patientId, patient.id),
							isNull(portalOtpCodes.consumedAt),
						),
					);

				const inserted = await tx
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
				await markPortalOtpDeliveryStatus(patient.organizationId, issuedId, "sent");
				reply.status(202);
				return neutralAccepted;
			}

			const delivery = await dispatchPortalOtpSms({
				organizationId: patient.organizationId,
				otpId: issuedId,
				rawPhone: patient.phone,
				invalidPhoneMessage: "Номер в карточке пациента не приводится к формату оператора.",
				messageBody: renderOtpMessage(policy, code),
				idempotencyKey: `portal-otp:${issuedId}`,
			});

			if (!delivery.ok) {
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

			reply.status(202);
			return neutralAccepted;
		},
	);

	// 2. Verify OTP (защищен составным лимитером по связке IP + phone_number)
	server.post<{ Body: { phone?: unknown; code?: unknown; organizationId?: unknown } }>(
		"/auth/verify-otp",
		{
			config: {
				rateLimit: {
					max: 10,
					timeWindow: "1 minute",
					hook: "preHandler",
					keyGenerator: (req: FastifyRequest) => getPortalOtpRateLimitKey(req, "portal-verify-otp"),
				},
			},
		},
		async (request, reply) => {
			const invalidOtp = {
				error: "InvalidOtp",
				message: "Неверный или истёкший код. Запросите новый код.",
			};

			const parsedBody = verifyOtpBodySchema.safeParse(request.body ?? {});
			if (!parsedBody.success) {
				reply.status(400);
				return {
					error: "ValidationError",
					message: "Некорректные параметры проверки кода.",
					details: parsedBody.error.issues,
				};
			}

			const rawPhone = parsedBody.data.phone?.trim() ?? "";
			const code = parsedBody.data.code?.trim() ?? "";
			const targetOrgId = parsedBody.data.organizationId?.trim() || undefined;
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
				const phoneDigits = rawPhone.replace(/\D/g, "");
				const phoneSuffix = phoneDigits.length >= 10 ? phoneDigits.slice(-10) : phoneDigits;
				const now = new Date();

				// Persistent PostgreSQL 18 check first, fallback to memory
				const pendingReg = await findPendingRegistrationOtp(phoneSuffix, targetOrgId, now);
				const pendingKey = getPendingRegistrationOtpKey(
					phoneSuffix,
					pendingReg?.organizationId ?? targetOrgId,
				);

				if (!pendingReg || pendingReg.expiresAt.getTime() < now.getTime()) {
					pendingRegistrationOtpStore.delete(pendingKey);
					reply.status(401);
					return invalidOtp;
				}

				if (pendingReg.attemptCount >= policy.maxAttempts) {
					if ("id" in pendingReg) {
						await setPendingRegistrationOtpAttemptOrConsumed(pendingReg.organizationId, pendingReg.id, { consumedAt: now });
					}
					pendingRegistrationOtpStore.delete(pendingKey);
					reply.status(401);
					return invalidOtp;
				}

				if ("id" in pendingReg) {
					await setPendingRegistrationOtpAttemptOrConsumed(pendingReg.organizationId, pendingReg.id, { attemptCount: pendingReg.attemptCount + 1 });
				} else {
					pendingReg.attemptCount += 1;
				}

				const isCodeValid = await verifyCredential(code, pendingReg.codeHash);
				if (!isCodeValid) {
					reply.status(401);
					return invalidOtp;
				}

				if ("id" in pendingReg) {
					await setPendingRegistrationOtpAttemptOrConsumed(pendingReg.organizationId, pendingReg.id, { consumedAt: now });
				}
				pendingRegistrationOtpStore.delete(pendingKey);

				// Предотвращение дубликатов и пустышек "Пациент" при повторной или семейной верификации
				const existingPatients = await findPatientsByPhone(rawPhone, pendingReg.organizationId);
				const matchedExisting =
					existingPatients.find((p) => p.isFamilyHead) ||
					existingPatients.find((p) => p.fullName.trim() !== "Пациент" && p.fullName.trim().length > 0) ||
					existingPatients[0];

				if (matchedExisting) {
					const token = signToken(
						{
							sub: matchedExisting.id,
							organizationId: matchedExisting.organizationId,
							kind: PORTAL_TOKEN_KIND,
						},
						requireAuthTokenSecret(),
						PORTAL_TOKEN_TTL_SECONDS,
					);
					return { success: true, token, patientId: matchedExisting.id, isNewPatient: false };
				}

				const newPatient = await withTenantCtx(pendingReg.organizationId, async (tx) => {
					const [created] = await tx
						.insert(patients)
						.values({
							organizationId: pendingReg.organizationId,
							fullName: "Пациент",
							phone: rawPhone,
							status: "active",
							administrativeProfile: normalizePatientAdministrativeProfile(null),
						})
						.returning({ id: patients.id, organizationId: patients.organizationId });
					return created;
				});

				if (!newPatient) {
					reply.status(500);
					return {
						error: "PatientCreationFailed",
						message: "Не удалось создать карточку пациента. Пожалуйста, повторите попытку.",
					};
				}

				const token = signToken(
					{
						sub: newPatient.id,
						organizationId: newPatient.organizationId,
						kind: PORTAL_TOKEN_KIND,
					},
					requireAuthTokenSecret(),
					PORTAL_TOKEN_TTL_SECONDS,
				);

				return { success: true, token, patientId: newPatient.id, isNewPatient: true };
			}

			const now = new Date();

			const candidate = await withTenantCtx(
				patient.organizationId,
				async (tx) => {
					const active = await tx
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

					const counted = await tx
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
						await tx
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

			const consumed = await withTenantCtx(patient.organizationId, async (tx) =>
				tx
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

			return { success: true, token, patientId: patient.id, isNewPatient: false };
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

		if (
			revokedPortalTokens.has(token) ||
			revokedPortalTokenHashes.has(hashPortalToken(token))
		) {
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

		// Revoke active token in PostgreSQL and memory
		await persistRevokedToken(
			token,
			patientId,
			organizationId,
			new Date(Date.now() + 30 * 24 * 3600 * 1000),
		);
		portalRevokedBeforeByPatient.set(patientId, nowSeconds);

		// Record revocation timestamp in patient's administrative profile for audit trails
		await withTenantCtx(organizationId, async (tx) => {
			const [patientRow] = await tx
				.select({ administrativeProfile: patients.administrativeProfile })
				.from(patients)
				.where(and(eq(patients.id, patientId), eq(patients.organizationId, organizationId)))
				.limit(1);

			if (patientRow) {
				const currentProfile = patientRow.administrativeProfile ?? {};
				await tx
					.update(patients)
					.set({
						administrativeProfile: {
							...currentProfile,
							portalSessionRevokedAt: nowIso,
						},
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
