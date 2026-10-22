import type { AutoclavePackagingType } from "./autoclavePackagingRules.js";
import { AUTOCLAVE_SPECIAL_CYCLES } from "./autoclaveSpecialCycles.js";

export type AutoclaveCycleId =
	| 'cycle_134_wrapped'
	| 'cycle_134_prion'
	| 'cycle_121_delicate'
	| 'cycle_bowie_dick'
	| 'cycle_helix_test';

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
	vacuumPulsesCount: number;
	dryingTimeMinutes: number;
	applicableLoadTypesRu: string[];
	recommendedPackaging: AutoclavePackagingType[];
	mandatoryIndicators: IndicatorQualityClass[];
	sanpinNormRefRu: string;
}

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
	cycle_bowie_dick: AUTOCLAVE_SPECIAL_CYCLES.cycle_bowie_dick!,
	cycle_helix_test: AUTOCLAVE_SPECIAL_CYCLES.cycle_helix_test!,
};

export function getAutoclavePreset(cycleId: AutoclaveCycleId): AutoclaveCycleDefinition {
	return AUTOCLAVE_CYCLES[cycleId] || AUTOCLAVE_CYCLES.cycle_134_wrapped;
}
