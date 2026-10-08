import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	auditEvents,
	organizations,
	users,
} from "../../db/schema.js";
import { ADMIN_ROLES, getRequestIdentity } from "../../security/identity.js";
import {
	hashCredential,
	verifyCredential,
	verifyToken,
} from "../../utils/cryptoHelper.js";
import { timingSafeSecretEqual } from "../../utils/timingSafeSecretEqual.js";
import {
	authAdminKeyFromRecord,
	authBodyRecord,
	authFailureDelay,
	authSchemaMessage,
	configuredAdminSetupKey,
	readUnderBypass,
	replyPreTenantPolicyFailure,
	TOKEN_SECRET,
} from "./tokenHelpers.js";
import {
	clinicSetPasswordBodySchema,
	staffSetPinBodySchema,
	updatePasswordBodySchema,
	updatePinBodySchema,
} from "./types.js";

export function registerPasswordRoutes(app: FastifyInstance): void {
	// ─── Admin: Set/Reset Clinic Password ────────────────────────────────────────
	// БЫЛО: любой запрос с публичным дефолтным ключом "dente_admin_setup_key" мог
	// сбросить пароль ЛЮБОЙ организации по её UUID (полный захват всех клиник).
	// СТАЛО: нужен либо владелец/админ с валидным токеном своей организации,
	// либо настроенный ADMIN_SETUP_KEY (сравнение timing-safe). Без переменной
	// окружения ключевой путь недоступен вовсе.
	app.post(
		"/api/auth/clinic/set-password",
		async (request: FastifyRequest, reply: FastifyReply) => {
			// AUTH first on raw record (adminKey credential), then Zod body for authorized caller.
			// Anonymous always gets the same 403 regardless of body shape (no policy oracle).
			const rawBody = authBodyRecord(request.body);

			const identity = getRequestIdentity(request);
			const isOrgAdmin =
				!!identity.organizationId &&
				!!identity.userId &&
				ADMIN_ROLES.some(
					(role) => role === (identity.role ?? "").toLowerCase(),
				);

			const setupKey = configuredAdminSetupKey();
			const hasValidSetupKey =
				!!setupKey &&
				timingSafeSecretEqual(authAdminKeyFromRecord(rawBody), setupKey);

			if (!isOrgAdmin && !hasValidSetupKey) {
				await authFailureDelay();
				return reply.code(403).send({
					error: "Forbidden",
					message: "Недостаточно прав для смены пароля клиники.",
				});
			}

			const parsed = clinicSetPasswordBodySchema.safeParse(request.body ?? {});
			if (!parsed.success) {
				const message = authSchemaMessage(
					parsed.error,
					"Новый пароль должен быть не короче 8 символов.",
					[
						{
							match: "Новый пароль должен быть не короче 8 символов.",
							message: "Новый пароль должен быть не короче 8 символов.",
						},
					],
				);
				return reply.code(400).send({ error: "ValidationError", message });
			}
			const body = parsed.data;

			// Org admin may only reset own org password; setup-key path needs organizationId.
			const targetOrganizationId = isOrgAdmin
				? // biome-ignore lint/style/noNonNullAssertion: automated suppression
					identity.organizationId!
				: body.organizationId;
			if (!targetOrganizationId) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Не указана организация.",
				});
			}
			if (
				isOrgAdmin &&
				body.organizationId &&
				body.organizationId !== identity.organizationId
			) {
				return reply.code(403).send({
					error: "Forbidden",
					message: "Нельзя менять пароль чужой организации.",
				});
			}

			const hash = await hashCredential(body.newPassword);

			// ПУТЬ ADMIN_SETUP_KEY НЕ НЕСЁТ ТОКЕНА, значит арендатора у запроса нет и
			// глобальная обёртка server.ts его не выставляет. Замер: без контекста
			// `UPDATE organizations` затрагивает 0 строк и ошибки не даёт, а следующая
			// за ним запись аудита падает с 42501 — то есть маршрут либо молча не
			// менял пароль, либо отвечал 500 без причины.
			//
			// Контекст выставляется по ЯВНО названной организации. Это не обход:
			// политика сверяет `id = current_tenant`, поэтому под этим контекстом можно
			// изменить ровно ту организацию, которая названа, и никакую другую.
			// Проверка «не чужая организация» для админа сделана выше и не ослаблена.
			const passwordUpdated = await withTenantCtx(
				targetOrganizationId,
				async (tx) => {
					const changed = await tx
						.update(organizations)
						.set({ passwordHash: hash })
						.where(eq(organizations.id, targetOrganizationId))
						.returning({ id: organizations.id });
					if (!changed.length) return false;

					await tx.insert(auditEvents).values({
						organizationId: targetOrganizationId,
						actorUserId: identity.userId ?? null,
						entityType: "organization",
						entityId: targetOrganizationId,
						action: "clinic_password_reset",
						reason: isOrgAdmin
							? "Смена пароля клиники администратором"
							: "Смена пароля клиники ключом установки",
					});
					return true;
				},
			);

			// БЫЛО: ответ «Пароль клиники обновлён.» отправлялся независимо от того,
			// изменилась ли хоть одна строка. Ноль изменённых строк — это ненайденная
			// организация, и говорить об успехе тут нельзя.
			if (!passwordUpdated) {
				return reply.code(404).send({
					error: "OrganizationNotFound",
					message: "Организация не найдена.",
				});
			}

			return reply.send({ ok: true, message: "Пароль клиники обновлён." });
		},
	);

	// ─── Admin: Set Staff PIN ─────────────────────────────────────────────────────
	// БЫЛО: публичный дефолтный ключ + произвольный userId без проверки организации.
	// СТАЛО: только владелец/админ своей организации (или настроенный ADMIN_SETUP_KEY),
	// и целевой сотрудник обязан принадлежать той же организации.
	app.post(
		"/api/auth/staff/set-pin",
		async (request: FastifyRequest, reply: FastifyReply) => {
			// AUTH first on raw record, then Zod body. Anonymous always same 403.
			const rawBody = authBodyRecord(request.body);

			const identity = getRequestIdentity(request);
			const isOrgAdmin =
				!!identity.organizationId &&
				!!identity.userId &&
				ADMIN_ROLES.some(
					(role) => role === (identity.role ?? "").toLowerCase(),
				);

			const setupKey = configuredAdminSetupKey();
			const hasValidSetupKey =
				!!setupKey &&
				timingSafeSecretEqual(authAdminKeyFromRecord(rawBody), setupKey);

			if (!isOrgAdmin && !hasValidSetupKey) {
				await authFailureDelay();
				return reply.code(403).send({
					error: "Forbidden",
					message: "Недостаточно прав для смены PIN сотрудника.",
				});
			}

			const parsed = staffSetPinBodySchema.safeParse(request.body ?? {});
			if (!parsed.success) {
				// Old if-order: userId missing first, then PIN form.
				// Union invalid_type on newPin has no custom text — map by path.
				const userPathHit = parsed.error.issues.some(
					(issue) => issue.path[0] === "userId",
				);
				const pinPathHit = parsed.error.issues.some(
					(issue) => issue.path[0] === "newPin",
				);
				const message = userPathHit
					? "Не указан сотрудник."
					: pinPathHit
						? "PIN должен состоять из 4–12 цифр."
						: authSchemaMessage(parsed.error, "Не указан сотрудник.", [
								{
									match: "PIN должен состоять из 4–12 цифр.",
									message: "PIN должен состоять из 4–12 цифр.",
								},
							]);
				return reply.code(400).send({ error: "ValidationError", message });
			}
			const body = parsed.data;

			if (isOrgAdmin) {
				const [target] = await db
					.select({ id: users.id })
					.from(users)
					.where(
						and(
							eq(users.id, body.userId),
							// biome-ignore lint/style/noNonNullAssertion: automated suppression
							eq(users.organizationId, identity.organizationId!),
						),
					)
					.limit(1);
				if (!target) {
					return reply.code(404).send({
						error: "UserNotFound",
						message: "Сотрудник не найден в вашей организации.",
					});
				}
			}

			const hash = await hashCredential(body.newPin);
			// Defense-in-depth: never UPDATE staff credentials by bare id.
			// Org-admin path already SELECTed with org; setup-key path may lack identity.organizationId.
			// Bind UPDATE to the target user's organizationId so a concurrent org move cannot widen the write.
			//
			// ПУТЬ ADMIN_SETUP_KEY — операция «до арендатора»: токена нет, значит нет и
			// контекста, а без контекста поиск сотрудника отдавал ноль строк и маршрут
			// отвечал «Сотрудник не найден» на существующего сотрудника. Обход накрывает
			// РОВНО одно чтение одной колонки — организации целевого сотрудника. Сама
			// запись идёт уже под контекстом этой организации: в `WITH CHECK` политики
			// users обхода нет, и под одним лишь обходом UPDATE отвергается (42501).
			let targetOrganizationId = identity.organizationId ?? null;
			if (!targetOrganizationId) {
				const owner = await readUnderBypass((tx) =>
					tx
						.select({ organizationId: users.organizationId })
						.from(users)
						.where(eq(users.id, body.userId))
						.limit(1),
				);
				if (!owner.row && !owner.bypassActive) {
					return replyPreTenantPolicyFailure(
						request,
						reply,
						"staff-set-pin:lookup-user-organization",
					);
				}
				targetOrganizationId = owner.row?.organizationId ?? null;
			}
			if (!targetOrganizationId) {
				return reply.code(404).send({
					error: "UserNotFound",
					message: "Сотрудник не найден в организации.",
				});
			}

			const pinOrganizationId = targetOrganizationId;
			const pinUpdated = await withTenantCtx(pinOrganizationId, async (tx) => {
				const changed = await tx
					.update(users)
					.set({ pinCodeHash: hash })
					.where(
						and(
							eq(users.id, body.userId),
							eq(users.organizationId, pinOrganizationId),
						),
					)
					.returning({ id: users.id });
				if (!changed.length) return false;

				if (identity.organizationId) {
					await tx.insert(auditEvents).values({
						organizationId: identity.organizationId,
						actorUserId: identity.userId ?? null,
						entityType: "user",
						entityId: body.userId,
						action: "staff_pin_reset",
						reason: "Смена PIN-кода сотрудника",
					});
				}
				return true;
			});
			if (!pinUpdated) {
				return reply.code(404).send({
					error: "UserNotFound",
					message: "Сотрудник не найден в организации.",
				});
			}

			return reply.send({ ok: true, message: "PIN сотрудника обновлён." });
		},
	);

	// ─── SaaS User Profile: Update Password ───────────────────────────────────────
	app.post(
		"/api/auth/user/update-password",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const staffHeader = request.headers["x-dente-staff-token"];
			const staffToken = Array.isArray(staffHeader)
				? staffHeader[0]
				: staffHeader;
			const payload = staffToken
				? verifyToken(staffToken, TOKEN_SECRET())
				: null;

			// AUTH first, then body — same order as set-password.
			if (!payload?.userId)
				return reply
					.code(401)
					.send({ error: "AuthRequired", message: "Требуется авторизация." });
			const parsed = updatePasswordBodySchema.safeParse(request.body ?? {});
			if (!parsed.success) {
				const message = authSchemaMessage(
					parsed.error,
					"Введите старый и новый пароль.",
					[
						{
							match: "Новый пароль должен быть не короче 8 символов.",
							message: "Новый пароль должен быть не короче 8 символов.",
						},
					],
				);
				return reply.code(400).send({ error: "ValidationError", message });
			}
			const { oldPassword, newPassword } = parsed.data;

			const userConditions = [eq(users.id, payload.userId as string)];
			if (payload.organizationId) {
				userConditions.push(
					eq(users.organizationId, payload.organizationId as string),
				);
			}

			const [user] = await db
				.select()
				.from(users)
				.where(and(...userConditions))
				.limit(1);
			if (!user?.passwordHash)
				return reply.code(401).send({
					error: "AuthError",
					message: "Пользователь не найден или пароль не установлен.",
				});

			if (!(await verifyCredential(oldPassword, user.passwordHash))) {
				return reply
					.code(401)
					.send({ error: "AuthError", message: "Старый пароль неверен." });
			}

			const newPasswordHash = await hashCredential(newPassword);
			await db
				.update(users)
				.set({ passwordHash: newPasswordHash })
				.where(
					and(
						eq(users.id, user.id),
						eq(users.organizationId, user.organizationId),
					),
				);

			return reply.send({ ok: true, message: "Пароль успешно изменен." });
		},
	);

	// ─── SaaS User Profile: Update PIN ───────────────────────────────────────────
	app.post(
		"/api/auth/user/update-pin",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const staffHeader = request.headers["x-dente-staff-token"];
			const staffToken = Array.isArray(staffHeader)
				? staffHeader[0]
				: staffHeader;
			const payload = staffToken
				? verifyToken(staffToken, TOKEN_SECRET())
				: null;

			// AUTH first, then body — same order as set-pin.
			if (!payload?.userId)
				return reply
					.code(401)
					.send({ error: "AuthRequired", message: "Требуется авторизация." });
			const parsed = updatePinBodySchema.safeParse(request.body ?? {});
			if (!parsed.success) {
				const message = authSchemaMessage(
					parsed.error,
					"Введите старый и новый PIN-код.",
					[
						{
							match: "PIN должен состоять из 4–12 цифр.",
							message: "PIN должен состоять из 4–12 цифр.",
						},
					],
				);
				return reply.code(400).send({ error: "ValidationError", message });
			}
			const { oldPin, newPin } = parsed.data;

			const userConditions = [eq(users.id, payload.userId as string)];
			if (payload.organizationId) {
				userConditions.push(
					eq(users.organizationId, payload.organizationId as string),
				);
			}

			const [user] = await db
				.select()
				.from(users)
				.where(and(...userConditions))
				.limit(1);
			if (!user?.pinCodeHash)
				return reply.code(401).send({
					error: "AuthError",
					message: "Пользователь не найден или PIN не установлен.",
				});

			if (!(await verifyCredential(oldPin, user.pinCodeHash))) {
				return reply
					.code(401)
					.send({ error: "AuthError", message: "Старый PIN-код неверен." });
			}

			const newPinHash = await hashCredential(newPin);
			await db
				.update(users)
				.set({ pinCodeHash: newPinHash })
				.where(
					and(
						eq(users.id, user.id),
						eq(users.organizationId, user.organizationId),
					),
				);

			return reply.send({ ok: true, message: "PIN-код успешно изменен." });
		},
	);
}
