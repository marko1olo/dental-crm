/**
 * @dental/web/components/anesthesia/anesthesiaCatalog.ts
 * Russian Dental Anesthetics & Vasoconstrictor Pharmacopeia (СтАР / Минздрав РФ)
 * Consolidated SSOT Catalog (Mandates 8b, 8e, 8n, 8y, 8am)
 */

export type AnestheticDrugId =
	| "articaine_1_100k"
	| "articaine_1_200k"
	| "septanest_1_100k"
	| "mepivacaine_plain"
	| "lidocaine_1_100k"
	| "lidocaine_plain"
	| "bupivacaine_05";

export type VasoconstrictorRatio = "1:100000" | "1:200000" | "none";

export type NeedleGaugeType =
	| "g27_long_35mm"
	| "g30_short_21mm"
	| "g30_ultrashort_12mm"
	| "g30_extrashort_8mm";

export type InjectionTechniqueId =
	| "infiltration"
	| "mandibular_torus"
	| "mental_incisive"
	| "tuberal"
	| "palatal_greater"
	| "incisive_canal"
	| "intraligamentary_sta"
	| "intraseptal"
	| "application_topical";

export interface AnestheticDrugInfo {
	readonly id: AnestheticDrugId;
	readonly tradeNamesRu: readonly string[];
	readonly activeSubstanceRu: string;
	readonly activeConcentrationPercent: number;
	readonly mgPerMlActive: number;
	readonly vasoconstrictorNameRu: string;
	readonly vasoconstrictorRatio: VasoconstrictorRatio;
	readonly epinephrineMgPerMl: number;
	readonly carpuleVolumeMl: number;
	readonly mgActivePerCarpule: number;
	readonly mgEpiPerCarpule: number;
	readonly maxDoseMgPerKgAdult: number;
	readonly absoluteMaxDoseMgAdult: number;
	readonly maxCarpules70kgAdult: number;
	readonly containsSulfites: boolean;
	readonly isAdrenalineFree: boolean;
	readonly onsetMinutes: number;
	readonly pulpalDurationMinutes: number;
	readonly softTissueDurationMinutes: number;
	readonly clinicalIndicationsRu: string;
	readonly contraindicationsRu: readonly string[];
}

export interface DentalNeedleInfo {
	readonly id: NeedleGaugeType;
	readonly gauge: string;
	readonly diameterMm: number;
	readonly lengthMm: number;
	readonly colorCode: string;
	readonly nameRu: string;
	readonly recommendedTechniques: readonly InjectionTechniqueId[];
}

export interface InjectionTechniqueInfo {
	readonly id: InjectionTechniqueId;
	readonly nameRu: string;
	readonly anatomicalLandmarksRu: string;
	readonly defaultNeedle: NeedleGaugeType;
	readonly targetAnesthesiaZonesRu: string;
	readonly aspirationCheckMandatory: boolean;
	readonly typicalVolumeCarpules: number;
}

export interface StandardAnesthesiaPreset {
	readonly id: string;
	readonly labelRu: string;
	readonly shortLabelRu: string;
	readonly testId: string;
	readonly drugId: AnestheticDrugId;
	readonly carpulesCount: number;
	readonly techniqueId: InjectionTechniqueId;
	readonly needleType: NeedleGaugeType;
	readonly descriptionRu: string;
	readonly isAdrenalineFree: boolean;
	readonly hasCardioRisk: boolean;
	readonly defaultWeightKg: number;
}

export interface PrimaryAnestheticDrug {
	readonly id: AnestheticDrugId;
	readonly labelRu: string;
	readonly subLabelRu: string;
	readonly activeSubstanceRu: string;
	readonly vasoRatio: string;
	readonly isAdrenalineFree: boolean;
	readonly isCardioRecommended: boolean;
}

export interface ClinicalFastPresetItem {
	readonly drugId: AnestheticDrugId | "none";
	readonly count: number;
	readonly volumeMl: number;
	readonly shortLabelRu: string;
	readonly fullLabelRu: string;
	readonly clinicalScopeRu: string;
	readonly testId: string;
	readonly altTestId?: string;
	readonly srOnlyText: string;
	readonly defaultTechnique?: InjectionTechniqueId;
	readonly needleType?: string;
	readonly isCardioRecommended?: boolean;
}

export const WEIGHT_QUICK_PRESETS: readonly number[] = [15, 30, 50, 70, 85, 100];
export const WEIGHT_PRESETS: readonly number[] = WEIGHT_QUICK_PRESETS;

