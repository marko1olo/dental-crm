export type LoyaltyTierId = "silver" | "gold" | "platinum" | "family";

export interface LoyaltyTierDefinition {
	readonly id: LoyaltyTierId;
	readonly nameRu: string;
	readonly badgeLabelRu: string;
	readonly cashbackPercent: number; // e.g. 3 = 3%
	readonly maxInvoiceCoveragePercent: number; // e.g. 30 = up to 30% of invoice can be paid with points
	readonly minLifetimeSpentKop: number; // threshold to unlock tier in kopecks
	readonly pointRateRub: number; // 1 point = 1 RUB
	readonly descriptionRu: string;
	readonly privilegesRu: readonly string[];
	readonly cardGradient: string;
	readonly accentColor: string;
}

/**
 * Clean statutory dental loyalty bounds (Mandate 8i, 8n):
 * Simple cashback: 3% (base) to 5% (regular/family), point redemption up to 30% of invoice.
 * Zero MLM pyramids, zero crypto-tokens.
 */
export const DENTAL_LOYALTY_STANDARDS = {
	cashbackPercentBase: 3,
	cashbackPercentPremium: 5,
	maxInvoiceCoveragePercent: 30,
	pointRateRub: 1.0, // 1 бонус = 1 рубль
	descriptionRu: "Простая стоматологическая бонусная программа: кэшбэк 3–5% бонусами, оплата баллами до 30% суммы чека.",
} as const;

export const LOYALTY_TIER_PRESETS: readonly LoyaltyTierDefinition[] = [
	{
		id: "silver",
		nameRu: "Серебряный",
		badgeLabelRu: "Silver (Базовый)",
		cashbackPercent: 3,
		maxInvoiceCoveragePercent: 30,
		minLifetimeSpentKop: 0,
		pointRateRub: 1.0,
		descriptionRu: "3% кэшбэк бонусами за любые терапевтические и профилактические приемы. Оплата бонусами до 30% суммы чека.",
		privilegesRu: [
			"3% начисление бонусов за каждый визит",
			"Оплата бонусами до 30% стоимости услуг",
			"Срок действия бонусов — 365 дней",
			"Уведомления о плановой гигиене",
		],
		cardGradient: "linear-gradient(135deg, var(--muted) 0%, var(--line) 50%, var(--muted) 100%)",
		accentColor: "var(--muted)",
	},
	{
		id: "gold",
		nameRu: "Золотой",
		badgeLabelRu: "Gold (Премиум)",
		cashbackPercent: 5,
		maxInvoiceCoveragePercent: 40,
		minLifetimeSpentKop: 15000000, // 150,000 RUB
		pointRateRub: 1.0,
		descriptionRu: "5% кэшбэк бонусами при сумме трат от 150 000 ₽. Оплата бонусами до 40% суммы чека и приоритетная запись к ведущим специалистам.",
		privilegesRu: [
			"Повышенный кэшбэк 5% со всех услуг",
			"Оплата бонусами до 40% стоимости чека",
			"Приоритетное бронирование времени приема",
			"Бесплатная консультация смежных специалистов",
		],
		cardGradient: "linear-gradient(135deg, var(--warn-fg) 0%, var(--warn-bg) 50%, var(--warn-fg) 100%)",
		accentColor: "var(--warn-fg)",
	},
	{
		id: "platinum",
		nameRu: "Платиновый / VIP",
		badgeLabelRu: "Platinum (VIP)",
		cashbackPercent: 7,
		maxInvoiceCoveragePercent: 50,
		minLifetimeSpentKop: 40000000, // 400,000 RUB
		pointRateRub: 1.0,
		descriptionRu: "7% кэшбэк бонусами при сумме трат от 400 000 ₽. Оплата бонусами до 50% чека, прямая связь с лечащим врачом и контрольный осмотр с радиовизиографией 1 раз в год.",
		privilegesRu: [
			"Максимальный кэшбэк 7% на все виды лечения",
			"Оплата бонусами до 50% суммы чека",
			"Бесплатный радиовизиографический контроль 1 раз в год",
			"Прямая приоритетная связь с лечащим врачом",
			"Выделенная парковка у клиники",
		],
		cardGradient: "linear-gradient(135deg, var(--teal) 0%, var(--teal-surface) 50%, var(--teal-dark) 100%)",
		accentColor: "var(--teal-dark)",
	},
	{
		id: "family",
		nameRu: "Семейный накопительный",
		badgeLabelRu: "Family (Семейный)",
		cashbackPercent: 6,
		maxInvoiceCoveragePercent: 35,
		minLifetimeSpentKop: 5000000, // 50,000 RUB
		pointRateRub: 1.0,
		descriptionRu: "Единый семейный баланс для родителей и детей. Повышенный кэшбэк 6% со всех приемов членов семьи с возможностью взаимного списания.",
		privilegesRu: [
			"Единый семейный кошелек баллов",
			"Повышенный кэшбэк 6% за визиты всех членов семьи",
			"Оплата до 35% стоимости детского и взрослого лечения",
			"Скидка 10% на детскую ортодонтию при лечении родителей",
		],
		cardGradient: "linear-gradient(135deg, var(--ok-fg) 0%, var(--ok-bg) 50%, var(--ok-fg) 100%)",
		accentColor: "var(--ok-fg)",
	},
];
