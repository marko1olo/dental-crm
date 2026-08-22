/**
 * planPriceValidationPresets.ts — Конфигурация политик фиксации цен и пресетов валидации прайс-листов DENTE CRM.
 * (DOMAIN: PLAN PRICE VALIDATION & PRICELIST LOCK)
 *
 * Определяет:
 * 1. Политики разрешения расхождений цен (LOCK_ORIGINAL_PRICE, UPDATE_TO_CURRENT_PRICE, REQUIRE_ADMIN_OVERRIDE, CUSTOM_PRICE_OVERRIDE).
 * 2. Пресеты сроков действия смет и гарантии цен (Стандартный 30 дней, Хирургия/Имплантация 90 дней, VIP 180 дней, Гибкий).
 * 3. Пороговые значения инфляции и правила обязательного согласования управляющим клиники.
 * 4. Типизированные структуры каталога услуг и демо-сметы для валидации.
 */

export type PriceLockResolutionPolicy =
	| "LOCK_ORIGINAL_PRICE"
	| "UPDATE_TO_CURRENT_PRICE"
	| "REQUIRE_ADMIN_OVERRIDE"
	| "CUSTOM_PRICE_OVERRIDE";

export type PriceDiscrepancyKind =
	| "PRICE_MATCH"
	| "PRICE_INCREASED"
	| "PRICE_DECREASED"
	| "SERVICE_ARCHIVED"
	| "SERVICE_NOT_FOUND"
	| "DISCOUNT_EXPIRED_OR_INVALID"
	| "PLAN_EXPIRED";

export type ValidationSeverity = "info" | "success" | "warning" | "error";

export type PlanPricePolicyPresetId =
	| "standard_30"
	| "ortho_implant_90"
	| "long_term_vip_180"
	| "flexible_clinic";

export interface PlanPricePolicyPreset {
	readonly id: PlanPricePolicyPresetId;
	readonly title: string;
	readonly subtitle: string;
	readonly validityDays: number;
	readonly inflationThresholdPercent: number; // Порог подорожания (напр. 10%), выше которого нужно согласование
	readonly allowAutoLockWithinValidity: boolean; // Автофиксация цены, если смета не просрочена
	readonly disallowArchivedServices: boolean; // Запрет оформления наряда с архивной услугой без замены
	readonly requireManagerOverrideAboveThreshold: boolean; // Требовать PIN/авторизацию управляющего
	readonly maxDoctorDiscountPercent: number; // Максимальная скидка врача без согласования (напр. 10%)
	readonly defaultResolutionForPriceIncrease: PriceLockResolutionPolicy;
	readonly defaultResolutionForPriceDecrease: PriceLockResolutionPolicy;
	readonly defaultResolutionForExpiredPlan: PriceLockResolutionPolicy;
}

export interface CatalogServiceItem {
	readonly id: string;
	readonly code804n: string;
	readonly title: string;
	readonly category: string;
	readonly basePriceRub: number;
	readonly active: boolean;
	readonly isArchived?: boolean;
	readonly updatedAtIso?: string;
	readonly vatPercent?: number;
}

export interface TreatmentPlanItemValidationContext {
	readonly itemId: string;
	readonly toothNumber?: number | undefined;
	readonly code804n: string;
	readonly serviceTitle: string;
	readonly category: string;
	readonly planUnitPriceRub: number;
	readonly planDiscountRub: number;
	readonly planDiscountPercent: number;
	readonly quantity: number;
	readonly planLineTotalRub: number;
	readonly serviceId?: string | undefined;
	readonly phase?: number | undefined;
	readonly clinicalRationale?: string | undefined;
}

export interface TreatmentPlanValidationPayload {
	readonly planId: string;
	readonly planNumber: string;
	readonly planTitle: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly doctorId: string;
	readonly doctorFullName: string;
	readonly createdAtIso: string;
	readonly validUntilIso?: string | undefined;
	readonly items: readonly TreatmentPlanItemValidationContext[];
	readonly notes?: string | undefined;
}

/**
 * Стандартные клинико-финансовые пресеты клиники DENTE CRM.
 */
export const PLAN_PRICE_POLICY_PRESETS: Readonly<
	Record<PlanPricePolicyPresetId, PlanPricePolicyPreset>
