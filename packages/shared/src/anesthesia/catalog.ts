/**
 * @dental/shared/anesthesia/catalog.ts
 * Russian Dental Anesthetics & Vasoconstrictor Pharmacopeia (СтАР / Минздрав РФ)
 */

import type {
	AnesthesiaDrugDefinition,
	AnesthesiaDrugKey,
	AnesthesiaDrugSpec,
	AnesthesiaMethodKey,
	AnestheticDrugId,
	ChairsideAnestheticDrugId,
} from "./types.js";
import { DENTAL_ANESTHETICS_CATALOG } from "../mdlp/catalog.js";
import type { DentalAnestheticInfo } from "../mdlp/types.js";

export const HEALTHY_MAX_EPINEPHRINE_MG = 0.20;
export const CARDIO_MAX_EPINEPHRINE_MG = 0.04;
export const CARDIO_LIMIT_BADGE_TEXT = "Кардиологический лимит";
export const EPINEPHRINE_BLOCKED_BADGE_TEXT = "⛔ Адреналин запрещен";

export const EPINEPHRINE_CEILINGS_MG = {
	healthyAdult: 0.20,
	cardiovascularGate: 0.04,
	cardiovascularRisk: 0.04,
} as const;

export const ANESTHESIA_DRUG_CATALOG: Record<AnestheticDrugId, AnesthesiaDrugSpec> = {
	articaine_4_epi_100k: {
		id: "articaine_4_epi_100k",
		nameRu: "Артикаин 4% с эпинефрином 1:100 000",
		tradeNamesRu: ["Ультракаин Д-С форте", "Септонест 1:100 000", "Убистезин форте", "Брилокаин форте"],
		activeSubstanceRu: "Артикаина гидрохлорид 4% + Эпинефрин 1:100 000",
		activeConcentrationPercent: 4.0,
		mgPerMlActive: 40.0,
		vasoconstrictorNameRu: "Эпинефрин (Адреналин) 1:100 000",
		vasoconstrictorRatio: "1:100000",
		epinephrineMgPerMl: 0.01,
		standardCarpuleVolumeMl: 1.7,
		mgActivePerCarpule: 68.0,
		mgEpiPerCarpule: 0.017,
		maxDoseMgPerKgAdult: 7.0,
		maxDoseMgPerKgPediatric: 5.0,
		absoluteMaxDoseMgAdult: 500.0,
		containsSulfites: true,
		isAdrenalineFree: false,
		durationPulpalMinutes: 75,
		durationSoftTissueMinutes: 240,
		onsetMinutes: 2,
		clinicalIndicationsRu: "Высокотравматичные вмешательства, эндодонтия, сложное удаление зубов, синус-лифтинг, костная пластика.",
		contraindicationsRu: [
			"Аллергия на артикаин и амидные анестетики",
			"Бронхиальная астма с гиперчувствительностью к сульфитам (метабисульфит E223)",
			"Прием ингибиторов МАО (ИМАО) и трициклических антидепрессантов (ТЦА)",
			"Декомпенсированный тиреотоксикоз, феохромоцитома, закрытоугольная глаукома",
			"Тяжелые нарушения ритма сердца (пароксизмальная тахикардия, мерцание)",
			"Неконтролируемая артериальная гипертензия (АД >= 180/110 мм рт. ст.)",
		],
	},

	articaine_4_epi_200k: {
		id: "articaine_4_epi_200k",
		nameRu: "Артикаин 4% с эпинефрином 1:200 000",
		tradeNamesRu: ["Ультракаин Д-С", "Убистезин", "Септонест 1:200 000", "Артифрин"],
		activeSubstanceRu: "Артикаина гидрохлорид 4% + Эпинефрин 1:200 000",
		activeConcentrationPercent: 4.0,
		mgPerMlActive: 40.0,
		vasoconstrictorNameRu: "Эпинефрин (Адреналин) 1:200 000",
		vasoconstrictorRatio: "1:200000",
		epinephrineMgPerMl: 0.005,
		standardCarpuleVolumeMl: 1.7,
		mgActivePerCarpule: 68.0,
		mgEpiPerCarpule: 0.0085,
		maxDoseMgPerKgAdult: 7.0,
		maxDoseMgPerKgPediatric: 5.0,
		absoluteMaxDoseMgAdult: 500.0,
		containsSulfites: true,
		isAdrenalineFree: false,
		durationPulpalMinutes: 45,
		durationSoftTissueMinutes: 180,
		onsetMinutes: 2,
		clinicalIndicationsRu: "Стандартная терапевтическая стоматология, препарирование под коронки, эндодонтия, удаление зубов.",
		contraindicationsRu: [
			"Аллергия на сульфиты и артикаин",
			"Прием ингибиторов МАО (ИМАО)",
			"Тяжелый тиреотоксикоз",
			"Тяжелая сердечно-сосудистая недостаточность (ASA IV)",
		],
	},

	articaine_4_plain: {
		id: "articaine_4_plain",
		nameRu: "Артикаин 4% без вазоконстриктора",
		tradeNamesRu: ["Ультракаин Д", "Артикаин 4% чистый"],
		activeSubstanceRu: "Артикаина гидрохлорид 4% (без вазоконстриктора)",
		activeConcentrationPercent: 4.0,
		mgPerMlActive: 40.0,
		vasoconstrictorNameRu: "Без вазоконстриктора (Адреналин-free)",
		vasoconstrictorRatio: "none",
		epinephrineMgPerMl: 0.0,
		standardCarpuleVolumeMl: 1.7,
		mgActivePerCarpule: 68.0,
		mgEpiPerCarpule: 0.0,
		maxDoseMgPerKgAdult: 4.0,
		maxDoseMgPerKgPediatric: 4.0,
		absoluteMaxDoseMgAdult: 300.0,
		containsSulfites: false,
		isAdrenalineFree: true,
		durationPulpalMinutes: 20,
		durationSoftTissueMinutes: 90,
		onsetMinutes: 2,
		clinicalIndicationsRu: "Малоинвазивные манипуляции, препарирование полостей, пациенты с аллергией на сульфиты и тяжелой кардиальной патологией.",
		contraindicationsRu: [
			"Аллергия на артикаин и амидные анестетики",
		],
	},

	mepivacaine_3_plain: {
		id: "mepivacaine_3_plain",
		nameRu: "Мепивакаин 3% без вазоконстриктора",
		tradeNamesRu: ["Скандонест 3%", "Мепивастезин 3%", "Мепивакаин-Бинергия"],
		activeSubstanceRu: "Мепивакаина гидрохлорид 3% (без вазоконстриктора)",
		activeConcentrationPercent: 3.0,
		mgPerMlActive: 30.0,
		vasoconstrictorNameRu: "Без вазоконстриктора (Адреналин-free)",
		vasoconstrictorRatio: "none",
		epinephrineMgPerMl: 0.0,
		standardCarpuleVolumeMl: 1.7,
		mgActivePerCarpule: 51.0,
		mgEpiPerCarpule: 0.0,
		maxDoseMgPerKgAdult: 4.4,
		maxDoseMgPerKgPediatric: 4.4,
		absoluteMaxDoseMgAdult: 300.0,
		containsSulfites: false,
		isAdrenalineFree: true,
		durationPulpalMinutes: 25,
		durationSoftTissueMinutes: 120,
		onsetMinutes: 1.5,
		clinicalIndicationsRu: "Препарат первого выбора для пациентов с сердечно-сосудистой патологией (ИБС, гипертония, аритмия), бронхиальной астмой, аллергией на сульфиты, тиреотоксикозом, приемом ИМАО/ТЦА, пожилых и беременных.",
		contraindicationsRu: [
			"Аллергия на мепивакаин и амидные анестетики",
			"Тяжелая печеночная недостаточность (декомпенсированный цирроз)",
		],
	},

	lidocaine_2_epi_100k: {
		id: "lidocaine_2_epi_100k",
		nameRu: "Лидокаин 2% с адреналином 1:100 000",
		tradeNamesRu: ["Ксилонор", "Лидокаин с адреналином 1:100 000", "Octocaine 1:100k"],
		activeSubstanceRu: "Лидокаина гидрохлорид 2% + Эпинефрин 1:100 000",
		activeConcentrationPercent: 2.0,
		mgPerMlActive: 20.0,
		vasoconstrictorNameRu: "Эпинефрин 1:100 000",
		vasoconstrictorRatio: "1:100000",
		epinephrineMgPerMl: 0.01,
		standardCarpuleVolumeMl: 1.7,
		mgActivePerCarpule: 34.0,
		mgEpiPerCarpule: 0.017,
		maxDoseMgPerKgAdult: 4.4,
		maxDoseMgPerKgPediatric: 4.4,
		absoluteMaxDoseMgAdult: 300.0,
		containsSulfites: true,
		isAdrenalineFree: false,
		durationPulpalMinutes: 60,
		durationSoftTissueMinutes: 180,
		onsetMinutes: 3,
		clinicalIndicationsRu: "Классическая инфильтрационная и проводниковая анестезия при непереносимости артикаина.",
		contraindicationsRu: [
			"Аллергия на лидокаин",
			"Атриовентрикулярная блокада II-III степени",
			"Прием ИМАО / аллергия на сульфиты",
		],
	},

	lidocaine_2_plain: {
		id: "lidocaine_2_plain",
		nameRu: "Лидокаин 2% без вазоконстриктора",
		tradeNamesRu: ["Лидокаин 2% (чистый)", "Ксилокаин"],
		activeSubstanceRu: "Лидокаина гидрохлорид 2% (чистый)",
		activeConcentrationPercent: 2.0,
		mgPerMlActive: 20.0,
		vasoconstrictorNameRu: "Без вазоконстриктора",
		vasoconstrictorRatio: "none",
		epinephrineMgPerMl: 0.0,
		standardCarpuleVolumeMl: 2.0,
		mgActivePerCarpule: 40.0,
		mgEpiPerCarpule: 0.0,
		maxDoseMgPerKgAdult: 4.4,
		maxDoseMgPerKgPediatric: 4.4,
		absoluteMaxDoseMgAdult: 300.0,
		containsSulfites: false,
		isAdrenalineFree: true,
		durationPulpalMinutes: 10,
		durationSoftTissueMinutes: 60,
		onsetMinutes: 3,
		clinicalIndicationsRu: "Кратковременные манипуляции, снятие швов, гингивотомия, непереносимость вазоконстрикторов.",
		contraindicationsRu: [
			"Аллергия на лидокаин",
			"Атриовентрикулярная блокада II-III степени",
		],
	},

	bupivacaine_05_epi_200k: {
		id: "bupivacaine_05_epi_200k",
		nameRu: "Бупивакаин 0.5% с адреналином 1:200 000",
		tradeNamesRu: ["Маркаин 0.5% с адреналином", "Бупивакаин Дентал"],
		activeSubstanceRu: "Бупивакаина гидрохлорид 0.5% + Эпинефрин 1:200 000",
		activeConcentrationPercent: 0.5,
		mgPerMlActive: 5.0,
		vasoconstrictorNameRu: "Эпинефрин 1:200 000",
		vasoconstrictorRatio: "1:200000",
		epinephrineMgPerMl: 0.005,
		standardCarpuleVolumeMl: 1.8,
		mgActivePerCarpule: 9.0,
		mgEpiPerCarpule: 0.009,
		maxDoseMgPerKgAdult: 2.0,
		maxDoseMgPerKgPediatric: 1.5,
		absoluteMaxDoseMgAdult: 90.0,
		containsSulfites: true,
		isAdrenalineFree: false,
		durationPulpalMinutes: 180,
		durationSoftTissueMinutes: 480,
		onsetMinutes: 6,
		clinicalIndicationsRu: "Длительные челюстно-лицевые операции, множественная имплантация, костная аугментация, пролонгированное послеоперационное обезболивание на 6-8 часов.",
		contraindicationsRu: [
			"Детский возраст до 12 лет",
			"Тяжелые нарушения ритма сердца (высокая кардиотоксичность бупивакаина)",
		],
	},
};

