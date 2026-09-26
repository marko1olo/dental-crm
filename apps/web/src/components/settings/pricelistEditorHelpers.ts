import type { DentalSpecialty, ServiceCategory } from "@dental/shared";

export const NEW_SERVICE_TEMPLATE = {
	title: "",
	code: "",
	category: "therapy" as ServiceCategory,
	specialty: "therapist" as DentalSpecialty,
	basePriceRub: 0,
	durationMinutes: 30,
	taxDeductible: true,
	vatRate: "vat_exempt" as "vat_exempt" | "vat_0" | "vat_20",
	active: true,
};

/**
 * Цена из каталога — в текстовое поле формы.
 * Круглая сумма без дробной части, копейки — через запятую («1500», «1500,50»).
 */
export function rubToPriceInput(
	value: number | string | null | undefined,
): string {
	const amountRub = typeof value === "string" ? Number(value) : value;
	if (
		typeof amountRub !== "number" ||
		!Number.isFinite(amountRub) ||
		amountRub < 0
	) {
		return "";
	}
	const kopecks = Math.round(amountRub * 100);
	return kopecks % 100 === 0
		? String(kopecks / 100)
		: (kopecks / 100).toFixed(2).replace(".", ",");
}

export const CATEGORY_TABS: Array<{ id: string; label: string }> = [
	{ id: "all", label: "Все категории" },
	{ id: "therapy", label: "Терапия" },
	{ id: "orthopedics", label: "Ортопедия" },
	{ id: "surgery", label: "Хирургия" },
	{ id: "hygiene", label: "Гигиена" },
	{ id: "orthodontics", label: "Ортодонтия" },
	{ id: "radiology", label: "Рентген / КТ" },
	{ id: "other", label: "Прочее" },
];

export const QUICK_804N_CHIPS: Array<{ code: string; label: string }> = [
	{ code: "A16.07.002", label: "A16.07.002 Кариес" },
	{ code: "A16.07.008", label: "A16.07.008 Пульпит" },
	{ code: "A11.07.012", label: "A11.07.012 Анестезия" },
	{ code: "A06.07.003", label: "A06.07.003 Снимок" },
	{ code: "A16.07.054", label: "A16.07.054 Имплантация" },
	{ code: "A16.07.004", label: "A16.07.004 Коронка" },
	{ code: "A16.07.001", label: "A16.07.001 Удаление" },
	{ code: "A16.07.051", label: "A16.07.051 Гигиена" },
];