> = {
	standard_30: {
		id: "standard_30",
		title: "Стандартный терапевтический (30 дней)",
		subtitle: "Гарантия цен 30 календарных дней с даты утверждения плана лечения",
		validityDays: 30,
		inflationThresholdPercent: 10,
		allowAutoLockWithinValidity: true,
		disallowArchivedServices: true,
		requireManagerOverrideAboveThreshold: true,
		maxDoctorDiscountPercent: 10,
		defaultResolutionForPriceIncrease: "LOCK_ORIGINAL_PRICE",
		defaultResolutionForPriceDecrease: "UPDATE_TO_CURRENT_PRICE",
		defaultResolutionForExpiredPlan: "REQUIRE_ADMIN_OVERRIDE",
	},
	ortho_implant_90: {
		id: "ortho_implant_90",
		title: "Хирургия & Ортопедия (90 дней)",
		subtitle: "Расширенная фиксация цен на 3 месяца для комплексных и этапных операций",
		validityDays: 90,
		inflationThresholdPercent: 15,
		allowAutoLockWithinValidity: true,
		disallowArchivedServices: true,
		requireManagerOverrideAboveThreshold: true,
		maxDoctorDiscountPercent: 15,
		defaultResolutionForPriceIncrease: "LOCK_ORIGINAL_PRICE",
		defaultResolutionForPriceDecrease: "UPDATE_TO_CURRENT_PRICE",
		defaultResolutionForExpiredPlan: "REQUIRE_ADMIN_OVERRIDE",
	},
	long_term_vip_180: {
		id: "long_term_vip_180",
		title: "VIP / Тотальная реабилитация (180 дней)",
		subtitle: "Полугодовая заморозка цен по депозитному или VIP-договору клиники",
		validityDays: 180,
		inflationThresholdPercent: 20,
		allowAutoLockWithinValidity: true,
		disallowArchivedServices: false,
		requireManagerOverrideAboveThreshold: true,
		maxDoctorDiscountPercent: 20,
		defaultResolutionForPriceIncrease: "LOCK_ORIGINAL_PRICE",
		defaultResolutionForPriceDecrease: "UPDATE_TO_CURRENT_PRICE",
		defaultResolutionForExpiredPlan: "LOCK_ORIGINAL_PRICE",
	},
	flexible_clinic: {
		id: "flexible_clinic",
		title: "Гибкая адаптация (Актуальный прайс)",
		subtitle: "Автоматический пересчет всех позиций по текущему каталогу клиники",
		validityDays: 14,
		inflationThresholdPercent: 5,
		allowAutoLockWithinValidity: false,
		disallowArchivedServices: true,
		requireManagerOverrideAboveThreshold: false,
		maxDoctorDiscountPercent: 5,
		defaultResolutionForPriceIncrease: "UPDATE_TO_CURRENT_PRICE",
		defaultResolutionForPriceDecrease: "UPDATE_TO_CURRENT_PRICE",
		defaultResolutionForExpiredPlan: "UPDATE_TO_CURRENT_PRICE",
	},
};

/**
 * Эталонный актуальный прайс-лист клиники DENTE (для валидации и сопоставления).
 */
export const SAMPLE_CURRENT_PRICELIST: readonly CatalogServiceItem[] = [
	{
		id: "srv_karies_photopolymer",
		code804n: "A16.07.002",
		title: "Восстановление зуба пломбой (Estelite Asteria, 1-2 поверхности)",
		category: "Терапия",
		basePriceRub: 5200, // Подорожало с 4500 руб.
		active: true,
	},
	{
		id: "srv_endo_pulpitis_2canals",
		code804n: "A16.07.030.002",
		title: "Эндодонтическое лечение 2-канального зуба (механическая и медикаментозная обработка)",
		category: "Эндодонтия",
		basePriceRub: 11500, // Подорожало с 10000 руб.
		active: true,
	},
	{
		id: "srv_implant_straumann",
		code804n: "A16.07.054.001",
		title: "Внутрикостная дентальная имплантация системы Straumann BLX (Швейцария)",
		category: "Хирургия",
		basePriceRub: 65000, // Подорожало с 58000 руб.
		active: true,
	},
	{
		id: "srv_crown_zirconia",
		code804n: "A16.07.004.001",
		title: "Восстановление зуба коронкой из диоксида циркония (Prettau Multi-layer CAD/CAM)",
		category: "Ортопедия",
		basePriceRub: 28000, // Подорожало с 25000 руб.
		active: true,
	},
	{
		id: "srv_hygiene_complex",
		code804n: "A16.07.050",
		title: "Профессиональная гигиена полости рта комплексная (УЗ + Air-Flow + полировка)",
		category: "Гигиена",
		basePriceRub: 4500, // Подешевело по акции с 5000 руб.
		active: true,
	},
	{
		id: "srv_cbct_3d",
		code804n: "A06.07.007",
		title: "Конусно-лучевая компьютерная томография (КЛКТ) двух челюстей 8x15 см",
		category: "Диагностика",
		basePriceRub: 3500, // Цена не изменилась
		active: true,
	},
	{
		id: "srv_old_cermet_crown",
		code804n: "A16.07.004.002",
		title: "Коронка металлокерамическая на сплаве CoCr (Устаревшая позиция)",
		category: "Ортопедия",
		basePriceRub: 14000,
		active: false,
		isArchived: true, // В архиве
	},
	{
		id: "srv_anesthesia_infiltr",
		code804n: "B01.003.004.004",
		title: "Анестезия инфильтрационная / проводниковая (Ubistesin forte)",
		category: "Анестезия",
		basePriceRub: 900,
		active: true,
	},
];

