import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
	PortalBudgetService,
	type PortalBudgetStatus,
	type PortalAuthMethod,
} from "../services/portalBudgetService.js";

const verifyBodySchema = z.object({
	method: z.enum(["phone_last4", "dob", "manual_code", "none"]).optional(),
	value: z.string().max(64).optional(),
	phone_last4: z.string().max(10).optional(),
	dob: z.string().max(30).optional(),
});

const signBodySchema = z.object({
	signaturePng: z.string().min(10),
	signerName: z.string().max(200).optional(),
	signatureSvg: z.string().optional(),
	relationship: z.string().max(100).optional(),
});

const generateTokenBodySchema = z.object({
	planId: z.string().uuid().optional(),
	organizationId: z.string().uuid(),
	patientId: z.string().uuid(),
	doctorId: z.string().uuid().optional(),
	clinicName: z.string().optional(),
	clinicPhone: z.string().optional(),
	clinicAddress: z.string().optional(),
	doctorName: z.string().optional(),
	patientFirstName: z.string().optional(),
	patientPhone: z.string().optional(),
	patientBirthDate: z.string().optional(),
	authMethod: z.enum(["phone_last4", "dob", "manual_code", "none"]).optional(),
	items: z
		.array(
			z.object({
				id: z.string().optional(),
				title: z.string(),
				toothNumber: z.number().int().nullable().optional(),
				quantity: z.number().int().positive().optional(),
				priceRub: z.number().nonnegative(),
				discountRub: z.number().nonnegative().optional(),
			}),
		)
		.optional(),
	totalPriceRub: z.number().nonnegative().optional(),
	discountRub: z.number().nonnegative().optional(),
	validUntil: z.string().optional(),
	customToken: z.string().optional(),
});

