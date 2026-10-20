import { eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { withTenantCtx } from "../../../db/rls.js";
import { auditEvents, organizations } from "../../../db/schema.js";
import { resetRateLimit } from "../../../security/rateLimit.js";
import {
	DEMO_SHOWCASE_ORG_ID,
	ensureDemoShowcaseTenant,
} from "../../../services/demo/deepDemoSeeder.js";
import {
	signToken,
	verifyCredential,
} from "../../../utils/cryptoHelper.js";
import {
	authBodyRecord,
	authFailureDelay,
	demoLoginAllowed,
	parseAuthPayload,
	readUnderBypass,
	replyPreTenantPolicyFailure,
	TOKEN_SECRET,
} from "../tokenHelpers.js";
import {
	clinicLoginBodySchema,
	clinicLoginValidationMessage,
} from "./loginValidationSchemas.js";

/**
 * POST /api/auth/clinic/login
 * Авторизация кабинета организации клиники (Clinic Workspace Login).
 */
export async function handleClinicLogin(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const input = parseAuthPayload(clinicLoginBodySchema, request.body);
	if (!input) {
		return reply.code(400).send({
			error: "ValidationError",
			message: clinicLoginValidationMessage,
		});
	}
	const { email, password } = input;
	const loginId = email.toLowerCase().trim();

	const isDemoClinicLogin =
		demoLoginAllowed() &&
		loginId === "clinic@example.com" &&
		password === "dente2026";

	if (isDemoClinicLogin) {
		try {
			await ensureDemoShowcaseTenant();
		} catch (seedErr) {
			request.log.error({ seedErr }, "[AUTH_DEMO_SEED_ERROR]");
		}
	}

	// Look up organization by login ID
	let org:
		| typeof organizations.$inferSelect
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		| Record<string, any>
		| undefined;
	try {
		const lookup = await readUnderBypass((tx) =>
			tx
				.select()
				.from(organizations)
				.where(
					isDemoClinicLogin
						? eq(organizations.id, DEMO_SHOWCASE_ORG_ID)
						: eq(organizations.loginId, loginId),
				)
				.limit(1),
		);
		if (!lookup.row && !lookup.bypassActive && !isDemoClinicLogin) {
			return replyPreTenantPolicyFailure(
				request,
				reply,
				"clinic-login:lookup-organization",
			);
		}
		org = lookup.row;
	} catch (dbErr) {
		request.log.error({ dbErr }, "[AUTH_DB_ERROR]");
		if (!isDemoClinicLogin) {
			return reply.code(500).send({
				error: "AuthUnavailable",
				message:
					"Вход временно недоступен: нет связи с базой данных. Повторите попытку позже.",
			});
		}
	}

	if (!org) {
		if (isDemoClinicLogin) {
			org = {
				id: DEMO_SHOWCASE_ORG_ID,
				name: "Стоматологическая Клиника DENTE (Демо)",
				passwordHash: null,
			};
		} else {
			await authFailureDelay();
			return reply.code(401).send({
				error: "AuthError",
				message: "Неверный логин или пароль клиники.",
			});
		}
	}

	// FAIL CLOSED: организация без пароля не пускает с любым паролем
	const storedHash = org.passwordHash;
	const isMatch = storedHash
		? await verifyCredential(password, storedHash)
		: isDemoClinicLogin;

	if (!isMatch) {
		await authFailureDelay();
		return reply.code(401).send({
			error: "AuthError",
			message: "Неверный логин или пароль клиники.",
		});
	}

	resetRateLimit(request);

	const token = signToken(
		{ organizationId: org.id, clinicName: org.name },
		TOKEN_SECRET(),
		60 * 60 * 24, // 24h clinic session
	);

	// Запись аудита под контекстом арендатора
	await withTenantCtx(org.id, async (tx) => {
		await tx.insert(auditEvents).values({
			organizationId: org.id,
			entityType: "organization",
			entityId: org.id,
			action: "clinic_login_success",
			reason: `Открыт рабочий кабинет: ${org.name}`,
		});
	});

	return reply.send({
		ok: true,
		clinicToken: token,
		clinicProfile: { organizationId: org.id, clinicName: org.name },
	});
}

/**
 * POST /api/auth/demo/seed
 * Инициализация или сброс демонстрационного тенанта (Demo Tenant Seeding).
 */
export async function handleDemoSeed(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	if (!demoLoginAllowed()) {
		request.log.warn(
			{ url: request.url },
			"[DEMO_SEED_FORBIDDEN] Инициализация демо-контура доступна только при включенном DENTE_ALLOW_DEMO_LOGIN в dev/test.",
		);
		return reply.code(403).send({
			error: "Forbidden",
			message:
				"Инициализация демо-контура недоступна в текущей конфигурации сервера.",
		});
	}
	const body = authBodyRecord(request.body);
	const forceReset = body.forceReset === true;
	try {
		const result = await ensureDemoShowcaseTenant(undefined, { forceReset });
		return reply.send({
			ok: true,
			...result,
		});
	} catch (err) {
		request.log.error({ err }, "[DEMO_SEED_FAIL] Ошибка инициализации демо-тенанта");
		return reply.code(500).send({
			error: "DemoSeedError",
			message: "Не удалось инициализировать демонстрационный тенант.",
		});
	}
}
