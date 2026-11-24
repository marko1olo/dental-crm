/**
 * marketingPromoDefaults.ts — Дефолтные маркетинговые акции и сидирование в PostgreSQL 18.
 */

import { eq } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { organizations } from "../../../db/schema.js";
import {
	marketingPromoSchema,
	type StoredMarketingPromo,
} from "./marketingPromoSchemas.js";

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
		minInvoiceKopecks: 350000,
		description:
			"Ультразвуковое снятие твердых зубных отложений + щадящая полировка Air-Flow порошком на основе глицина и реминерализующая терапия.",
		conditions: [
			"Включает первичный осмотр врача-терапевта и фотопротокол",
			"Действует в основном отделении клиники",
			"Требуется предварительная запись",
		],
		stats: {
			reach: 0,
			delivered: 0,
			deliveredPercent: 0,
			visits: 0,
			conversionPercent: 0,
			revenueRub: 0,
			budgetSpentRub: 0,
			revenueKopecks: 0,
			budgetSpentKopecks: 0,
			romiPercent: 0,
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
		minInvoiceKopecks: 200000,
		description:
			"Автоматическое персональное поздравление именинников с начислением скидки 10% на любые терапевтические приемы и эстетические реставрации.",
		conditions: [
			"Действует 7 дней до и 14 дней после даты рождения",
			"Не суммируется с другими специальными акциями",
		],
		stats: {
			reach: 0,
			delivered: 0,
			deliveredPercent: 0,
			visits: 0,
			conversionPercent: 0,
			revenueRub: 0,
			budgetSpentRub: 0,
			revenueKopecks: 0,
			budgetSpentKopecks: 0,
			romiPercent: 0,
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
		minInvoiceKopecks: 1500000,
		description:
			"Бонусный сертификат на 5 000 ₽ при совместном лечении двух и более членов семьи (детский прием + терапия или гигиена родителей).",
		conditions: [
			"Распространяется на супругов, детей и родителей",
			"Оплата до 30% стоимости терапевтического плана",
		],
		stats: {
			reach: 0,
			delivered: 0,
			deliveredPercent: 0,
			visits: 0,
			conversionPercent: 0,
			revenueRub: 0,
			budgetSpentRub: 0,
			revenueKopecks: 0,
			budgetSpentKopecks: 0,
			romiPercent: 0,
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
	{
		id: "promo-checkup-ct",
		title: "Первичный чекап + КТ за 1 900 ₽",
		badge: "Для новых",
		status: "active",
		category: "Диагностика",
		discountText: "1 900 ₽ (вместо 4 500 ₽)",
		promoCode: "CHECKUP19",
		validUntil: "Бессрочно",
		minInvoiceRub: 1900,
		minInvoiceKopecks: 190000,
		description:
			"Диагностика врача-стоматолога с фотопротоколом, 3D КЛКТ обеих челюстей и планом лечения.",
		conditions: [
			"Действует только для первичных пациентов клиники",
			"Включает заключение рентгенолога",
		],
		stats: {
			reach: 0,
			delivered: 0,
			deliveredPercent: 0,
			visits: 0,
			conversionPercent: 0,
			revenueRub: 0,
			budgetSpentRub: 0,
			revenueKopecks: 0,
			budgetSpentKopecks: 0,
			romiPercent: 0,
		},
		templates: {
			sms: "{Имя}, чекап зубов + 3D КТ всего за {Скидка} в «{Клиника}». Код: {Промокод}. Запись: {Ссылка}",
			whatsapp:
				"Здравствуйте, {Имя}!\n\nПриглашаем на чекап в клинику *{Клиника}*: консультация + 3D КЛКТ за *{Скидка}* по коду *{Промокод}*.\nЗапись: {Ссылка}",
			telegram:
				"{Имя}, чекап и 3D КТ за *{Скидка}* в *{Клиника}*!\nПромокод: `{Промокод}`.\nЗапись: {Ссылка}",
		},
		recommendedSegment: "no_visit_6m",
		createdAt: "2026-07-20T11:00:00.000Z",
	},
];

export async function readOrSeedOrganizationPromos(orgId: string): Promise<{
	flags: Record<string, unknown>;
	promos: StoredMarketingPromo[];
}> {
	return db.transaction(async (tx) => {
		const [org] = await tx
			.select({ flags: organizations.workspaceFeatureFlags })
			.from(organizations)
			.where(eq(organizations.id, orgId))
			.for("update");

		const existingFlags = (org?.flags as Record<string, unknown>) || {};
		const rawPromos = existingFlags.marketingPromos;

		if (Array.isArray(rawPromos) && rawPromos.length > 0) {
			const validatedPromos = rawPromos.map((p) => {
				const res = marketingPromoSchema.safeParse(p);
				return res.success ? res.data : (p as StoredMarketingPromo);
			});
			return {
				flags: existingFlags,
				promos: validatedPromos,
			};
		}

		// Первичное авто-сидирование в PostgreSQL 18
		const seeded = [...DEFAULT_SERVER_MARKETING_PROMOS];
		const updatedFlags = {
			...existingFlags,
			marketingPromos: seeded,
		};

		await tx
			.update(organizations)
			.set({ workspaceFeatureFlags: updatedFlags })
			.where(eq(organizations.id, orgId));

		return {
			flags: updatedFlags,
			promos: seeded,
		};
	});
}
