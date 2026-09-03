/**
 * SanPiN 3.3686-21 & GOST ISO 17665 Class B Autoclave & Sterilization Presets
 * Standards for Dental Sterilization, Indicators, and Cycle Parameters
 */

export type AutoclaveCycleId =
	| 'cycle_134_wrapped'
	| 'cycle_134_prion'
	| 'cycle_121_delicate'
	| 'cycle_bowie_dick'
	| 'cycle_helix_test';

export type AutoclaveDeviceClass = 'class_b' | 'class_s' | 'class_n';

export type AutoclavePackagingType =
	| 'kraft_paper_sealed'
	| 'kraft_paper_crepe'
	| 'crepe_paper_double'
	| 'sterilization_cassette_bipack'
	| 'bix_filter'
	| 'unwrapped_tray';

export type IndicatorQualityClass =
	| 'physical_sensors'
	| 'chemical_class4'
	| 'chemical_class5_integrating'
	| 'chemical_class6_emulating'
	| 'biological_spores'
	| 'bowie_dick_pack'
	| 'helix_pcd';

export interface AutoclaveCycleDefinition {
	id: AutoclaveCycleId;
	nameRu: string;
	shortLabelRu: string;
	descriptionRu: string;
	targetTemperatureCelsius: number;
	temperatureToleranceCelsius: { min: number; max: number };
	targetPressureBar: number;
	pressureToleranceBar: { min: number; max: number };
	plateauTimeMinutes: number;
	totalEstimatedCycleMinutes: number;
	vacuumPulsesCount: number; // Class B fractionated vacuum stages (3-5)
	dryingTimeMinutes: number;
	applicableLoadTypesRu: string[];
	recommendedPackaging: AutoclavePackagingType[];
	mandatoryIndicators: IndicatorQualityClass[];
	sanpinNormRefRu: string;
}

export interface AutoclaveApparatusInfo {
	id: string;
	brand: string;
	model: string;
	serialNumber: string;
	chamberVolumeLiters: number;
	deviceClass: AutoclaveDeviceClass;
	isCalibrated: boolean;
	lastMaintenanceDate: string;
	nextMaintenanceDate: string;
	firmwareVersion: string;
	supportedCycles: AutoclaveCycleId[];
}

export interface PackagingShelfLifeRule {
	packagingType: AutoclavePackagingType;
	nameRu: string;
	shelfLifeDays: number;
	sealMethodRu: string;
	sanpinClauseRu: string;
	descriptionRu: string;
}

// ---------------------------------------------------------------------------
// Standard Packaging Expiration Rules (СанПиН 3.3686-21)
// ---------------------------------------------------------------------------

export const SANPIN_PACKAGING_RULES: Record<AutoclavePackagingType, PackagingShelfLifeRule> = {
	kraft_paper_sealed: {
		packagingType: 'kraft_paper_sealed',
		nameRu: 'Пакет бумажный/комбинированный термосварной',
		shelfLifeDays: 60,
		sealMethodRu: 'Термосварочный импульсный шов (ширина >= 8 мм)',
		sanpinClauseRu: 'СанПиН 3.3686-21 п. 3632 (Таблица 3.14)',
		descriptionRu: 'Комбинированные пакеты (бумага + многослойная пленка), запаянные термосваривающим аппаратом при 180-200°C. Базово 60 суток (до 180 суток в закрытых чистых боксах).'
	},
	kraft_paper_crepe: {
		packagingType: 'kraft_paper_crepe',
		nameRu: 'Крафт-пакет бумажный самозаклеивающийся',
		shelfLifeDays: 30,
		sealMethodRu: 'Клеевой клапан с защитной лентой',
		sanpinClauseRu: 'СанПиН 3.3686-21 п. 3632',
		descriptionRu: 'Бумажные крафт-пакеты с липким слоем — до 30 суток в закрытых сухих шкафах.'
	},
	crepe_paper_double: {
		packagingType: 'crepe_paper_double',
		nameRu: 'Крепированная бумага (двойная обертка)',
		shelfLifeDays: 60,
		sealMethodRu: 'Метод конверта с фиксацией индикаторной лентой',
		sanpinClauseRu: 'СанПиН 3.3686-21 п. 3633',
		descriptionRu: 'Стерилизационная крепированная бумага в 2 слоя — до 60 суток.'
	},
	sterilization_cassette_bipack: {
		packagingType: 'sterilization_cassette_bipack',
		nameRu: 'Двойная упаковка (кассета + пакет) / Бипак',
		shelfLifeDays: 60,
		sealMethodRu: 'Двойная термосварная оболочка или кассета в пакете',
		sanpinClauseRu: 'СанПиН 3.3686-21 п. 3634',
		descriptionRu: 'Хирургические и имплантологические наборы в жестких кассетах с двойной барьерной упаковкой.'
	},
	bix_filter: {
		packagingType: 'bix_filter',
		nameRu: 'Стерилизационная коробка (Бикс с антибактериальным фильтром)',
		shelfLifeDays: 20,
		sealMethodRu: 'Замковый механизм бикса + сменные фильтры',
		sanpinClauseRu: 'СанПиН 3.3686-21 п. 3635',
		descriptionRu: 'Многоразовые металлические коробки (биксы) с фильтрами — 20 суток без вскрытия (после вскрытия — 24 ч).'
	},
	unwrapped_tray: {
		packagingType: 'unwrapped_tray',
		nameRu: 'Открытый лоток без упаковки (экстренно)',
		shelfLifeDays: 0,
		sealMethodRu: 'Без упаковки',
		sanpinClauseRu: 'СанПиН 3.3686-21 п. 3630',
		descriptionRu: 'Стерилизация на открытых лотках. Инструменты используются непосредственно на приеме (в течение 1 часа).'
	}
};

