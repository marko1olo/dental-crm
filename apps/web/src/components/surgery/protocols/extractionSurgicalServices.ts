/**
 * extractionSurgicalServices.ts — Расчет перечня услуг прейскуранта для удаления зубов (Мандаты 8e, 8ap).
 * Никаких сырых номеров приказов в типах и функциях.
 */

import type { SurgicalServiceItem } from "../surgeryNormsCatalog";
import {
	EXTRACTION_SURGICAL_CODES,
	type ExtractionComplexity,
	type SurgicalHemostasisMethod,
} from "./surgeryExtractionTypes";

export function getExtractionSurgicalServices(params: {
	complexity: ExtractionComplexity;
	toothFdi?: number;
	hemostasis?: readonly SurgicalHemostasisMethod[];
	sutureMaterial?: string;
}): readonly SurgicalServiceItem[] {
	const tooth = params.toothFdi;
	const comp = params.complexity;
	const hemo = params.hemostasis || [];

	const primary: SurgicalServiceItem =
		comp === "complex"
			? {
					code: EXTRACTION_SURGICAL_CODES.COMPLEX_SEPARATION,
					nameRu: "Удаление зуба сложное с разъединением корней",
					name: "Удаление зуба сложное с разъединением корней",
					priceRub: 6000,
					quantity: 1,
					suggestedPriceRub: 6000,
					toothNumber: tooth,
					stageKind: "stage_2_surgery" as const,
					isPrimary: true,
			  }
			: comp === "impacted_dystopic"
				? {
						code: EXTRACTION_SURGICAL_CODES.IMPACTED_DYSTOPIC,
						nameRu: "Операция удаления ретинированного / дистопированного зуба",
						name: "Операция удаления ретинированного / дистопированного зуба",
						priceRub: 9500,
						quantity: 1,
						suggestedPriceRub: 9500,
						toothNumber: tooth,
						stageKind: "stage_2_surgery" as const,
						isPrimary: true,
				  }
				: {
						code: EXTRACTION_SURGICAL_CODES.SIMPLE,
						nameRu: "Удаление постоянного зуба (простое)",
						name: "Удаление постоянного зуба (простое)",
						priceRub: 3500,
						quantity: 1,
						suggestedPriceRub: 3500,
						toothNumber: tooth,
						stageKind: "stage_2_surgery" as const,
						isPrimary: true,
				  };

	const items: SurgicalServiceItem[] = [primary];

	items.push({
		code: EXTRACTION_SURGICAL_CODES.CURETTAGE,
		nameRu: "Кюретаж лунки удаленного зуба (ревизия и гемостаз)",
		name: "Кюретаж лунки удаленного зуба (ревизия и гемостаз)",
		priceRub: 1200,
		quantity: 1,
		suggestedPriceRub: 1200,
		toothNumber: tooth,
		stageKind: "stage_2_surgery" as const,
	});

	if (comp === "complex" || comp === "impacted_dystopic" || hemo.includes("vicryl_suture")) {
		const sutName = params.sutureMaterial || "Викрил 4-0";
		items.push({
			code: EXTRACTION_SURGICAL_CODES.SUTURE_VICRYL,
			nameRu: `Наложение шва на слизистую оболочку рта (${sutName})`,
			name: `Наложение шва на слизистую оболочку рта (${sutName})`,
			priceRub: 1500,
			quantity: 1,
			suggestedPriceRub: 1500,
			toothNumber: tooth,
			stageKind: "stage_2_surgery" as const,
		});
	}

	items.push({
		code: comp === "impacted_dystopic" ? EXTRACTION_SURGICAL_CODES.ANESTHESIA_CONDUCTION : EXTRACTION_SURGICAL_CODES.ANESTHESIA_INFILTRATION,
		nameRu: comp === "impacted_dystopic"
			? "Проводниковая (торусальная) анестезия (Артикаин)"
			: "Инфильтрационная анестезия (Артикаин 1:100 000)",
		name: comp === "impacted_dystopic"
			? "Проводниковая (торусальная) анестезия (Артикаин)"
			: "Инфильтрационная анестезия (Артикаин 1:100 000)",
		priceRub: comp === "impacted_dystopic" ? 1200 : 900,
		quantity: 1,
		suggestedPriceRub: comp === "impacted_dystopic" ? 1200 : 900,
		toothNumber: tooth,
		stageKind: "stage_2_surgery" as const,
	});

	return items;
}

// Семантические и ретро-алиасы для полной совместимости
export const getExtractionServices = getExtractionSurgicalServices;
export const getExtractionServices804n = getExtractionSurgicalServices;