export const DENTAL_ANESTHETICS: Record<AnestheticDrugId, AnestheticDrugInfo> = {
	articaine_1_100k: {
		id: "articaine_1_100k",
		tradeNamesRu: ["Ультракаин Д-С форте", "Септонест 1:100 000", "Убистезин форте", "Брилокаин форте"],
		activeSubstanceRu: "Артикаина гидрохлорид 4% + Эпинефрин 1:100 000",
		activeConcentrationPercent: 4.0,
		mgPerMlActive: 40.0,
		vasoconstrictorNameRu: "Эпинефрин (Адреналин) 1:100 000",
		vasoconstrictorRatio: "1:100000",
		epinephrineMgPerMl: 0.01,
		carpuleVolumeMl: 1.7,
		mgActivePerCarpule: 68.0,
		mgEpiPerCarpule: 0.017,
		maxDoseMgPerKgAdult: 7.0,
		absoluteMaxDoseMgAdult: 500.0,
		maxCarpules70kgAdult: 7,
		containsSulfites: true,
		isAdrenalineFree: false,
		onsetMinutes: 2,
		pulpalDurationMinutes: 75,
		softTissueDurationMinutes: 240,
		clinicalIndicationsRu: "Высокотравматичные вмешательства, экстирпация пульпы, сложное удаление зубов, синус-лифтинг, костная пластика.",
		contraindicationsRu: [
			"Аллергия на артикаин и амидные анестетики",
			"Бронхиальная астма с гиперчувствительностью к сульфитам",
			"Неконтролируемая артериальная гипертензия (АД > 180/110)",
			"Закрытоугольная глаукома, феохромоцитома, декомпенсированный тиреотоксикоз",
			"Сердечно-сосудистые патологии (ИБС, гипертония II-III ст, аритмии, инфаркт в анамнезе), прием бета-блокаторов",
		],
	},
	articaine_1_200k: {
		id: "articaine_1_200k",
		tradeNamesRu: ["Ультракаин Д-С", "Убистезин", "Септонест 1:200 000", "Артифрин"],
		activeSubstanceRu: "Артикаина гидрохлорид 4% + Эпинефрин 1:200 000",
		activeConcentrationPercent: 4.0,
		mgPerMlActive: 40.0,
		vasoconstrictorNameRu: "Эпинефрин (Адреналин) 1:200 000",
		vasoconstrictorRatio: "1:200000",
		epinephrineMgPerMl: 0.005,
		carpuleVolumeMl: 1.7,
		mgActivePerCarpule: 68.0,
		mgEpiPerCarpule: 0.0085,
		maxDoseMgPerKgAdult: 7.0,
		absoluteMaxDoseMgAdult: 500.0,
		maxCarpules70kgAdult: 7,
		containsSulfites: true,
		isAdrenalineFree: false,
		onsetMinutes: 2,
		pulpalDurationMinutes: 45,
		softTissueDurationMinutes: 180,
		clinicalIndicationsRu: "Стандартная терапия кариеса, препарирование под коронки, эндодонтия, стандартные удаления.",
		contraindicationsRu: [
			"Аллергия на сульфиты и артикаин",
			"Тяжелая сердечно-сосудистая недостаточность",
		],
	},
	septanest_1_100k: {
		id: "septanest_1_100k",
		tradeNamesRu: ["Септанест 1:100 000", "Septanest 1:100 000", "Септонест"],
		activeSubstanceRu: "Артикаина гидрохлорид 4% + Эпинефрин 1:100 000",
		activeConcentrationPercent: 4.0,
		mgPerMlActive: 40.0,
		vasoconstrictorNameRu: "Эпинефрин (Адреналин) 1:100 000",
		vasoconstrictorRatio: "1:100000",
		epinephrineMgPerMl: 0.01,
		carpuleVolumeMl: 1.7,
		mgActivePerCarpule: 68.0,
		mgEpiPerCarpule: 0.017,
		maxDoseMgPerKgAdult: 7.0,
		absoluteMaxDoseMgAdult: 500.0,
		maxCarpules70kgAdult: 7,
		containsSulfites: true,
		isAdrenalineFree: false,
		onsetMinutes: 2,
		pulpalDurationMinutes: 60,
		softTissueDurationMinutes: 240,
		clinicalIndicationsRu: "Инфильтрационная и проводниковая анестезия в амбулаторной стоматологии при травматичных манипуляциях.",
		contraindicationsRu: [
			"Аллергия на артикаин и амидные анестетики",
			"Бронхиальная астма с гиперчувствительностью к сульфитам",
			"Неконтролируемая артериальная гипертензия (АД > 180/110)",
			"Закрытоугольная глаукома, феохромоцитома, декомпенсированный тиреотоксикоз",
			"Сердечно-сосудистые патологии (ИБС, гипертония II-III ст, аритмии, инфаркт в анамнезе), прием бета-блокаторов",
		],
	},
	mepivacaine_plain: {
		id: "mepivacaine_plain",
		tradeNamesRu: ["Скандонест 3%", "Мепивастезин 3%", "Мепивакаин-Бинергия"],
		activeSubstanceRu: "Мепивакаина гидрохлорид 3% (без вазоконстриктора)",
		activeConcentrationPercent: 3.0,
		mgPerMlActive: 30.0,
		vasoconstrictorNameRu: "Без вазоконстриктора (Адреналин-free)",
		vasoconstrictorRatio: "none",
		epinephrineMgPerMl: 0.0,
		carpuleVolumeMl: 1.7,
		mgActivePerCarpule: 51.0,
		mgEpiPerCarpule: 0.0,
		maxDoseMgPerKgAdult: 4.4,
		absoluteMaxDoseMgAdult: 300.0,
		maxCarpules70kgAdult: 5,
		containsSulfites: false,
		isAdrenalineFree: true,
		onsetMinutes: 1.5,
		pulpalDurationMinutes: 25,
		softTissueDurationMinutes: 120,
		clinicalIndicationsRu: "Препарат первого выбора для пациентов группы кардиоваскулярного риска, пациентов на бета-блокаторах, астматиков и аллергиков на сульфиты.",
		contraindicationsRu: [
			"Аллергия на мепивакаин / амиды",
			"Тяжелая печеночная недостаточность",
		],
	},
	lidocaine_1_100k: {
		id: "lidocaine_1_100k",
		tradeNamesRu: ["Ксилонор", "Лидокаин с адреналином 1:100 000", "Octocaine 1:100k"],
		activeSubstanceRu: "Лидокаина гидрохлорид 2% + Эпинефрин 1:100 000",
		activeConcentrationPercent: 2.0,
		mgPerMlActive: 20.0,
		vasoconstrictorNameRu: "Эпинефрин 1:100 000",
		vasoconstrictorRatio: "1:100000",
		epinephrineMgPerMl: 0.01,
		carpuleVolumeMl: 1.7,
		mgActivePerCarpule: 34.0,
		mgEpiPerCarpule: 0.017,
		maxDoseMgPerKgAdult: 4.4,
		absoluteMaxDoseMgAdult: 300.0,
		maxCarpules70kgAdult: 8,
		containsSulfites: true,
		isAdrenalineFree: false,
		onsetMinutes: 3,
		pulpalDurationMinutes: 60,
		softTissueDurationMinutes: 180,
		clinicalIndicationsRu: "Классическая инфильтрационная и проводниковая анестезия при непереносимости артикаина.",
		contraindicationsRu: ["Аллергия на лидокаин", "Атриовентрикулярная блокада II-III степени"],
	},
	lidocaine_plain: {
		id: "lidocaine_plain",
		tradeNamesRu: ["Лидокаин 2% без консервантов", "Ксилокаин"],
		activeSubstanceRu: "Лидокаина гидрохлорид 2% (чистый)",
		activeConcentrationPercent: 2.0,
		mgPerMlActive: 20.0,
		vasoconstrictorNameRu: "Без вазоконстриктора",
		vasoconstrictorRatio: "none",
		epinephrineMgPerMl: 0.0,
		carpuleVolumeMl: 2.0,
		mgActivePerCarpule: 40.0,
		mgEpiPerCarpule: 0.0,
		maxDoseMgPerKgAdult: 4.4,
		absoluteMaxDoseMgAdult: 300.0,
		maxCarpules70kgAdult: 7,
		containsSulfites: false,
		isAdrenalineFree: true,
		onsetMinutes: 3,
		pulpalDurationMinutes: 10,
		softTissueDurationMinutes: 60,
		clinicalIndicationsRu: "Кратковременные манипуляции, снятие швов, ретракция десны.",
		contraindicationsRu: ["Аллергия на лидокаин"],
	},
	bupivacaine_05: {
		id: "bupivacaine_05",
		tradeNamesRu: ["Маркаин 0.5% с адреналином", "Бупивакаин Дентал"],
		activeSubstanceRu: "Бупивакаина гидрохлорид 0.5% + Эпинефрин 1:200 000",
		activeConcentrationPercent: 0.5,
		mgPerMlActive: 5.0,
		vasoconstrictorNameRu: "Эпинефрин 1:200 000",
		vasoconstrictorRatio: "1:200000",
		epinephrineMgPerMl: 0.005,
		carpuleVolumeMl: 1.8,
		mgActivePerCarpule: 9.0,
		mgEpiPerCarpule: 0.009,
		maxDoseMgPerKgAdult: 2.0,
		absoluteMaxDoseMgAdult: 90.0,
		maxCarpules70kgAdult: 10,
		containsSulfites: true,
		isAdrenalineFree: false,
		onsetMinutes: 6,
		pulpalDurationMinutes: 180,
		softTissueDurationMinutes: 480,
		clinicalIndicationsRu: "Длительные челюстно-лицевые операции, множественная имплантация, послеоперационное обезболивание на 6-8 часов.",
		contraindicationsRu: [
			"Детский возраст до 12 лет",
			"Тяжелые нарушения ритма сердца (высокая кардиотоксичность бупивакаина)",
		],
	},
};