export const portalBudgetRoutes: FastifyPluginAsync = async (server) => {
	// Determines base sub-path depending on whether plugin is mounted under /api/portal or root
	const basePath = server.prefix.endsWith("/portal") ? "/budget" : "/api/portal/budget";

	// 1. GET /api/portal/budget/:token — публичные данные сметы
	// (список услуг с номерами зубов, итоговая сумма в рублях, скидка, название клиники, ФИО врача)
	server.get<{ Params: { token: string } }>(
		`${basePath}/:token`,
		async (request, reply) => {
			const token = request.params.token?.trim();
			if (!token) {
				reply.status(400);
				return { error: "TokenRequired", message: "Укажите токен сметы." };
			}

			// Extract session token from Authorization header or Cookie
			const authHeader = request.headers.authorization;
			let sessionToken = authHeader?.startsWith("Bearer ")
				? authHeader.slice("Bearer ".length).trim()
				: undefined;

			if (!sessionToken) {
				const cookieHeader = request.headers.cookie || "";
				const cookieMatch = cookieHeader.match(new RegExp(`bdg_session_${token}=([^;]+)`));
				if (cookieMatch && cookieMatch[1]) {
					sessionToken = cookieMatch[1];
				}
			}

			const budget = await PortalBudgetService.getBudgetByToken(token, sessionToken);
			if (!budget) {
				reply.status(404);
				return { error: "BudgetNotFound", message: "Смета не найдена или срок действия ссылки истёк." };
			}

			return {
				token: budget.token,
				planId: budget.planId,
				status: budget.status,
				clinicName: budget.clinicName,
				clinicPhone: budget.clinicPhone,
				clinicAddress: budget.clinicAddress,
				doctorName: budget.doctorName,
				patientFirstName: budget.patientFirstName,
				totalPriceRub: budget.totalPriceRub,
				discountRub: budget.discountRub,
				netTotalRub: budget.netTotalRub,
				currency: budget.currency,
				items: budget.items,
				requiresVerification: budget.requiresVerification,
				authMethod: budget.authMethod,
				isVerified: budget.isVerified,
				viewedAt: budget.viewedAt,
				signedAt: budget.signedAt,
				signerName: budget.signerName,
				documentHash: budget.documentHash,
				data: budget,
			};
		},
	);

	// 2. POST /api/portal/budget/:token/view — фиксация первого открытия сметы пациентом (budget.viewed)
	server.post<{ Params: { token: string } }>(
		`${basePath}/:token/view`,
		async (request, reply) => {
			const token = request.params.token?.trim();
			if (!token) {
				reply.status(400);
				return { error: "TokenRequired", message: "Укажите токен сметы." };
			}

			const rawIp =
				(request.headers["x-forwarded-for"] as string) ||
				request.ip ||
				"127.0.0.1";
			const clientIp = rawIp.split(",")[0]?.trim() || "127.0.0.1";

			const result = PortalBudgetService.markBudgetViewed(token, clientIp);
			if (!result.success) {
				reply.status(404);
				return { error: "BudgetNotFound", message: "Смета не найдена." };
			}

			return {
				success: true,
				status: result.status,
				viewedAt: result.viewedAt,
			};
		},
	);

	// 3. POST /api/portal/budget/:token/verify — подтверждение личности без паролей (phone_last4 или dob, лимит 5 попыток)
	server.post<{ Params: { token: string } }>(
		`${basePath}/:token/verify`,
		async (request, reply) => {
			const token = request.params.token?.trim();
			if (!token) {
				reply.status(400);
				return { error: "TokenRequired", message: "Укажите токен сметы." };
			}

			const parsed = verifyBodySchema.safeParse(request.body || {});
			if (!parsed.success) {
				reply.status(400);
				return {
					error: "InvalidVerificationPayload",
					message: "Некорректный формат фактора подтверждения личности.",
				};
			}

			const rawIp =
				(request.headers["x-forwarded-for"] as string) ||
				request.ip ||
				"127.0.0.1";
			const clientIp = rawIp.split(",")[0]?.trim() || "127.0.0.1";

			const result = PortalBudgetService.verifyBudgetAccess(token, parsed.data, clientIp);

			if (!result.success) {
				reply.status(result.status);
				return {
					error: result.error,
					message: result.message,
					isLocked: result.isLocked,
					remainingAttempts: result.remainingAttempts,
				};
			}

			if (result.sessionToken) {
				reply.header(
					"Set-Cookie",
					`bdg_session_${token}=${result.sessionToken}; Path=/api/portal/budget/${token}; HttpOnly; SameSite=Strict; Max-Age=1800`,
				);
			}

			return {
				success: true,
				sessionToken: result.sessionToken,
				isVerified: true,
			};
		},
	);

	// 4. POST /api/portal/budget/:token/sign — сохранение цифровой подписи пациента (Canvas PNG, хеш IP, дата/время, UA)
	server.post<{ Params: { token: string } }>(
		`${basePath}/:token/sign`,
		async (request, reply) => {
			const token = request.params.token?.trim();
			if (!token) {
				reply.status(400);
				return { error: "TokenRequired", message: "Укажите токен сметы." };
			}

			const parsed = signBodySchema.safeParse(request.body);
			if (!parsed.success) {
				reply.status(400);
				return {
					error: "InvalidSignatureData",
					message: "Необходимо передать графическую подпись пациента (Canvas PNG Base64).",
				};
			}

			const rawIp =
				(request.headers["x-forwarded-for"] as string) ||
				request.ip ||
				"127.0.0.1";
			const clientIp = rawIp.split(",")[0]?.trim() || "127.0.0.1";
			const userAgent = request.headers["user-agent"];

			const authHeader = request.headers.authorization;
			let sessionToken = authHeader?.startsWith("Bearer ")
				? authHeader.slice("Bearer ".length).trim()
				: undefined;

			if (!sessionToken) {
				const cookieHeader = request.headers.cookie || "";
				const cookieMatch = cookieHeader.match(new RegExp(`bdg_session_${token}=([^;]+)`));
				if (cookieMatch && cookieMatch[1]) {
					sessionToken = cookieMatch[1];
				}
			}

			const result = await PortalBudgetService.signBudget(token, parsed.data, {
				ipAddress: clientIp,
				userAgent,
				sessionToken,
			});

			if (!result.success) {
				reply.status(result.status);
				return {
					error: result.error,
					message: result.message,
				};
			}

			return {
				success: true,
				status: "accepted",
				signedAt: result.signedAt,
				documentHash: result.documentHash,
				signerName: result.signerName,
				ipHash: result.ipHash,
			};
		},
	);

	// 5. POST /api/portal/budget/generate-token — выпуск токена согласования сметы клиникой
	server.post(
		`${basePath}/generate-token`,
		async (request, reply) => {
			const parsed = generateTokenBodySchema.safeParse(request.body);
			if (!parsed.success) {
				reply.status(400);
				return {
					error: "InvalidGenerationPayload",
					message: "Некорректные параметры для создания ссылки на смету.",
					details: parsed.error.issues,
				};
			}

			const result = await PortalBudgetService.generateBudgetPortalToken(parsed.data);
			return {
				success: true,
				...result,
			};
		},
	);
};
