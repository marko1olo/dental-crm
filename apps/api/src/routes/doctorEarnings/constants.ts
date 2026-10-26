/**
 * constants.ts — Категории стоматологии и статусы ЗТЛ на русском языке.
 * Mandate 8e & Mandate 8x: живой клинический язык без птичьего канцелярита.
 */

export const CATEGORY_NAMES_RU: Record<string, string> = {
	therapy: "Терапевтическая стоматология",
	orthopedics: "Ортопедическая стоматология (ЗТЛ)",
	prosthetics: "Ортопедия и протезирование (ЗТЛ)",
	surgery: "Хирургия и имплантология",
	orthodontics: "Ортодонтия (брекеты и элайнеры)",
	hygiene: "Профгигиена и пародонтология",
	pediatric: "Детская стоматология",
	retail: "Сопутствующие товары",
	retail_hygiene: "Средства домашней гигиены",
	imaging: "Диагностика и снимки",
	consultation: "Консультация",
	universal: "Общий приём",
};

/** Категории каталога, чьи работы опираются на счета зуботехнической лаборатории. */
export const LAB_DEDUCTED_CATEGORIES = new Set(["orthopedics", "prosthetics"]);

export const LAB_STATUS_RU: Record<string, string> = {
	draft: "Черновик",
	sent: "Отправлен в ЗТЛ",
	in_progress: "В работе в ЗТЛ",
	shipped: "Доставляется",
	received: "Получен в клинике",
	refitting: "На примерке",
	completed: "Сдан пациенту",
	cancelled: "Отменен",
};