export const DENTAL_NEEDLES: Record<NeedleGaugeType, DentalNeedleInfo> = {
	g27_long_35mm: {
		id: "g27_long_35mm",
		gauge: "27G",
		diameterMm: 0.4,
		lengthMm: 35,
		colorCode: "#eab308",
		nameRu: "27G длинная (35 мм)",
		recommendedTechniques: ["mandibular_torus", "tuberal"],
	},
	g30_short_21mm: {
		id: "g30_short_21mm",
		gauge: "30G",
		diameterMm: 0.3,
		lengthMm: 21,
		colorCode: "#3b82f6",
		nameRu: "30G короткая (21 мм)",
		recommendedTechniques: ["infiltration", "mental_incisive", "palatal_greater", "incisive_canal"],
	},
	g30_ultrashort_12mm: {
		id: "g30_ultrashort_12mm",
		gauge: "30G",
		diameterMm: 0.3,
		lengthMm: 12,
		colorCode: "#10b981",
		nameRu: "30G ультракороткая (12 мм)",
		recommendedTechniques: ["intraligamentary_sta", "intraseptal"],
	},
	g30_extrashort_8mm: {
		id: "g30_extrashort_8mm",
		gauge: "30G",
		diameterMm: 0.3,
		lengthMm: 8,
		colorCode: "#ec4899",
		nameRu: "30G экстракороткая (8 мм)",
		recommendedTechniques: ["intraligamentary_sta"],
	},
};

