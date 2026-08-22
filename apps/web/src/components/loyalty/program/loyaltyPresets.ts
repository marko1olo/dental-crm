/**
 * DENTE Dental CRM — Statutory Dental Loyalty, Bonus & Gift Certificate Studio
 * Loyalty Tier Archetypes, Certificate Catalog, Promo Codes & Exclusion Presets
 */

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

export interface GiftCertificatePreset {
	readonly id: string;
	readonly nominalKop: number; // in kopecks: e.g. 500000 = 5 000 RUB, 0 = custom nominal
	readonly nominalRub: number;
	readonly titleRu: string;
	readonly validityDays: number; // e.g. 365 days (1 year)
	readonly isCustomNominal: boolean;
	readonly badgeRu: string;
	readonly descriptionRu: string;
}

export interface PromoCodePreset {
	readonly code: string;
	readonly titleRu: string;
	readonly discountType: "percentage" | "fixed_rub" | "welcome_bonus_points";
	readonly value: number; // e.g. 15 for 15%, 5000 for 5000 RUB, 1000 for 1000 bonus points
	readonly minInvoiceAmountKop: number;
	readonly applicableCategories: readonly string[]; // "therapy", "hygiene", "orthopedics", "surgery", "all"
	readonly excludedServiceCodes: readonly string[];
	readonly descriptionRu: string;
	readonly validityLabelRu: string;
}

export interface LoyaltyExclusionRule {
	readonly id: string;
	readonly categoryNameRu: string;
	readonly isExcludedFromBonusRedemption: boolean;
	readonly isExcludedFromBonusAccrual: boolean;
	readonly reasonRu: string;
}

/**
 * Statutory Russian Dental Practice Tier Presets
 */
export const LOYALTY_TIER_PRESETS: readonly LoyaltyTierDefinition[] = [
	{
		id: "silver",
		nameRu: "Серебряный",
		badgeLabelRu: "🥈 Silver (Базовый)",
		cashbackPercent: 3,
		maxInvoiceCoveragePercent: 30,
		minLifetimeSpentKop: 0, // 0 RUB
		pointRateRub: 1.0,
		descriptionRu: "3% кэшбэк бонусами за любые терапевтические и профилактические приемы. Оплата бонусами до 30% суммы чека.",
		privilegesRu: [
			"3% начисление бонусов за каждый визит",
			"Оплата бонусами до 30% стоимости услуг",
			"Срок действия бонусов — 365 дней",
			"Уведомления о плановой гигиене",
		],
		cardGradient: "linear-gradient(135deg, #94a3b8 0%, #cbd5e1 50%, #64748b 100%)",
		accentColor: "#64748b",
	},
	{
		id: "gold",
		nameRu: "Золотой",
		badgeLabelRu: "🥇 Gold (Премиум)",
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
		cardGradient: "linear-gradient(135deg, #d97706 0%, #fcd34d 50%, #b45309 100%)",
		accentColor: "#d97706",
	},
	{
		id: "platinum",
		nameRu: "Платиновый / VIP",
		badgeLabelRu: "💎 Platinum (VIP)",
		cashbackPercent: 7,
		maxInvoiceCoveragePercent: 50,
		minLifetimeSpentKop: 40000000, // 400,000 RUB
		pointRateRub: 1.0,
		descriptionRu: "7% кэшбэк бонусами при сумме трат от 400 000 ₽. Оплата бонусами до 50% чека, персональный куратор лечения и бесплатная ОПТГ 1 раз в год.",
		privilegesRu: [
			"Максимальный кэшбэк 7% на все виды лечения",
			"Оплата бонусами до 50% суммы чека",
			"Бесплатная ОПТГ / КЛКТ-контроль 1 раз в год",
			"Персональный медицинский консьерж 24/7",
			"Выделенная парковка у клиники",
		],
		cardGradient: "linear-gradient(135deg, #0ea5e9 0%, #38bdf8 50%, #0369a1 100%)",
		accentColor: "#0284c7",
	},
	{
		id: "family",
		nameRu: "Семейный накопительный",
		badgeLabelRu: "👨‍👩‍👧‍👦 Family (Семейный)",
		cashbackPercent: 6,
		maxInvoiceCoveragePercent: 35,
		minLifetimeSpentKop: 5000000, // 50,000 RUB суммарно для семьи
		pointRateRub: 1.0,
		descriptionRu: "Единый семейный баланс для родителей и детей. Повышенный кэшбэк 6% со всех приемов членов семьи с возможностью взаимного списания.",
		privilegesRu: [
			"Единый семейный кошелек баллов",
			"Повышенный кэшбэк 6% за визиты всех членов семьи",
			"Оплата до 35% стоимости детского и взрослого лечения",
			"Скидка 10% на детскую ортодонтию при лечении родителей",
		],
		cardGradient: "linear-gradient(135deg, #10b981 0%, #6ee7b7 50%, #047857 100%)",
		accentColor: "#059669",
	},
];

/**
 * Standard Russian Dental Gift Certificate Catalog
 */
