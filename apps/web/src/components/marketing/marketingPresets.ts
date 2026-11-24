/**
 * marketingPresets.ts — Canonical Dental Practice Promotional Offers & Campaigns.
 * Grounded in real Russian dental CRM operations.
 * Governed by Mandate 8b (<= 120 lines), Mandate 8ap, Mandate 8n (Solo Doctor Autonomy).
 */

import type { MarketingPromo } from "./marketingTypes";
import { DEFAULT_PATIENT_SEGMENTS } from "./marketingSegmentsPresets.js";
import { DEFAULT_ARCHIVED_PROMOS } from "./marketingArchivedPromosPresets.js";

export { DEFAULT_PATIENT_SEGMENTS };

export const DEFAULT_ACTIVE_PROMOS: readonly MarketingPromo[] = [
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
		description: "Ультразвуковое снятие твердых зубных отложений + полировка Air-Flow и реминерализация.",
		conditions: ["Включает первичный осмотр врача-терапевта и фотопротокол", "Требуется предварительная запись"],
		stats: { reach: 0, delivered: 0, deliveredPercent: 0, visits: 0, conversionPercent: 0, revenueRub: 0, budgetSpentRub: 0, romiPercent: 0 },
		templates: {
			sms: "{Имя}, здравствуйте! В клинике «{Клиника}» действует акция: профгигиена Air-Flow за {Скидка} по промокоду {Промокод}. Запись: {Ссылка}",
			whatsapp: "Здравствуйте, {Имя}!\n\nСпециальное предложение от клиники *{Клиника}*: комплексная ультразвуковая гигиена и полировка Air-Flow за *{Скидка}*.\n\nПромокод: *{Промокод}*\nЗапись: {Ссылка}",
			telegram: "Здравствуйте, {Имя}!\n\nВ клинике *{Клиника}* сезонная акция на гигиену: *{Скидка}*.\nПромокод: `{Промокод}`\nЗапись: {Ссылка}",
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
		description: "Автоматическое персональное поздравление именинников со скидкой 10% на терапию.",
		conditions: ["Действует 7 дней до и 14 дней после даты рождения", "Не суммируется с другими специальными акциями"],
		stats: { reach: 0, delivered: 0, deliveredPercent: 0, visits: 0, conversionPercent: 0, revenueRub: 0, budgetSpentRub: 0, romiPercent: 0 },
		templates: {
			sms: "{Имя}, с наступающим днем рождения! Дарим скидку {Скидка} в «{Клиника}» по коду {Промокод}. Запись: {Ссылка}",
			whatsapp: "С днем рождения, {Имя}!\n\nКлиника *{Клиника}* дарит вам скидку *{Скидка}* на лечение и гигиену.\nПромокод: *{Промокод}*\nЗапись: {Ссылка}",
			telegram: "{Имя}, с днем рождения!\n\nДарим скидку *{Скидка}* по коду `{Промокод}` в *{Клиника}*: {Ссылка}",
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
		description: "Бонусный сертификат на 5 000 ₽ при совместном лечении двух и более членов семьи.",
		conditions: ["Сумма плана от 15 000 ₽", "Единый семейный баланс"],
		stats: { reach: 0, delivered: 0, deliveredPercent: 0, visits: 0, conversionPercent: 0, revenueRub: 0, budgetSpentRub: 0, romiPercent: 0 },
		templates: {
			sms: "{Имя}, семейный сертификат на {Скидка} в «{Клиника}»! Код {Промокод}: {Ссылка}",
			whatsapp: "Здравствуйте, {Имя}!\n\nВ клинике *{Клиника}* семейный сертификат *{Скидка}*!\nПромокод: *{Промокод}*\nЗапись: {Ссылка}",
			telegram: "{Имя}, семейный сертификат на *{Скидка}* в *{Клиника}*! Код `{Промокод}`. Запись: {Ссылка}",
		},
		recommendedSegment: "all_active",
		createdAt: "2026-09-05T12:00:00.000Z",
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
		description: "Диагностика врача-стоматолога с фотопротоколом, 3D КЛКТ обеих челюстей и планом лечения.",
		conditions: ["Действует только для первичных пациентов клиники", "Включает заключение рентгенолога"],
		stats: { reach: 0, delivered: 0, deliveredPercent: 0, visits: 0, conversionPercent: 0, revenueRub: 0, budgetSpentRub: 0, romiPercent: 0 },
		templates: {
			sms: "{Имя}, чекап зубов + 3D КТ всего за {Скидка} в «{Клиника}». Код: {Промокод}. Запись: {Ссылка}",
			whatsapp: "Здравствуйте, {Имя}!\n\nПриглашаем на чекап в клинику *{Клиника}*: консультация + 3D КЛКТ за *{Скидка}* по коду *{Промокод}*.\nЗапись: {Ссылка}",
			telegram: "{Имя}, чекап и 3D КТ за *{Скидка}* в *{Клиника}*!\nПромокод: `{Промокод}`.\nЗапись: {Ссылка}",
		},
		recommendedSegment: "no_visit_6m",
		createdAt: "2026-07-20T11:00:00.000Z",
	},
];

export const DEFAULT_MARKETING_PROMOS: readonly MarketingPromo[] = [
	...DEFAULT_ACTIVE_PROMOS,
	...DEFAULT_ARCHIVED_PROMOS,
];
