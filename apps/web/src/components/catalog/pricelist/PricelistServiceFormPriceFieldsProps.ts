export interface PricelistServiceFormPriceFieldsProps {
	readonly priceRub: string;
	readonly materialCostRub: string;
	readonly labCostRub: string;
	readonly durationMin: number;
	readonly onPriceChange: (val: string) => void;
	readonly onMaterialCostChange: (val: string) => void;
	readonly onLabCostChange: (val: string) => void;
	readonly onDurationChange: (val: number) => void;
}

export const DURATION_OPTIONS = [
	{ value: 15, label: "15 мин" },
	{ value: 30, label: "30 мин" },
	{ value: 45, label: "45 мин" },
	{ value: 60, label: "60 мин (1 ч)" },
	{ value: 90, label: "90 мин (1.5 ч)" },
	{ value: 120, label: "120 мин (2 ч)" },
];