export const INJECTION_TECHNIQUES: Record<InjectionTechniqueId, InjectionTechniqueInfo> = {
	infiltration: {
		id: "infiltration",
		nameRu: "Инфильтрационная (вестибулярная)",
		anatomicalLandmarksRu: "Переходная складка в проекции верхушки корня зуба под углом 45° к надкостнице.",
		defaultNeedle: "g30_short_21mm",
		targetAnesthesiaZonesRu: "Пульпа зуба, надкостница, слизистая оболочка вестибулярной поверхности.",
		aspirationCheckMandatory: true,
		typicalVolumeCarpules: 1.0,
	},
	mandibular_torus: {
		id: "mandibular_torus",
		nameRu: "Проводниковая мандибулярная / Торусальная (по Вейсбрему)",
		anatomicalLandmarksRu: "Нижнечелюстной валик (torus mandibulae) в углублении между крыловидно-нижнечелюстной складкой и щекой на 0.5 см ниже окклюзии верхних моляров.",
		defaultNeedle: "g27_long_35mm",
		targetAnesthesiaZonesRu: "Нижний альвеолярный, язычный и щечный нервы (все зубы половины нижней челюсти, 2/3 языка, слизистая).",
		aspirationCheckMandatory: true,
		typicalVolumeCarpules: 1.7,
	},
	mental_incisive: {
		id: "mental_incisive",
		nameRu: "Ментальная (подбородочная блокада)",
		anatomicalLandmarksRu: "Подбородочное отверстие между корнями 34-35 (44-45) зубов в переходной складке.",
		defaultNeedle: "g30_short_21mm",
		targetAnesthesiaZonesRu: "Премоляры, клыки, резцы нижней челюсти и мягкие ткани подбородка и нижней губы.",
		aspirationCheckMandatory: true,
		typicalVolumeCarpules: 1.0,
	},
	tuberal: {
		id: "tuberal",
		nameRu: "Туберальная (бугор верхней челюсти)",
		anatomicalLandmarksRu: "Бугор верхней челюсти позади скулоальвеолярного гребня на уровне 2-го верхнего моляра.",
		defaultNeedle: "g27_long_35mm",
		targetAnesthesiaZonesRu: "Задние верхние альвеолярные нервы (моляры верхней челюсти и гайморова пазуха).",
		aspirationCheckMandatory: true,
		typicalVolumeCarpules: 1.5,
	},
	palatal_greater: {
		id: "palatal_greater",
		nameRu: "Палатинальная (большое нёбное отверстие)",
		anatomicalLandmarksRu: "Большое нёбное отверстие кнутри от 3-го моляра верхней челюсти на 1 см медиальнее десневого края.",
		defaultNeedle: "g30_short_21mm",
		targetAnesthesiaZonesRu: "Слизистая оболочка твердого нёба и нёбная надкостница от моляров до клыка.",
		aspirationCheckMandatory: true,
		typicalVolumeCarpules: 0.3,
	},
	incisive_canal: {
		id: "incisive_canal",
		nameRu: "Резцовая (резцовый сосочек / назопалатинальная)",
		anatomicalLandmarksRu: "Резцовый сосочек по срединной линии нёба позади центральных резцов.",
		defaultNeedle: "g30_short_21mm",
		targetAnesthesiaZonesRu: "Слизистая нёба в области резцов и клыков верхней челюсти.",
		aspirationCheckMandatory: true,
		typicalVolumeCarpules: 0.2,
	},
	intraligamentary_sta: {
		id: "intraligamentary_sta",
		nameRu: "Интралигаментарная (внутрисвязочная / компьютерная STA)",
		anatomicalLandmarksRu: "Периодонтальная щель под углом 30° к продольной оси корня зуба под давлением.",
		defaultNeedle: "g30_ultrashort_12mm",
		targetAnesthesiaZonesRu: "Изолированная пульпа одного зуба без онемения губ и щек.",
		aspirationCheckMandatory: false,
		typicalVolumeCarpules: 0.4,
	},
	intraseptal: {
		id: "intraseptal",
		nameRu: "Интрасептальная (внутриперегородочная)",
		anatomicalLandmarksRu: "Межзубная костная перегородка на 2 мм ниже вершины десневого сосочка.",
		defaultNeedle: "g30_ultrashort_12mm",
		targetAnesthesiaZonesRu: "Костная ткань, периодонт и прилежащая десна.",
		aspirationCheckMandatory: false,
		typicalVolumeCarpules: 0.5,
	},
	application_topical: {
		id: "application_topical",
		nameRu: "Аппликационная (поверхностная лидокаин/бензокаин гель)",
		anatomicalLandmarksRu: "Высушенная слизистая оболочка в месте предполагаемого вкола иглы.",
		defaultNeedle: "g30_short_21mm",
		targetAnesthesiaZonesRu: "Поверхностные слои слизистой на глубину 2-3 мм.",
		aspirationCheckMandatory: false,
		typicalVolumeCarpules: 0.0,
	},
};

