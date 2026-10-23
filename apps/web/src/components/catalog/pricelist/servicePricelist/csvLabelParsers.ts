/**
 * DENTE Dental CRM — Statutory Service Catalog & Nomenclature
 *
 * CSV Category & Specialty Label Parsers
 */

import {
	CATEGORY_LABELS,
	SPECIALTY_LABELS,
	type DoctorSpecialty,
	type ServiceCategory,
} from "../servicePricelistPresets";

export function parseCategoryFromLabel(label: string): ServiceCategory {
	const norm = label.toLowerCase().trim();
	for (const [cat, catLabel] of Object.entries(CATEGORY_LABELS)) {
		if (norm.includes(cat) || norm.includes(catLabel.toLowerCase())) {
			return cat as ServiceCategory;
		}
	}
	if (
		norm.includes("терап") ||
		norm.includes("кариес") ||
		norm.includes("пломб") ||
		norm.includes("эндо")
	)
		return "therapy";
	if (
		norm.includes("хирург") ||
		norm.includes("имплант") ||
		norm.includes("удален")
	)
		return "surgery";
	if (
		norm.includes("ортопед") ||
		norm.includes("коронк") ||
		norm.includes("протез") ||
		norm.includes("винир")
	)
		return "orthopedics";
	if (
		norm.includes("ортодонт") ||
		norm.includes("брекет") ||
		norm.includes("элайн")
	)
		return "orthodontics";
	if (norm.includes("детск") || norm.includes("молочн")) return "pediatric";
	if (
		norm.includes("рентген") ||
		norm.includes("диагност") ||
		norm.includes("снимок") ||
		norm.includes("томограф")
	)
		return "radiology";
	if (
		norm.includes("гигиен") ||
		norm.includes("чистк") ||
		norm.includes("отбеливан")
	)
		return "hygiene";
	if (norm.includes("анестез")) return "anesthesia";
	if (norm.includes("консульт") || norm.includes("осмотр"))
		return "consultation";
	if (
		norm.includes("пакет") ||
		norm.includes("комплекс") ||
		norm.includes("сертификат") ||
		norm.includes("капа")
	)
		return "package";
	return "other";
}

export function parseSpecialtyFromLabel(label: string): DoctorSpecialty {
	const norm = label.toLowerCase().trim();
	for (const [spec, specLabel] of Object.entries(SPECIALTY_LABELS)) {
		if (norm.includes(spec) || norm.includes(specLabel.toLowerCase())) {
			return spec as DoctorSpecialty;
		}
	}
	if (norm.includes("терапевт")) return "therapist";
	if (norm.includes("хирург") || norm.includes("имплантолог")) return "surgeon";
	if (norm.includes("ортопед")) return "orthopedist";
	if (norm.includes("ортодонт")) return "orthodontist";
	if (norm.includes("детск")) return "pediatric";
	if (norm.includes("гигиенист")) return "hygienist";
	if (norm.includes("рентгенолог")) return "radiologist";
	if (norm.includes("анестезиолог")) return "anesthesiologist";
	return "general";
}
