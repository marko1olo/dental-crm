import crypto from "node:crypto";
import { and, eq, or, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { withTenantCtx } from "../../db/rls.js";
import {
	auditEvents,
	organizations,
	users,
} from "../../db/schema.js";
import { resetRateLimit } from "../../security/rateLimit.js";
import {
	DEMO_ADMIN_ID,
	DEMO_DOCTOR_1_ID,
	DEMO_SHOWCASE_ORG_ID,
	ensureDemoShowcaseTenant,
} from "../../services/demo/deepDemoSeeder.js";
import {
	signToken,
	verifyCredential,
	verifyToken,
} from "../../utils/cryptoHelper.js";
import {
	authBodyRecord,
	authFailureDelay,
	demoLoginAllowed,
	parseAuthPayload,
	readUnderBypass,
	replyPreTenantPolicyFailure,
	TOKEN_SECRET,
} from "./tokenHelpers.js";
import {
	clinicLoginBodySchema,
	clinicLoginValidationMessage,
	loginBodySchema,
	staffUnlockBodySchema,
	staffUnlockValidationMessage,
} from "./types.js";

export function registerLoginRoutes(app: FastifyInstance): void {
	// ─── Clinic Workspace Login ───────────────────────────────────────────────────
	app.post(
		"/api/auth/clinic/login",
		{
			config: {
				rateLimit: {
					max: 5,
					timeWindow: "1 minute",
				},
			},
		},
		async (request: FastifyRequest, reply: FastifyReply) => {
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
					console.error("[AUTH_DEMO_SEED_ERROR]", seedErr);
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
								? or(
										eq(organizations.loginId, loginId),
										eq(organizations.id, DEMO_SHOWCASE_ORG_ID),
									)
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
				console.error("[AUTH_DB_ERROR]", dbErr);
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

			// FAIL CLOSED: организация без пароля больше не пускает с любым паролем.
			// Раньше отсутствие passwordHash означало "подойдёт что угодно".
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

			// Запись аудита идёт УЖЕ ПОД АРЕНДАТОРОМ, а не под обходом: в `WITH CHECK`
			// политики audit_events дизъюнкта обхода нет, и вставка под одним лишь
			// `app.superuser_bypass` отвергается кодом 42501 (проверено). Арендатор к
			// этому моменту известен — это org.id, поэтому контекст даёт и права на
			// запись, и границу: чужую организацию сюда записать нельзя.
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
		},
	);

	// ─── Staff PIN Unlock ─────────────────────────────────────────────────────────
	app.post(
		"/api/auth/staff/unlock",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const input = parseAuthPayload(staffUnlockBodySchema, request.body);
			if (!input) {
				return reply.code(400).send({
					error: "ValidationError",
					message: staffUnlockValidationMessage,
				});
			}
			const { userId, pinCode } = input;

			// Verify clinic token is present so we know the org context
			const clinicHeader = request.headers["x-dente-clinic-token"];
			const clinicToken = Array.isArray(clinicHeader)
				? clinicHeader[0]
				: clinicHeader;
			const clinicPayload =
				clinicToken &&
				(clinicToken.startsWith("demo-showcase-token") ||
					clinicToken.startsWith("demo-showcase-clinic-token"))
					? { organizationId: DEMO_SHOWCASE_ORG_ID }
					: clinicToken
						? verifyToken(clinicToken, TOKEN_SECRET())
						: null;

			if (!clinicPayload?.organizationId) {
				return reply.code(401).send({
					error: "ClinicAuthRequired",
					message: "Сначала выполните вход в кабинет клиники.",
				});
			}

			const orgId = clinicPayload.organizationId as string;

			const [user] = await withTenantCtx(orgId, async (tx) => {
				return tx
					.select()
					.from(users)
					.where(
						and(
							eq(users.id, userId),
							eq(users.organizationId, orgId),
							eq(users.isActive, true),
						),
					)
					.limit(1);
			});
			if (!user) {
				await authFailureDelay();
				// Единый ответ для "нет сотрудника" и "неверный PIN": иначе endpoint
				// работает как оракул существования сотрудников организации.
				return reply
					.code(401)
					.send({ error: "AuthError", message: "Неверный PIN-код." });
			}

			const storedPinHash = user.pinCodeHash;
			const isMatch = storedPinHash
				? await verifyCredential(pinCode, storedPinHash)
				: false;

			if (!isMatch) {
				await authFailureDelay();
				return reply
					.code(401)
					.send({ error: "AuthError", message: "Неверный PIN-код." });
			}

			resetRateLimit(request);

			const sessionId = crypto.randomUUID();
			await withTenantCtx(orgId, async (tx) => {
				await tx
					.update(users)
					.set({ currentSessionId: sessionId })
					.where(and(eq(users.id, user.id), eq(users.organizationId, orgId)));
			});

			const staffToken = signToken(
				{
					userId: user.id,
					fullName: user.fullName,
					role: user.role,
					organizationId: orgId,
					sessionId,
				},
				TOKEN_SECRET(),
				60 * 60 * 8, // 8h staff session
			);

			await withTenantCtx(orgId, async (tx) => {
				await tx.insert(auditEvents).values({
					organizationId: orgId,
					actorUserId: user.id,
					entityType: "user",
					entityId: user.id,
					action: "staff_unlock_success",
					reason: `Сотрудник ${user.fullName} начал сессию.`,
				});
			});

			return reply.send({
				ok: true,
				staffToken,
				user: {
					id: user.id,
					fullName: user.fullName,
					role: user.role,
					phone: user.phone,
					email: user.email,
				},
			});
		},
	);

	// ─── SaaS User Login (Universal login: email / phone / clinic ID or code) ────
	app.post(
		"/api/auth/login",
		async (request: FastifyRequest, reply: FastifyReply) => {
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
					console.error("[AUTH_DEMO_SEED_ERROR]", seedErr);
				}
				const orgId = DEMO_SHOWCASE_ORG_ID;
				const clinicToken = signToken(
					{ organizationId: orgId, clinicName: "Стоматологическая Клиника DENTE (Демо)" },
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
										sql`regexp_replace(${users.phone}, '[^0-9]', '', 'g') LIKE ${'%' + last10}`,
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
				console.error("[AUTH_USER_DB_ERROR]", dbErr);
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
						console.error("[AUTH_DEMO_SEED_ERROR]", seedErr);
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

			// FAIL CLOSED: нет хеша пароля — вход запрещён (кроме явного демо-режима).
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

			// Арендатор здесь УЖЕ известен — он записан в найденной учётке, поэтому
			// название клиники читается под контекстом, а не под обходом. Без контекста
			// (как было) запрос молча отдавал ноль строк, и в токен кабинета уезжало
			// слово «Клиника» вместо настоящего названия.
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
		},
	);

	// ─── Demo Tenant Seeding / Reinitialization Endpoint ────────────────────────
	app.post(
		"/api/auth/demo/seed",
		async (request: FastifyRequest, reply: FastifyReply) => {
			if (!demoLoginAllowed()) {
				return reply.code(403).send({
					error: "Forbidden",
					message: "Инициализация демо-контура доступна только при включенном DENTE_ALLOW_DEMO_LOGIN в dev/test.",
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
		},
	);
}
