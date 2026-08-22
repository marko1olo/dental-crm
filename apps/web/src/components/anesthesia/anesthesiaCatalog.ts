/**
 * Russian Dental Anesthetics & Vasoconstrictor Pharmacopeia (СтАР / Минздрав РФ)
 * Reference catalog of local anesthetics, vasoconstrictors, needles, and injection techniques.
 */

export type AnestheticDrugId =
	| 'articaine_1_100k'
	| 'articaine_1_200k'
	| 'mepivacaine_plain'
	| 'lidocaine_1_100k'
	| 'lidocaine_plain'
	| 'bupivacaine_05';

export type VasoconstrictorRatio = '1:100000' | '1:200000' | 'none';

export type NeedleGaugeType = 'g27_long_35mm' | 'g30_short_21mm' | 'g30_ultrashort_12mm' | 'g30_extrashort_8mm';

export type InjectionTechniqueId =
	| 'infiltration'
	| 'mandibular_torus'
	| 'mental_incisive'
	| 'tuberal'
	| 'palatal_greater'
	| 'incisive_canal'
	| 'intraligamentary_sta'
	| 'intraseptal'
	| 'application_topical';

export interface AnestheticDrugInfo {
	id: AnestheticDrugId;
	tradeNamesRu: string[];
	activeSubstanceRu: string;
	activeConcentrationPercent: number;
	mgPerMlActive: number;
	vasoconstrictorNameRu: string;
	vasoconstrictorRatio: VasoconstrictorRatio;
	epinephrineMgPerMl: number;
	carpuleVolumeMl: number;
	mgActivePerCarpule: number;
	mgEpiPerCarpule: number;
	maxDoseMgPerKgAdult: number;
	absoluteMaxDoseMgAdult: number;
	maxCarpules70kgAdult: number;
	containsSulfites: boolean;
	isAdrenalineFree: boolean;
	onsetMinutes: number;
	pulpalDurationMinutes: number;
	softTissueDurationMinutes: number;
	clinicalIndicationsRu: string;
	contraindicationsRu: string[];
}

export interface DentalNeedleInfo {
	id: NeedleGaugeType;
	gauge: string;
	diameterMm: number;
	lengthMm: number;
	colorCode: string;
	nameRu: string;
	recommendedTechniques: InjectionTechniqueId[];
}

export interface InjectionTechniqueInfo {
	id: InjectionTechniqueId;
	nameRu: string;
	anatomicalLandmarksRu: string;
	defaultNeedle: NeedleGaugeType;
	targetAnesthesiaZonesRu: string;
	aspirationCheckMandatory: boolean;
	typicalVolumeCarpules: number;
}

// ---------------------------------------------------------------------------
// 1. Dental Anesthetics Pharmacopeia
// ---------------------------------------------------------------------------

