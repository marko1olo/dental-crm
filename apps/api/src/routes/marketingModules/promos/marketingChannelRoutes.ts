/**
 * marketingChannelRoutes.ts — Маршруты рекламных каналов (ROMI) и кампаний клиники.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { withTenantCtx } from "../../../db/rls.js";
import { organizations } from "../../../db/schema.js";
import {
	requireClinicalMutationAccess,
	requireResolvedOrganizationId,
} from "../../../accessGuard.js";
import { requireMarketingReadAccess } from "../marketingAccessGuard.js";
import {
	extractIdempotencyKey,
	isValidUuid,
} from "../../../plugins/idempotencyModules/idempotencyHeaderParser.js";
import {
	type AdvertisingChannelInput,
	advertisingChannelInputSchema,
	buildDenteDefaultAdvertisingChannels,
} from "@dental/shared";
import { readOrSeedOrganizationRomiChannels } from "./marketingRomiChannelsService.js";

const campaignsBodySchema = z.union([
	z.array(advertisingChannelInputSchema),
	z
		.object({
			campaigns: z.array(advertisingChannelInputSchema).optional(),
			channels: z.array(advertisingChannelInputSchema).optional(),
		})
		.strict()
		.refine(
			(val) => Array.isArray(val.campaigns) || Array.isArray(val.channels),
			{
				message: "Ожидался массив рекламных кампаний campaigns или channels",
			},
		),
	advertisingChannelInputSchema,
]);

const romiChannelsBodySchema = z.union([
	z.array(advertisingChannelInputSchema),
	z
		.object({
			channels: z.array(advertisingChannelInputSchema),
		})
		.strict(),
]);

export function registerMarketingChannelRoutes(app: FastifyInstance): void {
	/**
	 * GET /api/marketing/romi-channels
	 * Возвращает список рекламных каналов клиники с фактическими расходами из PostgreSQL 18.
	 */
	app.get("/api/marketing/romi-channels", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireMarketingReadAccess(request, reply, "marketing romi channels");
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
			return reply.code(500).send({
				error: "InternalServerError",
				message: "Не удалось загрузить рекламные каналы из базы данных",
			});
		}
	});

	/**
	 * GET /api/marketing/campaigns
	 * Алиас эндпоинта рекламных кампаний клиники с фактическими расходами и выручкой в копейках из PostgreSQL 18.
	 */
	app.get("/api/marketing/campaigns", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireMarketingReadAccess(request, reply, "marketing campaigns");
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
			return reply.code(500).send({
				error: "InternalServerError",
				message: "Не удалось загрузить рекламные кампании из базы данных",
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

		const idempotencyKey = extractIdempotencyKey(request);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7)",
			});
		}

		const parsedBody = campaignsBodySchema.safeParse(request.body);
		if (!parsedBody.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректная структура рекламных кампаний",
				details: parsedBody.error.issues,
			});
		}

		const parsedData = parsedBody.data;
		const rawList: AdvertisingChannelInput[] = Array.isArray(parsedData)
			? (parsedData as AdvertisingChannelInput[])
			: "campaigns" in parsedData || "channels" in parsedData
				? ((parsedData.campaigns ?? parsedData.channels ?? []) as AdvertisingChannelInput[])
				: [parsedData as AdvertisingChannelInput];
		const parsed = { data: rawList };

		try {
			const finalCampaigns = await withTenantCtx(orgId, async (tx) => {
				const [org] = await tx
					.select()
					.from(organizations)
					.where(eq(organizations.id, orgId))
					.for("update");
				const flags = (org?.workspaceFeatureFlags as Record<string, unknown>) || {};
				const existing = Array.isArray(flags.marketingRomiChannels)
					? (flags.marketingRomiChannels as AdvertisingChannelInput[])
					: buildDenteDefaultAdvertisingChannels();

				const mergedMap = new Map<string, AdvertisingChannelInput>();
				for (const ch of existing) {
					mergedMap.set(ch.channelKey || ch.id, ch);
				}
				for (const updated of parsed.data) {
					const key = updated.channelKey || updated.id;
					const prev = mergedMap.get(key);
					mergedMap.set(key, { ...prev, ...updated });
				}
				const final = Array.from(mergedMap.values());

				const updatedFlags = {
					...flags,
					marketingRomiChannels: final,
				};

				await tx
					.update(organizations)
					.set({ workspaceFeatureFlags: updatedFlags })
					.where(eq(organizations.id, orgId));

				return final;
			});

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

		const idempotencyKey = extractIdempotencyKey(request);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7)",
			});
		}

		const parsedBody = romiChannelsBodySchema.safeParse(request.body);
		if (!parsedBody.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректная структура рекламных каналов",
				details: parsedBody.error.issues,
			});
		}

		const channelsList = Array.isArray(parsedBody.data)
			? parsedBody.data
			: parsedBody.data.channels;
		const parsed = { data: channelsList };

		try {
			await withTenantCtx(orgId, async (tx) => {
				const [org] = await tx
					.select()
					.from(organizations)
					.where(eq(organizations.id, orgId))
					.for("update");
				const flags = (org?.workspaceFeatureFlags as Record<string, unknown>) || {};
				const updatedFlags = {
					...flags,
					marketingRomiChannels: parsed.data,
				};

				await tx
					.update(organizations)
					.set({ workspaceFeatureFlags: updatedFlags })
					.where(eq(organizations.id, orgId));
			});

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
	app.post("/api/marketing/romi-channels/reset", { schema: { description: "Marketing ROMI channels reset with mandatory RFC 9562 Idempotency-Key", headers: { type: "object", properties: { "idempotency-key": { type: "string" }, "x-idempotency-key": { type: "string" }, organizationid: { type: "string" }, "x-organization-id": { type: "string" } } } } }, async (request: FastifyRequest, reply: FastifyReply) => {
		const mutAllowed = await requireClinicalMutationAccess(request, reply, "reset marketing romi channels");
		if (!mutAllowed) return;

		const orgId = await requireResolvedOrganizationId(request, reply, "reset marketing romi channels");
		if (!orgId) return;

		const idempotencyKey = extractIdempotencyKey(request);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7)",
			});
		}
		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
		}

		try {
			const resetChannels = buildDenteDefaultAdvertisingChannels();
			await withTenantCtx(orgId, async (tx) => {
				const [org] = await tx
					.select()
					.from(organizations)
					.where(eq(organizations.id, orgId))
					.for("update");

				const existingFlags = (org?.workspaceFeatureFlags as Record<string, unknown>) || {};
				const updatedFlags = {
					...existingFlags,
					marketingRomiChannels: resetChannels,
				};

				await tx
					.update(organizations)
					.set({ workspaceFeatureFlags: updatedFlags })
					.where(eq(organizations.id, orgId));
			});

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
