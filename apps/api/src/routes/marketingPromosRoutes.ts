/**
 * marketingPromosRoutes.ts — CRUD эндпоинты маркетинговых акций и кампаний клиники в PostgreSQL 18.
 *
 * МАРШРУТЫ:
 * - GET /api/marketing/promos — получение списка акций клиники (с авто-сидированием в БД при первом чтении)
 * - POST /api/marketing/promos — создание новой маркетинговой акции в PostgreSQL 18
 * - PATCH /api/marketing/promos/:id/status — переключение статуса акции (active / archived / paused) в PostgreSQL 18
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import { organizations } from "../db/schema.js";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../accessGuard.js";
import {
	type AdvertisingChannelInput,
	advertisingChannelInputSchema,
	buildDenteDefaultAdvertisingChannels,
} from "@dental/shared";

const promoStatsSchema = z.object({
	reach: z.number().nonnegative().default(0),
	delivered: z.number().nonnegative().default(0),
	deliveredPercent: z.number().nonnegative().default(0),
	visits: z.number().nonnegative().default(0),
	conversionPercent: z.number().nonnegative().default(0),
	revenueRub: z.number().nonnegative().default(0),
	budgetSpentRub: z.number().nonnegative().default(0),
	romiPercent: z.number().default(0),
});

const promoTemplatesSchema = z.object({
	sms: z.string().min(1),
	whatsapp: z.string().min(1),
	telegram: z.string().min(1),
});

export const marketingPromoSchema = z.object({
	id: z.string().min(1),
	title: z.string().min(1).max(200),
	badge: z.string().max(80).default("Акция"),
	status: z.enum(["active", "archived", "paused"]).default("active"),
	category: z.string().max(120).default("Профилактика и гигиена"),
	discountText: z.string().min(1).max(120),
	promoCode: z.string().min(1).max(60),
	validUntil: z.string().max(80).default("Бессрочно"),
	minInvoiceRub: z.number().nonnegative().default(0),
	description: z.string().max(1000).default(""),
	conditions: z.array(z.string()).default([]),
	stats: promoStatsSchema.default({
		reach: 0,
		delivered: 0,
		deliveredPercent: 0,
		visits: 0,
		conversionPercent: 0,
		revenueRub: 0,
		budgetSpentRub: 0,
		romiPercent: 0,
	}),
	templates: promoTemplatesSchema,
	recommendedSegment: z.string().default("no_visit_6m"),
	createdAt: z.string().default(() => new Date().toISOString()),
});

export type StoredMarketingPromo = z.infer<typeof marketingPromoSchema>;

export const DEFAULT_SERVER_MARKETING_PROMOS: StoredMarketingPromo[] = [
	{
		id: "promo-hygiene-3500",
		title: "Комплексная профгигиена Air-Flow",
		badge: "Хит месяца",
		status: "active",
		category: "Профилактика и гигиена",
		discountText: "3 500 ₽ (вместо 5 000 ₽)",
		promoCode: "HYGIENE3500",
		validUntil: "31.10.2026",
		minInvoiceRub: 3500,
		description:
			"Ультразвуковое снятие твердых зубных отложений + щадящая полировка Air-Flow порошком на основе глицина и реминерализующая терапия.",
		conditions: [
			"Включает первичный осмотр врача-терапевта и фотопротокол",
			"Действует в основном отделении клиники",
			"Требуется предварительная запись",
		],
		stats: {
			reach: 142,
			delivered: 140,
			deliveredPercent: 98.6,
			visits: 34,
			conversionPercent: 23.9,
			revenueRub: 497000,
			budgetSpentRub: 1200,
			romiPercent: 412,
		},
		templates: {
			sms: "{Имя}, здравствуйте! В клинике «{Клиника}» действует акция: комплексная профгигиена Air-Flow за {Скидка} по промокоду {Промокод}. Запись: {Ссылка}",
			whatsapp:
				"Здравствуйте, {Имя}!\n\nСпециальное предложение от клиники *{Клиника}*: комплексная ультразвуковая гигиена и полировка Air-Flow по акционной цене *{Скидка}* (вместо 5 000 ₽).\n\nВаш персональный промокод: *{Промокод}*\nЗаписаться в удобное время онлайн: {Ссылка}",
			telegram:
				"Здравствуйте, {Имя}!\n\nВ клинике *{Клиника}* стартовала сезонная акция на комплексную гигиену полости рта: *{Скидка}*.\n\nПромокод: `{Промокод}`\nДействует до {Срок}.\nЗаписаться: {Ссылка}",
		},
		recommendedSegment: "no_visit_6m",
		createdAt: "2026-09-01T09:00:00.000Z",
	},
	{
		id: "promo-birthday-10",
		title: "Скидка на день рождения 10%",
		badge: "Триггерная",
		status: "active",
		category: "Терапия и эстетика",
		discountText: "-10% на терапию и эстетику",
		promoCode: "BIRTHDAY10",
		validUntil: "Бессрочно (за 7 дней до ДР)",
		minInvoiceRub: 2000,
		description:
			"Автоматическое персональное поздравление именинников с начислением скидки 10% на любые терапевтические приемы и эстетические реставрации.",
		conditions: [
			"Действует 7 дней до и 14 дней после даты рождения",
			"Не суммируется с другими специальными акциями",
		],
		stats: {
			reach: 86,
			delivered: 86,
			deliveredPercent: 100,
			visits: 28,
			conversionPercent: 32.5,
			revenueRub: 312000,
			budgetSpentRub: 680,
			romiPercent: 458,
		},
		templates: {
			sms: "{Имя}, с наступающим днем рождения! Дарим скидку {Скидка} в клинике «{Клиника}» по коду {Промокод}. Запись: {Ссылка}",
			whatsapp:
				"С наступающим днем рождения, {Имя}!\n\nКоманда клиники *{Клиника}* дарит вам праздничную скидку *{Скидка}* на терапевтическое лечение и гигиену.\n\nПромокод: *{Промокод}*\nОнлайн-запись: {Ссылка}",
			telegram:
				"{Имя}, поздравляем с днем рождения!\n\nДарим вам персональную скидку *{Скидка}* по коду `{Промокод}`.\nЖдем вас в *{Клиника}*: {Ссылка}",
		},
		recommendedSegment: "all_active",
		createdAt: "2026-08-15T10:30:00.000Z",
	},
	{
		id: "promo-family-cert",
		title: "Семейный сертификат 5 000 ₽",
		badge: "Семейная",
		status: "active",
		category: "Семейная стоматология",
		discountText: "Сертификат 5 000 ₽ на семью",
		promoCode: "FAMILY5000",
		validUntil: "15.12.2026",
		minInvoiceRub: 15000,
		description:
			"Бонусный сертификат на 5 000 ₽ при совместном лечении двух и более членов семьи (детский прием + терапия или гигиена родителей).",
		conditions: [
			"Распространяется на супругов, детей и родителей",
			"Оплата до 30% стоимости терапевтического плана",
		],
		stats: {
			reach: 64,
			delivered: 63,
			deliveredPercent: 98.4,
			visits: 19,
			conversionPercent: 29.7,
			revenueRub: 418000,
			budgetSpentRub: 950,
			romiPercent: 439,
		},
		templates: {
			sms: "{Имя}, дарим семейный сертификат {Скидка} в клинике «{Клиника}» по коду {Промокод}. Запись: {Ссылка}",
			whatsapp:
				"Здравствуйте, {Имя}!\n\nДля вашей семьи в клинике *{Клиника}* открыт сертификат *{Скидка}* на совместное лечение и профилактику.\n\nКод активации: *{Промокод}*\nЗапись: {Ссылка}",
			telegram:
				"Семейный сертификат *{Скидка}* в клинике *{Клиника}*!\n\nКод: `{Промокод}` (действует до {Срок}).\nЗаписаться: {Ссылка}",
		},
		recommendedSegment: "ortho_therapy",
		createdAt: "2026-08-01T12:00:00.000Z",
	},
];

async function readOrSeedOrganizationPromos(orgId: string): Promise<{
	flags: Record<string, unknown>;
	promos: StoredMarketingPromo[];
}> {
	const [org] = await db
		.select({ flags: organizations.workspaceFeatureFlags })
		.from(organizations)
		.where(eq(organizations.id, orgId))
		.limit(1);

	const existingFlags = (org?.flags as Record<string, unknown>) || {};
	const rawPromos = existingFlags.marketingPromos;

	if (Array.isArray(rawPromos) && rawPromos.length > 0) {
		return {
			flags: existingFlags,
			promos: rawPromos as StoredMarketingPromo[],
		};
	}

	// Первичное авто-сидирование в PostgreSQL 18
	const seeded = [...DEFAULT_SERVER_MARKETING_PROMOS];
	const updatedFlags = {
		...existingFlags,
		marketingPromos: seeded,
	};

	await db
		.update(organizations)
		.set({ workspaceFeatureFlags: updatedFlags })
		.where(eq(organizations.id, orgId));

	return {
		flags: updatedFlags,
		promos: seeded,
	};
}

async function readOrSeedOrganizationRomiChannels(orgId: string): Promise<{
	flags: Record<string, unknown>;
	channels: AdvertisingChannelInput[];
}> {
	const [org] = await db
		.select({ flags: organizations.workspaceFeatureFlags })
		.from(organizations)
		.where(eq(organizations.id, orgId))
		.limit(1);

	const existingFlags = (org?.flags as Record<string, unknown>) || {};
	const rawChannels = existingFlags.marketingRomiChannels;

	if (Array.isArray(rawChannels) && rawChannels.length > 0) {
		return {
			flags: existingFlags,
			channels: rawChannels as AdvertisingChannelInput[],
		};
	}

	// Первичное авто-сидирование канонических каналов DENTE в PostgreSQL 18
	const seeded = buildDenteDefaultAdvertisingChannels();
	const updatedFlags = {
		...existingFlags,
		marketingRomiChannels: seeded,
	};

	await db
		.update(organizations)
		.set({ workspaceFeatureFlags: updatedFlags })
		.where(eq(organizations.id, orgId));

	return {
		flags: updatedFlags,
		channels: seeded,
	};
}

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
