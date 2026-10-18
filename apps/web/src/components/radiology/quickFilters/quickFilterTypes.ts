export interface RadiologyQuickFilterState {
	readonly sharpness: boolean;
	readonly maxSharpness: boolean;
	readonly invert: boolean;
	readonly pseudoRelief: boolean;
}

export const DEFAULT_QUICK_FILTERS_STATE: RadiologyQuickFilterState = {
	sharpness: false,
	maxSharpness: false,
	invert: false,
	pseudoRelief: false,
};

export interface RadiologyQuickFiltersPanelProps {
	readonly filterState: RadiologyQuickFilterState;
	readonly onFilterChange: (nextState: Partial<RadiologyQuickFilterState>) => void;
	readonly onReset: () => void;
	readonly orientation?: "horizontal" | "vertical";
	readonly brightnessPct?: number;
	readonly contrastPct?: number;
	readonly onAdjustBrightness?: (step: number) => void;
	readonly onAdjustContrast?: (step: number) => void;
	readonly disabled?: boolean;
	readonly className?: string;
}