export const ANESTHESIA_KEY_TO_CLINICAL_ID: Record<AnesthesiaDrugKey, AnestheticDrugId> = {
	ultracain_ds_forte: "articaine_4_epi_100k",
	ultracain_ds: "articaine_4_epi_200k",
	septanest_100: "articaine_4_epi_100k",
	scandonest_3: "mepivacaine_3_plain",
	lidocaine_2: "lidocaine_2_plain",
} as const;

/**
 * Mapping between chairside component keys and canonical clinical pharmacopeia specs (SSOT)
 */
export const CHAIRSIDE_KEY_TO_CLINICAL_ID: Record<ChairsideAnestheticDrugId, AnestheticDrugId> = {
	articaine_1_100k: "articaine_4_epi_100k",
	articaine_1_200k: "articaine_4_epi_200k",
	mepivacaine_plain: "mepivacaine_3_plain",
	mepivacaine_plain_3: "mepivacaine_3_plain",
	lidocaine_1_100k: "lidocaine_2_epi_100k",
	lidocaine_2_100k: "lidocaine_2_epi_100k",
	lidocaine_plain: "lidocaine_2_plain",
	bupivacaine_05: "bupivacaine_05_epi_200k",
} as const;

/**
 * Retrieves clinical pharmacology specification for a chairside drug key.
 */
