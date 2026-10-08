import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { withTenantCtx } from "../../db/rls.js";
import {
	chairs,
	clinics,
	organizations,
	users,
} from "../../db/schema.js";
import { resetRateLimit } from "../../security/rateLimit.js";
import { hashCredential, signToken } from "../../utils/cryptoHelper.js";
import {
	authSchemaMessage,
	readUnderBypass,
	replyPreTenantPolicyFailure,
	TOKEN_SECRET,
} from "./tokenHelpers.js";
import {
	registerBodySchema,
	setupInitBodySchema,
} from "./types.js";

export function registerRegistrationRoutes(app: FastifyInstance): void {
	// ─── Initial Clinic Setup (first-run seed credentials) ───────────────────────
	app.post(
		"/api/auth/setup/init",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const parsed = setupInitBodySchema.safeParse(request.body ?? {});
			if (!parsed.success) {
				// Old if-order: required -> password length -> PIN form.
				// ownerPin object fails union with invalid_type — map by path after priority.
				let message = authSchemaMessage(
					parsed.error,
					"Укажите название клиники, логин и пароль.",
					[
						{
							match: "Пароль должен быть не короче 8 символов.",
							message: "Пароль должен быть не короче 8 символов.",
						},
						{
							match: "PIN должен состоять из 4–12 цифр.",
							message: "PIN должен состоять из 4–12 цифр.",
						},
					],
				);
				const pinPathOnly =
					message === "Укажите название клиники, логин и пароль." &&
					parsed.error.issues.some((issue) => issue.path[0] === "ownerPin") &&
					!parsed.error.issues.some(
						(issue) =>
							issue.path[0] === "clinicName" ||
							issue.path[0] === "email" ||
							issue.path[0] === "password",
					);
				if (pinPathOnly) {
					message = "PIN должен состоять из 4–12 цифр.";
				}
				return reply.code(400).send({ error: "ValidationError", message });
			}
			const { clinicName, email, password, ownerName, ownerPin } = parsed.data;

			const loginId = email.toLowerCase().trim();

			// Check if org with this loginId already exists
			//
			// ОПЕРАЦИЯ «ДО АРЕНДАТОРА»: организации ещё нет, называть арендатора нечем.
			// Без обхода запрос отдавал ноль строк ВСЕГДА, поэтому дубль логина не
			// ловился вовсе и упирался бы в уникальный индекс позже. Обход накрывает
			// ровно этот SELECT одной колонки.
			const duplicate = await readUnderBypass((tx) =>
				tx
					.select({ id: organizations.id })
					.from(organizations)
					.where(eq(organizations.loginId, loginId))
					.limit(1),
			);
			if (!duplicate.row && !duplicate.bypassActive) {
				return replyPreTenantPolicyFailure(
					request,
					reply,
					"setup-init:check-duplicate-login",
				);
			}
			if (duplicate.row) {
				return reply.code(409).send({
					error: "Conflict",
					message: "Организация с таким логином уже существует.",
				});
			}

			const passwordHash = await hashCredential(password);

			// Хеши считаются ДО транзакции: hashCredential — это pbkdf2, и держать на
			// нём соединение из пула нельзя (пул на 10 соединений, см. db/client.ts).
			//
			// БЫЛО: без ownerPin автоматически ставился PIN "0000" — предсказуемый вход
			// владельца в каждой новой клинике. СТАЛО: генерируется случайный PIN и
			// возвращается один раз в ответе, чтобы владелец сразу его сменил.
			let generatedOwnerPin: string | null = null;
			let ownerPinHash: string | null = null;
			if (ownerName) {
				if (!ownerPin) {
					generatedOwnerPin = String(crypto.randomInt(0, 1_000_000)).padStart(
						6,
						"0",
					);
				}
				// biome-ignore lint/style/noNonNullAssertion: automated suppression
				ownerPinHash = await hashCredential(ownerPin ?? generatedOwnerPin!);
			}

			// ИДЕНТИФИКАТОР КЛИНИКИ ГЕНЕРИРУЕТСЯ ДО ВСТАВКИ, и им же выставляется
			// контекст арендатора. Курицы и яйца здесь нет: `app.current_tenant` —
			// обычный строковый параметр, он ничем не связан с содержимым таблицы, а
			// политика organizations сверяет `id = current_tenant`. Под таким контекстом
			// создаётся ровно названная строка (замер: с чужим id — 42501), тогда как
			// под обходом запись в organizations не ограничена ничем. Владелец создаётся
			// в ТОЙ ЖЕ транзакции: в WITH CHECK политики users обхода нет, а половинчатой
			// клиники без владельца существовать не должно.
			const organizationId = crypto.randomUUID();
			const created = await withTenantCtx(organizationId, async (tx) => {
				const [organization] = await tx
					.insert(organizations)
					.values({
						id: organizationId,
						name: clinicName,
						loginId,
						passwordHash,
						email,
					})
					.returning();
				if (!organization) return { organization: null, owner: null };

				if (!ownerName || !ownerPinHash) return { organization, owner: null };

				const [ownerUser] = await tx
					.insert(users)
					.values({
						organizationId,
						fullName: ownerName,
						role: "owner",
						pinCodeHash: ownerPinHash,
						isActive: true,
					})
					.returning({ id: users.id });

				const [clinic] = await tx
					.insert(clinics)
					.values({
						organizationId,
						name: clinicName || "Основная клиника",
					})
					.returning({ id: clinics.id });

				if (clinic) {
					await tx.insert(chairs).values([
						{
							organizationId,
							clinicId: clinic.id,
							name: "Кабинет 1 (Терапия)",
							isActive: true,
						},
						{
							organizationId,
							clinicId: clinic.id,
							name: "Кабинет 2 (Хирургия)",
							isActive: true,
						},
					]);
				}

				return { organization, owner: ownerUser ?? null };
			});

			const org = created.organization;
			if (!org) {
				return reply.code(500).send({
					error: "InternalError",
					message: "Не удалось создать организацию.",
				});
			}
			const owner = created.owner;

			const token = signToken(
				{ organizationId: org.id, clinicName: org.name },
				TOKEN_SECRET(),
				60 * 60 * 24,
			);

			return reply.code(201).send({
				ok: true,
				clinicToken: token,
				organizationId: org.id,
				ownerUserId: owner?.id ?? null,
				// Показывается ровно один раз, в базе хранится только хеш.
				generatedOwnerPin,
			});
		},
	);

	// ─── SaaS Registration (New Clinic + Owner) ──────────────────────────────────
	app.post(
		"/api/auth/register",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const parsed = registerBodySchema.safeParse(request.body ?? {});
			if (!parsed.success) {
				const message = authSchemaMessage(parsed.error, "Заполните все поля.", [
					{
						match: "Пароль должен быть не короче 6 символов.",
						message: "Пароль должен быть не короче 6 символов.",
					},
					{
						match: "PIN должен состоять из 4–12 цифр.",
						message: "PIN должен состоять из 4–12 цифр.",
					},
				]);
				return reply.code(400).send({ error: "ValidationError", message });
			}
			const {
				clinicName,
				ownerName,
				email,
				password,
				ownerPin,
				practiceType = "clinic",
				phone,
				withDemoData = false,
			} = parsed.data;
			const loginId = email.toLowerCase().trim();

			// Обе проверки дублей — операции «до арендатора»: организации ещё нет.
			// Проверка организации без обхода отдавала ноль строк всегда; соседняя
			// проверка пользователя обход уже использовала.
			const duplicateOrg = await readUnderBypass((tx) =>
				tx
					.select({ id: organizations.id })
					.from(organizations)
					.where(eq(organizations.loginId, loginId))
					.limit(1),
			);
			if (!duplicateOrg.row && !duplicateOrg.bypassActive) {
				return replyPreTenantPolicyFailure(
					request,
					reply,
					"register:check-duplicate-login",
				);
			}
			if (duplicateOrg.row)
				return reply.code(409).send({
					error: "Conflict",
					message: "Организация с таким логином уже существует.",
				});

			const duplicateUser = await readUnderBypass((tx) =>
				tx
					.select({ id: users.id })
					.from(users)
					.where(eq(users.email, loginId))
					.limit(1),
			);
			if (!duplicateUser.row && !duplicateUser.bypassActive) {
				return replyPreTenantPolicyFailure(
					request,
					reply,
					"register:check-duplicate-user",
				);
			}
			if (duplicateUser.row)
				return reply.code(409).send({
					error: "Conflict",
					message: "Пользователь с таким email уже существует.",
				});

			// БЫЛО: PIN владельца всегда '0000' — предсказуемый вход в любую свежую клинику.
			// Хеши считаются до транзакции: pbkdf2 не должен держать соединение пула.
			const passwordHash = await hashCredential(password);
			const generatedOwnerPin = ownerPin
				? null
				: String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
			// biome-ignore lint/style/noNonNullAssertion: automated suppression
			const pinCodeHash = await hashCredential(ownerPin ?? generatedOwnerPin!);

			// Идентификатор клиники известен до вставки, поэтому обход здесь не нужен:
			// контекст арендатора разрешает создать ровно эту строку и никакую другую.
			// Клиника и владелец создаются одной транзакцией.
			const organizationId = crypto.randomUUID();
			const isSolo = practiceType === "solo";
			const clinicMode = isSolo ? "solo_doctor" : "small_clinic";

			const created = await withTenantCtx(organizationId, async (tx) => {
				const [organization] = await tx
					.insert(organizations)
					.values({
						id: organizationId,
						name: clinicName,
						loginId,
						passwordHash,
						email: loginId,
						clinicMode,
					})
					.returning();
				if (!organization) return { organization: null, owner: null };

				// Владелец с полным суверенитетом (Doctor Autonomy Mandate 8e)
				const [ownerUser] = await tx
					.insert(users)
					.values({
						organizationId,
						fullName: ownerName,
						role: "owner",
						email: loginId,
						phone: phone?.trim() || null,
						passwordHash,
						pinCodeHash,
						isActive: true,
						canSignMedicalRecords: true,
						canManageMoney: true,
						canManageImports: true,
					})
					.returning();

				if (!ownerUser) return { organization, owner: null };

				// Создаем клинику (филиал)
				const [clinic] = await tx
					.insert(clinics)
					.values({
						organizationId,
						name: clinicName || (isSolo ? "Кабинет врача" : "Основная клиника"),
					})
					.returning();

				// Создаем кабинеты (кресла)
				let createdChairs: Array<{ id: string; name: string }> = [];
				if (clinic) {
					const chairsToInsert = isSolo
						? [
								{
									organizationId,
									clinicId: clinic.id,
									name: "Основной кабинет",
									isActive: true,
								},
							]
						: [
								{
									organizationId,
									clinicId: clinic.id,
									name: "Кабинет 1 (Терапия)",
									isActive: true,
								},
								{
									organizationId,
									clinicId: clinic.id,
									name: "Кабинет 2 (Хирургия)",
									isActive: true,
								},
							];
					createdChairs = await tx
						.insert(chairs)
						.values(chairsToInsert)
						.returning({ id: chairs.id, name: chairs.name });
				}

				// Если withDemoData !== false — сеем полноценный клинический демо-контекст:
				// пациенты, приёмы, зубная формула (одонтограмма), дневник 043/у SOAP,
				// план лечения, склад и серии партионного учёта FEFO (МАНДАТ 8y, 8n)
				const primaryChair = createdChairs[0];
				if (withDemoData !== false && primaryChair) {
					const { seedDeepDemoData } = await import(
						"../../services/demo/deepDemoSeeder.js"
					);
					await seedDeepDemoData(tx, {
						organizationId,
						doctorUserId: ownerUser.id,
						primaryChairId: primaryChair.id,
					});
				}

				return { organization, owner: ownerUser };
			});

			const org = created.organization;
			if (!org)
				return reply.code(500).send({
					error: "InternalError",
					message: "Не удалось создать организацию.",
				});
			const user = created.owner;
			if (!user)
				return reply.code(500).send({
					error: "InternalError",
					message: "Не удалось создать профиль владельца.",
				});

			resetRateLimit(request);

			const clinicToken = signToken(
				{ organizationId: org.id, clinicName: org.name },
				TOKEN_SECRET(),
				60 * 60 * 24 * 7,
			);
			const token = signToken(
				{
					userId: user.id,
					fullName: user.fullName,
					role: user.role,
					organizationId: org.id,
				},
				TOKEN_SECRET(),
				60 * 60 * 24 * 7,
			);
			return reply.code(201).send({
				ok: true,
				clinicToken,
				staffToken: token,
				organizationId: org.id,
				userId: user.id,
				generatedOwnerPin,
				practiceType,
				demoDataSeeded: withDemoData !== false,
			});
		},
	);
}
