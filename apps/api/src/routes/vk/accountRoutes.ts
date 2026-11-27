import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { withTenantReadCtx, withTenantWriteCtx } from "../../db/rls.js";
import { denteVkUserAccounts } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { OmnichannelTokenVault } from "../../services/bots/OmnichannelTokenVault.js";
import { VkApiClient } from "../../services/bots/VkApiClient.js";
import { connectAccountSchema } from "./schemas.js";

export function registerVkAccountRoutes(server: FastifyInstance): void {
	/**
	 * GET /api/vk/account/status
	 * Получение статуса подключенного личного аккаунта ВКонтакте.
	 */
	defineStreamRoute(server, {
		method: "GET",
		path: "/api/vk/account/status",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = await requireResolvedOrganizationId(request, reply, "vk account status");
			if (!orgId) return;

			const account = await withTenantReadCtx(orgId, async (tx) => {
				const accounts = await tx
					.select()
					.from(denteVkUserAccounts)
					.where(eq(denteVkUserAccounts.organizationId, orgId))
					.orderBy(desc(denteVkUserAccounts.createdAt))
					.limit(1);
				return accounts[0] || null;
			});

			if (!account || !account.isActive || account.status === "disconnected") {
				return reply.send({
					connected: false,
					account: null,
				});
			}

			return reply.send({
				connected: true,
				account: {
					id: account.id,
					vkUserId: account.vkUserId,
					firstName: account.firstName,
					lastName: account.lastName,
					screenName: account.screenName,
					photoUrl: account.photoUrl,
					status: account.status,
					isActive: account.isActive,
					lastSyncAt: account.lastSyncAt ? account.lastSyncAt.toISOString() : null,
				},
			});
		},
	});

	/**
	 * POST /api/vk/account/connect
	 * Подключение личной страницы врача / администратора ВКонтакте.
	 */
	defineStreamRoute(server, {
		method: "POST",
		path: "/api/vk/account/connect",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = await requireResolvedOrganizationId(request, reply, "vk account connect");
			if (!orgId) return;

			const identity = getRequestIdentity(request);

			const parsed = connectAccountSchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: parsed.error.issues[0]?.message || "Неверные параметры запроса",
				});
			}

			const { accessToken, vkUserId } = parsed.data;

			// Проверка токена пользователя через VK API (строго вне PG TX)
			let profile;
			try {
				profile = await VkApiClient.getUserProfile(accessToken, vkUserId);
			} catch (err) {
				const message =
					err instanceof Error
						? err.message
						: "Не удалось проверить личную страницу ВКонтакте";
				return reply.code(400).send({
					error: "VkUserVerificationFailed",
					message,
				});
			}

			// Шифрование токена пользователя AES-256-GCM
			const encryptedToken = OmnichannelTokenVault.encrypt(accessToken, orgId);
			const vkIdStr = String(profile.id);

			await withTenantWriteCtx(orgId, async (tx) => {
				const [existing] = await tx
					.select({ id: denteVkUserAccounts.id })
					.from(denteVkUserAccounts)
					.where(
						and(
							eq(denteVkUserAccounts.organizationId, orgId),
							eq(denteVkUserAccounts.vkUserId, vkIdStr),
						),
					)
					.limit(1);

				if (existing) {
					await tx
						.update(denteVkUserAccounts)
						.set({
							accessToken: encryptedToken,
							tokenSecretRef: encryptedToken,
							firstName: profile.first_name,
							lastName: profile.last_name,
							screenName: profile.screen_name || null,
							photoUrl: profile.photo_200 || profile.photo_100 || null,
							status: "connected",
							isActive: true,
							lastSyncAt: new Date(),
							updatedAt: new Date(),
						})
						.where(
							and(
								eq(denteVkUserAccounts.id, existing.id),
								eq(denteVkUserAccounts.organizationId, orgId),
							),
						);
				} else {
					await tx.insert(denteVkUserAccounts).values({
						organizationId: orgId,
						userId: identity.userId || undefined,
						vkUserId: vkIdStr,
						accessToken: encryptedToken,
						tokenSecretRef: encryptedToken,
						firstName: profile.first_name,
						lastName: profile.last_name,
						screenName: profile.screen_name || null,
						photoUrl: profile.photo_200 || profile.photo_100 || null,
						status: "connected",
						isActive: true,
						lastSyncAt: new Date(),
					});
				}
			});

			return reply.send({
				ok: true,
				profile: {
					id: profile.id,
					firstName: profile.first_name,
					lastName: profile.last_name,
					first_name: profile.first_name,
					last_name: profile.last_name,
					screenName: profile.screen_name,
					photoUrl: profile.photo_200 || profile.photo_100,
				},
			});
		},
	});

	/**
	 * POST /api/vk/account/disconnect
	 * Отключение личной страницы ВКонтакте.
	 */
	defineStreamRoute(server, {
		method: "POST",
		path: "/api/vk/account/disconnect",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = await requireResolvedOrganizationId(request, reply, "vk account disconnect");
			if (!orgId) return;

			await withTenantWriteCtx(orgId, async (tx) => {
				await tx
					.update(denteVkUserAccounts)
					.set({
						status: "disconnected",
						isActive: false,
						updatedAt: new Date(),
					})
					.where(eq(denteVkUserAccounts.organizationId, orgId));
			});

			return reply.send({ ok: true });
		},
	});
}
