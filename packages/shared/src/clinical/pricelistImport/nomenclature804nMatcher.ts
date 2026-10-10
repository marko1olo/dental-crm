/**
 * packages/shared/src/clinical/pricelistImport/nomenclature804nMatcher.ts
 *
 * Statutory Minzdrav Order 804n Nomenclature matching, duration inference,
 * and clinical category / doctor specialty normalization.
 *
 * ZERO MOCKS INVARIANT: Never emits synthetic fake codes like A16.07.999.xxx!
 */

import type { DentalSpecialty, ServiceCategory } from "../../index.js";

// =============================================================================
// CANONICAL STATUTORY 804N FALLBACKS (ZERO MOCKS)
// =============================================================================

export const STATUTORY_CATEGORY_CODES_MAP: Record<ServiceCategory, string> = {
	therapy: "A16.07.002", // Восстановление зуба пломбой
	prosthetics: "A16.07.004", // Восстановление зуба коронкой
	surgery: "A16.07.001", // Удаление зуба
	orthodontics: "A16.07.048", // Ортодонтическая коррекция
	hygiene: "A16.07.051", // Профессиональная гигиена полости рта
	periodontology: "A16.07.018", // Пособие при пародонтологических вмешательствах
	imaging: "A06.07.007", // Внутриротовая прицельная рентгенография
	consultation: "B01.065.001", // Прием (осмотр, консультация) врача-стоматолога
	documents: "B01.065.001", // Официальные медицинские документы
	other: "A16.07.002",
};

export const STATUTORY_CATEGORY_DURATIONS_MAP: Record<ServiceCategory, number> = {
	therapy: 45,
	prosthetics: 60,
	surgery: 45,
	orthodontics: 30,
	hygiene: 60,
	periodontology: 45,
	imaging: 15,
	consultation: 30,
	documents: 15,
	other: 30,
};

// =============================================================================
// CATEGORY & SPECIALTY NORMALIZERS
// =============================================================================

export function normalizeServiceCategoryName(cat: string): ServiceCategory {
	const c = (cat || "").toLowerCase().trim();
	if (
		c === "therapy" ||
		c === "терапия" ||
		c.includes("кариес") ||
		c.includes("пульпит") ||
		c.includes("эндодонт") ||
		c.includes("реставрац") ||
		c.includes("пломб")
	) {
		return "therapy";
	}
	if (
		c === "surgery" ||
		c === "хирургия" ||
		c.includes("удален") ||
		c.includes("имплант") ||
		c.includes("синус") ||
		c.includes("костн")
	) {
		return "surgery";
	}
	if (
		c === "orthopedics" ||
		c === "prosthetics" ||
		c === "ортопедия" ||
		c === "протезирование" ||
		c.includes("корон") ||
		c.includes("винир") ||
		c.includes("протез") ||
		c.includes("вкладк") ||
		c.includes("зуботехническ")
	) {
		return "prosthetics";
	}
	if (
		c === "orthodontics" ||
		c === "ортодонтия" ||
		c.includes("брекет") ||
		c.includes("элайн") ||
		c.includes("прикус")
	) {
		return "orthodontics";
	}
	if (
		c === "hygiene" ||
		c === "гигиена" ||
		c.includes("чистк") ||
		c.includes("air-flow") ||
		c.includes("отбел") ||
		c.includes("профгигиен")
	) {
		return "hygiene";
	}
	if (
		c === "periodontology" ||
		c === "пародонтология" ||
		c.includes("пародонт") ||
		c.includes("десн") ||
		c.includes("кюретаж")
	) {
		return "periodontology";
	}
	if (
		c === "diagnostics" ||
		c === "imaging" ||
		c === "диагностика" ||
		c.includes("рентген") ||
		c.includes("сним") ||
		c.includes("оптг") ||
		c.includes("кт") ||
		c.includes("клкт") ||
		c.includes("визиограф")
	) {
		return "imaging";
	}
	if (
		c === "consultation" ||
		c === "консультация" ||
		c.includes("консульт") ||
		c.includes("осмотр") ||
		c.includes("прием") ||
		c.includes("приём")
	) {
		return "consultation";
	}
	if (
		c === "documents" ||
		c === "документы" ||
		c.includes("справк") ||
		c.includes("вычет")
	) {
		return "documents";
	}
	return "other";
}

export function normalizeDoctorSpecialtyName(spec: string): DentalSpecialty {
	const s = (spec || "").toLowerCase().trim();
	if (s.includes("терапевт") || s === "therapist") return "therapist";
	if (s.includes("ортопед") || s === "orthopedist") return "orthopedist";
	if (s.includes("хирург") || s === "surgeon") return "surgeon";
	if (s.includes("ортодонт") || s === "orthodontist") return "orthodontist";
	if (s.includes("пародонтолог") || s === "periodontist") return "periodontist";
	if (s.includes("гигиенист") || s === "hygienist") return "hygienist";
	if (s.includes("детск") || s === "pediatric") return "pediatric";
	if (s.includes("имплантолог") || s === "implantologist") return "implantologist";
	if (s.includes("рентгенолог") || s === "radiologist") return "radiologist";
	return "universal";
}