// ---------------------------------------------------------------------------
// Standard Class B Autoclave Sterilization Cycles (ГОСТ ISO 17665, EN 13060)
// ---------------------------------------------------------------------------

export const AUTOCLAVE_CYCLES: Record<AutoclaveCycleId, AutoclaveCycleDefinition> = {
	cycle_134_wrapped: {
		id: 'cycle_134_wrapped',
		nameRu: 'Универсальный упакованный 134°C (Class B)',
		shortLabelRu: '134°C Упакованный (5 мин)',
		descriptionRu: 'Основной рабочий цикл для цельнометаллических и пористых инструментов в крафт-пакетах, турбинных и микромоторных наконечников.',
		targetTemperatureCelsius: 134.0,
		temperatureToleranceCelsius: { min: 134.0, max: 137.0 },
		targetPressureBar: 2.15,
		pressureToleranceBar: { min: 2.05, max: 2.30 },
		plateauTimeMinutes: 5.0,
		totalEstimatedCycleMinutes: 45,
		vacuumPulsesCount: 3,
		dryingTimeMinutes: 15,
		applicableLoadTypesRu: [
			'Стоматологические наконечники (турбинные, угловые, прямые)',
			'Хирургический инструментарий (элеваторы, щипцы, кюреты)',
			'Терапевтические наборы в крафт-пакетах',
			'Ортодонтические щипцы и позиционеры'
		],
		recommendedPackaging: ['kraft_paper_sealed', 'kraft_paper_crepe', 'sterilization_cassette_bipack'],
		mandatoryIndicators: ['physical_sensors', 'chemical_class5_integrating'],
		sanpinNormRefRu: 'СанПиН 3.3686-21 табл. 3.12, ГОСТ Р ИСО 17665-1'
	},

	cycle_134_prion: {
		id: 'cycle_134_prion',
		nameRu: 'Антиприонный усиленный 134°C (18 мин)',
		shortLabelRu: '134°C Прионный (18 мин)',
		descriptionRu: 'Усиленный режим стерилизации для деактивации прионных белков и споровых форм микроорганизмов повышенной резистентности.',
		targetTemperatureCelsius: 134.0,
		temperatureToleranceCelsius: { min: 134.0, max: 138.0 },
		targetPressureBar: 2.15,
		pressureToleranceBar: { min: 2.05, max: 2.35 },
		plateauTimeMinutes: 18.0,
		totalEstimatedCycleMinutes: 62,
		vacuumPulsesCount: 4,
		dryingTimeMinutes: 18,
		applicableLoadTypesRu: [
			'Инструменты после операций у пациентов группы риска',
			'Костно-пластический и имплантологический инструментарий',
			'Эндодонтические инструменты многократного применения (NiTi)'
		],
		recommendedPackaging: ['kraft_paper_sealed', 'sterilization_cassette_bipack'],
		mandatoryIndicators: ['physical_sensors', 'chemical_class6_emulating', 'biological_spores'],
		sanpinNormRefRu: 'СанПиН 3.3686-21 п. 3628, Рекомендации ВОЗ по прионам'
	},

	cycle_121_delicate: {
		id: 'cycle_121_delicate',
		nameRu: 'Деликатный щадящий 121°C (20 мин)',
		shortLabelRu: '121°C Деликатный (20 мин)',
		descriptionRu: 'Стерилизация термолабильных медицинских изделий: силиконовых оттискных ложек, полимеров, резины, оптических световодов.',
		targetTemperatureCelsius: 121.0,
		temperatureToleranceCelsius: { min: 121.0, max: 124.0 },
		targetPressureBar: 1.15,
		pressureToleranceBar: { min: 1.05, max: 1.25 },
		plateauTimeMinutes: 20.0,
		totalEstimatedCycleMinutes: 55,
		vacuumPulsesCount: 3,
		dryingTimeMinutes: 20,
		applicableLoadTypesRu: [
			'Силиконовые и резиновые изделия (роторасширители, кламмеры)',
			'Пластиковые кассеты и шаблоны',
			'Световоды фотополимеризационных ламп',
			'Эндодонтические обтураторы и линейки'
		],
		recommendedPackaging: ['kraft_paper_sealed', 'kraft_paper_crepe'],
		mandatoryIndicators: ['physical_sensors', 'chemical_class4'],
		sanpinNormRefRu: 'СанПиН 3.3686-21 табл. 3.12'
	},

	cycle_bowie_dick: {
		id: 'cycle_bowie_dick',
		nameRu: 'Вакуум-тест Боуи-Дика (Bowie-Dick Test)',
		shortLabelRu: 'Тест Боуи-Дика (3.5 мин)',
		descriptionRu: 'Ежедневный контрольный тест для проверки эффективности фракционированного вакуума и равномерности проникновения пара в пористый пакет.',
		targetTemperatureCelsius: 134.0,
		temperatureToleranceCelsius: { min: 134.0, max: 137.0 },
		targetPressureBar: 2.15,
		pressureToleranceBar: { min: 2.05, max: 2.30 },
		plateauTimeMinutes: 3.5,
		totalEstimatedCycleMinutes: 30,
		vacuumPulsesCount: 3,
		dryingTimeMinutes: 5,
		applicableLoadTypesRu: [
			'Контрольный тестовый пакет Bowie-Dick (однократная загрузка в пустую камеру)'
		],
		recommendedPackaging: ['unwrapped_tray'],
		mandatoryIndicators: ['bowie_dick_pack'],
		sanpinNormRefRu: 'ГОСТ Р ИСО 11140-4, СанПиН 3.3686-21 п. 3640 (Ежедневно перед началом работы)'
	},

	cycle_helix_test: {
		id: 'cycle_helix_test',
		nameRu: 'Хеликс-тест для полых инструментов (Helix PCD)',
		shortLabelRu: 'Хеликс-тест PCD (3.5 мин)',
		descriptionRu: 'Проверка удаления воздуха из длинных узких каналов (турбинные наконечники, канюли, слюноотсосы) с помощью трубки PCD 1.5 м.',
		targetTemperatureCelsius: 134.0,
		temperatureToleranceCelsius: { min: 134.0, max: 137.0 },
		targetPressureBar: 2.15,
		pressureToleranceBar: { min: 2.05, max: 2.30 },
		plateauTimeMinutes: 3.5,
		totalEstimatedCycleMinutes: 32,
		vacuumPulsesCount: 4,
		dryingTimeMinutes: 8,
		applicableLoadTypesRu: [
			'Устройство контроля процессов Helix PCD с полой трубкой 1500 мм x 2 мм'
		],
		recommendedPackaging: ['unwrapped_tray'],
		mandatoryIndicators: ['helix_pcd'],
		sanpinNormRefRu: 'ГОСТ EN 867-5, СанПиН 3.3686-21 п. 3641'
	}
};

