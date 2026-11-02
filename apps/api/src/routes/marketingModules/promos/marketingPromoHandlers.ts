/**
 * marketingPromoHandlers.ts — Обработчики маршрутов акций и рекламных каналов Fastify.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../../db/client.js";
import { organizations } from "../../../db/schema.js";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../../../accessGuard.js";
import {
	type AdvertisingChannelInput,
	advertisingChannelInputSchema,
	buildDenteDefaultAdvertisingChannels,
} from "@dental/shared";
import {
	marketingPromoSchema,
	type StoredMarketingPromo,
} from "./marketingPromoSchemas.js";
import {
	DEFAULT_SERVER_MARKETING_PROMOS,
	readOrSeedOrganizationPromos,
} from "./marketingPromoDefaults.js";
import { readOrSeedOrganizationRomiChannels } from "./marketingRomiChannelsService.js";

export async function registerMarketingPromosRoutes(app: FastifyInstance) {
	/**
	 * GET /api/marketing/promos
	 * Возвращает список акций и кампаний клиники из PostgreSQL 18.
	 */
	app.get("/api/marketing/promos", async (request: FastifyRequest, reply: FastifyReply) => {
		const readAllowed = await requireClinicalReadAccess(request, reply, "marketing promos");
		if (!readAllowed) return;

		const orgId = await requireResolvedOrganizationId(request, reply, "marketing promos");
		if (!orgId) return;

		try {
			const { promos } = await readOrSeedOrganizationPromos(orgId);
			return reply.code(200).send({
				success: true,
				organizationId: orgId,
				promos,
			});
		} catch (err) {
			request.log.error({ err }, "[Marketing] Failed to load promos from DB");
			return reply.code(200).send({
				success: true,
				organizationId: orgId,
				promos: DEFAULT_SERVER_MARKETING_PROMOS,
			});
		}
	});

	/**
	 * POST /api/marketing/promos
	 * Создает новую акцию клиники и сохраняет её в PostgreSQL 18.
	 */
	app.post("/api/marketing/promos", async (request: FastifyRequest, reply: FastifyReply) => {
		const mutAllowed = await requireClinicalMutationAccess(request, reply, "create marketing promo");
		if (!mutAllowed) return;

		const orgId = await requireResolvedOrganizationId(request, reply, "create marketing promo");
		if (!orgId) return;

		const parsed = marketingPromoSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры акции",
				details: parsed.error.issues,
			});
		}

		try {
			const { flags, promos } = await readOrSeedOrganizationPromos(orgId);
			const nextPromos = [parsed.data, ...promos.filter((p) => p.id !== parsed.data.id)];
			const updatedFlags = {
				...flags,
				marketingPromos: nextPromos,
			};

			await db
				.update(organizations)
				.set({ workspaceFeatureFlags: updatedFlags })
				.where(eq(organizations.id, orgId));

			return reply.code(201).send({
				success: true,
				promo: parsed.data,
				promos: nextPromos,
			});
		} catch (err) {
			request.log.error({ err }, "[Marketing] Failed to save new promo in DB");
			return reply.code(500).send({
				error: "InternalServerError",
				message: "Не удалось сохранить акцию в базе данных",
			});
		}
	});

	/**
	 * PATCH /api/marketing/promos/:id/status
	 * Переключает статус акции (active / archived / paused) в PostgreSQL 18.
	 */
	app.patch("/api/marketing/promos/:id/status", async (request: FastifyRequest, reply: FastifyReply) => {
		const mutAllowed = await requireClinicalMutationAccess(request, reply, "toggle marketing promo status");
		if (!mutAllowed) return;

		const orgId = await requireResolvedOrganizationId(request, reply, "toggle marketing promo status");
		if (!orgId) return;

		const { id } = request.params as { id: string };
		const body = (request.body as { status?: "active" | "archived" | "paused" } | null) || {};

		try {
			const { flags, promos } = await readOrSeedOrganizationPromos(orgId);
			let updatedPromo: StoredMarketingPromo | null = null;

			const nextPromos = promos.map((p) => {
				if (p.id !== id) return p;
				const nextStatus: StoredMarketingPromo["status"] =
					body.status ?? (p.status === "active" ? "archived" : "active");
				updatedPromo = { ...p, status: nextStatus };
				return updatedPromo;
			});

			if (!updatedPromo) {
				return reply.code(404).send({
					error: "PromoNotFound",
					message: "Акция не найдена",
				});
			}

			const updatedFlags = {
				...flags,
				marketingPromos: nextPromos,
			};

			await db
				.update(organizations)
				.set({ workspaceFeatureFlags: updatedFlags })
				.where(eq(organizations.id, orgId));

			return reply.code(200).send({
				success: true,
				promo: updatedPromo,
				promos: nextPromos,
			});
		} catch (err) {
			request.log.error({ err }, "[Marketing] Failed to toggle promo status in DB");
			return reply.code(500).send({
				error: "InternalServerError",
				message: "Не удалось обновить статус акции в базе данных",
			});
		}
	});

	/**
	 * GET /api/marketing/romi-channels
	 * Возвращает список рекламных каналов клиники с фактическими расходами из PostgreSQL 18.
	 */
	app.get("/api/marketing/romi-channels", async (request: FastifyRequest, reply: FastifyReply) => {
		const readAllowed = await requireClinicalReadAccess(request, reply, "marketing romi channels");
		if (!readAllowed) return;

		const orgId = await requireResolvedOrganizationId(request, reply, "marketing romi channels");
		if (!orgId) return;

		try {
			const { channels } = await readOrSeedOrganizationRomiChannels(orgId);
			return reply.code(200).send({
				success: true,
				organizationId: orgId,
				channels,
			});
		} catch (err) {
			request.log.error({ err }, "[Marketing] Failed to load ROMI channels from DB");
			return reply.code(200).send({
				success: true,
				organizationId: orgId,
				channels: buildDenteDefaultAdvertisingChannels(),
			});
		}
	});

	/**
	 * GET /api/marketing/campaigns
	 * Алиас эндпоинта рекламных кампаний клиники с фактическими расходами и выручкой в копейках из PostgreSQL 18.
	 */
	app.get("/api/marketing/campaigns", async (request: FastifyRequest, reply: FastifyReply) => {
		const readAllowed = await requireClinicalReadAccess(request, reply, "marketing campaigns");
		if (!readAllowed) return;

		const orgId = await requireResolvedOrganizationId(request, reply, "marketing campaigns");
		if (!orgId) return;

		try {
			const { channels } = await readOrSeedOrganizationRomiChannels(orgId);
			return reply.code(200).send({
				success: true,
				organizationId: orgId,
				campaigns: channels,
				channels,
			});
		} catch (err) {
			request.log.error({ err }, "[Marketing] Failed to load marketing campaigns from DB");
			const defChannels = buildDenteDefaultAdvertisingChannels();
			return reply.code(200).send({
				success: true,
				organizationId: orgId,
				campaigns: defChannels,
				channels: defChannels,
			});
		}
	});

	/**
	 * POST /api/marketing/campaigns
	 * Сохраняет рекламные кампании/каналы клиники в PostgreSQL 18 с целочисленными копейками (BIGINT).
	 */
	app.post("/api/marketing/campaigns", async (request: FastifyRequest, reply: FastifyReply) => {
		const mutAllowed = await requireClinicalMutationAccess(request, reply, "save marketing campaigns");
		if (!mutAllowed) return;

		const orgId = await requireResolvedOrganizationId(request, reply, "save marketing campaigns");
		if (!orgId) return;

		const body = request.body as any;
		const rawList = Array.isArray(body)
			? body
			: Array.isArray(body?.campaigns)
				? body.campaigns
				: Array.isArray(body?.channels)
					? body.channels
					: body && typeof body === "object" && body.channelKey
						? [body]
						: null;

		if (!rawList) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Ожидался массив рекламных кампаний campaigns или channels",
			});
		}

		const parsed = z.array(advertisingChannelInputSchema).safeParse(rawList);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректная структура рекламных кампаний",
				details: parsed.error.issues,
			});
		}

		try {
			const { flags, channels: existing } = await readOrSeedOrganizationRomiChannels(orgId);

			const mergedMap = new Map<string, AdvertisingChannelInput>();
			for (const ch of existing) {
				mergedMap.set(ch.channelKey || ch.id, ch);
			}
			for (const updated of parsed.data) {
				const key = updated.channelKey || updated.id;
				const prev = mergedMap.get(key);
				mergedMap.set(key, { ...prev, ...updated });
			}
			const finalCampaigns = Array.from(mergedMap.values());

			const updatedFlags = {
				...flags,
				marketingRomiChannels: finalCampaigns,
			};

			await db
				.update(organizations)
				.set({ workspaceFeatureFlags: updatedFlags })
				.where(eq(organizations.id, orgId));

			return reply.code(200).send({
				success: true,
				organizationId: orgId,
				campaigns: finalCampaigns,
				channels: finalCampaigns,
			});
		} catch (err) {
			request.log.error({ err }, "[Marketing] Failed to persist marketing campaigns in DB");
			return reply.code(500).send({
				error: "InternalServerError",
				message: "Не удалось сохранить рекламные кампании в базе данных",
			});
		}
	});

	/**
	 * POST /api/marketing/romi-channels
	 * Сохраняет рекламные каналы и затраты клиники в PostgreSQL 18 с изоляцией по организации.
	 */
	app.post("/api/marketing/romi-channels", async (request: FastifyRequest, reply: FastifyReply) => {
		const mutAllowed = await requireClinicalMutationAccess(request, reply, "save marketing romi channels");
		if (!mutAllowed) return;

		const orgId = await requireResolvedOrganizationId(request, reply, "save marketing romi channels");
		if (!orgId) return;

		const body = request.body as any;
		const rawList = Array.isArray(body)
			? body
			: Array.isArray(body?.channels)
				? body.channels
				: null;

		if (!rawList) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Ожидался массив рекламных каналов channels",
			});
		}

		const parsed = z.array(advertisingChannelInputSchema).safeParse(rawList);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректная структура рекламных каналов",
				details: parsed.error.issues,
			});
		}

		try {
			const { flags } = await readOrSeedOrganizationRomiChannels(orgId);
			const updatedFlags = {
				...flags,
				marketingRomiChannels: parsed.data,
			};

			await db
				.update(organizations)
				.set({ workspaceFeatureFlags: updatedFlags })
				.where(eq(organizations.id, orgId));

			return reply.code(200).send({
				success: true,
				organizationId: orgId,
				channels: parsed.data,
			});
		} catch (err) {
			request.log.error({ err }, "[Marketing] Failed to persist ROMI channels in DB");
			return reply.code(500).send({
				error: "InternalServerError",
				message: "Не удалось сохранить рекламные каналы в базе данных",
			});
		}
	});

	/**
	 * POST /api/marketing/romi-channels/reset
	 * Сбрасывает рекламные каналы клиники к эталонным каноническим каналам DENTE в PostgreSQL 18.
	 */
	app.post("/api/marketing/romi-channels/reset", async (request: FastifyRequest, reply: FastifyReply) => {
		const mutAllowed = await requireClinicalMutationAccess(request, reply, "reset marketing romi channels");
		if (!mutAllowed) return;

		const orgId = await requireResolvedOrganizationId(request, reply, "reset marketing romi channels");
		if (!orgId) return;

		try {
			const [org] = await db
				.select({ flags: organizations.workspaceFeatureFlags })
				.from(organizations)
				.where(eq(organizations.id, orgId))
				.limit(1);

			const existingFlags = (org?.flags as Record<string, unknown>) || {};
			const resetChannels = buildDenteDefaultAdvertisingChannels();
			const updatedFlags = {
				...existingFlags,
				marketingRomiChannels: resetChannels,
			};

			await db
				.update(organizations)
				.set({ workspaceFeatureFlags: updatedFlags })
				.where(eq(organizations.id, orgId));

			return reply.code(200).send({
				success: true,
				organizationId: orgId,
				channels: resetChannels,
			});
		} catch (err) {
			request.log.error({ err }, "[Marketing] Failed to reset ROMI channels in DB");
			return reply.code(500).send({
				error: "InternalServerError",
				message: "Не удалось сбросить рекламные каналы в базе данных",
			});
		}
	});
}
