import { timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { db } from "../db/client.js";
import { portalBudgetTokens } from "../db/schema.js";
import {
	LOCKOUT_DURATION_MS,
	MAX_VERIFY_ATTEMPTS,
	createSessionToken,
	hashIp,
	maskPhone,
	validateSessionToken,
} from "../services/budget/budgetSecurityService.js";
import {
	signBodySchema,
	verifyBodySchema,
} from "../services/budget/budgetSchemas.js";
import { completeBudgetSigning } from "../services/budget/budgetSigningService.js";

export { maskPhone };

export const publicBudgetRoutes: FastifyPluginAsync = async (server) => {
	// 1. GET /api/v1/public/budgets/:token — публичные данные сметы
	// ИНВАРИАНТ БЕЗОПАСНОСТИ: ZERO DATA LEAKS prior to phone verification.
	// Без подтверждения номера НЕ отдаются услуги, цены, скидки, ФИО врача и пациента!
	server.get<{ Params: { token: string } }>(
		"/api/v1/public/budgets/:token",
		async (request, reply) => {
			const token = request.params.token?.trim();
			if (!token) {
				return reply.code(400).send({ error: "TokenRequired", message: "Укажите токен сметы." });
			}

			const [budget] = await db
				.select()
				.from(portalBudgetTokens)
				.where(eq(portalBudgetTokens.token, token))
				.limit(1);

			if (!budget) {
				return reply.code(404).send({
					error: "BudgetNotFound",
					message: "Смета не найдена или срок действия ссылки истёк.",
				});
			}

			// Проверка активного таймаута блокировки (15 минут)
			const now = Date.now();
			const isLocked =
				budget.isLocked && budget.lockedUntil && budget.lockedUntil.getTime() > now;

			// Проверка сессионного токена (Bearer token или cookie)
			const authHeader = request.headers.authorization;
			let sessionToken = authHeader?.startsWith("Bearer ")
				? authHeader.slice("Bearer ".length).trim()
				: undefined;

			if (!sessionToken) {
				const cookieHeader = request.headers.cookie || "";
				const cookieMatch = cookieHeader.match(new RegExp(`pub_bdg_session_${token}=([^;]+)`));
				if (cookieMatch && cookieMatch[1]) {
					sessionToken = cookieMatch[1];
				}
			}

			const isSigned = budget.status === "accepted";
			let isVerified = budget.authMethod === "none" || isSigned;
			if (!isVerified && sessionToken) {
				isVerified = validateSessionToken(sessionToken, budget.patientId, budget.token);
			}

			const masked = maskPhone(budget.patientPhone);

			// ФИКСАЦИЯ ПЕРВОГО ОТКРЫТИЯ (viewed)
			if (!budget.viewedAt) {
				const viewedIso = new Date();
				await db
					.update(portalBudgetTokens)
					.set({
						viewedAt: viewedIso,
						status: budget.status === "sent" ? "viewed" : budget.status,
						updatedAt: viewedIso,
					})
					.where(eq(portalBudgetTokens.token, token));
			}

			// ЕСЛИ ЛИЧНОСТЬ НЕ ВЕРИФИЦИРОВАНА — НОЛЬ УТЕЧЕК!
			if (!isVerified) {
				return reply.code(200).send({
					token: budget.token,
					status: budget.status === "sent" ? "viewed" : budget.status,
					clinicName: budget.clinicName,
					clinicPhone: budget.clinicPhone,
					clinicAddress: budget.clinicAddress,
					requiresVerification: true,
					isVerified: false,
					maskedPhone: masked,
					authMethod: budget.authMethod,
					failedAttempts: budget.failedAttempts,
					isLocked,
					lockedUntil: isLocked && budget.lockedUntil ? budget.lockedUntil.toISOString() : null,
				});
			}

			// ВЕРИФИЦИРОВАННЫЙ ДОСТУП — ПОЛНАЯ РАСШИФРОВКА СМЕТЫ
			const rawItems = Array.isArray(budget.items) ? budget.items : [];
			return reply.code(200).send({
				token: budget.token,
				planId: budget.planId,
				status: budget.status,
				clinicName: budget.clinicName,
				clinicPhone: budget.clinicPhone,
				clinicAddress: budget.clinicAddress,
				doctorName: budget.doctorName,
				patientFirstName: budget.patientFirstName,
				maskedPhone: masked,
				items: rawItems,
				totalPriceRub: Number(budget.totalPriceRub) || 0,
				discountRub: Number(budget.discountRub) || 0,
				netTotalRub: Number(budget.netTotalRub) || 0,
				currency: budget.currency || "RUB",
				requiresVerification: false,
				isVerified: true,
				signedAt: budget.signedAt ? budget.signedAt.toISOString() : null,
				signerName: budget.signerName,
				documentHash: budget.documentHash,
				validUntil: budget.validUntil ? budget.validUntil.toISOString() : null,
			});
		},
	);

	// 2. POST /api/v1/public/budgets/:token/verify & /verify-pin — 2FA подтверждение по последним 4 цифрам телефона или PIN
	const verifyHandler = async (
		request: any,
		reply: any,
	) => {
		const token = (request.params as { token?: string })?.token?.trim();
		if (!token) {
			return reply.code(400).send({ error: "TokenRequired", message: "Укажите токен сметы." });
		}

		const parsed = verifyBodySchema.safeParse(request.body || {});
		if (!parsed.success) {
			return reply.code(400).send({
				error: "InvalidVerificationPayload",
				message: "Некорректный формат ввода цифр телефона или PIN-кода.",
			});
		}

		const [budget] = await db
			.select()
			.from(portalBudgetTokens)
			.where(eq(portalBudgetTokens.token, token))
			.limit(1);

		if (!budget) {
			return reply.code(404).send({
				error: "BudgetNotFound",
				message: "Смета не найдена или срок действия ссылки истёк.",
			});
		}

		if (budget.status === "accepted") {
			return reply.code(409).send({
				error: "AlreadyAccepted",
				message: "Смета уже успешно согласована и подписана.",
			});
		}

		const rawIp =
			(request.headers["x-forwarded-for"] as string) ||
			request.ip ||
			"127.0.0.1";
		const clientIp = rawIp.split(",")[0]?.trim() || "127.0.0.1";
		const clientIpHash = hashIp(clientIp);

		const now = Date.now();
		if (budget.isLocked && budget.lockedUntil && budget.lockedUntil.getTime() > now) {
			return reply.code(429).send({
				error: "RateLimited",
				message: `Превышено число попыток ввода (максимум ${MAX_VERIFY_ATTEMPTS}). Доступ временно заблокирован на 15 минут.`,
				isLocked: true,
				remainingAttempts: 0,
				ipHash: clientIpHash,
			});
		}

		const inputDigits = (
			parsed.data.pin ??
			parsed.data.code ??
			parsed.data.phoneDigits ??
			parsed.data.phone_last4 ??
			parsed.data.value ??
			""
		)
			.replace(/\D/g, "")
			.trim();

		if (!inputDigits || inputDigits.length < 4) {
			return reply.code(400).send({
				error: "InvalidVerificationPayload",
				message: "Необходимо указать последние 4 цифры номера телефона или 4-значный PIN-код.",
			});
		}

		const cleanPatientPhone = (budget.patientPhone || "").replace(/\D/g, "");
		const expectedLast4 = cleanPatientPhone.slice(-4);

		let isMatch = false;
		if (budget.authMethod === "none") {
			isMatch = true;
		} else if (cleanPatientPhone.length >= 4 && inputDigits.length === 4) {
			isMatch = timingSafeEqual(
				Buffer.from(inputDigits),
				Buffer.from(expectedLast4),
			);
		}

		if (!isMatch) {
			const nextFailures = (budget.failedAttempts || 0) + 1;
			const remaining = Math.max(0, MAX_VERIFY_ATTEMPTS - nextFailures);
			const willLock = nextFailures >= MAX_VERIFY_ATTEMPTS;
			const lockedUntil = willLock ? new Date(now + LOCKOUT_DURATION_MS) : null;

			await db
				.update(portalBudgetTokens)
				.set({
					failedAttempts: nextFailures,
					totalFailures: (budget.totalFailures || 0) + 1,
					isLocked: willLock,
					lockedUntil,
					updatedAt: new Date(),
				})
				.where(eq(portalBudgetTokens.token, token));

			if (willLock) {
				return reply.code(429).send({
					error: "RateLimited",
					message: `Превышено число попыток ввода (максимум ${MAX_VERIFY_ATTEMPTS}). Доступ заблокирован на 15 минут.`,
					isLocked: true,
					remainingAttempts: 0,
					ipHash: clientIpHash,
				});
			}

			return reply.code(401).send({
				error: "VerificationFailed",
				message: `Неверные последние 4 цифры номера телефона или PIN. Осталось попыток: ${remaining}`,
				remainingAttempts: remaining,
				ipHash: clientIpHash,
			});
		}

		// УСПЕШНОЕ ПОДТВЕРЖДЕНИЕ
		await db
			.update(portalBudgetTokens)
			.set({
				failedAttempts: 0,
				isLocked: false,
				lockedUntil: null,
				updatedAt: new Date(),
			})
			.where(eq(portalBudgetTokens.token, token));

		const sessionToken = createSessionToken(budget.patientId, budget.token);
		reply.header(
			"Set-Cookie",
			`pub_bdg_session_${token}=${sessionToken}; Path=/; HttpOnly; SameSite=Strict; Max-Age=1800`,
		);

		return reply.code(200).send({
			success: true,
			sessionToken,
			isVerified: true,
			ipHash: clientIpHash,
		});
	};

	server.post<{ Params: { token: string } }>(
		"/api/v1/public/budgets/:token/verify",
		verifyHandler,
	);
	server.post<{ Params: { token: string } }>(
		"/api/v1/public/budgets/:token/verify-pin",
		verifyHandler,
	);

	// 3. POST /api/v1/public/budgets/:token/sign — сохранение цифровой подписи пациента (Canvas PNG, хеш IP, аудит)
	server.post<{ Params: { token: string } }>(
		"/api/v1/public/budgets/:token/sign",
		async (request, reply) => {
			const token = request.params.token?.trim();
			if (!token) {
				return reply.code(400).send({ error: "TokenRequired", message: "Укажите токен сметы." });
			}

			const parsed = signBodySchema.safeParse(request.body || {});
			if (!parsed.success) {
				return reply.code(400).send({
					error: "InvalidSignatureData",
					message: "Необходимо передать графическую подпись пациента (Canvas PNG Base64).",
				});
			}

			const [budget] = await db
				.select()
				.from(portalBudgetTokens)
				.where(eq(portalBudgetTokens.token, token))
				.limit(1);

			if (!budget) {
				return reply.code(404).send({
					error: "BudgetNotFound",
					message: "Смета не найдена.",
				});
			}

			if (budget.status === "accepted") {
				return reply.code(200).send({
					success: true,
					status: "accepted",
					signedAt: budget.signedAt ? budget.signedAt.toISOString() : null,
					documentHash: budget.documentHash,
					signerName: budget.signerName,
				});
			}

			// Проверка сессии при требовании верификации
			if (budget.authMethod !== "none") {
				const authHeader = request.headers.authorization;
				let sessionToken = authHeader?.startsWith("Bearer ")
					? authHeader.slice("Bearer ".length).trim()
					: undefined;

				if (!sessionToken) {
					const cookieHeader = request.headers.cookie || "";
					const cookieMatch = cookieHeader.match(new RegExp(`pub_bdg_session_${token}=([^;]+)`));
					if (cookieMatch && cookieMatch[1]) {
						sessionToken = cookieMatch[1];
					}
				}

				const isAuthed = sessionToken
					? validateSessionToken(sessionToken, budget.patientId, budget.token)
					: false;

				if (!isAuthed) {
					return reply.code(401).send({
						error: "VerificationRequired",
						message: "Необходимо подтвердить номер телефона перед подписанием сметы.",
					});
				}
			}

			const rawIp =
				(request.headers["x-forwarded-for"] as string) ||
				request.ip ||
				"127.0.0.1";
			const clientIp = rawIp.split(",")[0]?.trim() || "127.0.0.1";
			const clientIpHash = hashIp(clientIp);
			const userAgent = request.headers["user-agent"] || "unknown";

			const signingResult = await completeBudgetSigning({
				budget,
				parsedSignData: parsed.data,
				clientIp,
				clientIpHash,
				userAgent,
				log: request.log,
			});

			return reply.code(200).send({
				success: true,
				status: "accepted",
				signedAt: signingResult.signedAt.toISOString(),
				documentHash: signingResult.documentHash,
				signerName: signingResult.signerName,
				ipHash: clientIpHash,
			});
		},
	);
};