export const STANDARD_ANESTHESIA_PRESETS: Record<string, StandardAnesthesiaPreset> = {
	ultracain_ds_forte: {
		id: "ultracain_ds_forte",
		labelRu: "Ультракаин Д-С Форте 1.7 мл инфильтрационная (1:100 000, 1 карпула, осложнений нет)",
		shortLabelRu: "Ультракаин Д-С Форте 1.7 мл",
		testId: "btn-anesthesia-preset-ultracain-ds-forte",
		drugId: "articaine_1_100k",
		carpulesCount: 1.0,
		techniqueId: "infiltration",
		needleType: "g30_short_21mm",
		descriptionRu: "Стандартная инфильтрационная анестезия (Ультракаин Д-С Форте 1:100 000, 1 карпула 1.7 мл, осложнений нет)",
		isAdrenalineFree: false,
		hasCardioRisk: false,
		defaultWeightKg: 70,
	},
	ultracain_ds: {
		id: "ultracain_ds",
		labelRu: "Ультракаин Д-С 1:200 000 (1 карпула 1.7 мл, инфильтрация, осложнений нет)",
		shortLabelRu: "Ультракаин Д-С 1:200k",
		testId: "btn-anesthesia-preset-ultracain-ds",
		drugId: "articaine_1_200k",
		carpulesCount: 1.0,
		techniqueId: "infiltration",
		needleType: "g30_short_21mm",
		descriptionRu: "Стандартная инфильтрационная анестезия Ультракаин Д-С 1:200 000 (1 карпула 1.7 мл, осложнений нет)",
		isAdrenalineFree: false,
		hasCardioRisk: false,
		defaultWeightKg: 70,
	},
	mepivacaine_plain: {
		id: "mepivacaine_plain",
		labelRu: "Скандонест 3% (Мепивакаин без вазоконстриктора, 1 карпула 1.8 мл, кардио-риск)",
		shortLabelRu: "Скандонест 3% (без адреналина)",
		testId: "btn-anesthesia-preset-mepivacaine-plain",
		drugId: "mepivacaine_plain",
		carpulesCount: 1.0,
		techniqueId: "infiltration",
		needleType: "g30_short_21mm",
		descriptionRu: "Анестезия без вазоконстриктора (Скандонест 3%, 1.8 мл, препарат выбора при ССЗ и гипертонии)",
		isAdrenalineFree: true,
		hasCardioRisk: true,
		defaultWeightKg: 70,
	},
	septanest_100k: {
		id: "septanest_100k",
		labelRu: "Септанест с адреналином 1:100 000 (1 карпула 1.7 мл, осложнений нет)",
		shortLabelRu: "Септанест 1:100k",
		testId: "btn-anesthesia-preset-septanest-100k",
		drugId: "septanest_1_100k",
		carpulesCount: 1.0,
		techniqueId: "infiltration",
		needleType: "g30_short_21mm",
		descriptionRu: "Инфильтрационная анестезия Септанест с адреналином 1:100 000 (1 карпула 1.7 мл, осложнений нет)",
		isAdrenalineFree: false,
		hasCardioRisk: false,
		defaultWeightKg: 70,
	},
	ubistesin_forte: {
		id: "ubistesin_forte",
		labelRu: "Убистезин форте 1:100 000 — 1 карпула 1.7 мл (инфильтрация, осложнений нет)",
		shortLabelRu: "Убистезин форте 1:100k",
		testId: "btn-anesthesia-preset-ubistesin-forte",
		drugId: "articaine_1_100k",
		carpulesCount: 1.0,
		techniqueId: "infiltration",
		needleType: "g30_short_21mm",
		descriptionRu: "Инфильтрационная анестезия Sol. Ubistesini forte 4% — 1.7 ml (1:100 000), осложнений нет",
		isAdrenalineFree: false,
		hasCardioRisk: false,
		defaultWeightKg: 70,
	},
	articaine_mandibular: {
		id: "articaine_mandibular",
		labelRu: "Артикаин 4% 1:100 000 (1 карпула 1.7 мл, мандибулярная проводниковая, анестезия наступила через 3 мин)",
		shortLabelRu: "Артикаин 1:100k (мандибулярная)",
		testId: "btn-anesthesia-preset-articaine-mandibular",
		drugId: "articaine_1_100k",
		carpulesCount: 1.0,
		techniqueId: "mandibular_torus",
		needleType: "g27_long_35mm",
		descriptionRu: "Мандибулярная проводниковая анестезия по Вейсбрему (1 карпула 1.7 мл, анестезия наступила через 3 мин)",
		isAdrenalineFree: false,
		hasCardioRisk: false,
		defaultWeightKg: 70,
	},
};

