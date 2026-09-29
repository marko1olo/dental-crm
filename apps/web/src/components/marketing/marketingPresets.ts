/**
 * marketingPresets.ts — Canonical Dental Practice Promotional Offers & Campaigns.
 * Grounded in real Russian dental CRM operations (Dent-X, StomX, IDENT).
 */

import type { MarketingPromo, PatientSegmentOption } from "./marketingTypes";

export const DEFAULT_PATIENT_SEGMENTS: readonly PatientSegmentOption[] = [
	{
		id: "no_visit_6m",
		name: "Пациенты без визита > 6 мес.",
		count: 142,
		description: "Прошли лечение более полугода назад, требуется контрольный осмотр и гигиена",
	},
	{
		id: "missed_hygiene",
		name: "Пропустили регулярную гигиену",
		count: 48,
		description: "Индивидуальный график профгигиены нарушен более чем на 2 месяца",
	},
	{
		id: "ortho_therapy",
		name: "Ортодонтия и терапия",
		count: 95,
		description: "Пациенты с активными или незавершенными планами терапевтического лечения",
	},
	{
		id: "all_active",
		name: "Вся активная база клиники",
		count: 240,
		description: "Все пациенты с заполненными контактными данными и согласием на информирование",
	},
];

export const DEFAULT_MARKETING_PROMOS: readonly MarketingPromo[] = [
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
				"Здравствуйте, {Имя}!\n\nСпециальное предложение от клиники *{Клиника}*: комплексная ультразвуковая гигиена и полировка Air-Flow по акционной цене *{Скидка}* (вместо 5 000 ₽).\n\nВаш персональный промокод: *{Промокод}*\nЗаписаться в удобное время онлайн: {Ссылка}\nИли ответьте на это сообщение для подбора окна.",
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
				"С наступающим днем рождения, {Имя}!\n\nКоманда клиники *{Клиника}* желает вам крепкого здоровья и ослепительной улыбки! Мы дарим вам праздничную скидку *{Скидка}* на терапевтическое лечение и гигиену.\n\nПромокод: *{Промокод}*\nОнлайн-запись: {Ссылка}",
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
			"Сумма общего согласованного плана лечения от 15 000 ₽",
			"Единый семейный баланс клиники для всех членов семьи",
		],
		stats: {
			reach: 54,
			delivered: 53,
			deliveredPercent: 98.1,
			visits: 18,
			conversionPercent: 33.3,
			revenueRub: 270000,
			budgetSpentRub: 520,
			romiPercent: 518,
		},
		templates: {
			sms: "{Имя}, семейный сертификат на {Скидка} ждет вас в «{Клиника}»! Запись для всей семьи по коду {Промокод}: {Ссылка}",
			whatsapp:
				"Здравствуйте, {Имя}!\n\nВ клинике *{Клиника}* действует программа «Семейная забота»: при записи двух членов семьи вы получаете подарочный сертификат *{Скидка}* на общий баланс!\n\nПромокод: *{Промокод}*\nЗабронировать семейный прием: {Ссылка}",
			telegram:
				"{Имя}, семейная забота о здоровье улыбки в *{Клиника}*!\n\nПодарочный сертификат на *{Скидка}* по промокоду `{Промокод}`.\nПодробнее и запись: {Ссылка}",
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
		description:
			"Комплексная диагностика врача-стоматолога с полным фотопротоколом, 3D компьютерной томографией обеих челюстей и составлением плана.",
		conditions: [
			"Действует только для первичных пациентов клиники",
			"Включает расшифровку и заключение врача-рентгенолога",
		],
		stats: {
			reach: 210,
			delivered: 206,
			deliveredPercent: 98.0,
			visits: 49,
			conversionPercent: 23.3,
			revenueRub: 399000,
			budgetSpentRub: 1850,
			romiPercent: 215,
		},
		templates: {
			sms: "{Имя}, полный чекап зубов + 3D КТ всего за {Скидка} в «{Клиника}». Код: {Промокод}. Запись: {Ссылка}",
			whatsapp:
				"Здравствуйте, {Имя}!\n\nПриглашаем на расширенный диагностический чекап в клинику *{Клиника}*:\n• Консультация ведущего врача-терапевта\n• 3D томография (КЛКТ) обеих челюстей\n• Составление комплексного плана лечения\nВсего за *{Скидка}* по промокоду *{Промокод}*.\n\nЗаписаться: {Ссылка}",
			telegram:
				"{Имя}, чекап и 3D КТ за *{Скидка}* в *{Клиника}*!\nПромокод: `{Промокод}`.\nЗапись онлайн: {Ссылка}",
		},
		recommendedSegment: "no_visit_6m",
		createdAt: "2026-07-20T11:00:00.000Z",
	},
	{
		id: "promo-implant-osstem",
		title: "Имплантация Osstem (-5 000 ₽)",
		badge: "Хирургия",
		status: "active",
		category: "Имплантация",
		discountText: "Скидка 5 000 ₽ на имплантат",
		promoCode: "IMPLANT5000",
		validUntil: "30.11.2026",
		minInvoiceRub: 45000,
		description:
			"Прямая скидка 5 000 ₽ при установке премиального дентального имплантата Osstem TS III с пожизненной гарантией производителя.",
		conditions: [
			"При установке от 1 хирургической единицы",
			"Не включает стоимость формирователя десны и коронки",
		],
		stats: {
			reach: 72,
			delivered: 70,
			deliveredPercent: 97.2,
			visits: 14,
			conversionPercent: 19.4,
			revenueRub: 630000,
			budgetSpentRub: 840,
			romiPercent: 749,
		},
		templates: {
			sms: "{Имя}, скидка 5 000 ₽ на имплантацию Osstem в «{Клиника}». Промокод: {Промокод}. Запись на консультацию: {Ссылка}",
			whatsapp:
				"Здравствуйте, {Имя}!\n\nВ клинике *{Клиника}* действует специальная скидка *{Скидка}* на установку оригинальных корейских имплантатов Osstem TS III.\n\nВаш персональный промокод: *{Промокод}*\nЗаписаться на консультацию хирурга-имплантолога: {Ссылка}",
			telegram:
				"{Имя}, специальное предложение на имплантацию Osstem в *{Клиника}*:\nСкидка: *{Скидка}*\nКод: `{Промокод}`\nЗапись: {Ссылка}",
		},
		recommendedSegment: "ortho_therapy",
		createdAt: "2026-09-10T14:00:00.000Z",
	},
	{
		id: "promo-summer-2026",
		title: "Летний имплант Osstem (-15%)",
		badge: "Архив",
		status: "archived",
		category: "Имплантация",
		discountText: "-15% на хирургический этап",
		promoCode: "SUMMER2026",
		validUntil: "31.08.2026",
		minInvoiceRub: 35000,
		description: "Летняя сезонная акция на хирургическую установку имплантатов.",
		conditions: ["Акция завершена 31.08.2026"],
		stats: {
			reach: 98,
			delivered: 96,
			deliveredPercent: 97.9,
			visits: 19,
			conversionPercent: 19.4,
			revenueRub: 665000,
			budgetSpentRub: 950,
			romiPercent: 699,
		},
		templates: {
			sms: "Акция завершена.",
			whatsapp: "Акция завершена.",
			telegram: "Акция завершена.",
		},
		recommendedSegment: "all_active",
		createdAt: "2026-06-01T09:00:00.000Z",
	},
	{
		id: "promo-spring-smile",
		title: "Весенняя ортодонтия: рассрочка 0%",
		badge: "Архив",
		status: "archived",
		category: "Ортодонтия",
		discountText: "Рассрочка 0% на брекет-системы",
		promoCode: "SPRING-SMILE",
		validUntil: "31.05.2026",
		minInvoiceRub: 80000,
		description: "Беспроцентная рассрочка на самолигирующие брекет-системы Damon Q.",
		conditions: ["Акция завершена 31.05.2026"],
		stats: {
			reach: 115,
			delivered: 114,
			deliveredPercent: 99.1,
			visits: 22,
			conversionPercent: 19.1,
			revenueRub: 880000,
			budgetSpentRub: 1100,
			romiPercent: 799,
		},
		templates: {
			sms: "Акция завершена.",
			whatsapp: "Акция завершена.",
			telegram: "Акция завершена.",
		},
		recommendedSegment: "ortho_therapy",
		createdAt: "2026-03-01T09:00:00.000Z",
	},
];
