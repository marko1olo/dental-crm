/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FNS MEDICAL TAX DEDUCTION PRESETS & VALIDATORS (ПРИКАЗ ФНС № ЕД-7-11/755@)
 * Russian Tax Identification Number (ИНН), SNILS, Passport & Deduction Presets
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** Поддерживаемые налоговые периоды (текущий и до 3 предыдущих лет). */
export const SUPPORTED_TAX_YEARS = [2026, 2025, 2024, 2023] as const;
export type SupportedTaxYear = (typeof SUPPORTED_TAX_YEARS)[number];

/** Лимиты социального налогового вычета по обычному лечению (Код 1). */
export const NDFL_LIMITS = {
	/** Лимит базы расходов по коду 1 начиная с 2024 года (150 000 руб. = возврат до 19 500 руб.). */
	CODE_1_MAX_EXPENSE_FROM_2024: 150_000,
	/** Лимит базы расходов по коду 1 до 2024 года (120 000 руб. = возврат до 15 600 руб.). */
	CODE_1_MAX_EXPENSE_LEGACY: 120_000,
	/** Ставка НДФЛ базового возврата (13%). */
	TAX_RATE: 0.13,
} as const;

/**
 * Коды услуг по Приказу ФНС России № ЕД-7-11/755@ / № ЕА-7-11/824@:
 * 1 — Услуги по лечению (Обычное лечение, лимит 150 тыс. руб.)
 * 2 — Дорогостоящие медицинские услуги (Имплантация, костная пластика, без лимита)
 */
export type FnsServiceDeductionCode = "1" | "2";

export interface FnsServiceCodePreset {
	code: FnsServiceDeductionCode;
	label: string;
	shortTitle: string;
	description: string;
	hasLimit: boolean;
	typicalDentalServices: readonly string[];
}

export const FNS_SERVICE_CODE_PRESETS: Record<
	FnsServiceDeductionCode,
	FnsServiceCodePreset
