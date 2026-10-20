import { and, eq, or, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { withTenantCtx } from "../../../db/rls.js";
import { organizations, users } from "../../../db/schema.js";
import { resetRateLimit } from "../../../security/rateLimit.js";
import {
	DEMO_ADMIN_ID,
	DEMO_DOCTOR_1_ID,
	DEMO_SHOWCASE_ORG_ID,
	ensureDemoShowcaseTenant,
} from "../../../services/demo/deepDemoSeeder.js";
import {
	signToken,
	verifyCredential,
} from "../../../utils/cryptoHelper.js";
import {
	authFailureDelay,
	demoLoginAllowed,
	readUnderBypass,
	replyPreTenantPolicyFailure,
	TOKEN_SECRET,
} from "../tokenHelpers.js";
import { loginBodySchema } from "./loginValidationSchemas.js";

/**
 * POST /api/auth/login
 * SaaS User Login: email / phone / clinic ID or login code.
 */
export async function handleUniversalLogin(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const parsed = loginBodySchema.safeParse(request.body ?? {});
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Введите email и пароль.",
		});
	}
	const { password } = parsed.data;
	const rawInput = (parsed.data.identifier || parsed.data.email || "").trim();
	const loginIdentifier = rawInput.toLowerCase();

	const isDemoUserLogin =
		demoLoginAllowed() &&
		(loginIdentifier === "doctor@clinic.com" ||
			loginIdentifier === "admin@clinic.ru");

	const isDemoClinicLogin =
		demoLoginAllowed() &&
		loginIdentifier === "clinic@example.com" &&
		password === "dente2026";

	if (isDemoClinicLogin) {
		try {
			await ensureDemoShowcaseTenant();
		} catch (seedErr) {
			request.log.error({ seedErr }, "[AUTH_DEMO_SEED_ERROR]");
		}
		const orgId = DEMO_SHOWCASE_ORG_ID;
		const clinicToken = signToken(
			{
				organizationId: orgId,
				clinicName: "Стоматологическая Клиника DENTE (Демо)",
			},
			TOKEN_SECRET(),
			60 * 60 * 24 * 7,
		);
		const staffToken = signToken(
			{
				userId: DEMO_DOCTOR_1_ID,
				fullName: "Д-р Соколов А. В.",
				role: "doctor",
				organizationId: orgId,
			},
			TOKEN_SECRET(),
			60 * 60 * 24 * 7,
		);
		return reply.send({
			ok: true,
			clinicToken,
			staffToken,
			user: {
				id: DEMO_DOCTOR_1_ID,
				fullName: "Д-р Соколов А. В.",
				role: "doctor",
				email: "clinic@example.com",
			},
		});
	}

	// Анализируем тип идентификатора
	const digitsOnly = rawInput.replace(/\D/g, "");
	const isPhoneLike =
		!rawInput.includes("@") &&
		digitsOnly.length >= 10 &&
		digitsOnly.length <= 15 &&
		/^[\d\s+()\-]+$/.test(rawInput);
	const isUuid =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
			rawInput,
		);

	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	let user: any = null;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	let matchedOrg: any = null;

	try {
		if (isPhoneLike) {
			// 1. Поиск по телефону пользователя (последние 10 цифр)
			const last10 = digitsOnly.slice(-10);
			const lookup = await readUnderBypass((tx) =>
				tx
					.select()
					.from(users)
					.where(
						and(
							or(
								eq(users.phone, rawInput),
								sql`regexp_replace(${users.phone}, '[^0-9]', '', 'g') LIKE ${`%${last10}`}`,
							),
							eq(users.isActive, true),
						),
					)
					.limit(1),
			);
			if (!lookup.row && !lookup.bypassActive && !isDemoUserLogin) {
				return replyPreTenantPolicyFailure(
					request,
					reply,
					"user-login:lookup-user-phone",
				);
			}
			user = lookup.row ?? null;
		} else if (isUuid) {
			// 2. Поиск по UUID организации
			const lookup = await readUnderBypass((tx) =>
				tx
					.select()
					.from(organizations)
					.where(eq(organizations.id, rawInput))
					.limit(1),
			);
			if (!lookup.row && !lookup.bypassActive) {
				return replyPreTenantPolicyFailure(
					request,
					reply,
					"clinic-login:lookup-organization-uuid",
				);
			}
			matchedOrg = lookup.row ?? null;
		} else {
			// 3. Поиск по email пользователя
			const lookupUser = await readUnderBypass((tx) =>
				tx
					.select()
					.from(users)
					.where(
						and(
							eq(users.email, loginIdentifier),
							eq(users.isActive, true),
							...(isDemoUserLogin
								? [eq(users.organizationId, DEMO_SHOWCASE_ORG_ID)]
								: []),
						),
					)
					.limit(1),
			);
			if (!lookupUser.row && !lookupUser.bypassActive && !isDemoUserLogin) {
				return replyPreTenantPolicyFailure(
					request,
					reply,
					"user-login:lookup-user-email",
				);
			}
			user = lookupUser.row ?? null;

			// 4. Если пользователь не найден — поиск по loginId или email организации
			if (!user) {
				const lookupOrg = await readUnderBypass((tx) =>
					tx
						.select()
						.from(organizations)
						.where(
							or(
								eq(organizations.loginId, loginIdentifier),
								eq(organizations.email, loginIdentifier),
							),
						)
						.limit(1),
				);
				if (!lookupOrg.row && !lookupOrg.bypassActive) {
					return replyPreTenantPolicyFailure(
						request,
						reply,
						"clinic-login:lookup-organization-loginId",
					);
				}
				matchedOrg = lookupOrg.row ?? null;
			}
		}
	} catch (dbErr) {
		request.log.error({ dbErr }, "[AUTH_USER_DB_ERROR]");
		if (!isDemoUserLogin) {
			return reply.code(500).send({
				error: "AuthUnavailable",
				message:
					"Вход временно недоступен: нет связи с базой данных. Повторите попытку позже.",
			});
		}
	}

	// Если найдена организация (вход по ID клиники или loginId клиники)
	if (matchedOrg && !user) {
		const storedHash = matchedOrg.passwordHash;
		const isMatch = storedHash
			? await verifyCredential(password, storedHash)
			: false;

		if (!isMatch) {
			await authFailureDelay();
			return reply.code(401).send({
				error: "AuthError",
				message: "Неверный логин или пароль клиники.",
			});
		}

		resetRateLimit(request);

		// Находим владельца клиники
		const ownerLookup = await readUnderBypass((tx) =>
			tx
				.select()
				.from(users)
				.where(
					and(
						eq(users.organizationId, matchedOrg.id),
						eq(users.isActive, true),
					),
				)
				.orderBy(sql`CASE WHEN ${users.role} = 'owner' THEN 0 ELSE 1 END`)
				.limit(1),
		);
		const ownerUser = ownerLookup.row ?? null;

		const clinicToken = signToken(
			{
				organizationId: matchedOrg.id,
				clinicName: matchedOrg.name,
			},
			TOKEN_SECRET(),
			60 * 60 * 24 * 7,
		);
		const staffToken = signToken(
			{
				userId: ownerUser?.id ?? matchedOrg.id,
				fullName: ownerUser?.fullName ?? matchedOrg.name,
				role: ownerUser?.role ?? "owner",
				organizationId: matchedOrg.id,
			},
			TOKEN_SECRET(),
			60 * 60 * 24 * 7,
		);
		return reply.send({
			ok: true,
			clinicToken,
			staffToken,
			user: ownerUser
				? {
						id: ownerUser.id,
						fullName: ownerUser.fullName,
						role: ownerUser.role,
						email: ownerUser.email,
					}
				: {
						id: matchedOrg.id,
						fullName: matchedOrg.name,
						role: "owner",
						email: matchedOrg.email ?? null,
					},
		});
	}

	// Демо-вход пользователя при отсутствии в базе
	if (!user) {
		if (isDemoUserLogin) {
			try {
				await ensureDemoShowcaseTenant();
			} catch (seedErr) {
				request.log.error({ seedErr }, "[AUTH_DEMO_SEED_ERROR]");
			}
			const isDoctorLogin = loginIdentifier === "doctor@clinic.com";
			const targetUserId = isDoctorLogin ? DEMO_DOCTOR_1_ID : DEMO_ADMIN_ID;
			const demoUserLookup = await readUnderBypass((tx) =>
				tx
					.select()
					.from(users)
					.where(
						and(
							eq(users.organizationId, DEMO_SHOWCASE_ORG_ID),
							eq(users.id, targetUserId),
						),
					)
					.limit(1),
			);
			const dbUser = demoUserLookup.row;
			if (dbUser) {
				user = dbUser;
			} else {
				user = {
					id: targetUserId,
					organizationId: DEMO_SHOWCASE_ORG_ID,
					fullName: isDoctorLogin ? "Д-р Соколов А. В." : "Смирнова А. П.",
					role: isDoctorLogin ? "doctor" : "administrator",
					email: loginIdentifier,
					passwordHash: null,
				};
			}
		} else {
			await authFailureDelay();
			return reply.code(401).send({
				error: "AuthError",
				message: "Неверный email или пароль.",
			});
		}
	}

	// FAIL CLOSED: нет хеша пароля — вход запрещён (кроме явного демо-режима)
	const isMatch =
		isDemoUserLogin ||
		(user.passwordHash
			? await verifyCredential(password, user.passwordHash)
			: false);
	if (!isMatch) {
		await authFailureDelay();
		return reply
			.code(401)
			.send({ error: "AuthError", message: "Неверный email или пароль." });
	}

	resetRateLimit(request);

	// Арендатор здесь уже известен
	const [userOrg] = await withTenantCtx(
		user.organizationId as string,
		async (tx) =>
			tx
				.select({ name: organizations.name })
				.from(organizations)
				.where(eq(organizations.id, user.organizationId))
				.limit(1),
	).catch(() => [] as Array<{ name: string }>);

	const clinicToken = signToken(
		{
			organizationId: user.organizationId,
			clinicName: userOrg?.name ?? "Клиника",
		},
		TOKEN_SECRET(),
		60 * 60 * 24 * 7,
	);
	const staffToken = signToken(
		{
			userId: user.id,
			fullName: user.fullName,
			role: user.role,
			organizationId: user.organizationId,
		},
		TOKEN_SECRET(),
		60 * 60 * 24 * 7,
	);
	return reply.send({
		ok: true,
		clinicToken,
		staffToken,
		user: {
			id: user.id,
			fullName: user.fullName,
			role: user.role,
			email: user.email,
		},
	});
}
