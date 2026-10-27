/**
 * QuickDoctorColorPicker.tsx — Color palette selector for QuickAddDoctorModal.
 */

import React from "react";
import { Check, Palette } from "lucide-react";
import { DOCTOR_COLOR_PRESETS } from "./quickDoctorTypes";

interface QuickDoctorColorPickerProps {
	selectedColor: string;
	onSelectColor: (hex: string) => void;
}

export function QuickDoctorColorPicker({ selectedColor, onSelectColor }: QuickDoctorColorPickerProps) {
	return (
		<div className="space-y-1.5">
			<span
				id="quick-doctor-color-label"
				className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted,#64748b)] flex items-center gap-1.5"
			>
				<Palette className="w-3.5 h-3.5 text-[var(--teal)]" />
				<span>Цветовой бейдж врача (палитра)</span>
			</span>
			<div
				className="flex flex-wrap gap-2.5 pt-1"
				role="radiogroup"
				aria-labelledby="quick-doctor-color-label"
				data-testid="quick-doctor-color"
			>
				{DOCTOR_COLOR_PRESETS.map((preset) => {
					const isSelected = selectedColor.toLowerCase() === preset.hex.toLowerCase();
					return (
						<button
							key={preset.id}
							type="button"
							onClick={() => onSelectColor(preset.hex)}
							className={`min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center transition-all cursor-pointer border relative select-none ${
								isSelected
									? "border-[var(--ink,#0f172a)] ring-2 ring-[var(--teal,#0d9488)] scale-110 shadow-sm"
									: "border-black/10 hover:scale-105"
							}`}
							style={{
								backgroundColor: preset.hex,
								minHeight: "44px",
								minWidth: "44px",
							}}
							title={`${preset.label} (${preset.hex})`}
							data-testid={`quick-doctor-color-${preset.id}`}
							role="radio"
							aria-checked={isSelected}
						>
							{isSelected && (
								<Check className="w-5 h-5 text-white drop-shadow-md" aria-hidden="true" />
							)}
						</button>
					);
				})}
			</div>
		</div>
	);
}
