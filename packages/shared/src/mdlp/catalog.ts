import type { DentalAnestheticInfo } from "./types.js";
export type { DentalAnestheticInfo };
import type {
	AnesthesiaDrugKey,
	AnestheticDrugId,
} from "../anesthesia/types.js";

// ─── Recognized Dental Anesthetics Catalog (MDLP) ───────────────────────────

export const DENTAL_ANESTHETICS_CATALOG: readonly DentalAnestheticInfo[] = [
	{
		id: "ultracain-ds-forte",
		tradeName: "Ультракаин® Д-С форте",
		tradeNameLatin: "Ultracain D-S forte",
		inn: "Артикаин + Эпинефрин",
		innLatin: "Articaine + Epinephrine",
		activeSubstance:
			"Артикаина гидрохлорид 40 мг/мл (4%), Эпинефрина гидрохлорид 0.010 мг/мл (1:100 000)",
		concentrationPct: 4.0,
		vasoconstrictor: "1:100000",
		vasoconstrictorName: "Эпинефрин (Адреналин) 1:100 000",
		carpuleVolumeMl: 1.7,
		dosageForm: "раствор для инъекций в карпулах 1.7 мл",
		manufacturer: "Sanofi-Aventis Deutschland GmbH, Германия",
		atxCode: "N01BB58",
		gtinMatches: [
			"03664798000016",
			"04013054005016",
			"04601234567893",
			"04607008360011",
			"04013054001018",
			"03664798000054",
		],
		isPrescriptionOnly: true,
		storageConditions: "Хранить в защищенном от света месте при температуре не выше 25°C. Не замораживать.",
		maxCarpulesPerPatient: 7,
		notes: "Препарат выбора для инвазивных вмешательств, пульпэктомии, резекции верхушки корня, имплантации и удаления зубов высокой сложности.",
		clinicalDrugId: "articaine_4_epi_100k",
		anesthesiaDrugKey: "ultracain_ds_forte",
	},
	{
		id: "ultracain-ds",
		tradeName: "Ультракаин® Д-С",
		tradeNameLatin: "Ultracain D-S",
		inn: "Артикаин + Эпинефрин",
		innLatin: "Articaine + Epinephrine",
		activeSubstance:
			"Артикаина гидрохлорид 40 мг/мл (4%), Эпинефрина гидрохлорид 0.005 мг/мл (1:200 000)",
		concentrationPct: 4.0,
		vasoconstrictor: "1:200000",
		vasoconstrictorName: "Эпинефрин (Адреналин) 1:200 000",
		carpuleVolumeMl: 1.7,
		dosageForm: "раствор для инъекций в карпулах 1.7 мл",
		manufacturer: "Sanofi-Aventis Deutschland GmbH, Германия",
		atxCode: "N01BB58",
		gtinMatches: [
			"03664798000023",
			"04013054005023",
			"04607008360028",
			"04013054001025",
			"03664798000061",
		],
		isPrescriptionOnly: true,
		storageConditions: "Хранить в защищенном от света месте при температуре не выше 25°C. Не замораживать.",
		maxCarpulesPerPatient: 7,
		notes: "Стандартная инфильтрационная и проводниковая анестезия. Рекомендован для пациентов группы риска (сердечно-сосудистые заболевания в стадии компенсации, пожилой возраст).",
		clinicalDrugId: "articaine_4_epi_200k",
		anesthesiaDrugKey: "ultracain_ds",
	},
	{
		id: "ultracain-d",
		tradeName: "Ультракаин® Д",
		tradeNameLatin: "Ultracain D (without vasoconstrictor)",
		inn: "Артикаин",
		innLatin: "Articaine",
		activeSubstance: "Артикаина гидрохлорид 40 мг/мл (4%), без вазоконстриктора и сульфитов",
		concentrationPct: 4.0,
		vasoconstrictor: "none",
		vasoconstrictorName: "Без вазоконстриктора",
		carpuleVolumeMl: 1.7,
		dosageForm: "раствор для инъекций в карпулах 1.7 мл",
		manufacturer: "Sanofi-Aventis Deutschland GmbH, Германия",
		atxCode: "N01BB08",
		gtinMatches: [
			"03664798000030",
			"04013054005030",
			"04013054001032",
		],
		isPrescriptionOnly: true,
		storageConditions: "Хранить в защищенном от света месте при температуре не выше 25°C.",
		maxCarpulesPerPatient: 6,
		notes: "Не содержит вазоконстриктора и бисульфита натрия. Показан при бронхиальной астме с гиперчувствительностью к сульфитам, тяжелых формах ИБС, закрытоугольной глаукоме.",
		clinicalDrugId: "articaine_4_plain",
	},
	{
		id: "septanest-1-100000",
		tradeName: "Септанест с адреналином 1:100 000",
		tradeNameLatin: "Septanest with Adrenaline 1:100,000",
		inn: "Артикаин + Эпинефрин",
		innLatin: "Articaine + Epinephrine",
		activeSubstance:
			"Артикаина гидрохлорид 40 мг/мл (4%), Адреналина тартрат 0.010 мг/мл (1:100 000)",
		concentrationPct: 4.0,
		vasoconstrictor: "1:100000",
		vasoconstrictorName: "Эпинефрин (Адреналин) 1:100 000",
		carpuleVolumeMl: 1.7,
		dosageForm: "раствор для инъекций в картриджах 1.7 мл",
		manufacturer: "Septodont, Франция",
		atxCode: "N01BB58",
		gtinMatches: [
			"03400930000014",
			"03660000000018",
			"03400935517228",
			"03400930012345",
		],
		isPrescriptionOnly: true,
		storageConditions: "Хранить в защищенном от света месте при температуре от 15°C до 25°C.",
		maxCarpulesPerPatient: 7,
		notes: "Классический французский артикаиновый анестетик для терапевтических и хирургических манипуляций.",
		clinicalDrugId: "articaine_4_epi_100k",
		anesthesiaDrugKey: "septanest_100",
	},
	{
		id: "septanest-1-200000",
		tradeName: "Септанест с адреналином 1:200 000",
		tradeNameLatin: "Septanest with Adrenaline 1:200,000",
		inn: "Артикаин + Эпинефрин",
		innLatin: "Articaine + Epinephrine",
		activeSubstance:
			"Артикаина гидрохлорид 40 мг/мл (4%), Адреналина тартрат 0.005 мг/мл (1:200 000)",
		concentrationPct: 4.0,
		vasoconstrictor: "1:200000",
		vasoconstrictorName: "Эпинефрин (Адреналин) 1:200 000",
		carpuleVolumeMl: 1.7,
		dosageForm: "раствор для инъекций в картриджах 1.7 мл",
		manufacturer: "Septodont, Франция",
		atxCode: "N01BB58",
		gtinMatches: [
			"03400930000021",
			"03660000000025",
			"03400935517457",
			"03400930012352",
		],
		isPrescriptionOnly: true,
		storageConditions: "Хранить в защищенном от света месте при температуре от 15°C до 25°C.",
		maxCarpulesPerPatient: 7,
		notes: "Мягкая концентрация вазоконстриктора для препарирования кариозных полостей и обработки зубов под ортопедические коронки.",
		clinicalDrugId: "articaine_4_epi_200k",
	},
	{
		id: "scandonest-3-plain",
		tradeName: "Скандонест 3% без вазоконстриктора",
		tradeNameLatin: "Scandonest 3% plain",
		inn: "Мепивакаин",
		innLatin: "Mepivacaine",
		activeSubstance:
			"Мепивакаина гидрохлорид 30 мг/мл (3%), Без вазоконстриктора",
		concentrationPct: 3.0,
		vasoconstrictor: "none",
		vasoconstrictorName: "Без вазоконстриктора",
		carpuleVolumeMl: 1.7,
		dosageForm: "раствор для инъекций в картриджах 1.7 мл",
		manufacturer: "Septodont, Франция",
		atxCode: "N01BB03",
		gtinMatches: [
			"03400930000038",
			"03660000000032",
			"03400935517686",
			"03400930012369",
		],
		isPrescriptionOnly: true,
		storageConditions: "Хранить при температуре ниже 25°C. Не замораживать.",
		maxCarpulesPerPatient: 5,
		notes: "Мепивакаин не обладает выраженным сосудорасширяющим эффектом, обеспечивает эффективную анестезию без добавления адреналина. Препарат выбора для гипертоников, беременных и аллергиков.",
		clinicalDrugId: "mepivacaine_3_plain",
		anesthesiaDrugKey: "scandonest_3",
	},
	{
		id: "scandonest-2-special",
		tradeName: "Скандонест 2% специальный",
		tradeNameLatin: "Scandonest 2% special",
		inn: "Мепивакаин + Эпинефрин",
		innLatin: "Mepivacaine + Epinephrine",
		activeSubstance:
			"Мепивакаина гидрохлорид 20 мг/мл (2%), Эпинефрина гидрохлорид 1:100 000",
		concentrationPct: 2.0,
		vasoconstrictor: "1:100000",
		vasoconstrictorName: "Эпинефрин (Адреналин) 1:100 000",
		carpuleVolumeMl: 1.7,
		dosageForm: "раствор для инъекций в картриджах 1.7 мл",
		manufacturer: "Septodont, Франция",
		atxCode: "N01BB53",
		gtinMatches: ["03400930000045", "03660000000049", "03400935517815"],
		isPrescriptionOnly: true,
		storageConditions: "Хранить при температуре от 15°C до 25°C в защищенном от света месте.",
		maxCarpulesPerPatient: 6,
		notes: "Мепивакаин пролонгированного действия с адреналином для длительных вмешательств.",
	},
	{
		id: "ubistesin-1-200000",
		tradeName: "Убистезин",
		tradeNameLatin: "Ubistesin",
		inn: "Артикаин + Эпинефрин",
		innLatin: "Articaine + Epinephrine",
		activeSubstance:
			"Артикаина гидрохлорид 40 мг/мл (4%), Эпинефрина гидрохлорид 0.005 мг/мл (1:200 000)",
		concentrationPct: 4.0,
		vasoconstrictor: "1:200000",
		vasoconstrictorName: "Эпинефрин (Адреналин) 1:200 000",
		carpuleVolumeMl: 1.7,
		dosageForm: "раствор для инъекций в карпулах 1.7 мл",
		manufacturer: "3M Deutschland GmbH, Германия",
		atxCode: "N01BB58",
		gtinMatches: [
			"04046719000012",
			"04046719012347",
			"04046719582103",
		],
		isPrescriptionOnly: true,
		storageConditions: "Хранить при температуре не выше 25°C в оригинальной упаковке для защиты от света.",
		maxCarpulesPerPatient: 7,
		notes: "Оригинальный немецкий анестетик 3M ESPE. Быстрое наступление обезболивания (1-3 мин) и минимальная системная токсичность.",
		clinicalDrugId: "articaine_4_epi_200k",
	},
	{
		id: "ubistesin-forte",
		tradeName: "Убистезин форте",
		tradeNameLatin: "Ubistesin forte",
		inn: "Артикаин + Эпинефрин",
		innLatin: "Articaine + Epinephrine",
		activeSubstance:
			"Артикаина гидрохлорид 40 мг/мл (4%), Эпинефрина гидрохлорид 0.010 мг/мл (1:100 000)",
		concentrationPct: 4.0,
		vasoconstrictor: "1:100000",
		vasoconstrictorName: "Эпинефрин (Адреналин) 1:100 000",
		carpuleVolumeMl: 1.7,
		dosageForm: "раствор для инъекций в карпулах 1.7 мл",
		manufacturer: "3M Deutschland GmbH, Германия",
		atxCode: "N01BB58",
		gtinMatches: [
			"04046719000029",
			"04046719012354",
			"04046719582110",
		],
		isPrescriptionOnly: true,
		storageConditions: "Хранить при температуре не выше 25°C в оригинальной упаковке.",
		maxCarpulesPerPatient: 7,
		notes: "Форте-версия 3M с адреналином 1:100 000 для сложных хирургических и пародонтологических процедур.",
		clinicalDrugId: "articaine_4_epi_100k",
	},
	{
		id: "articaine-binergia",
		tradeName: "Артикаин Бинергия с адреналином",
		tradeNameLatin: "Articaine Binergia with Adrenaline",
		inn: "Артикаин + Эпинефрин",
		innLatin: "Articaine + Epinephrine",
		activeSubstance: "Артикаина гидрохлорид 40 мг/мл (4%), Эпинефрин 1:100 000 / 1:200 000",
		concentrationPct: 4.0,
		vasoconstrictor: "1:100000",
		vasoconstrictorName: "Эпинефрин (Адреналин) 1:100 000",
		carpuleVolumeMl: 1.7,
		dosageForm: "раствор для инъекций в карпулах 1.7 мл",
		manufacturer: "ЗАО Биннофарм / ООО Бинергия, Россия",
		atxCode: "N01BB58",
		gtinMatches: [
			"04607008360035",
			"04607008360042",
			"04607008361230",
		],
		isPrescriptionOnly: true,
		storageConditions: "Хранить в защищенном от света месте при температуре от 2°C до 25°C.",
		maxCarpulesPerPatient: 7,
		notes: "Отечественный стоматологический анестетик Бинергия в карпулах европейского стандарта.",
		clinicalDrugId: "articaine_4_epi_100k",
	},
	{
		id: "articaine-inibsa",
		tradeName: "Артикаин ИНИБСА (Артикаин 4% с эпинефрином)",
		tradeNameLatin: "Articaine INIBSA",
		inn: "Артикаин + Эпинефрин",
		innLatin: "Articaine + Epinephrine",
		activeSubstance: "Артикаина гидрохлорид 40 мг/мл (4%), Эпинефрин 1:100 000 / 1:200 000",
		concentrationPct: 4.0,
		vasoconstrictor: "1:100000",
		vasoconstrictorName: "Эпинефрин (Адреналин) 1:100 000",
		carpuleVolumeMl: 1.8,
		dosageForm: "раствор для инъекций в картриджах 1.8 мл",
		manufacturer: "Laboratorios Inibsa S.A., Испания",
		atxCode: "N01BB58",
		gtinMatches: [
			"08470001234567",
			"08470007890123",
			"08470003456789",
		],
		isPrescriptionOnly: true,
		storageConditions: "Хранить при температуре ниже 25°C в защищенном от света месте.",
		maxCarpulesPerPatient: 7,
		notes: "Испанский карпульный анестетик премиум-класса объемом 1.8 мл.",
		clinicalDrugId: "articaine_4_epi_100k",
	},
	{
		id: "articaine-generic",
		tradeName: "Артикаин с адреналином (Бинофарм / Органика)",
		tradeNameLatin: "Articaine with Adrenaline",
		inn: "Артикаин + Эпинефрин",
		innLatin: "Articaine + Epinephrine",
		activeSubstance:
			"Артикаина гидрохлорид 40 мг/мл (4%), Эпинефрин 1:100 000 / 1:200 000",
		concentrationPct: 4.0,
		vasoconstrictor: "1:100000",
		vasoconstrictorName: "Эпинефрин (Адреналин) 1:100 000",
		carpuleVolumeMl: 1.7,
		dosageForm: "раствор для инъекций в карпулах 1.7 мл",
		manufacturer: "ОАО Синтез / Бинофарм Групп / Органика, Россия",
		atxCode: "N01BB58",
		gtinMatches: [
			"04602509000015",
			"04605077000016",
			"04602509000022",
			"04602509012346",
			"04605077012354",
		],
		isPrescriptionOnly: true,
		storageConditions: "Хранить при температуре от 2°C до 25°C в защищенном от света месте.",
		maxCarpulesPerPatient: 7,
		notes: "Отечественный карпульный артикаин стандарта GMP. Полный аналог Ультракаина.",
		clinicalDrugId: "articaine_4_epi_100k",
	},
	{
		id: "primacaine-adrenaline",
		tradeName: "Примакаин с адреналином",
		tradeNameLatin: "Primacaine with Adrenaline",
		inn: "Артикаин + Эпинефрин",
		innLatin: "Articaine + Epinephrine",
		activeSubstance:
			"Артикаина гидрохлорид 40 мг/мл (4%), Адреналин 1:100 000",
		concentrationPct: 4.0,
		vasoconstrictor: "1:100000",
		vasoconstrictorName: "Эпинефрин (Адреналин) 1:100 000",
		carpuleVolumeMl: 1.7,
		dosageForm: "раствор для инъекций в картриджах 1.7 мл",
		manufacturer: "Pierre Rolland / Acteon Group, Франция",
		atxCode: "N01BB58",
		gtinMatches: [
			"03400930000052",
			"03660000000056",
		],
		isPrescriptionOnly: true,
		storageConditions: "Хранить при температуре от 15°C до 25°C.",
		maxCarpulesPerPatient: 7,
		notes: "Французский анестетик Pierre Rolland с высокой степенью очистки действующего вещества.",
		clinicalDrugId: "articaine_4_epi_100k",
	},
	{
		id: "lidocaine-2-plain",
		tradeName: "Лидокаин 2% (чистый, карпулы)",
		tradeNameLatin: "Lidocaine 2% plain",
		inn: "Лидокаин",
		innLatin: "Lidocaine",
		activeSubstance: "Лидокаина гидрохлорид 20 мг/мл (2%), без вазоконстриктора",
		concentrationPct: 2.0,
		vasoconstrictor: "none",
		vasoconstrictorName: "Без вазоконстриктора",
		carpuleVolumeMl: 2.0,
		dosageForm: "раствор для инъекций в карпулах 2.0 мл",
		manufacturer: "ОАО Синтез / Органика, Россия",
		atxCode: "N01BB02",
		gtinMatches: [
			"04601234567800",
			"04602509000039",
		],
		isPrescriptionOnly: true,
		storageConditions: "Хранить в защищенном от света месте при температуре не выше 25°C.",
		maxCarpulesPerPatient: 7,
		notes: "Классический амидный анестетик без вазоконстриктора для кратковременных процедур и пациентов с непереносимостью адреналина.",
		clinicalDrugId: "lidocaine_2_plain",
		anesthesiaDrugKey: "lidocaine_2",
	},
	{
		id: "xylonor-special",
		tradeName: "Ксилонор специальный (Лидокаин 2% с адреналином)",
		tradeNameLatin: "Xylonor Special (Lidocaine 2% with Adrenaline)",
		inn: "Лидокаин + Эпинефрин",
		innLatin: "Lidocaine + Epinephrine",
		activeSubstance:
			"Лидокаина гидрохлорид 20 мг/мл (2%), Эпинефрин 0.010 мг/мл (1:100 000)",
		concentrationPct: 2.0,
		vasoconstrictor: "1:100000",
		vasoconstrictorName: "Эпинефрин (Адреналин) 1:100 000",
		carpuleVolumeMl: 1.7,
		dosageForm: "раствор для инъекций в картриджах 1.7 мл",
		manufacturer: "Septodont, Франция",
		atxCode: "N01BB52",
		gtinMatches: [
			"03400930000069",
			"03660000000063",
		],
		isPrescriptionOnly: true,
		storageConditions: "Хранить при температуре от 15°C до 25°C в защищенном от света месте.",
		maxCarpulesPerPatient: 8,
		notes: "Раствор лидокаина с адреналином для инфильтрационной и проводниковой анестезии при непереносимости артикаина.",
		clinicalDrugId: "lidocaine_2_epi_100k",
	},
	{
		id: "marcaine-adrenaline",
		tradeName: "Маркаин Дентал 0.5% с адреналином",
		tradeNameLatin: "Marcaine Dental 0.5% with Adrenaline",
		inn: "Бупивакаин + Эпинефрин",
		innLatin: "Bupivacaine + Epinephrine",
		activeSubstance:
			"Бупивакаина гидрохлорид 5 мг/мл (0.5%), Эпинефрин 0.005 мг/мл (1:200 000)",
		concentrationPct: 0.5,
		vasoconstrictor: "1:200000",
		vasoconstrictorName: "Эпинефрин (Адреналин) 1:200 000",
		carpuleVolumeMl: 1.8,
		dosageForm: "раствор для инъекций в картриджах 1.8 мл",
		manufacturer: "AstraZeneca AB / Sanofi, Франция",
		atxCode: "N01BB51",
		gtinMatches: [
			"07321420000018",
			"07321420000025",
		],
		isPrescriptionOnly: true,
		storageConditions: "Хранить при температуре от 2°C до 25°C. Не замораживать.",
		maxCarpulesPerPatient: 5,
		notes: "Пролонгированный анестетик длительного действия для многочасовых хирургических вмешательств, имплантации и костной пластики.",
		clinicalDrugId: "bupivacaine_05_epi_200k",
	},
];

