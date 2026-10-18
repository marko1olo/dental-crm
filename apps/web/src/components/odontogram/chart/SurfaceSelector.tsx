import React, { memo, useCallback, useMemo } from "react";
import { canonicalKey } from "./surfaces/surfacePresets";
import { SurfaceSvgDiagram } from "./surfaces/SurfaceSvgDiagram";
import { SurfacePresetsBar } from "./surfaces/SurfacePresetsBar";

export interface SurfaceSelectorProps {
	selected: string[];
	onChange: (newSelected: string[]) => void;
	size?: number;
	disabled?: boolean;
	showPresets?: boolean;
}

export const SurfaceSelector: React.FC<SurfaceSelectorProps> = memo(({
	selected,
	onChange,
	size = 110,
	disabled = false,
	showPresets = true,
}) => {
	const normalizedSelected = useMemo(
		() => Array.from(new Set(selected.map(canonicalKey))),
		[selected],
	);

	const isSurfActive = useCallback(
		(key: string) => normalizedSelected.includes(canonicalKey(key)),
		[normalizedSelected],
	);

	const toggle = useCallback(
		(surface: string) => {
			if (disabled) return;
			const canon = canonicalKey(surface);
			if (normalizedSelected.includes(canon)) {
				onChange(selected.filter((s) => canonicalKey(s) !== canon));
			} else {
				onChange([...selected, canon]);
			}
		},
		[disabled, normalizedSelected, onChange, selected],
	);

	const applyPreset = useCallback(
		(presetSurfs: readonly string[]) => {
			if (disabled) return;
			const allIncluded = presetSurfs.every((s) => normalizedSelected.includes(s));
			if (allIncluded) {
				onChange(selected.filter((s) => !presetSurfs.includes(canonicalKey(s))));
			} else {
				const nextSet = new Set(selected.map(canonicalKey));
				for (const s of presetSurfs) {
					nextSet.add(s);
				}
				onChange(Array.from(nextSet));
			}
		},
		[disabled, normalizedSelected, onChange, selected],
	);

	const shouldShowPresets = showPresets && size >= 70;

	return (
		<div className="flex flex-col items-center justify-center select-none" data-testid="surface-selector-root">
			<SurfaceSvgDiagram
				size={size}
				disabled={disabled}
				isSurfActive={isSurfActive}
				toggle={toggle}
			/>

			{shouldShowPresets && (
				<SurfacePresetsBar
					normalizedSelected={normalizedSelected}
					disabled={disabled}
					applyPreset={applyPreset}
					onClear={() => onChange([])}
				/>
			)}
		</div>
	);
});
SurfaceSelector.displayName = "SurfaceSelector";
