import {
	type DentalSpecialty,
	type ServiceCategory,
} from "@dental/shared";
import { VALID_SERVICE_CATEGORIES } from "./types.js";

export function isValidServiceCategory(category: string): boolean {
	const c = (category || "").toLowerCase().trim();
	return (
		(VALID_SERVICE_CATEGORIES as readonly string[]).includes(c) ||
		[
			"терапия",
			"ортопедия",
			"хирургия",
			"ортодонтия",
			"гигиена",
			"пародонтология",
			"диагностика",
			"рентген",
			"консультация",
			"документы",
			"протезирование",
			"orthopedics",
		].includes(c)
	);
}

export function normalizeCategory(cat: string): ServiceCategory {
	const c = (cat || "").toLowerCase().trim();
	if (
		c === "therapy" ||
		c === "терапия" ||
		c.includes("кариес") ||
		c.includes("пульпит") ||
		c.includes("эндодонт")
	)
		return "therapy";
	if (
		c === "surgery" ||
		c === "хирургия" ||
		c.includes("удален") ||
		c.includes("имплант") ||
		c.includes("синус")
	)
		return "surgery";
	if (
		c === "orthopedics" ||
		c === "prosthetics" ||
		c === "ортопедия" ||
		c === "протезирование" ||
		c.includes("корон") ||
		c.includes("винир") ||
		c.includes("протез")
	)
		return "prosthetics";
	if (
		c === "orthodontics" ||
		c === "ортодонтия" ||
		c.includes("брекет") ||
		c.includes("элайн")
	)
		return "orthodontics";
	if (
		c === "hygiene" ||
		c === "гигиена" ||
		c.includes("чистк") ||
		c.includes("air-flow") ||
		c.includes("отбел")
	)
		return "hygiene";
	if (c === "periodontology" || c === "пародонтология" || c.includes("пародонт"))
		return "periodontology";
	if (
		c === "diagnostics" ||
		c === "imaging" ||
		c === "диагностика" ||
		c.includes("рентген") ||
		c.includes("сним") ||
		c.includes("оптг") ||
		c.includes("кт")
	)
		return "imaging";
	if (
		c === "consultation" ||
		c === "консультация" ||
		c.includes("консульт") ||
		c.includes("осмотр") ||
		c.includes("прием")
	)
		return "consultation";
	if (
		c === "documents" ||
		c === "документы" ||
		c.includes("справк") ||
		c.includes("вычет")
	)
		return "documents";
	return "other";
}

export function normalizeSpecialty(spec: string): DentalSpecialty {
	const s = (spec || "").toLowerCase().trim();
	if (s === "therapist" || s === "терапевт") return "therapist";
	if (s === "orthopedist" || s === "ортопед") return "orthopedist";
	if (s === "surgeon" || s === "хирург") return "surgeon";
	if (s === "orthodontist" || s === "ортодонт") return "orthodontist";
	if (s === "periodontist" || s === "пародонтолог") return "periodontist";
	if (s === "hygienist" || s === "гигиенист") return "hygienist";
	if (s === "pediatric" || s === "детский") return "pediatric";
	if (s === "implantologist" || s === "имплантолог") return "implantologist";
	if (s === "radiologist" || s === "рентгенолог") return "radiologist";
	return "universal";
}