/**
 * Образец сметы плана лечения, требующей валидации перед оформлением наряда.
 */
export const SAMPLE_TREATMENT_PLAN_FOR_VALIDATION: TreatmentPlanValidationPayload = {
	planId: "plan_2026_08_4109",
	planNumber: "ПЛ-2026/041",
	planTitle: "Комплексная терапевтическая санация и протезирование 4-го квадранта",
	patientId: "pat_77810",
	patientName: "Ковалев Андрей Сергеевич",
	doctorId: "doc_102",
	doctorFullName: "Д-р Смирнов А. В. (Стоматолог-ортопед)",
	createdAtIso: "2026-06-15T10:00:00.000Z", // Составлен 68 дней назад
	validUntilIso: "2026-07-15T23:59:59.000Z", // Срок 30 дней истек
	items: [
		{
			itemId: "item_1",
			toothNumber: 46,
			code804n: "A16.07.002",
			serviceTitle: "Восстановление зуба пломбой (Estelite Asteria, 1-2 поверхности)",
			category: "Терапия",
			planUnitPriceRub: 4500, // Старая цена: 4500, в прайсе: 5200 (+15.6%)
			planDiscountRub: 0,
			planDiscountPercent: 0,
			quantity: 1,
			planLineTotalRub: 4500,
			serviceId: "srv_karies_photopolymer",
			phase: 1,
			clinicalRationale: "Глубокий кариес жевательной поверхности зуба 46",
		},
		{
			itemId: "item_2",
			toothNumber: 45,
			code804n: "A16.07.030.002",
			serviceTitle: "Эндодонтическое лечение 2-канального зуба",
			category: "Эндодонтия",
			planUnitPriceRub: 10000, // Старая цена: 10000, в прайсе: 11500 (+15%)
			planDiscountRub: 1000, // Скидка врача 10%
			planDiscountPercent: 10,
			quantity: 1,
			planLineTotalRub: 9000,
			serviceId: "srv_endo_pulpitis_2canals",
			phase: 1,
			clinicalRationale: "Хронический пульпит зуба 45",
		},
		{
			itemId: "item_3",
			toothNumber: 46,
			code804n: "A16.07.004.001",
			serviceTitle: "Восстановление зуба коронкой из диоксида циркония",
			category: "Ортопедия",
			planUnitPriceRub: 25000, // Старая цена: 25000, в прайсе: 28000 (+12%)
			planDiscountRub: 0,
			planDiscountPercent: 0,
			quantity: 1,
			planLineTotalRub: 25000,
			serviceId: "srv_crown_zirconia",
			phase: 2,
			clinicalRationale: "ИРОПЗ > 0.8, восстановление анатомической формы",
		},
		{
			itemId: "item_4",
			toothNumber: undefined,
			code804n: "A16.07.050",
			serviceTitle: "Профессиональная гигиена полости рта комплексная",
			category: "Гигиена",
			planUnitPriceRub: 5000, // Старая цена: 5000, в прайсе: 4500 (-10% скидка по акции)
			planDiscountRub: 0,
			planDiscountPercent: 0,
			quantity: 1,
			planLineTotalRub: 5000,
			serviceId: "srv_hygiene_complex",
			phase: 1,
			clinicalRationale: "Подготовка к ортопедическому этапу",
		},
		{
			itemId: "item_5",
			toothNumber: 47,
			code804n: "A16.07.004.002",
			serviceTitle: "Коронка металлокерамическая на сплаве CoCr",
			category: "Ортопедия",
			planUnitPriceRub: 13000,
			planDiscountRub: 0,
			planDiscountPercent: 0,
			quantity: 1,
			planLineTotalRub: 13000,
			serviceId: "srv_old_cermet_crown", // УСЛУГА В АРХИВЕ
			phase: 2,
			clinicalRationale: "Альтернативный вариант коронки на зуб 47",
		},
	],
	notes: "Пациент просит сохранить цены первичной консультации от июня.",
};
