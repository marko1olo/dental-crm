import crypto from "node:crypto";
import { staffRoleSchema } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	organizations,
	userInvitations,
	users,
} from "../../db/schema.js";
import { ADMIN_ROLES } from "../../security/identity.js";
import {
	hashCredential,
	signToken,
	verifyToken,
} from "../../utils/cryptoHelper.js";
import {
	authSchemaMessage,
	readUnderBypass,
	replyPreTenantPolicyFailure,
	TOKEN_SECRET,
} from "./tokenHelpers.js";
import {
	acceptInviteBodySchema,
	createInviteBodySchema,
} from "./types.js";

export function registerInvitationRoutes(app: FastifyInstance): void {
	// ─── SaaS Create Invite ──────────────────────────────────────────────────────
	app.post(
		"/api/auth/invites/create",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const staffHeader = request.headers["x-dente-staff-token"];
			const staffToken = Array.isArray(staffHeader)
				? staffHeader[0]
				: staffHeader;
			const staffPayload = staffToken
				? verifyToken(staffToken, TOKEN_SECRET())
				: null;

			/*
			 * БЫЛО: `staffPayload.role !== 'owner' && staffPayload.role !== 'admin'` —
			 * своя пара написаний прямо в условии. Роли `admin` в staffRoleSchema нет
			 * (там owner, doctor, administrator, assistant, manager), поэтому настоящий
			 * администратор клиники получал 403 и приглашать сотрудников мог только
			 * владелец.
			 *
			 * Свой список ролей здесь не заводится: в проекте уже есть единственный
			 * ADMIN_ROLES (security/identity.ts) — «роли, которым разрешены
			 * административные действия», и тем же списком пользуются два соседних
			 * маршрута этого файла. Легаси-написание `admin` в нём
			 * оставлено сознательно, и здесь оно тоже сохраняется: два списка одной
			 * правды — ровно та болезнь, которую этот продукт уже проходил.
			 * Сравнение в нижнем регистре, как у соседей.
			 */
			const invitingRole = String(staffPayload?.role ?? "").toLowerCase();
			if (
				!staffPayload?.organizationId ||
				!ADMIN_ROLES.some((allowed) => allowed === invitingRole)
			) {
				return reply.code(403).send({
					error: "Forbidden",
					message:
						"Приглашать сотрудников может владелец клиники или администратор.",
				});
			}
			// AUTH first, then body — same order as set-password/set-pin.
			const parsedBody = createInviteBodySchema.safeParse(request.body ?? {});
			if (!parsedBody.success) {
				return reply
					.code(400)
					.send({ error: "ValidationError", message: "Укажите email и роль." });
			}
			const { email, role } = parsedBody.data;

			/*
			 * РОЛЬ ПРОВЕРЯЕТСЯ ПО СХЕМЕ, а не принимается как есть. Прежде значение из
			 * тела запроса ложилось в user_invitations.role напрямую, а
			 * /api/auth/invites/accept переносит его в users.role тоже без проверки.
			 * Экран настроек до недавнего исправления отправлял `admin` — роль, которой
			 * нет в схеме, — и она доживала до users.role. Дальше getFilteredAppViews
			 * на незнакомой роли доходит до ветки «вернуть все разделы», и приглашённый
			 * администратор получал права владельца: 14 разделов вместо 9.
			 *
			 * Экранную часть уже починили (59a886a2c, список ролей выведен из схемы), но
			 * сервер обязан отказывать сам: клиент — не место для проверки прав.
			 */
			const parsedRole = staffRoleSchema.safeParse(role);
			if (!parsedRole.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message:
						"Такой должности в программе нет. Выберите её из списка на экране приглашения.",
				});
			}

			const tokenUuid = crypto.randomUUID();
			const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

			await db.insert(userInvitations).values({
				organizationId: staffPayload.organizationId as string,
				email: email.toLowerCase().trim(),
				role: parsedRole.data,
				inviteToken: tokenUuid,
				expiresAt,
				status: "pending",
			});

			return reply.send({
				ok: true,
				inviteLink: `/#/auth/accept-invite?token=${tokenUuid}`,
			});
		},
	);

	// ─── SaaS Accept Invite ──────────────────────────────────────────────────────
	app.post(
		"/api/auth/invites/accept",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const parsed = acceptInviteBodySchema.safeParse(request.body ?? {});
			if (!parsed.success) {
				const message = authSchemaMessage(parsed.error, "Заполните все поля.", [
					{
						match: "Пароль должен быть не короче 8 символов.",
						message: "Пароль должен быть не короче 8 символов.",
					},
					{
						match: "PIN должен состоять из 4–12 цифр.",
						message: "PIN должен состоять из 4–12 цифр.",
					},
				]);
				return reply.code(400).send({ error: "ValidationError", message });
			}
			const { token, fullName, password, pinCode } = parsed.data;

			// ОПЕРАЦИЯ «ДО АРЕНДАТОРА». Приглашение опознаётся по одноразовой ссылке,
			// и никакого токена клиники у приглашённого ещё нет: организация станет
			// известна только из найденной строки. Замер: без контекста этот SELECT
			// отдаёт ноль строк, под обходом — строку. Обход накрывает ровно его.
			const inviteLookup = await readUnderBypass((tx) =>
				tx
					.select()
					.from(userInvitations)
					.where(
						and(
							eq(userInvitations.inviteToken, token),
							eq(userInvitations.status, "pending"),
						),
					)
					.limit(1),
			);
			if (!inviteLookup.row && !inviteLookup.bypassActive) {
				return replyPreTenantPolicyFailure(
					request,
					reply,
					"invite-accept:lookup-invitation",
				);
			}
			const invite = inviteLookup.row;
			if (!invite || new Date() > invite.expiresAt)
				return reply.code(400).send({
					error: "InvalidToken",
					message: "Приглашение недействительно или истекло.",
				});

			// Хеши считаются до транзакции: pbkdf2 не должен держать соединение пула.
			const passwordHash = await hashCredential(password);
			const pinCodeHash = await hashCredential(pinCode);

			// Дальше арендатор известен (invite.organizationId), и всё идёт под ним, а
			// НЕ под обходом: в WITH CHECK политик user_invitations и users обхода нет,
			// UPDATE под одним лишь обходом отвергается кодом 42501 (проверено).
			// Без контекста было хуже: UPDATE затрагивал ноль строк и приглашённый
			// получал «Приглашение уже использовано» на живое приглашение.
			const accepted = await withTenantCtx(
				invite.organizationId,
				async (tx) => {
					// Приглашение одноразовое: помечаем принятым ДО создания пользователя, чтобы
					// параллельные запросы с одной ссылкой не создали несколько учётных записей.
					const claimed = await tx
						.update(userInvitations)
						.set({ status: "accepted" })
						.where(
							and(
								eq(userInvitations.id, invite.id),
								eq(userInvitations.status, "pending"),
							),
						)
						.returning({ id: userInvitations.id });
					if (!claimed.length)
						return { claimed: false, user: null, clinicName: null };

					const [createdUser] = await tx
						.insert(users)
						.values({
							organizationId: invite.organizationId,
							fullName,
							role: invite.role,
							email: invite.email,
							passwordHash,
							pinCodeHash,
							isActive: true,
						})
						.returning();
					if (!createdUser) {
						// Откатываем пометку, чтобы приглашение не сгорело из-за сбоя вставки.
						await tx
							.update(userInvitations)
							.set({ status: "pending" })
							.where(eq(userInvitations.id, invite.id));
						return { claimed: true, user: null, clinicName: null };
					}

					const [org] = await tx
						.select({ name: organizations.name })
						.from(organizations)
						.where(eq(organizations.id, createdUser.organizationId))
						.limit(1);
					return {
						claimed: true,
						user: createdUser,
						clinicName: org?.name ?? null,
					};
				},
			);

			if (!accepted.claimed) {
				return reply.code(400).send({
					error: "InvalidToken",
					message: "Приглашение уже использовано.",
				});
			}
			const user = accepted.user;
			if (!user) {
				return reply.code(500).send({
					error: "InternalError",
					message: "Не удалось создать пользователя.",
				});
			}

			const clinicToken = signToken(
				{
					organizationId: user.organizationId,
					clinicName: accepted.clinicName ?? "Clinic",
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
}
