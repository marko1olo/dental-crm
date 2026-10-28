/**
 * FNS MEDICAL TAX DEDUCTION PRESETS & VALIDATORS
 * Russian Tax Identification Number (ИНН), SNILS, Passport & Deduction Presets
 */

export * from "./fnsInnValidators";
export * from "./fnsSnilsValidators";
export * from "./fnsKinshipPresets";

/** Поддерживаемые налоговые периоды (текущий и до 3 предыдущих лет). */
export const SUPPORTED_TAX_YEARS = [2026, 2025, 2024, 2023] as const;
export type SupportedTaxYear = (typeof SUPPORTED_TAX_YEARS)[number];

/** Лимиты социального налогового вычета по обычному лечению (Код 1). */
export const NDFL_LIMITS = {
	CODE_1_MAX_EXPENSE_FROM_2024: 150_000,
	CODE_1_MAX_EXPENSE_LEGACY: 120_000,
	TAX_RATE: 0.13,
} as const;

export type FnsServiceDeductionCode = "1" | "2";

export interface FnsServiceCodePreset {
	code: FnsServiceDeductionCode;
	label: string;
	shortTitle: string;
	description: string;
	hasLimit: boolean;
	typicalDentalServices: readonly string[];
}

export const FNS_SERVICE_CODE_PRESETS: Record<FnsServiceDeductionCode, FnsServiceCodePreset> = {
	"1": {
		code: "1",
		label: "Код 01 — Обычное лечение (Терапия, ортодонтия, гигиена, удаление)",
		shortTitle: "Код 1 (Обычное)",
		description: "Услуги по лечению с ограничением базы вычета 150 000 ₽ в год (максимальный возврат 19 500 ₽).",
		hasLimit: true,
		typicalDentalServices: [
			"Терапевтическое лечение кариеса и пульпита",
			"Профессиональная гигиена полости рта и AirFlow",
			"Ортодонтическое лечение (брекеты, элайнеры)",
			"Простое удаление зубов",
			"Периодонтологическое лечение",
			"Рентгенодиагностика (ОПТГ, КЛКТ, визиография)",
		],
	},
	"2": {
		code: "2",
		label: "Код 02 — Дорогостоящее лечение (Имплантация, костная пластика, синус-лифтинг)",
		shortTitle: "Код 2 (Дорогостоящее)",
		description: "Дорогостоящие медицинские услуги. Вычет 13% рассчитывается от ПОЛНОЙ суммы без ограничения.",
		hasLimit: false,
		typicalDentalServices: [
			"Дентальная имплантация (установка имплантатов)",
			"Костная пластика и направленная костная регенерация (НКР)",
			"Синус-лифтинг (открытый / закрытый)",
			"Сложные реконструктивные челюстно-лицевые хирургические операции",
			"Пластика мягких тканей и расщепление альвеолярного гребня",
		],
	},
};

export const FNS_IDENTITY_DOC_TYPES = [
	{ code: "21", label: "Паспорт гражданина РФ (Код 21)" },
	{ code: "03", label: "Свидетельство о рождении (Код 03)" },
	{ code: "10", label: "Паспорт иностранного гражданина (Код 10)" },
	{ code: "12", label: "Вид на жительство в РФ (Код 12)" },
	{ code: "07", label: "Военный билет (Код 07)" },
	{ code: "91", label: "Иные документы (Код 91)" },
] as const;

export const DEFAULT_FNS_CLINIC_PRESET = {
	clinicName: "ООО Стоматологическая клиника «ДЕНТЕ»",
	inn: "",
	kpp: "",
	ogrn: "",
	taxOfficeCode: "7701",
	licenseNumber: "ЛО-77-01-019842",
	licenseDate: "2021-04-12",
	directorName: "Смирнов Алексей Владимирович",
	directorSnils: "123-456-789 01",
	phone: "+7 (495) 789-20-20",
} as const;
