import type { AnestheticDrugId } from '../anesthesiaCatalog';

export const WEIGHT_QUICK_PRESETS: readonly number[] = [15, 30, 50, 70, 85, 100];
export const WEIGHT_PRESETS: readonly number[] = WEIGHT_QUICK_PRESETS;

export interface PrimaryAnestheticDrug {
	readonly id: AnestheticDrugId;
	readonly labelRu: string;
	readonly subLabelRu: string;
	readonly activeSubstanceRu: string;
	readonly vasoRatio: string;
	readonly isAdrenalineFree: boolean;
	readonly isCardioRecommended: boolean;
}

export const PRIMARY_ANESTHETIC_DRUGS: readonly PrimaryAnestheticDrug[] = [
	{
		id: 'articaine_1_100k',
		labelRu: 'Артикаин 1:100 000 (Ультракаин ДС форте / Септанест)',
		subLabelRu: 'Артикаин 4% • Глубокая анестезия • Дефолт у кресла',
		activeSubstanceRu: 'Артикаин 4% + Эпинефрин 1:100 000',
		vasoRatio: '1:100 000',
		isAdrenalineFree: false,
		isCardioRecommended: false,
	},
	{
		id: 'articaine_1_200k',
		labelRu: 'Артикаин 1:200 000 (Ультракаин ДС)',
		subLabelRu: 'Артикаин 4% • Умеренная вазоконстрикция • Щадящий адреналин',
		activeSubstanceRu: 'Артикаин 4% + Эпинефрин 1:200 000',
		vasoRatio: '1:200 000',
		isAdrenalineFree: false,
		isCardioRecommended: false,
	},
	{
		id: 'mepivacaine_plain',
		labelRu: 'Мепивакаин 3% (Скандонест без адреналина)',
		subLabelRu: 'Мепивакаин 3% • Кардиориск, беременность, гипертония • Без сульфитов',
		activeSubstanceRu: 'Мепивакаин 3% (чистый)',
		vasoRatio: 'Без адреналина',
		isAdrenalineFree: true,
		isCardioRecommended: true,
	},
];
