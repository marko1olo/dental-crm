import React from "react";
import {
	RadiologyQuickFiltersVertical,
	RadiologyQuickFiltersHorizontal,
	type RadiologyQuickFilterState,
	type RadiologyQuickFiltersPanelProps,
} from "./quickFilters/index.js";

export * from "./quickFilters/index.js";

export const RadiologyQuickFiltersPanel: React.FC<RadiologyQuickFiltersPanelProps> = ({
	filterState, onFilterChange, onReset, orientation = "horizontal",
	brightnessPct = 0, contrastPct = 0, onAdjustBrightness, onAdjustContrast,
	disabled = false, className = "",
}) => {
	const handleToggle = (key: keyof RadiologyQuickFilterState) => {
		if (disabled) return;
		if (key === "maxSharpness" && !filterState.maxSharpness) {
			onFilterChange({ maxSharpness: true, sharpness: false });
		} else if (key === "sharpness" && !filterState.sharpness) {
			onFilterChange({ sharpness: true, maxSharpness: false });
		} else {
			onFilterChange({ [key]: !filterState[key] });
		}
	};

	const isAnyActive =
		filterState.sharpness ||
		filterState.maxSharpness ||
		filterState.invert ||
		filterState.pseudoRelief ||
		brightnessPct !== 0 ||
		contrastPct !== 0;

	if (orientation === "vertical") {
		return (
			<RadiologyQuickFiltersVertical
				filterState={filterState} isAnyActive={isAnyActive} disabled={disabled}
				className={className} brightnessPct={brightnessPct} contrastPct={contrastPct}
				onToggle={handleToggle} onReset={onReset} onAdjustBrightness={onAdjustBrightness}
				onAdjustContrast={onAdjustContrast}
			/>
		);
	}

	return (
		<RadiologyQuickFiltersHorizontal
			filterState={filterState} isAnyActive={isAnyActive} disabled={disabled}
			className={className} onToggle={handleToggle} onReset={onReset}
		/>
	);
};