export const GIFT_CERTIFICATE_CATALOG: readonly GiftCertificatePreset[] = [
	{
		id: "cert_5k",
		nominalKop: 500000, // 5,000 RUB
		nominalRub: 5000,
		titleRu: "Подарочный сертификат 5 000 ₽",
		validityDays: 365,
		isCustomNominal: false,
		badgeRu: "Популярный подарок",
		descriptionRu: "Идеально подходит для профессиональной гигиены полости рта или отбеливания зубов.",
	},
	{
		id: "cert_10k",
		nominalKop: 1000000, // 10,000 RUB
		nominalRub: 10000,
		titleRu: "Подарочный сертификат 10 000 ₽",
		validityDays: 365,
		isCustomNominal: false,
		badgeRu: "Терапия и эстетика",
		descriptionRu: "Покрывает стоимость терапевтического лечения кариеса или эстетической реставрации.",
	},
	{
		id: "cert_25k",
		nominalKop: 2500000, // 25,000 RUB
		nominalRub: 25000,
		titleRu: "Подарочный сертификат 25 000 ₽",
		validityDays: 365,
		isCustomNominal: false,
		badgeRu: "Премиум уход",
		descriptionRu: "Подходит для комплексной санации, установки коронок E.max или подготовки к ортодонтии.",
	},
	{
		id: "cert_50k",
		nominalKop: 5000000, // 50,000 RUB
		nominalRub: 50000,
		titleRu: "Подарочный сертификат 50 000 ₽",
		validityDays: 365,
		isCustomNominal: false,
		badgeRu: "VIP / Имплантация",
		descriptionRu: "Для масштабных планов лечения: дентальная имплантация, ортопедия, элайнеры.",
	},
	{
		id: "cert_custom",
		nominalKop: 0,
		nominalRub: 0,
		titleRu: "Сертификат со свободным номиналом",
		validityDays: 365,
		isCustomNominal: true,
		badgeRu: "Индивидуальный",
		descriptionRu: "Сумма сертификата указывается администратором при оформлении на кассе.",
	},
];

/**
 * Dental Marketing Promo Codes
 */
export const PROMO_CODE_PRESETS: readonly PromoCodePreset[] = [
	{
		code: "HYGIENE15",
		titleRu: "Сезонная гигиена -15%",
		discountType: "percentage",
		value: 15,
		minInvoiceAmountKop: 400000, // 4,000 RUB
		applicableCategories: ["hygiene"],
		excludedServiceCodes: ["A16.07.051"], // исключая сложные хирургические пародонтологические кюретажи
		descriptionRu: "Скидка 15% на комплексную чистку зубов ультразвуком и Air-Flow.",
		validityLabelRu: "Действует до конца текущего месяца",
	},
	{
		code: "FIRST20",
		titleRu: "Первичный прием терапевта -20%",
		discountType: "percentage",
		value: 20,
		minInvoiceAmountKop: 300000, // 3,000 RUB
		applicableCategories: ["therapy", "consultation"],
		excludedServiceCodes: [],
		descriptionRu: "Скидка 20% на первичную консультацию и первое лечение кариеса новому пациенту.",
		validityLabelRu: "Только для новых пациентов клиники",
	},
	{
		code: "BIRTHDAY1000",
		titleRu: "День рождения (+1 000 бонусов)",
		discountType: "welcome_bonus_points",
		value: 1000,
		minInvoiceAmountKop: 0,
		applicableCategories: ["all"],
		excludedServiceCodes: [],
		descriptionRu: "Подарок 1 000 бонусных рублей к дню рождения пациента (активны 30 дней).",
		validityLabelRu: "Начисляется за 7 дней до ДР, действует 30 дней",
	},
	{
		code: "IMPLANT5000",
		titleRu: "Имплантация Nobel/Osstem (-5 000 ₽)",
		discountType: "fixed_rub",
		value: 5000,
		minInvoiceAmountKop: 4500000, // от 45,000 RUB
		applicableCategories: ["surgery", "implantology"],
		excludedServiceCodes: [],
		descriptionRu: "Фиксированная скидка 5 000 ₽ при установке дентального имплантата.",
		validityLabelRu: "При установке от 1 имплантата",
	},
];

/**
 * Statutory Dental Practice Exclusion Rules
 * Prevents clinic financial loss on direct third-party lab invoices and expensive titanium components
 */
export const LOYALTY_EXCLUSION_RULES: readonly LoyaltyExclusionRule[] = [
	{
		id: "excl_lab",
		categoryNameRu: "Лабораторные расходы зуботехника (CAD/CAM, цирконий, E.max)",
		isExcludedFromBonusRedemption: true,
		isExcludedFromBonusAccrual: false,
		reasonRu: "Прямые затраты на стороннюю зуботехническую лабораторию не могут компенсироваться бонусами клиники.",
	},
	{
		id: "excl_implant_hardware",
		categoryNameRu: "Титановые имплантаты и абатменты (Nobel, Straumann, Osstem)",
		isExcludedFromBonusRedemption: true,
		isExcludedFromBonusAccrual: false,
		reasonRu: "Стоимость закупки титанового винта и формирователя десны исключается из базы списания баллов.",
	},
	{
		id: "excl_promo_bundle",
		categoryNameRu: "Услуги по спецпредложениям и акционным пакетам",
		isExcludedFromBonusRedemption: true,
		isExcludedFromBonusAccrual: false,
		reasonRu: "Скидка по акции и оплата бонусами не суммируются на одну и ту же позицию прейскуранта.",
	},
	{
		id: "excl_retail_oral_care",
		categoryNameRu: "Аптечная витрина и товары для домашней гигиены (Curaprox, Marvis)",
		isExcludedFromBonusRedemption: false,
		isExcludedFromBonusAccrual: true,
		reasonRu: "За покупку зубных щеток и паст бонусы не начисляются ввиду минимальной торговой наценки.",
	},
];

/**
 * Quick touch-action redemption presets for cashier HUD (in RUB)
 */
export const QUICK_REDEMPTION_PRESETS_RUB: readonly number[] = [500, 1000, 2000, 5000];