export const DENTAL_ANESTHETICS: Record<AnestheticDrugId, AnestheticDrugInfo> = {
	articaine_1_100k: {
		id: 'articaine_1_100k',
		tradeNamesRu: ['Ультракаин Д-С форте', 'Септонест 1:100 000', 'Убистезин форте', 'Брилокаин форте'],
		activeSubstanceRu: 'Артикаина гидрохлорид 4% + Эпинефрин 1:100 000',
		activeConcentrationPercent: 4.0,
		mgPerMlActive: 40.0,
		vasoconstrictorNameRu: 'Эпинефрин (Адреналин) 1:100 000',
		vasoconstrictorRatio: '1:100000',
		epinephrineMgPerMl: 0.01,
		carpuleVolumeMl: 1.7,
		mgActivePerCarpule: 68.0, // 40 mg/ml * 1.7 ml
		mgEpiPerCarpule: 0.017,   // 0.01 mg/ml * 1.7 ml
		maxDoseMgPerKgAdult: 7.0,
		absoluteMaxDoseMgAdult: 500.0,
		maxCarpules70kgAdult: 7,
		containsSulfites: true,
		isAdrenalineFree: false,
		onsetMinutes: 2,
		pulpalDurationMinutes: 75,
		softTissueDurationMinutes: 240,
		clinicalIndicationsRu: 'Высокотравматичные вмешательства, экстирпация пульпы, сложное удаление зубов, синус-лифтинг, костная пластика.',
		contraindicationsRu: [
			'Аллергия на артикаин и амидные анестетики',
			'Бронхиальная астма с гиперчувствительностью к сульфитам',
			'Неконтролируемая артериальная гипертензия (АД > 180/110)',
			'Закрытоугольная глаукома, феохромоцитома, декомпенсированный тиреотоксикоз'
		]
	},

	articaine_1_200k: {
		id: 'articaine_1_200k',
		tradeNamesRu: ['Ультракаин Д-С', 'Убистезин', 'Септонест 1:200 000', 'Артифрин'],
		activeSubstanceRu: 'Артикаина гидрохлорид 4% + Эпинефрин 1:200 000',
		activeConcentrationPercent: 4.0,
		mgPerMlActive: 40.0,
		vasoconstrictorNameRu: 'Эпинефрин (Адреналин) 1:200 000',
		vasoconstrictorRatio: '1:200000',
		epinephrineMgPerMl: 0.005,
		carpuleVolumeMl: 1.7,
		mgActivePerCarpule: 68.0,
		mgEpiPerCarpule: 0.0085, // 0.005 mg/ml * 1.7 ml
		maxDoseMgPerKgAdult: 7.0,
		absoluteMaxDoseMgAdult: 500.0,
		maxCarpules70kgAdult: 7,
		containsSulfites: true,
		isAdrenalineFree: false,
		onsetMinutes: 2,
		pulpalDurationMinutes: 45,
		softTissueDurationMinutes: 180,
		clinicalIndicationsRu: 'Стандартная терапия кариеса, препарирование под коронки, эндодонтия, стандартные удаления.',
		contraindicationsRu: [
			'Аллергия на сульфиты и артикаин',
			'Тяжелая сердечно-сосудистая недостаточность'
		]
	},

	mepivacaine_plain: {
		id: 'mepivacaine_plain',
		tradeNamesRu: ['Скандонест 3%', 'Мепивастезин 3%', 'Мепивакаин-Бинергия'],
		activeSubstanceRu: 'Мепивакаина гидрохлорид 3% (без вазоконстриктора)',
		activeConcentrationPercent: 3.0,
		mgPerMlActive: 30.0,
		vasoconstrictorNameRu: 'Без вазоконстриктора (Адреналин-free)',
		vasoconstrictorRatio: 'none',
		epinephrineMgPerMl: 0.0,
		carpuleVolumeMl: 1.7,
		mgActivePerCarpule: 51.0, // 30 mg/ml * 1.7 ml
		mgEpiPerCarpule: 0.0,
		maxDoseMgPerKgAdult: 4.4,
		absoluteMaxDoseMgAdult: 300.0,
		maxCarpules70kgAdult: 5,
		containsSulfites: false,
		isAdrenalineFree: true,
		onsetMinutes: 1.5,
		pulpalDurationMinutes: 25,
		softTissueDurationMinutes: 120,
		clinicalIndicationsRu: 'Препарат первого выбора для пациентов группы кардиоваскулярного риска (ASA III/IV, гипертония, ИБС), астматиков, беременных, пациентов с тиреотоксикозом.',
		contraindicationsRu: [
			'Аллергия на мепивакаин / амиды',
			'Тяжелая печеночная недостаточность'
		]
	},

	lidocaine_1_100k: {
		id: 'lidocaine_1_100k',
		tradeNamesRu: ['Ксилонор', 'Лидокаин с адреналином 1:100 000', 'Octocaine 1:100k'],
		activeSubstanceRu: 'Лидокаина гидрохлорид 2% + Эпинефрин 1:100 000',
		activeConcentrationPercent: 2.0,
		mgPerMlActive: 20.0,
		vasoconstrictorNameRu: 'Эпинефрин 1:100 000',
		vasoconstrictorRatio: '1:100000',
		epinephrineMgPerMl: 0.01,
		carpuleVolumeMl: 1.7,
		mgActivePerCarpule: 34.0, // 20 mg/ml * 1.7 ml
		mgEpiPerCarpule: 0.017,
		maxDoseMgPerKgAdult: 4.4,
		absoluteMaxDoseMgAdult: 300.0,
		maxCarpules70kgAdult: 8,
		containsSulfites: true,
		isAdrenalineFree: false,
		onsetMinutes: 3,
		pulpalDurationMinutes: 60,
		softTissueDurationMinutes: 180,
		clinicalIndicationsRu: 'Классическая инфильтрационная и проводниковая анестезия при непереносимости артикаина.',
		contraindicationsRu: [
			'Аллергия на лидокаин',
			'Атриовентрикулярная блокада II-III степени'
		]
	},

	lidocaine_plain: {
		id: 'lidocaine_plain',
		tradeNamesRu: ['Лидокаин 2% без консервантов', 'Ксилокаин'],
		activeSubstanceRu: 'Лидокаина гидрохлорид 2% (чистый)',
		activeConcentrationPercent: 2.0,
		mgPerMlActive: 20.0,
		vasoconstrictorNameRu: 'Без вазоконстриктора',
		vasoconstrictorRatio: 'none',
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
		clinicalIndicationsRu: 'Кратковременные манипуляции, снятие швов, ретракция десны.',
		contraindicationsRu: ['Аллергия на лидокаин']
	},

	bupivacaine_05: {
		id: 'bupivacaine_05',
		tradeNamesRu: ['Маркаин 0.5% с адреналином', 'Бупивакаин Дентал'],
		activeSubstanceRu: 'Бупивакаина гидрохлорид 0.5% + Эпинефрин 1:200 000',
		activeConcentrationPercent: 0.5,
		mgPerMlActive: 5.0,
		vasoconstrictorNameRu: 'Эпинефрин 1:200 000',
		vasoconstrictorRatio: '1:200000',
		epinephrineMgPerMl: 0.005,
		carpuleVolumeMl: 1.8,
		mgActivePerCarpule: 9.0, // 5 mg/ml * 1.8 ml
		mgEpiPerCarpule: 0.009,
		maxDoseMgPerKgAdult: 2.0,
		absoluteMaxDoseMgAdult: 90.0,
		maxCarpules70kgAdult: 10,
		containsSulfites: true,
		isAdrenalineFree: false,
		onsetMinutes: 6,
		pulpalDurationMinutes: 180,
		softTissueDurationMinutes: 480, // Extended 4-8 hours post-op pain management
		clinicalIndicationsRu: 'Длительные челюстно-лицевые операции, множественная имплантация, послеоперационное обезболивание на 6-8 часов.',
		contraindicationsRu: [
			'Детский возраст до 12 лет',
			'Тяжелые нарушения ритма сердца (высокая кардиотоксичность бупивакаина)'
		]
	}
};

