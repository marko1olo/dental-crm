export type AutoclavePackagingType =
	| 'kraft_paper_sealed'
	| 'kraft_paper_crepe'
	| 'crepe_paper_double'
	| 'sterilization_cassette_bipack'
	| 'bix_filter'
	| 'unwrapped_tray';

export interface PackagingShelfLifeRule {
	packagingType: AutoclavePackagingType;
	nameRu: string;
	shelfLifeDays: number;
	sealMethodRu: string;
	sanpinClauseRu: string;
	descriptionRu: string;
}

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

export function getPackagingRule(packagingType: AutoclavePackagingType): PackagingShelfLifeRule {
	return SANPIN_PACKAGING_RULES[packagingType] || SANPIN_PACKAGING_RULES.kraft_paper_sealed;
}