> = {
	"1": {
		code: "1",
		label: "Код 01 — Обычное лечение (Терапия, ортодонтия, гигиена, удаление)",
		shortTitle: "Код 1 (Обычное)",
		description:
			"Услуги по лечению с ограничением базы вычета 150 000 ₽ в год (максимальный возврат 19 500 ₽).",
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
		label:
			"Код 02 — Дорогостоящее лечение (Имплантация, костная пластика, синус-лифтинг)",
		shortTitle: "Код 2 (Дорогостоящее)",
		description:
			"Дорогостоящие медицинские услуги (Постановление Правительства РФ № 458). Вычет 13% рассчитывается от ПОЛНОЙ суммы без ограничения.",
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

/**
 * Код родства пациента с налогоплательщиком (Приказ ФНС):
 * 1 — Сам налогоплательщик (пациент и плательщик совпадают)
 * 2 — Супруг / Супруга
 * 3 — Родитель
 * 4 — Ребенок (включая усыновленного) до 18 лет (или до 24 лет при очном обучении)
 * 5 — Подопечный (опекаемый)
 */
export type FnsKinshipCode = "1" | "2" | "3" | "4" | "5";

export interface FnsKinshipPreset {
	code: FnsKinshipCode;
	label: string;
	relationTitle: string;
	requiresKinshipDoc: boolean;
	hint: string;
}

export const FNS_KINSHIP_PRESETS: Record<FnsKinshipCode, FnsKinshipPreset> = {
	"1": {
		code: "1",
		label: "1 — Сам пациент (налогоплательщик и пациент — одно лицо)",
		relationTitle: "Сам налогоплательщик",
		requiresKinshipDoc: false,
		hint: "Блок сведений о пациенте в XML сжимается до флага ПризнПац=\"1\"",
	},
	"2": {
		code: "2",
		label: "2 — Супруг / Супруга",
		relationTitle: "Супруг(а)",
		requiresKinshipDoc: true,
		hint: "Требуется свидетельство о заключении брака",
	},
	"3": {
		code: "3",
		label: "3 — Родитель (мать / отец)",
		relationTitle: "Родитель",
		requiresKinshipDoc: true,
		hint: "Требуется свидетельство о рождении налогоплательщика",
	},
	"4": {
		code: "4",
		label: "4 — Ребенок (до 18 лет или до 24 лет очной формы обучения)",
		relationTitle: "Сын / Дочь",
		requiresKinshipDoc: true,
		hint: "Требуется свидетельство о рождении ребенка / справка об очном обучении",
	},
	"5": {
		code: "5",
		label: "5 — Подопечный / Опекаемый",
		relationTitle: "Подопечный",
		requiresKinshipDoc: true,
		hint: "Требуется акт органа опеки и попечительства",
	},
};

/** Коды видов документов, удостоверяющих личность (ФНС РФ). */
export const FNS_IDENTITY_DOC_TYPES = [
	{ code: "21", label: "Паспорт гражданина РФ (Код 21)" },
	{ code: "03", label: "Свидетельство о рождении (Код 03)" },
	{ code: "10", label: "Паспорт иностранного гражданина (Код 10)" },
	{ code: "12", label: "Вид на жительство в РФ (Код 12)" },
	{ code: "07", label: "Военный билет (Код 07)" },
	{ code: "91", label: "Иные документы (Код 91)" },
] as const;

/**
 * Проверка контрольной суммы ИНН (Российская Федерация).
 * - 10 знаков: Юридические лица (веса [2, 4, 10, 3, 5, 9, 4, 6, 8, 0], остаток по модулю 11)
 * - 12 знаков: Физические лица и ИП (две контрольные суммы на 11-й и 12-й знаки)
 */
export function validateRussianInn(inn: string | null | undefined): {
	isValid: boolean;
	type: "individual" | "legal" | "invalid";
	cleanInn: string;
	error?: string;
} {
	const clean = String(inn ?? "").replace(/\D/g, "");

	if (!clean) {
		return {
			isValid: false,
			type: "invalid",
			cleanInn: "",
			error: "ИНН не заполнен",
		};
	}

	if (clean.length === 10) {
		// Юридическое лицо
		const weights = [2, 4, 10, 3, 5, 9, 4, 6, 8, 0];
		const digits = clean.split("").map(Number);
		let sum = 0;
		for (let i = 0; i < 9; i++) {
			sum += (digits[i] ?? 0) * (weights[i] ?? 0);
		}
		const checkDigit = (sum % 11) % 10;
		if (checkDigit === digits[9]) {
			return { isValid: true, type: "legal", cleanInn: clean };
		}
		return {
			isValid: false,
			type: "invalid",
			cleanInn: clean,
			error: `Неверная контрольная сумма ИНН ЮЛ (ожидалась ${checkDigit}, получена ${digits[9]})`,
		};
	}

	if (clean.length === 12) {
		// Физическое лицо / ИП
		const weights11 = [7, 2, 4, 10, 3, 5, 9, 4, 6, 8, 0];
		const weights12 = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8, 0];
		const digits = clean.split("").map(Number);

		let sum11 = 0;
		for (let i = 0; i < 10; i++) {
			sum11 += (digits[i] ?? 0) * (weights11[i] ?? 0);
		}
		const checkDigit11 = (sum11 % 11) % 10;

		let sum12 = 0;
		for (let i = 0; i < 11; i++) {
			sum12 += (digits[i] ?? 0) * (weights12[i] ?? 0);
		}
		const checkDigit12 = (sum12 % 11) % 10;

		if (checkDigit11 === digits[10] && checkDigit12 === digits[11]) {
			return { isValid: true, type: "individual", cleanInn: clean };
		}
		return {
			isValid: false,
			type: "invalid",
			cleanInn: clean,
			error: `Неверная контрольная сумма ИНН ФЛ (контрольные цифры: ${checkDigit11}${checkDigit12}, указаны: ${digits[10]}${digits[11]})`,
		};
	}

	return {
		isValid: false,
		type: "invalid",
		cleanInn: clean,
		error: `ИНН должен содержать ровно 10 цифр (ЮЛ) или 12 цифр (ФЛ/ИП), сейчас ${clean.length} цифр`,
	};
}

/**
 * Проверка контрольной суммы СНИЛС (Страховой Номер Индивидуального Лицевого Счета РФ).
 * Формат: 11 цифр (XXX-XXX-XXX YY).
 */
export function validateRussianSnils(snils: string | null | undefined): {
	isValid: boolean;
	cleanSnils: string;
	formatted: string;
	error?: string;
} {
	const clean = String(snils ?? "").replace(/\D/g, "");

	if (!clean) {
		return {
			isValid: false,
			cleanSnils: "",
			formatted: "",
			error: "СНИЛС не указан",
		};
	}

	if (clean.length !== 11) {
		return {
			isValid: false,
			cleanSnils: clean,
			formatted: clean,
			error: `СНИЛС должен содержать ровно 11 цифр, сейчас ${clean.length}`,
		};
	}

	// СНИЛС вида 000-000-000 00 не валиден
	if (/^0{11}$/.test(clean)) {
		return {
			isValid: false,
			cleanSnils: clean,
			formatted: clean,
			error: "СНИЛС не может состоять из одних нулей",
		};
	}

	const formatted = `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6, 9)} ${clean.slice(9, 11)}`;
	const numberPart = Number(clean.slice(0, 9));

	// Для номеров меньше или равных 001-001-998 проверка контрольной суммы не проводилась
	if (numberPart <= 1001998) {
		return { isValid: true, cleanSnils: clean, formatted };
	}

	let sum = 0;
	for (let i = 0; i < 9; i++) {
		const digit = Number(clean[i]);
		sum += digit * (9 - i);
	}

	let checkDigit = 0;
	if (sum < 100) {
		checkDigit = sum;
	} else if (sum === 100 || sum === 101) {
		checkDigit = 0;
	} else {
		const rem = sum % 101;
		checkDigit = rem === 100 || rem === 101 ? 0 : rem;
	}

	const actualCheckDigit = Number(clean.slice(9, 11));
	if (checkDigit === actualCheckDigit) {
		return { isValid: true, cleanSnils: clean, formatted };
	}

	return {
		isValid: false,
		cleanSnils: clean,
		formatted,
		error: `Неверное контрольное число СНИЛС (вычислено: ${String(checkDigit).padStart(2, "0")}, указано: ${clean.slice(9, 11)})`,
	};
}

/**
 * Валидация КПП (Код причины постановки на учет) — 9 знаков.
 */
export function validateRussianKpp(kpp: string | null | undefined): boolean {
	const clean = String(kpp ?? "").replace(/\D/g, "");
	return clean.length === 9;
}

/**
 * Валидация ОГРН (13 знаков) / ОГРНИП (15 знаков).
 */
export function validateRussianOgrn(ogrn: string | null | undefined): boolean {
	const clean = String(ogrn ?? "").replace(/\D/g, "");
	return clean.length === 13 || clean.length === 15;
}

/**
 * Дефолтные реквизиты клиники для формы и XML выгрузки.
 */
export const DEFAULT_FNS_CLINIC_PRESET = {
	clinicName: "ООО Стоматологическая клиника «ДЕНТЕ»",
	inn: "7701234567",
	kpp: "770101001",
	ogrn: "1157746123456",
	taxOfficeCode: "7701",
	licenseNumber: "ЛО-77-01-019842",
	licenseDate: "2021-04-12",
	directorName: "Смирнов Алексей Владимирович",
	directorSnils: "123-456-789 01",
	phone: "+7 (495) 789-20-20",
} as const;