export function getClinicalSpecForChairsideDrug(drugKey: string): AnesthesiaDrugSpec | null {
	const clinicalId = CHAIRSIDE_KEY_TO_CLINICAL_ID[drugKey as ChairsideAnestheticDrugId];
	if (!clinicalId) return null;
	return ANESTHESIA_DRUG_CATALOG[clinicalId] ?? null;
}

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
		{
			activeSubstance: "Артикаин 4% + Эпинефрин 1:100 000",
			vasoconstrictor: "Эпинефрин 1:100 000",
		},
	),
	ultracain_ds: createDrugDefinition(
		"ultracain_ds",
		"Ультракаин Д-С",
		ANESTHESIA_DRUG_CATALOG.articaine_4_epi_200k,
		"Стандартная терапия и препарирование. Оптимальная кардиоваскулярная безопасность.",
		{
			activeSubstance: "Артикаин 4% + Эпинефрин 1:200 000",
			vasoconstrictor: "Эпинефрин 1:200 000",
		},
	),
	septanest_100: createDrugDefinition(
		"septanest_100",
		"Септанест с адреналином 1:100 000",
		ANESTHESIA_DRUG_CATALOG.articaine_4_epi_100k,
		"Французский артикаиновый анестетик быстрого действия.",
		{
			activeSubstance: "Артикаин 4% + Адреналин 1:100 000",
			vasoconstrictor: "Адреналин 1:100 000",
		},
	),
	scandonest_3: createDrugDefinition(
		"scandonest_3",
		"Скандонест 3% (Мепивакаин)",
		ANESTHESIA_DRUG_CATALOG.mepivacaine_3_plain,
		"Без адреналина и без сульфитов. Препарат выбора для пациентов с гипертонией, ССЗ, глаукомой, астмой, аллергией на сульфиты.",
		{
			activeSubstance: "Мепивакаин 3%",
			vasoconstrictor: "Без вазоконстриктора",
		},
	),
	lidocaine_2: createDrugDefinition(
		"lidocaine_2",
		"Лидокаин 2%",
		ANESTHESIA_DRUG_CATALOG.lidocaine_2_plain,
		"Классический амидный анестетик без вазоконстриктора и сульфитов для инфильтрации и проводниковой блокады.",
		{
			activeSubstance: "Лидокаин 2%",
			vasoconstrictor: "Без вазоконстриктора",
		},
	),
};