export const PRIMARY_ANESTHETIC_DRUGS: readonly PrimaryAnestheticDrug[] = [
	{ id: "articaine_1_200k", labelRu: "Артикаин 1:200 000", subLabelRu: "Артикаин 1:200 000 (1.7 мл) — терапия/стандарт", activeSubstanceRu: "Артикаин 4% + Эпинефрин 1:200 000", vasoRatio: "1:200 000", isAdrenalineFree: false, isCardioRecommended: false },
	{ id: "articaine_1_100k", labelRu: "Артикаин 1:100 000", subLabelRu: "Артикаин 1:100 000 (1.7 мл) — хирургия/гемостаз", activeSubstanceRu: "Артикаин 4% + Эпинефрин 1:100 000", vasoRatio: "1:100 000", isAdrenalineFree: false, isCardioRecommended: false },
	{ id: "mepivacaine_plain", labelRu: "Мепивакаин 3% (без адреналина)", subLabelRu: "Мепивакаин 3% без адреналина (1.7 мл) — кардио/беременность", activeSubstanceRu: "Мепивакаин 3% (чистый)", vasoRatio: "Без адреналина", isAdrenalineFree: true, isCardioRecommended: true },
	{ id: "lidocaine_plain", labelRu: "Лидокаин-спрей 10%", subLabelRu: "Лидокаин-спрей 10% (аппликационная)", activeSubstanceRu: "Лидокаин 10% спрей", vasoRatio: "Без адреналина", isAdrenalineFree: true, isCardioRecommended: false },
	{ id: "septanest_1_100k", labelRu: "Септанест 1:100 000", subLabelRu: "Септанест 1:100 000 (1.7 мл)", activeSubstanceRu: "Артикаин 4% + Эпинефрин 1:100 000", vasoRatio: "1:100 000", isAdrenalineFree: false, isCardioRecommended: false },
];

