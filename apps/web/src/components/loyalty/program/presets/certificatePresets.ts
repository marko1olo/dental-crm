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
		badgeRu: "VIP / Комплекс",
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