export const ANESTHESIA_METHODS: Record<
	AnesthesiaMethodKey,
	{ nameRu: string; defaultNeedleSize: string; typicalOnsetMinutes: number }
> = {
	infiltration: {
		nameRu: "Инфильтрационная",
		defaultNeedleSize: "30G (0.3 x 21 мм)",
		typicalOnsetMinutes: 2,
	},
	mandibular: {
		nameRu: "Проводниковая мандибулярная",
		defaultNeedleSize: "27G (0.4 x 35 мм)",
		typicalOnsetMinutes: 5,
	},
	torusal: {
		nameRu: "Проводниковая торусальная (по Вейсбрему)",
		defaultNeedleSize: "27G (0.4 x 35 мм)",
		typicalOnsetMinutes: 4,
	},
	tuberal: {
		nameRu: "Проводниковая туберальная",
		defaultNeedleSize: "27G (0.4 x 30 мм)",
		typicalOnsetMinutes: 3,
	},
	incisive: {
		nameRu: "Проводниковая резцовая (назопалатинальная)",
		defaultNeedleSize: "30G (0.3 x 16 мм)",
		typicalOnsetMinutes: 2,
	},
	intraligamentary: {
		nameRu: "Интралигаментарная (внутрисвязочная)",
		defaultNeedleSize: "30G (0.3 x 12 мм)",
		typicalOnsetMinutes: 1,
	},
	application: {
		nameRu: "Аппликационная (поверхностная)",
		defaultNeedleSize: "Ватный шарик / аппликатор",
		typicalOnsetMinutes: 1,
	},
};