// ─── Catalog Lookup Functions ───────────────────────────────────────────────

/**
 * Searches the catalog of dental anesthetics by GTIN, trade name, or INN.
 */
export function recognizeDentalMedication(
	gtin: string,
	searchHint?: string | null,
): DentalAnestheticInfo | null {
	const normalizedGtin = gtin.trim();

	// 1. Direct GTIN match
	const matchByGtin = DENTAL_ANESTHETICS_CATALOG.find((drug) =>
		drug.gtinMatches.includes(normalizedGtin),
	);
	if (matchByGtin) return matchByGtin;

	// 2. Search hint matching if provided
	if (searchHint && searchHint.trim().length > 0) {
		const rawWords = searchHint
			.toLowerCase()
			.replace(/[®™\-_.,/()]/g, " ")
			.split(/\s+/)
			.filter((w) => w.length > 0);

		if (rawWords.length > 0) {
			const matchByHint = DENTAL_ANESTHETICS_CATALOG.find((drug) => {
				const corpus = `${drug.tradeName} ${drug.tradeNameLatin} ${drug.inn} ${drug.innLatin} ${drug.id}`
					.toLowerCase()
					.replace(/[®™\-_.,/()]/g, " ");

				// Match if all search terms exist in the drug corpus
				return rawWords.every((word) => corpus.includes(word));
			});
			if (matchByHint) return matchByHint;
		}
	}

	return null;
}