export const CLINICAL_FAST_PRESETS: readonly ClinicalFastPresetItem[] = [
	{
		drugId: "articaine_1_200k",
		count: 1.0,
		volumeMl: 1.7,
		shortLabelRu: "Артикаин 1:200 000",
		fullLabelRu: "Артикаин 1:200 000 (1.7 мл) — терапия/стандарт",
		clinicalScopeRu: "Терапия / стандарт (1.7 мл)",
		testId: "anesthesia-preset-infiltration-articaine-200k",
		altTestId: "btn-anesthesia-preset-ultracain-ds",
		srOnlyText: "Артикаин 1:200 000 Ультракаин Д-С 1:200к терапия",
		defaultTechnique: "infiltration",
		needleType: "g30_short_21mm",
	},
	{
		drugId: "articaine_1_100k",
		count: 1.0,
		volumeMl: 1.7,
		shortLabelRu: "Артикаин 1:100 000",
		fullLabelRu: "Артикаин 1:100 000 (1.7 мл) — хирургия/гемостаз",
		clinicalScopeRu: "Хирургия / гемостаз (1.7 мл)",
		testId: "anesthesia-dose-norm-preset",
		altTestId: "btn-anesthesia-preset-septanest",
		srOnlyText: "Норма: Артикаин 1:100 000 Септанест 1:100k Убистезин форте инфильтрация игла 30G короткая 21мм",
		defaultTechnique: "infiltration",
		needleType: "g30_short_21mm",
	},
	{
		drugId: "mepivacaine_plain",
		count: 1.0,
		volumeMl: 1.7,
		shortLabelRu: "Мепивакаин 3% (без адреналина)",
		fullLabelRu: "Мепивакаин 3% без адреналина (1.7 мл) — кардио/беременность",
		clinicalScopeRu: "Кардио / беременность / группа риска (1.7 мл)",
		testId: "anesthesia-preset-scandonest-cardio",
		altTestId: "btn-anesthesia-preset-mepivacaine-plain",
		srOnlyText: "Мепивакаин 3% (без адреналина) Скандонест без адреналина кардио-защита группа риска",
		defaultTechnique: "infiltration",
		needleType: "g30_short_21mm",
		isCardioRecommended: true,
	},
	{
		drugId: "lidocaine_plain",
		count: 0.5,
		volumeMl: 0.5,
		shortLabelRu: "Лидокаин-спрей 10%",
		fullLabelRu: "Лидокаин-спрей 10% (аппликационная)",
		clinicalScopeRu: "Аппликационная анестезия места вкола",
		testId: "anesthesia-preset-lidocaine-spray",
		altTestId: "btn-anesthesia-preset-lidocaine-spray",
		srOnlyText: "Лидокаин-спрей 10% аппликационная анестезия",
		defaultTechnique: "application_topical",
	},
	{
		drugId: "none",
		count: 0,
		volumeMl: 0,
		shortLabelRu: "Без анестезии",
		fullLabelRu: "Лечение без анестезии / Интактно по согласию пациента",
		clinicalScopeRu: "Лечение без анестезии",
		testId: "btn-anes-none",
		srOnlyText: "Лечение без анестезии / Интактно",
	},
];