/**
 * Mapping between chairside AnesthesiaDrugKey and statutory MDLP catalog identifiers.
 */
export const ANESTHESIA_TO_MDLP_MAP: Record<AnesthesiaDrugKey, string> = {
	ultracain_ds_forte: "ultracain-ds-forte",
	ultracain_ds: "ultracain-ds",
	septanest_100: "septanest-1-100000",
	scandonest_3: "scandonest-3-plain",
	lidocaine_2: "lidocaine-2-plain",
} as const;

/**
 * Retrieves statutory MDLP / Chestny ZNAK info for a chairside AnesthesiaDrugKey.
 */
export function getMdlpInfoForAnesthesiaDrug(
	drugKey: AnesthesiaDrugKey,
): DentalAnestheticInfo | null {
	const mdlpId = ANESTHESIA_TO_MDLP_MAP[drugKey];
	if (!mdlpId) return null;
	return DENTAL_ANESTHETICS_CATALOG.find((d) => d.id === mdlpId) ?? null;
}

/**
 * Retrieves clinical pharmacology specification from an MDLP DataMatrix GTIN barcode.
 */
export function getClinicalDrugForMdlpGtin(gtin: string): AnesthesiaDrugSpec | null {
	const normalizedGtin = gtin.trim();
	const mdlpDrug = DENTAL_ANESTHETICS_CATALOG.find((d) =>
		d.gtinMatches.includes(normalizedGtin),
	);
	if (!mdlpDrug?.clinicalDrugId) return null;
	const drugId = mdlpDrug.clinicalDrugId as AnestheticDrugId;
	return ANESTHESIA_DRUG_CATALOG[drugId] ?? null;
}

/**
 * Retrieves clinical pharmacology specification for an MDLP drug identifier.
 */
export function getClinicalSpecForMdlp(mdlpId: string): AnesthesiaDrugSpec | null {
	const mdlpDrug = DENTAL_ANESTHETICS_CATALOG.find((d) => d.id === mdlpId);
	if (!mdlpDrug?.clinicalDrugId) return null;
	const drugId = mdlpDrug.clinicalDrugId as AnestheticDrugId;
	return ANESTHESIA_DRUG_CATALOG[drugId] ?? null;
}

