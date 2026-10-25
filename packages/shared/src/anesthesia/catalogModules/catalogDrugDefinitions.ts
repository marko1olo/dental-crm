/**
 * @dental/shared/anesthesia/catalogModules/catalogDrugDefinitions.ts
 * Clinical chairside drug definitions (Mandate 8b, <= 120 lines)
 */

import type { AnesthesiaDrugDefinition, AnesthesiaDrugKey, AnesthesiaDrugSpec } from "../types.js";
import { ANESTHESIA_DRUG_CATALOG } from "./catalogKeyMappings.js";

function createDrugDefinition(
	key: AnesthesiaDrugKey,
	commercialName: string,
	spec: AnesthesiaDrugSpec,
	description: string,
	overrides?: {
		readonly activeSubstance?: string;
		readonly vasoconstrictor?: string;
	},
): AnesthesiaDrugDefinition {
	return {
		key,
		commercialName,
		activeSubstance: overrides?.activeSubstance ?? spec.activeSubstanceRu,
		concentrationPct: spec.activeConcentrationPercent,
		vasoconstrictor:
			overrides?.vasoconstrictor ??
			(spec.vasoconstrictorRatio === "none"
				? "Без вазоконстриктора"
				: spec.vasoconstrictorNameRu),
		vasoconstrictorRatio:
			spec.vasoconstrictorRatio === "1:50000"
				? "1:100000"
				: spec.vasoconstrictorRatio,
		epinephrineMgPerCarpule: spec.mgEpiPerCarpule,
		containsSulfites: spec.containsSulfites,
		volumeMlPerCarpule: spec.standardCarpuleVolumeMl,
		mgPerCarpule: spec.mgActivePerCarpule,
		maxDoseMgPerKg: spec.maxDoseMgPerKgAdult,
		maxDoseMgPerKgPediatric: spec.maxDoseMgPerKgPediatric,
		absoluteMaxDoseMg: spec.absoluteMaxDoseMgAdult,
		isAdrenalineFree: spec.isAdrenalineFree,
		description,
	};
}

export const ANESTHESIA_DRUGS: Record<AnesthesiaDrugKey, AnesthesiaDrugDefinition> = {
	ultracain_ds_forte: createDrugDefinition(
		"ultracain_ds_forte",
		"Ультракаин Д-С форте",
		ANESTHESIA_DRUG_CATALOG.articaine_4_epi_100k,
		"Высокая глубина анестезии. Для травматичных вмешательств, пульпитов, хирургии.",
		{ activeSubstance: "Артикаин 4% + Эпинефрин 1:100 000", vasoconstrictor: "Эпинефрин 1:100 000" },
	),
	ultracain_ds: createDrugDefinition(
		"ultracain_ds",
		"Ультракаин Д-С",
		ANESTHESIA_DRUG_CATALOG.articaine_4_epi_200k,
		"Стандартная терапия и препарирование. Оптимальная кардиоваскулярная безопасность.",
		{ activeSubstance: "Артикаин 4% + Эпинефрин 1:200 000", vasoconstrictor: "Эпинефрин 1:200 000" },
	),
	septanest_100: createDrugDefinition(
		"septanest_100",
		"Септанест с адреналином 1:100 000",
		ANESTHESIA_DRUG_CATALOG.articaine_4_epi_100k,
		"Французский артикаиновый анестетик быстрого действия.",
		{ activeSubstance: "Артикаин 4% + Адреналин 1:100 000", vasoconstrictor: "Адреналин 1:100 000" },
	),
	scandonest_3: createDrugDefinition(
		"scandonest_3",
		"Скандонест 3% (Мепивакаин)",
		ANESTHESIA_DRUG_CATALOG.mepivacaine_3_plain,
		"Без адреналина и без сульфитов. Препарат выбора для пациентов с гипертонией, ССЗ, глаукомой, астмой, аллергией на сульфиты.",
		{ activeSubstance: "Мепивакаин 3%", vasoconstrictor: "Без вазоконстриктора" },
	),
	lidocaine_2: createDrugDefinition(
		"lidocaine_2",
		"Лидокаин 2%",
		ANESTHESIA_DRUG_CATALOG.lidocaine_2_plain,
		"Классический амидный анестетик без вазоконстриктора и сульфитов для инфильтрации и проводниковой блокады.",
		{ activeSubstance: "Лидокаин 2%", vasoconstrictor: "Без вазоконстриктора" },
	),
};