// ---------------------------------------------------------------------------
// 2. Dental Needles Catalog
// ---------------------------------------------------------------------------

export const DENTAL_NEEDLES: Record<NeedleGaugeType, DentalNeedleInfo> = {
	g27_long_35mm: {
		id: 'g27_long_35mm',
		gauge: '27G',
		diameterMm: 0.4,
		lengthMm: 35,
		colorCode: '#eab308', // Yellow
		nameRu: 'Игла 27G длинная (0.4 x 35 мм)',
		recommendedTechniques: ['mandibular_torus', 'tuberal']
	},
	g30_short_21mm: {
		id: 'g30_short_21mm',
		gauge: '30G',
		diameterMm: 0.3,
		lengthMm: 21,
		colorCode: '#3b82f6', // Blue
		nameRu: 'Игла 30G короткая (0.3 x 21 мм)',
		recommendedTechniques: ['infiltration', 'mental_incisive', 'palatal_greater', 'incisive_canal']
	},
	g30_ultrashort_12mm: {
		id: 'g30_ultrashort_12mm',
		gauge: '30G',
		diameterMm: 0.3,
		lengthMm: 12,
		colorCode: '#10b981', // Green
		nameRu: 'Игла 30G ультракороткая (0.3 x 12 мм)',
		recommendedTechniques: ['intraligamentary_sta', 'intraseptal']
	},
	g30_extrashort_8mm: {
		id: 'g30_extrashort_8mm',
		gauge: '30G',
		diameterMm: 0.3,
		lengthMm: 8,
		colorCode: '#a855f7', // Purple
		nameRu: 'Игла 30G экстракороткая (0.3 x 8 мм)',
		recommendedTechniques: ['intraligamentary_sta']
	}
};

// ---------------------------------------------------------------------------
// 3. Injection Techniques Catalog
// ---------------------------------------------------------------------------

