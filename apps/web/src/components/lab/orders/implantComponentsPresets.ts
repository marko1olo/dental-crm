export {
	type LabImplantComponentsManifest,
	formatImplantComponentsSummary,
} from './implantComponentsManifest';

export type ImplantPlatformType = 'conical' | 'hex';

export interface ImplantPlatformOption {
	id: ImplantPlatformType;
	nameRu: string;
	descriptionRu: string;
}

export const IMPLANT_PLATFORMS: ImplantPlatformOption[] = [
	{
		id: 'conical',
		nameRu: 'Conical (Коническое соединение / Morse Taper)',
		descriptionRu: 'Конус Морзе с антиротационным элементом (Straumann BLX, Nobel Conical, Astra EV, Osstem TS, Dentium)'
	},
	{
		id: 'hex',
		nameRu: 'Hex (Шестигранное соединение / Internal/External Hex)',
		descriptionRu: 'Внутренний или внешний шестигранник (Zimmer, BioHorizons, MIS, Alpha-Bio)'
	}
];

export type AbutmentCategoryType =
	| 'tibase_bonded'
	| 'multiunit_straight'
	| 'multiunit_17'
	| 'multiunit_30'
	| 'custom_titanium'
	| 'custom_zirconia'
	| 'standard_titanium';

export interface AbutmentTypeOption {
	id: AbutmentCategoryType;
	nameRu: string;
	angle: number;
	descriptionRu: string;
	isMultiUnit?: boolean;
	isTiBase?: boolean;
}

export const ABUTMENT_TYPE_OPTIONS: AbutmentTypeOption[] = [
	{
		id: 'tibase_bonded',
		nameRu: 'Ti-Base вклеиваемое основание',
		angle: 0,
		isTiBase: true,
		descriptionRu: 'Титановое основание (Ti-Base) под вклейку циркониевой коронки (3M RelyX Ultimate / Multilink Hybrid Abutment).'
	},
	{
		id: 'multiunit_straight',
		nameRu: 'Multi-Unit прямой (0°)',
		angle: 0,
		isMultiUnit: true,
		descriptionRu: 'Винтовой абатмент Multi-Unit для мостовидных и балочных конструкций при параллельных осях.'
	},
	{
		id: 'multiunit_17',
		nameRu: 'Multi-Unit угловой 17°',
		angle: 17,
		isMultiUnit: true,
		descriptionRu: 'Угловой абатмент Multi-Unit 17° для компенсации наклона имплантатов в протоколах All-on-4 / All-on-6.'
	},
	{
		id: 'multiunit_30',
		nameRu: 'Multi-Unit угловой 30°',
		angle: 30,
		isMultiUnit: true,
		descriptionRu: 'Угловой абатмент Multi-Unit 30° для дистальных наклонных имплантатов в протоколах All-on-4 / All-on-6.'
	},
	{
		id: 'custom_titanium',
		nameRu: 'Индивидуальный титановый абатмент Grade 5',
		angle: 0,
		descriptionRu: 'Фрезерованный индивидуальный абатмент из титана Grade 5 с анатомическим десневым уступом.'
	},
	{
		id: 'custom_zirconia',
		nameRu: 'Индивидуальный циркониевый абатмент ZrO₂',
		angle: 0,
		descriptionRu: 'Безметалловый абатмент из оксида циркония на титановом интерфейсе для фронтальной эстетики.'
	},
	{
		id: 'standard_titanium',
		nameRu: 'Стандартный прямой титановый абатмент',
		angle: 0,
		descriptionRu: 'Фабричный стандартный абатмент для цементной фиксации одиночных коронок.'
	}
];

export type FixationType = 'screw_retained' | 'cement_retained';

export interface FixationTypeOption {
	id: FixationType;
	nameRu: string;
	descriptionRu: string;
}

export const FIXATION_TYPES: FixationTypeOption[] = [
	{
		id: 'screw_retained',
		nameRu: 'Винтовая фиксация',
		descriptionRu: 'Трансокклюзионная шахта винта, прямое прикручивание к имплантату или Multi-Unit. Безопасность для маргинальной кости.'
	},
	{
		id: 'cement_retained',
		nameRu: 'Цементная фиксация',
		descriptionRu: 'Фиксация коронки на постоянный/временный цемент на индивидуальный абатмент с зазором 30–50 мкм.'
	}
];
