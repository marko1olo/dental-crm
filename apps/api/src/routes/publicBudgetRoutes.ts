import { timingSafeEqual } from "node:crypto";
import { rublesToKopecks } from "@dental/shared";
import { and, eq, isNull } from "drizzle-orm";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { definePublicRoute } from "../core/routeFactories.js";
import { onTenantTxCommit, withSuperuserBypass, withTenantWriteCtx } from "../db/rls.js";
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
import { loadPublicBudgetTiersSummary } from "../services/budget/budgetTiersSummary.js";
import { wsBroker } from "../services/websocketBroker.js";

export { maskPhone };

function extractCookieValue(cookieHeader: string | undefined, cookieName: string): string | undefined {
	if (!cookieHeader) return undefined;
	const prefix = `${cookieName}=`;
	for (const rawPart of cookieHeader.split(";")) {
		const part = rawPart.trim();
		if (part.startsWith(prefix)) {
			const val = part.slice(prefix.length).trim();
			return val || undefined;
		}
	}
	return undefined;
}

export const publicBudgetRoutes: FastifyPluginAsync = async (server) => {
	// 1. GET /api/v1/public/budgets/:token & /api/portal/budget/:token — публичные данные сметы
	// ИНВАРИАНТ БЕЗОПАСНОСТИ: ZERO DATA LEAKS prior to phone verification.
	// Без подтверждения номера НЕ отдаются услуги, цены, скидки, ФИО врача и пациента!
	const getBudgetHandler = async (
		request: FastifyRequest<{ Params: { token: string } }>,
		reply: FastifyReply,
	) => {
			const token = request.params.token?.trim();
			if (!token) {
				return reply.code(400).send({ error: "TokenRequired", message: "Укажите токен сметы." });
			}

			const [budget] = await withSuperuserBypass(async (tx) =>
				tx
					.select()
					.from(portalBudgetTokens)
					.where(eq(portalBudgetTokens.token, token))
					.limit(1),
			);

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
				sessionToken = extractCookieValue(
					request.headers.cookie,
					`pub_bdg_session_${token}`,
				);
			}

			let isVerified = budget.authMethod === "none";
			if (!isVerified && sessionToken) {
				isVerified = validateSessionToken(sessionToken, budget.patientId, budget.token);
			}

			const masked = maskPhone(budget.patientPhone);

			// ЕСЛИ ЛИЧНОСТЬ НЕ ВЕРИФИЦИРОВАНА — НОЛЬ УТЕЧЕК!
			if (!isVerified) {
				return reply.code(200).send({
					token: budget.token,
					status: budget.status,
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
			const rawItems = Array.isArray(budget.items)
				? (budget.items as Array<Record<string, unknown>>).map((it) => {
						const priceKopecks =
							typeof it.priceKopecks === "number" || typeof it.priceKopecks === "bigint"
								? Number(it.priceKopecks)
								: rublesToKopecks(Number(it.priceRub) || 0);
						const discountKopecks =
							typeof it.discountKopecks === "number" || typeof it.discountKopecks === "bigint"
								? Number(it.discountKopecks)
								: rublesToKopecks(Number(it.discountRub) || 0);
						return {
							...it,
							priceKopecks,
							discountKopecks,
						};
					})
				: [];

			const totalPriceKopecks =
				typeof budget.totalPriceKopecks === "bigint" || typeof budget.totalPriceKopecks === "number"
					? Number(budget.totalPriceKopecks)
					: rublesToKopecks(Number(budget.totalPriceRub) || 0);
			const discountKopecks =
				typeof budget.discountKopecks === "bigint" || typeof budget.discountKopecks === "number"
					? Number(budget.discountKopecks)
					: rublesToKopecks(Number(budget.discountRub) || 0);
			const netTotalKopecks =
				typeof budget.netTotalKopecks === "bigint" || typeof budget.netTotalKopecks === "number"
					? Number(budget.netTotalKopecks)
					: rublesToKopecks(Number(budget.netTotalRub) || 0);

			const { tiersSummary, selectedTierId } =
				await loadPublicBudgetTiersSummary({
					organizationId: budget.organizationId,
					planId: budget.planId,
					baseNetTotalKopecks: netTotalKopecks,
					baseDiscountKopecks: discountKopecks,
				});

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
				totalPriceKopecks,
				discountKopecks,
				netTotalKopecks,
				tiersSummary,
				selectedTierId,
				currency: budget.currency || "RUB",
				requiresVerification: false,
				isVerified: true,
				signedAt: budget.signedAt ? budget.signedAt.toISOString() : null,
				signerName: budget.signerName,
				documentHash: budget.documentHash,
				validUntil: budget.validUntil ? budget.validUntil.toISOString() : null,
			});
	};

	definePublicRoute(server, {
		method: "GET",
		path: "/api/v1/public/budgets/:token",
		handler: async ({ request, reply }) =>
			getBudgetHandler(
				request as FastifyRequest<{ Params: { token: string } }>,
				reply,
			),
	});
	definePublicRoute(server, {
		method: "GET",
		path: "/api/portal/budget/:token",
		handler: async ({ request, reply }) =>
			getBudgetHandler(
				request as FastifyRequest<{ Params: { token: string } }>,
				reply,
			),
	});

	// 1b. POST /api/v1/public/budgets/:token/view & /api/portal/budget/:token/view — явная фиксация первого просмотра сметы
	const markBudgetViewedHandler = async (
		request: FastifyRequest<{ Params: { token: string } }>,
		reply: FastifyReply,
	) => {
		const token = request.params.token?.trim();
		if (!token) {
			return reply.code(400).send({ error: "TokenRequired", message: "Укажите токен сметы." });
		}

		const [budget] = await withSuperuserBypass(async (tx) =>
			tx
				.select()
				.from(portalBudgetTokens)
				.where(eq(portalBudgetTokens.token, token))
				.limit(1),
		);

		if (!budget) {
			return reply.code(404).send({
				error: "BudgetNotFound",
				message: "Смета не найдена или срок действия ссылки истёк.",
			});
		}

		const viewedAt = budget.viewedAt ?? new Date();
		const nextStatus = budget.status === "sent" ? "viewed" : budget.status;
		if (!budget.viewedAt) {
			await withTenantWriteCtx(budget.organizationId, async (tx) => {
				const updated = await tx
					.update(portalBudgetTokens)
					.set({
						viewedAt,
						status: nextStatus,
						updatedAt: viewedAt,
					})
					.where(
						and(
							eq(portalBudgetTokens.token, token),
							eq(portalBudgetTokens.organizationId, budget.organizationId),
							isNull(portalBudgetTokens.viewedAt),
						),
					)
					.returning({ token: portalBudgetTokens.token });

				if (updated.length > 0) {
					onTenantTxCommit(() => {
						wsBroker.broadcastToOrganization(budget.organizationId, {
							type: "TREATMENT_PLAN_VIEWED",
							payload: {
								token: budget.token,
								planId: budget.planId,
								patientId: budget.patientId,
								patientFirstName: budget.patientFirstName,
								clinicName: budget.clinicName,
								viewedAt: viewedAt.toISOString(),
								netTotalKopecks:
									typeof budget.netTotalKopecks === "bigint" || typeof budget.netTotalKopecks === "number"
										? Number(budget.netTotalKopecks)
										: rublesToKopecks(Number(budget.netTotalRub) || 0),
							},
						});
					});
				}
			});
		}

		return reply.code(200).send({
			success: true,
			token: budget.token,
			status: nextStatus,
			viewedAt: viewedAt.toISOString(),
		});
	};

	// door-validation: none — Фиксация первого просмотра сметы использует только параметр :token в URL без тела запроса
	definePublicRoute(server, {
		method: "POST",
		path: "/api/v1/public/budgets/:token/view",
		handler: async ({ request, reply }) =>
			markBudgetViewedHandler(
				request as FastifyRequest<{ Params: { token: string } }>,
				reply,
			),
	});
	// door-validation: none — Фиксация первого просмотра сметы использует только параметр :token в URL без тела запроса
	definePublicRoute(server, {
		method: "POST",
		path: "/api/portal/budget/:token/view",
		handler: async ({ request, reply }) =>
			markBudgetViewedHandler(
				request as FastifyRequest<{ Params: { token: string } }>,
				reply,
			),
	});

	// 2. POST /api/v1/public/budgets/:token/verify & /verify-pin — 2FA подтверждение по последним 4 цифрам телефона или PIN
	const verifyHandler = async (
		request: FastifyRequest<{ Params: { token: string } }>,
		reply: FastifyReply,
	) => {
		const token = request.params.token?.trim();
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

		const [budget] = await withSuperuserBypass(async (tx) =>
			tx
				.select()
				.from(portalBudgetTokens)
				.where(eq(portalBudgetTokens.token, token))
				.limit(1),
		);

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

		const forwardedHeader = request.headers["x-forwarded-for"];
		const rawIp =
			typeof forwardedHeader === "string"
				? forwardedHeader
				: Array.isArray(forwardedHeader) && forwardedHeader.length > 0 && typeof forwardedHeader[0] === "string"
					? forwardedHeader[0]
					: request.ip || "127.0.0.1";
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
			const inputBuf = Buffer.from(inputDigits);
			const expectedBuf = Buffer.from(expectedLast4);
			isMatch =
				inputBuf.length === expectedBuf.length &&
				timingSafeEqual(inputBuf, expectedBuf);
		}

		if (!isMatch) {
			const nextFailures = (budget.failedAttempts || 0) + 1;
			const remaining = Math.max(0, MAX_VERIFY_ATTEMPTS - nextFailures);
			const willLock = nextFailures >= MAX_VERIFY_ATTEMPTS;
			const lockedUntil = willLock ? new Date(now + LOCKOUT_DURATION_MS) : null;

			await withSuperuserBypass(async (tx) =>
				tx
					.update(portalBudgetTokens)
					.set({
						failedAttempts: nextFailures,
						totalFailures: (budget.totalFailures || 0) + 1,
						isLocked: willLock,
						lockedUntil,
						updatedAt: new Date(),
					})
					.where(eq(portalBudgetTokens.token, token)),
			);

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
		await withSuperuserBypass(async (tx) =>
			tx
				.update(portalBudgetTokens)
				.set({
					failedAttempts: 0,
					isLocked: false,
					lockedUntil: null,
					updatedAt: new Date(),
				})
				.where(eq(portalBudgetTokens.token, token)),
		);

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

	definePublicRoute(server, {
		method: "POST",
		path: "/api/v1/public/budgets/:token/verify",
		handler: async ({ request, reply }) =>
			verifyHandler(
				request as FastifyRequest<{ Params: { token: string } }>,
				reply,
			),
	});
	definePublicRoute(server, {
		method: "POST",
		path: "/api/v1/public/budgets/:token/verify-pin",
		handler: async ({ request, reply }) =>
			verifyHandler(
				request as FastifyRequest<{ Params: { token: string } }>,
				reply,
			),
	});
	definePublicRoute(server, {
		method: "POST",
		path: "/api/portal/budget/:token/verify",
		handler: async ({ request, reply }) =>
			verifyHandler(
				request as FastifyRequest<{ Params: { token: string } }>,
				reply,
			),
	});

	// 3. POST /api/v1/public/budgets/:token/sign & /api/portal/budget/:token/sign — сохранение цифровой подписи пациента (Canvas PNG, хеш IP, аудит)
	const signHandler = async (
		request: FastifyRequest<{ Params: { token: string } }>,
		reply: FastifyReply,
	) => {
			const token = request.params.token?.trim();
			if (!token) {
				return reply.code(400).send({ error: "TokenRequired", message: "Укажите токен сметы." });
			}

			const rawIdemKey =
				request.headers["idempotency-key"] ||
				request.headers["x-idempotency-key"];
			const idempotencyKey =
				typeof rawIdemKey === "string" ? rawIdemKey.trim() : undefined;
			if (idempotencyKey) {
				reply.header("Idempotency-Key", idempotencyKey);
				reply.header("X-Idempotency-Key", idempotencyKey);
			}

			const parsed = signBodySchema.safeParse(request.body || {});
			if (!parsed.success) {
				return reply.code(400).send({
					error: "InvalidSignatureData",
					message: "Необходимо передать графическую подпись пациента (Canvas PNG Base64).",
				});
			}

			const [budget] = await withSuperuserBypass(async (tx) =>
				tx
					.select()
					.from(portalBudgetTokens)
					.where(eq(portalBudgetTokens.token, token))
					.limit(1),
			);

			if (!budget) {
				return reply.code(404).send({
					error: "BudgetNotFound",
					message: "Смета не найдена.",
				});
			}

			// Проверка сессии при требовании верификации
			if (budget.authMethod !== "none") {
				const authHeader = request.headers.authorization;
				let sessionToken = authHeader?.startsWith("Bearer ")
					? authHeader.slice("Bearer ".length).trim()
					: undefined;

				if (!sessionToken) {
					sessionToken = extractCookieValue(
						request.headers.cookie,
						`pub_bdg_session_${token}`,
					);
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

			const forwardedHeader = request.headers["x-forwarded-for"];
			const rawIp =
				typeof forwardedHeader === "string"
					? forwardedHeader
					: Array.isArray(forwardedHeader) && forwardedHeader.length > 0 && typeof forwardedHeader[0] === "string"
						? forwardedHeader[0]
						: request.ip || "127.0.0.1";
			const clientIp = rawIp.split(",")[0]?.trim() || "127.0.0.1";
			const clientIpHash = hashIp(clientIp);
			const rawUserAgent = request.headers["user-agent"];
			const userAgent = typeof rawUserAgent === "string" ? rawUserAgent : "unknown";

			const signingResult = await completeBudgetSigning({
				budget,
				parsedSignData: parsed.data,
				clientIp,
				clientIpHash,
				userAgent,
				log: request.log,
				idempotencyKey,
			});

			if (signingResult.replayed) {
				reply.header("idempotency-replayed", "true");
			}

			return reply.code(200).send({
				success: true,
				status: "accepted",
				signedAt: signingResult.signedAt.toISOString(),
				documentHash: signingResult.documentHash,
				signerName: signingResult.signerName,
				ipHash: clientIpHash,
			});
	};

	definePublicRoute(server, {
		method: "POST",
		path: "/api/v1/public/budgets/:token/sign",
		handler: async ({ request, reply }) =>
			signHandler(
				request as FastifyRequest<{ Params: { token: string } }>,
				reply,
			),
	});
	definePublicRoute(server, {
		method: "POST",
		path: "/api/portal/budget/:token/sign",
		handler: async ({ request, reply }) =>
			signHandler(
				request as FastifyRequest<{ Params: { token: string } }>,
				reply,
			),
	});
};
