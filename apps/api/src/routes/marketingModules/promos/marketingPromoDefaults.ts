/**
 * marketingPromoDefaults.ts — Дефолтные маркетинговые акции и сидирование в PostgreSQL 18.
 */

import { eq } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { organizations } from "../../../db/schema.js";
import type { StoredMarketingPromo } from "./marketingPromoSchemas.js";

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

export async function readOrSeedOrganizationPromos(orgId: string): Promise<{
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
