/**
 * sinusGbrSurgicalServices.ts — Расчет перечня услуг прейскуранта для синус-лифтинга и НКР (Мандаты 8e, 8ap).
 * Никаких сырых номеров приказов в типах и функциях.
 */

import type { SurgicalServiceItem } from "../surgeryNormsCatalog";
import { EXTRACTION_SURGICAL_CODES } from "./surgeryExtractionTypes";

export function getSinusGbrSurgicalServices(params: {
	isClosedSinus: boolean;
	toothFdi?: number;
	membrane?: string;
	hasPins?: boolean;
}): readonly SurgicalServiceItem[] {
	const tooth = params.toothFdi;
	if (params.isClosedSinus) {
		return [
			{
				code: EXTRACTION_SURGICAL_CODES.SINUS_LIFT,
				nameRu: "Синус-лифтинг закрытый (трансальвеолярный)",
				name: "Синус-лифтинг закрытый (трансальвеолярный)",
				priceRub: 18000,
				quantity: 1,
				suggestedPriceRub: 18000,
				toothNumber: tooth,
				stageKind: "stage_2_surgery" as const,
				isPrimary: true,
			},
			{
				code: EXTRACTION_SURGICAL_CODES.SUTURE_VICRYL,
				nameRu: "Наложение шва на слизистую оболочку рта (ПГА 4-0)",
				name: "Наложение шва на слизистую оболочку рта (ПГА 4-0)",
				priceRub: 1500,
				quantity: 1,
				suggestedPriceRub: 1500,
				toothNumber: tooth,
				stageKind: "stage_2_surgery" as const,
			},
			{
				code: EXTRACTION_SURGICAL_CODES.ANESTHESIA_INFILTRATION,
				nameRu: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				name: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				priceRub: 900,
				quantity: 1,
				suggestedPriceRub: 900,
				toothNumber: tooth,
				stageKind: "stage_2_surgery" as const,
			},
		];
	}

	return [
		{
			code: EXTRACTION_SURGICAL_CODES.BONE_GRAFT,
			nameRu: "Костная пластика альвеолярного отростка (латеральный синус-лифтинг & НКР)",
			name: "Костная пластика альвеолярного отростка (латеральный синус-лифтинг & НКР)",
			priceRub: 35000,
			quantity: 1,
			suggestedPriceRub: 35000,
			toothNumber: tooth,
			stageKind: "stage_2_surgery" as const,
			isPrimary: true,
		},
		{
			code: EXTRACTION_SURGICAL_CODES.SINUS_LIFT,
			nameRu: "Внесение остеопластического материала (ксенографт) и мембраны",
			name: "Внесение остеопластического материала (ксенографт) и мембраны",
			priceRub: 18000,
			quantity: 1,
			suggestedPriceRub: 18000,
			toothNumber: tooth,
			stageKind: "stage_2_surgery" as const,
		},
		{
			code: EXTRACTION_SURGICAL_CODES.SUTURE_VICRYL,
			nameRu: "Наложение шва на слизистую оболочку рта (ПГА/Викрил 4-0)",
			name: "Наложение шва на слизистую оболочку рта (ПГА/Викрил 4-0)",
			priceRub: 1500,
			quantity: 1,
			suggestedPriceRub: 1500,
			toothNumber: tooth,
			stageKind: "stage_2_surgery" as const,
		},
		{
			code: EXTRACTION_SURGICAL_CODES.ANESTHESIA_INFILTRATION,
			nameRu: "Инфильтрационная анестезия (Артикаин 1:100 000)",
			name: "Инфильтрационная анестезия (Артикаин 1:100 000)",
			priceRub: 900,
			quantity: 1,
			suggestedPriceRub: 900,
			toothNumber: tooth,
			stageKind: "stage_2_surgery" as const,
		},
	];
}

// Семантические и ретро-алиасы для полной совместимости
export const getSinusGbrServices = getSinusGbrSurgicalServices;
export const getSinusGbrServices804n = getSinusGbrSurgicalServices;