// ---------------------------------------------------------------------------
// Standard Autoclave Hardware Registry Presets
// ---------------------------------------------------------------------------

export const CLINIC_AUTOCLAVES_PRESETS: AutoclaveApparatusInfo[] = [
	{
		id: 'AUTO-MELAG-01',
		brand: 'Melag',
		model: 'Vacuklav 23 B+',
		serialNumber: '2023-V23B-9841',
		chamberVolumeLiters: 22,
		deviceClass: 'class_b',
		isCalibrated: true,
		lastMaintenanceDate: '2026-06-15',
		nextMaintenanceDate: '2026-12-15',
		firmwareVersion: 'v4.18',
		supportedCycles: ['cycle_134_wrapped', 'cycle_134_prion', 'cycle_121_delicate', 'cycle_bowie_dick', 'cycle_helix_test']
	},
	{
		id: 'AUTO-WH-02',
		brand: 'W&H',
		model: 'Lisa 500 EcoDry',
		serialNumber: 'WH-LISA-44129',
		chamberVolumeLiters: 17,
		deviceClass: 'class_b',
		isCalibrated: true,
		lastMaintenanceDate: '2026-07-01',
		nextMaintenanceDate: '2027-01-01',
		firmwareVersion: 'v5.02',
		supportedCycles: ['cycle_134_wrapped', 'cycle_134_prion', 'cycle_121_delicate', 'cycle_bowie_dick', 'cycle_helix_test']
	},
	{
		id: 'AUTO-EURONDA-03',
		brand: 'Euronda',
		model: 'E9 Next',
		serialNumber: 'EU-E9N-88120',
		chamberVolumeLiters: 24,
		deviceClass: 'class_b',
		isCalibrated: true,
		lastMaintenanceDate: '2026-05-10',
		nextMaintenanceDate: '2026-11-10',
		firmwareVersion: 'v3.85',
		supportedCycles: ['cycle_134_wrapped', 'cycle_134_prion', 'cycle_121_delicate', 'cycle_bowie_dick', 'cycle_helix_test']
	}
];

export function getAutoclavePreset(cycleId: AutoclaveCycleId): AutoclaveCycleDefinition {
	return AUTOCLAVE_CYCLES[cycleId] || AUTOCLAVE_CYCLES.cycle_134_wrapped;
}

export function getPackagingRule(packagingType: AutoclavePackagingType): PackagingShelfLifeRule {
	return SANPIN_PACKAGING_RULES[packagingType] || SANPIN_PACKAGING_RULES.kraft_paper_sealed;
}
