import React, { useState } from "react";
import {
	DEFAULT_RVG_FILTERS, RvgHickToolbar, RvgFineTuningPanel,
	type RvgFilterPreset, type RvgFilterValues, type RvgFiltersToolbarProps,
} from "./rvgFilters/index.js";

export * from "./rvgFilters/index.js";

export const RvgFiltersToolbar: React.FC<RvgFiltersToolbarProps> = ({
	filters, onChange, onReset, activePresetId = "standard", onSelectPreset,
	isSplitCompare = false, onToggleSplitCompare, disabled = false, layout = "dock",
	onToggleMeasure, isMeasuring = false, onRotate,
}) => {
	const [showFineTuning, setShowFineTuning] = useState<boolean>(false);

	const handlePresetClick = (preset: RvgFilterPreset) => {
		if (disabled) return;
		onChange(preset.values);
		onSelectPreset?.(preset);
	};

	const handleSliderChange = (key: keyof RvgFilterValues, value: number) => {
		if (disabled) return;
		onChange({ ...filters, [key]: value });
	};

	const handleToggle = (key: "invert" | "denoise" | "emboss") => {
		if (disabled) return;
		onChange({ ...filters, [key]: !filters[key] });
	};

	const handleReset = () => {
		if (disabled) return;
		onChange(DEFAULT_RVG_FILTERS);
		onReset?.();
	};

	const toolbar = (
		<RvgHickToolbar
			filters={filters} activePresetId={activePresetId} layout={layout} disabled={disabled}
			showFineTuning={showFineTuning} setShowFineTuning={setShowFineTuning} isSplitCompare={isSplitCompare}
			onToggleSplitCompare={onToggleSplitCompare} isMeasuring={isMeasuring} onToggleMeasure={onToggleMeasure}
			onRotate={onRotate} onToggle={handleToggle} onSliderChange={handleSliderChange}
			onPresetClick={handlePresetClick} onReset={handleReset}
		/>
	);

	if (layout === "toolbar") {
		return toolbar;
	}

	return (
		<div className="rvg-filters-toolbar flex flex-col gap-2.5 w-full" data-testid="rvg-filters-toolbar">
			{toolbar}
			{showFineTuning && (
				<RvgFineTuningPanel
					filters={filters} activePresetId={activePresetId} disabled={disabled}
					onPresetClick={handlePresetClick} onSliderChange={handleSliderChange} onToggle={handleToggle}
				/>
			)}
		</div>
	);
};
