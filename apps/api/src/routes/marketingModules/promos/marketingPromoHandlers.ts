/**
 * marketingPromoHandlers.ts — Обработчики маршрутов акций и рекламных каналов Fastify.
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
	marketingPromoSchema,
	type StoredMarketingPromo,
} from "./marketingPromoSchemas.js";
import {
	DEFAULT_SERVER_MARKETING_PROMOS,
	readOrSeedOrganizationPromos,
} from "./marketingPromoDefaults.js";
import { registerMarketingChannelRoutes } from "./marketingChannelRoutes.js";

const promoStatusUpdateSchema = z
	.object({
		status: z.enum(["active", "archived", "paused"]).optional(),
	})
	.strict();

export async function registerMarketingPromosRoutes(app: FastifyInstance) {
	/**
	 * GET /api/marketing/promos
	 * Возвращает список акций и кампаний клиники из PostgreSQL 18.
	 */
	app.get("/api/marketing/promos", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireMarketingReadAccess(request, reply, "marketing promos");
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
			return reply.code(500).send({
				error: "InternalServerError",
				message: "Не удалось загрузить акции из базы данных",
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

		const idempotencyKey = extractIdempotencyKey(request);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7)",
			});
		}

		const parsed = marketingPromoSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры акции",
				details: parsed.error.issues,
			});
		}

		try {
			const { nextPromos } = await withTenantCtx(orgId, async (tx) => {
				const [org] = await tx
					.select()
					.from(organizations)
					.where(eq(organizations.id, orgId))
					.for("update");
				const flags = (org?.workspaceFeatureFlags as Record<string, unknown>) || {};
				const existingPromos = Array.isArray(flags.marketingPromos)
					? (flags.marketingPromos as StoredMarketingPromo[])
					: [...DEFAULT_SERVER_MARKETING_PROMOS];
				const nextPromos = [parsed.data, ...existingPromos.filter((p) => p.id !== parsed.data.id)];
				const updatedFlags = {
					...flags,
					marketingPromos: nextPromos,
				};

				await tx
					.update(organizations)
					.set({ workspaceFeatureFlags: updatedFlags })
					.where(eq(organizations.id, orgId));

				return { nextPromos };
			});

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

		const idempotencyKey = extractIdempotencyKey(request);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7)",
			});
		}

		const { id } = request.params as { id: string };
		if (!id || id.trim().length === 0) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный идентификатор акции",
			});
		}
		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
		}
		const parsedStatus = promoStatusUpdateSchema.safeParse(request.body ?? {});
		if (!parsedStatus.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный статус акции",
				details: parsedStatus.error.issues,
			});
		}
		const body = parsedStatus.data;

		try {
			const result = await withTenantCtx(orgId, async (tx) => {
				const [org] = await tx
					.select()
					.from(organizations)
					.where(eq(organizations.id, orgId))
					.for("update");
				const flags = (org?.workspaceFeatureFlags as Record<string, unknown>) || {};
				const existingPromos = Array.isArray(flags.marketingPromos)
					? (flags.marketingPromos as StoredMarketingPromo[])
					: [...DEFAULT_SERVER_MARKETING_PROMOS];

				let updatedPromo: StoredMarketingPromo | null = null;
				const nextPromos = existingPromos.map((p) => {
					if (p.id !== id) return p;
					const nextStatus: StoredMarketingPromo["status"] =
						body.status ?? (p.status === "active" ? "archived" : "active");
					updatedPromo = { ...p, status: nextStatus };
					return updatedPromo;
				});

				if (!updatedPromo) {
					return null;
				}

				const updatedFlags = {
					...flags,
					marketingPromos: nextPromos,
				};

				await tx
					.update(organizations)
					.set({ workspaceFeatureFlags: updatedFlags })
					.where(eq(organizations.id, orgId));

				return { updatedPromo, nextPromos };
			});

			if (!result) {
				return reply.code(404).send({
					error: "PromoNotFound",
					message: "Акция не найдена",
				});
			}

			return reply.code(200).send({
				success: true,
				promo: result.updatedPromo,
				promos: result.nextPromos,
			});
		} catch (err) {
			request.log.error({ err }, "[Marketing] Failed to toggle promo status in DB");
			return reply.code(500).send({
				error: "InternalServerError",
				message: "Не удалось обновить статус акции в базе данных",
			});
		}
	});

	registerMarketingChannelRoutes(app);
}