/**
 * Finds anesthetic by its identifier (e.g. 'ultracain-ds-forte', 'scandonest-3-plain').
 */
export function findAnestheticById(id: string): DentalAnestheticInfo | null {
	return DENTAL_ANESTHETICS_CATALOG.find((d) => d.id === id) ?? null;
}

/**
 * Returns all anesthetics matching a specific INN (e.g. 'Артикаин' or 'Мепивакаин').
 */
export function findAnestheticsByInn(innPattern: string): DentalAnestheticInfo[] {
	const p = innPattern.toLowerCase().trim();
	return DENTAL_ANESTHETICS_CATALOG.filter((d) =>
		d.inn.toLowerCase().includes(p) || d.innLatin.toLowerCase().includes(p),
	);
}

/**
 * Returns entire dental anesthetics catalog.
 */
export function getAllAnesthetics(): readonly DentalAnestheticInfo[] {
	return DENTAL_ANESTHETICS_CATALOG;
}

/**
 * Returns all MDLP anesthetic entries corresponding to a specific clinical drug identifier.
 */
export function findAnestheticsByClinicalId(
	clinicalDrugId: AnestheticDrugId,
): DentalAnestheticInfo[] {
	return DENTAL_ANESTHETICS_CATALOG.filter((d) => d.clinicalDrugId === clinicalDrugId);
}

/**
 * Returns the MDLP anesthetic entry corresponding to a chairside anesthesia drug key.
 */
export function findAnestheticByDrugKey(
	drugKey: AnesthesiaDrugKey,
): DentalAnestheticInfo | null {
	return DENTAL_ANESTHETICS_CATALOG.find((d) => d.anesthesiaDrugKey === drugKey) ?? null;
}

