/**
 * @dental/shared/anesthesia/catalogModules/catalogMethodsAndMdlp.ts
 * Methods & MDLP identifiers mapping (Mandate 8b, <= 120 lines)
 */

import { DENTAL_ANESTHETICS_CATALOG } from "../../mdlp/catalog.js";
import type { DentalAnestheticInfo } from "../../mdlp/types.js";
import type { AnesthesiaDrugKey, AnesthesiaDrugSpec, AnesthesiaMethodKey, AnestheticDrugId } from "../types.js";
import { ANESTHESIA_DRUG_CATALOG } from "./catalogKeyMappings.js";

export const ANESTHESIA_METHODS: Record<
	AnesthesiaMethodKey,
	{ nameRu: string; defaultNeedleSize: string; typicalOnsetMinutes: number }
> = {
	infiltration: { nameRu: "Инфильтрационная", defaultNeedleSize: "30G (0.3 x 21 мм)", typicalOnsetMinutes: 2 },
	mandibular: { nameRu: "Проводниковая мандибулярная", defaultNeedleSize: "27G (0.4 x 35 мм)", typicalOnsetMinutes: 5 },
	torusal: { nameRu: "Проводниковая торусальная (по Вейсбрему)", defaultNeedleSize: "27G (0.4 x 35 мм)", typicalOnsetMinutes: 4 },
	tuberal: { nameRu: "Проводниковая туберальная", defaultNeedleSize: "27G (0.4 x 30 мм)", typicalOnsetMinutes: 3 },
	incisive: { nameRu: "Проводниковая резцовая (назопалатинальная)", defaultNeedleSize: "30G (0.3 x 16 мм)", typicalOnsetMinutes: 2 },
	intraligamentary: { nameRu: "Интралигаментарная (внутрисвязочная)", defaultNeedleSize: "30G (0.3 x 12 мм)", typicalOnsetMinutes: 1 },
	application: { nameRu: "Аппликационная (поверхностная)", defaultNeedleSize: "Ватный шарик / аппликатор", typicalOnsetMinutes: 1 },
};

export const ANESTHESIA_TO_MDLP_MAP: Record<AnesthesiaDrugKey, string> = {
	ultracain_ds_forte: "ultracain-ds-forte",
	ultracain_ds: "ultracain-ds",
	septanest_100: "septanest-1-100000",
	scandonest_3: "scandonest-3-plain",
	lidocaine_2: "lidocaine-2-plain",
} as const;

export function getMdlpInfoForAnesthesiaDrug(drugKey: AnesthesiaDrugKey): DentalAnestheticInfo | null {
	const mdlpId = ANESTHESIA_TO_MDLP_MAP[drugKey];
	if (!mdlpId) return null;
	return DENTAL_ANESTHETICS_CATALOG.find((d) => d.id === mdlpId) ?? null;
}

export function getClinicalDrugForMdlpGtin(gtin: string): AnesthesiaDrugSpec | null {
	const normalizedGtin = gtin.trim();
	const mdlpDrug = DENTAL_ANESTHETICS_CATALOG.find((d) => d.gtinMatches.includes(normalizedGtin));
	if (!mdlpDrug?.clinicalDrugId) return null;
	const drugId = mdlpDrug.clinicalDrugId as AnestheticDrugId;
	return ANESTHESIA_DRUG_CATALOG[drugId] ?? null;
}

export function getClinicalSpecForMdlp(mdlpId: string): AnesthesiaDrugSpec | null {
	const mdlpDrug = DENTAL_ANESTHETICS_CATALOG.find((d) => d.id === mdlpId);
	if (!mdlpDrug?.clinicalDrugId) return null;
	const drugId = mdlpDrug.clinicalDrugId as AnestheticDrugId;
	return ANESTHESIA_DRUG_CATALOG[drugId] ?? null;
}
