/**
 * ============================================================================
 * WARRANTY PASSPORT STUDIO — LAYER 0: CONSTANTS & PURE UTILITIES
 * ============================================================================
 */

import { generateUuidV7, type WarrantyItem } from "../warrantyEngine.js";
import {
	DENTAL_MATERIALS_CATALOG,
	getWarrantyPreset,
	type WarrantyCategory,
} from "../warrantyPresets.js";
import type { CompletedTreatmentStage } from "./types";

export const UPPER_RIGHT_TEETH = ["18", "17", "16", "15", "14", "13", "12", "11"];
export const UPPER_LEFT_TEETH = ["21", "22", "23", "24", "25", "26", "27", "28"];
export const LOWER_RIGHT_TEETH = ["48", "47", "46", "45", "44", "43", "42", "41"];
export const LOWER_LEFT_TEETH = ["31", "32", "33", "34", "35", "36", "37", "38"];

/**
 * Автоопределение категории стоматологической помощи по названию услуги плана лечения (Мандат 8e/8k)
 */
export const detectCategoryFromServiceTitle = (title: string): WarrantyCategory => {
	const lower = title.toLowerCase();
	if (lower.includes("имплант") || lower.includes("implant")) return "implant_fixture";
	if (lower.includes("временн") || lower.includes("провизор"))
		return "temporary_prosthesis";
	if (lower.includes("циркон") || lower.includes("zircon")) return "ceramic_crown_veneer";
	if (
		lower.includes("e.max") ||
		lower.includes("emax") ||
		lower.includes("керамич") ||
		lower.includes("коронк") ||
		lower.includes("винир") ||
		lower.includes("вкладк")
	)
		return "ceramic_crown_veneer";
	if (
		lower.includes("элайнер") ||
		lower.includes("брекет") ||
		lower.includes("ретейнер") ||
		lower.includes("ортодонт")
	)
		return "orthodontic_aligners";
	if (
		lower.includes("канал") ||
		lower.includes("пульпит") ||
		lower.includes("периодонтит") ||
		lower.includes("эндодонт")
	)
		return "endodontic_treatment";
	if (lower.includes("протез") || lower.includes("бюгель") || lower.includes("съемн"))
		return "removable_prosthesis";
	if (lower.includes("шин")) return "periodontal_splinting";
	return "composite_restoration";
};

/**
 * 1-Клик конвертация завершенных этапов лечения в позиции гарантийного паспорта
 */
export const mapCompletedStagesToWarrantyItems = (stages: CompletedTreatmentStage[]): WarrantyItem[] => {
	return stages.map((st) => {
		const cat = st.category || detectCategoryFromServiceTitle(st.serviceTitle);
		const preset = getWarrantyPreset(cat);
		const mat = DENTAL_MATERIALS_CATALOG.find((m) => m.category === cat);
		const rawTooth = st.toothNumber ? String(st.toothNumber).trim() : "1.6";
		const tooth =
			rawTooth.length === 2 && !rawTooth.includes(".")
				? `${rawTooth[0]}.${rawTooth[1]}`
				: rawTooth || "1.6";

		let matName = st.materialName || mat?.name || preset.recommendedMaterials[0] || "Стоматологический материал";
		let manufacturer = st.manufacturer || mat?.manufacturer || preset.popularManufacturers[0] || "Производитель";
		let country = mat?.country || "Германия";
		let warrantyMonths = preset.baseWarrantyMonths;

		const lower = st.serviceTitle.toLowerCase();
		if (lower.includes("e.max") || lower.includes("emax")) {
			if (!st.materialName) matName = "IPS e.max Press (дисиликат лития)";
			if (!st.manufacturer) manufacturer = "Ivoclar Vivadent";
			country = "Лихтенштейн";
			warrantyMonths = 24;
		} else if (lower.includes("циркон") || lower.includes("zircon")) {
			if (!st.materialName) matName = "Katana Zirconia HTML/UTML";
			if (!st.manufacturer) manufacturer = "Kuraray Noritake";
			country = "Япония";
			warrantyMonths = 36;
		} else if (lower.includes("straumann")) {
			if (!st.materialName) matName = "Straumann BLX / BLT SLActive Roxolid";
			if (!st.manufacturer) manufacturer = "Straumann";
			country = "Швейцария";
			warrantyMonths = 24;
		}

		return {
			id: generateUuidV7(),
			toothNumber: tooth,
			category: cat,
			clinicalWorkTitle: st.serviceTitle || preset.title,
			materialName: matName,
			manufacturer,
			country,
			vitaShade: "A2",
			serviceCode804n: st.serviceCode804n || preset.serviceCode804n,
			labOrderNumber: st.labOrderNumber,
			baseWarrantyMonths: warrantyMonths,
			baseServiceLifeMonths: preset.baseServiceLifeMonths,
		};
	});
};
