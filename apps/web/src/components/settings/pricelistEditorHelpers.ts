import type { DentalSpecialty, ServiceCategory } from "@dental/shared";

export const NEW_SERVICE_TEMPLATE = {
	title: "",
	code: "",
	order804nCode: "",
	category: "therapy" as ServiceCategory,
	specialty: "therapist" as DentalSpecialty,
	basePriceRub: 0,
	materialsCostRub: 0,
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

export const QUICK_CLINICAL_CHIPS: Array<{ code: string; label: string; shortLabel: string }> = [
	{ code: "A16.07.002", label: "Лечение кариеса", shortLabel: "Кариес" },
	{ code: "A16.07.008", label: "Пульпит / каналы", shortLabel: "Пульпит" },
	{ code: "A11.07.012", label: "Анестезия", shortLabel: "Анестезия" },
	{ code: "A06.07.003", label: "Снимок / ОПТГ", shortLabel: "Снимок" },
	{ code: "A16.07.054", label: "Имплантация", shortLabel: "Имплантация" },
	{ code: "A16.07.004", label: "Коронка", shortLabel: "Коронка" },
	{ code: "A16.07.001", label: "Удаление зуба", shortLabel: "Удаление" },
	{ code: "A16.07.051", label: "Профгигиена / Air-Flow", shortLabel: "Гигиена" },
	{ code: "B01.065.001", label: "Консультация / Осмотр", shortLabel: "Консультация" },
];

/** Алиас для обратной совместимости со старыми тестами */
export const QUICK_804N_CHIPS = QUICK_CLINICAL_CHIPS;

/**
 * Интеллектуальный матчинг категории по ключевым словам для быстрого плоского импорта.
 * Пломба/кариес -> Терапия; Коронка/слепок -> Ортопедия; Удаление/имплант -> Хирургия; Чистка/air-flow -> Гигиена.
 */
export function detectCategoryByTitleKeywords(title: string): ServiceCategory {
	const t = (title || "").toLowerCase();
	if (
		t.includes("кариес") ||
		t.includes("пульпит") ||
		t.includes("эндодонт") ||
		t.includes("пломб") ||
		t.includes("реставрац") ||
		t.includes("композит") ||
		t.includes("штифт")
	) {
		return "therapy";
	}
	if (
		t.includes("удален") ||
		t.includes("имплант") ||
		t.includes("синус") ||
		t.includes("резекц") ||
		t.includes("костн") ||
		t.includes("пластик")
	) {
		return "surgery";
	}
	if (
		t.includes("корон") ||
		t.includes("протез") ||
		t.includes("винир") ||
		t.includes("слепк") ||
		t.includes("оттиск") ||
		t.includes("вкладк") ||
		t.includes("бюгел") ||
		t.includes("абатмент") ||
		t.includes("мост")
	) {
		return "prosthetics";
	}
	if (
		t.includes("чистк") ||
		t.includes("air-flow") ||
		t.includes("airflow") ||
		t.includes("гигиен") ||
		t.includes("отбел") ||
		t.includes("ультразвук") ||
		t.includes("полировк")
	) {
		return "hygiene";
	}
	if (
		t.includes("брекет") ||
		t.includes("элайн") ||
		t.includes("капп") ||
		t.includes("капа") ||
		t.includes("прикус") ||
		t.includes("ретейнер")
	) {
		return "orthodontics";
	}
	if (
		t.includes("пародонт") ||
		t.includes("десн") ||
		t.includes("кюретаж") ||
		t.includes("вектор")
	) {
		return "periodontology";
	}
	if (
		t.includes("снимок") ||
		t.includes("рентген") ||
		t.includes("кт") ||
		t.includes("оптг") ||
		t.includes("визиограф") ||
		t.includes("диагностик")
	) {
		return "imaging";
	}
	if (
		t.includes("консульт") ||
		t.includes("осмотр") ||
		t.includes("прием") ||
		t.includes("приём")
	) {
		return "consultation";
	}
	return "therapy";
}

