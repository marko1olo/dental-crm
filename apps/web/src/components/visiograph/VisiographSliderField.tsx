/**
 * VisiographSliderField.tsx
 * Reusable labeled range slider for radiological image adjustments.
 */

import type React from "react";

export interface VisiographSliderFieldProps {
	label: string;
	valueText: string | number;
	value: number;
	min: number;
	max: number;
	step?: number | undefined;
	onChange: (val: number) => void;
}

export function VisiographSliderField({
	label,
	valueText,
	value,
	min,
	max,
	step,
	onChange,
}: VisiographSliderFieldProps) {
	return (
		<div>
			<div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
				<span>{label}</span>
				<span>{valueText}</span>
			</div>
			<input
				type="range"
				min={min}
				max={max}
				step={step}
				value={value}
				onChange={(e) => onChange(Number(e.target.value))}
				style={{ width: "100%", accentColor: "var(--primary, #58a6ff)" }}
			/>
		</div>
	);
}
