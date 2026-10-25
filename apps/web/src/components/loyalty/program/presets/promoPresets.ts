export interface PromoCodePreset {
	readonly code: string;
	readonly titleRu: string;
	readonly discountType: "percentage" | "fixed_rub" | "welcome_bonus_points";
	readonly value: number;
	readonly minInvoiceAmountKop: number;
	readonly applicableCategories: readonly string[];
	readonly excludedServiceCodes: readonly string[];
	readonly descriptionRu: string;
	readonly validityLabelRu: string;
}

export const PROMO_CODE_PRESETS: readonly PromoCodePreset[] = [
	{
		code: "HYGIENE15",
		titleRu: "Сезонная гигиена -15%",
		discountType: "percentage",
		value: 15,
		minInvoiceAmountKop: 400000, // 4,000 RUB
		applicableCategories: ["hygiene"],
		excludedServiceCodes: ["A16.07.051"],
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