export const INJECTION_TECHNIQUES: Record<InjectionTechniqueId, InjectionTechniqueInfo> = {
	infiltration: {
		id: 'infiltration',
		nameRu: 'Инфильтрационная (вестибулярная)',
		anatomicalLandmarksRu: 'Переходная складка в проекции верхушки корня зуба под углом 45° к надкостнице.',
		defaultNeedle: 'g30_short_21mm',
		targetAnesthesiaZonesRu: 'Пульпа зуба, надкостница, слизистая оболочка вестибулярной поверхности.',
		aspirationCheckMandatory: true,
		typicalVolumeCarpules: 1.0
	},
	mandibular_torus: {
		id: 'mandibular_torus',
		nameRu: 'Проводниковая мандибулярная / Торусальная (по Вейсбрему)',
		anatomicalLandmarksRu: 'Нижнечелюстной валик (torus mandibulae) в углублении между крыловидно-нижнечелюстной складкой и щекой на 0.5 см ниже окклюзии верхних моляров.',
		defaultNeedle: 'g27_long_35mm',
		targetAnesthesiaZonesRu: 'Нижний альвеолярный, язычный и щечный нервы (все зубы половины нижней челюсти, 2/3 языка, слизистая).',
		aspirationCheckMandatory: true,
		typicalVolumeCarpules: 1.7
	},
	mental_incisive: {
		id: 'mental_incisive',
		nameRu: 'Ментальная (подбородочная блокада)',
		anatomicalLandmarksRu: 'Подбородочное отверстие между корнями 34-35 (44-45) зубов в переходной складке.',
		defaultNeedle: 'g30_short_21mm',
		targetAnesthesiaZonesRu: 'Премоляры, клыки, резцы нижней челюсти и мягкие ткани подбородка и нижней губы.',
		aspirationCheckMandatory: true,
		typicalVolumeCarpules: 1.0
	},
	tuberal: {
		id: 'tuberal',
		nameRu: 'Туберальная (бугор верхней челюсти)',
		anatomicalLandmarksRu: 'Бугор верхней челюсти позади скулоальвеолярного гребня на уровне 2-го верхнего моляра.',
		defaultNeedle: 'g27_long_35mm',
		targetAnesthesiaZonesRu: 'Задние верхние альвеолярные нервы (моляры верхней челюсти и гайморова пазуха).',
		aspirationCheckMandatory: true,
		typicalVolumeCarpules: 1.5
	},
	palatal_greater: {
		id: 'palatal_greater',
		nameRu: 'Палатинальная (большое нёбное отверстие)',
		anatomicalLandmarksRu: 'Большое нёбное отверстие кнутри от 3-го моляра верхней челюсти на 1 см медиальнее десневого края.',
		defaultNeedle: 'g30_short_21mm',
		targetAnesthesiaZonesRu: 'Слизистая оболочка твердого нёба и нёбная надкостница от моляров до клыка.',
		aspirationCheckMandatory: true,
		typicalVolumeCarpules: 0.3
	},
	incisive_canal: {
		id: 'incisive_canal',
		nameRu: 'Резцовая (резцовый сосочек / назопалатинальная)',
		anatomicalLandmarksRu: 'Резцовый сосочек по срединной линии нёба позади центральных резцов.',
		defaultNeedle: 'g30_short_21mm',
		targetAnesthesiaZonesRu: 'Слизистая нёба в области резцов и клыков верхней челюсти.',
		aspirationCheckMandatory: true,
		typicalVolumeCarpules: 0.2
	},
	intraligamentary_sta: {
		id: 'intraligamentary_sta',
		nameRu: 'Интралигаментарная (внутрисвязочная / компьютерная STA)',
		anatomicalLandmarksRu: 'Периодонтальная щель под углом 30° к продольной оси корня зуба под давлением.',
		defaultNeedle: 'g30_ultrashort_12mm',
		targetAnesthesiaZonesRu: 'Изолированная пульпа одного зуба без онемения губ и щек.',
		aspirationCheckMandatory: false,
		typicalVolumeCarpules: 0.4
	},
	intraseptal: {
		id: 'intraseptal',
		nameRu: 'Интрасептальная (внутриперегородочная)',
		anatomicalLandmarksRu: 'Межзубная костная перегородка на 2 мм ниже вершины десневого сосочка.',
		defaultNeedle: 'g30_ultrashort_12mm',
		targetAnesthesiaZonesRu: 'Костная ткань, периодонт и прилежащая десна.',
		aspirationCheckMandatory: false,
		typicalVolumeCarpules: 0.5
	},
	application_topical: {
		id: 'application_topical',
		nameRu: 'Аппликационная (поверхностная лидокаин/бензокаин гель)',
		anatomicalLandmarksRu: 'Высушенная слизистая оболочка в месте предполагаемого вкола иглы.',
		defaultNeedle: 'g30_short_21mm',
		targetAnesthesiaZonesRu: 'Поверхностные слои слизистой на глубину 2-3 мм.',
		aspirationCheckMandatory: false,
		typicalVolumeCarpules: 0.0
	}
};
