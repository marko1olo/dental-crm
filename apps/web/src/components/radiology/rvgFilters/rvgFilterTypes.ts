export interface RvgFilterValues {
	brightness: number; // 0..200 (100 = 1.0)
	contrast: number; // 0..300 (100 = 1.0)
	gamma: number; // 0.5..2.5 (1.0 = 1.0)
	sharpness: number; // 0..100
	clahe: number; // 0..100
	invert: boolean;
	denoise: boolean;
	emboss?: boolean;
}

export interface RvgFilterPreset {
	id: string;
	label: string;
	description: string;
	iconName: string;
	values: RvgFilterValues;
}

export const RVG_FILTER_PRESETS: readonly RvgFilterPreset[] = [
	{
		id: "standard",
		label: "Стандарт",
		description: "Естественная гамма и сбалансированная яркость снимка",
		iconName: "Sun",
		values: { brightness: 100, contrast: 100, gamma: 1.0, sharpness: 0, clahe: 0, invert: false, denoise: false },
	},
	{
		id: "endo",
		label: "Эндодонтия",
		description: "Высокая детализация апексов, устьев каналов и качества обтурации",
		iconName: "Zap",
		values: { brightness: 105, contrast: 175, gamma: 0.9, sharpness: 60, clahe: 70, invert: false, denoise: false },
	},
	{
		id: "perio",
		label: "Пародонт / Кость",
		description: "Оптимизация кортикальной пластинки, периодонтальной щели и трабекул",
		iconName: "Layers",
		values: { brightness: 110, contrast: 160, gamma: 1.1, sharpness: 40, clahe: 85, invert: false, denoise: false },
	},
	{
		id: "caries",
		label: "Кариес / Эмаль",
		description: "Контрастирование эмалево-дентинной границы для скрытого кариеса",
		iconName: "Sparkles",
		values: { brightness: 95, contrast: 190, gamma: 0.85, sharpness: 50, clahe: 60, invert: false, denoise: false },
	},
	{
		id: "implant",
		label: "Импланты / Металл",
		description: "Подавление засветов от металлических коронок и контроль витков имплантата",
		iconName: "Activity",
		values: { brightness: 85, contrast: 220, gamma: 1.2, sharpness: 30, clahe: 40, invert: false, denoise: true },
	},
	{
		id: "negative",
		label: "Негатив / Трещины",
		description: "Инвертированный рентген для выявления микротрещин и вертикальных фрактур",
		iconName: "Contrast",
		values: { brightness: 100, contrast: 120, gamma: 1.0, sharpness: 45, clahe: 50, invert: true, denoise: false, emboss: false },
	},
	{
		id: "emboss",
		label: "Рельеф / 3D",
		description: "45° Emboss тиснение для выявления микротрещин корня и скрытых сколов эмали",
		iconName: "Layers",
		values: { brightness: 100, contrast: 120, gamma: 1.0, sharpness: 30, clahe: 40, invert: false, denoise: false, emboss: true },
	},
];

export const DEFAULT_RVG_FILTERS: RvgFilterValues = {
	brightness: 100,
	contrast: 100,
	gamma: 1.0,
	sharpness: 0,
	clahe: 0,
	invert: false,
	denoise: false,
	emboss: false,
};

export interface RvgFiltersToolbarProps {
	filters: RvgFilterValues;
	onChange: (updated: RvgFilterValues) => void;
	onReset?: () => void;
	activePresetId?: string;
	onSelectPreset?: (preset: RvgFilterPreset) => void;
	isSplitCompare?: boolean;
	onToggleSplitCompare?: (enabled: boolean) => void;
	disabled?: boolean;
	layout?: "toolbar" | "dock";
	onToggleMeasure?: () => void;
	isMeasuring?: boolean;
	onRotate?: () => void;
}
