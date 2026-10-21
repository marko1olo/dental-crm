import { Check } from "lucide-react";
import { CHAIR_COLOR_PRESETS } from "./chairPresets";

interface QuickAddChairColorPickerProps {
	selectedColor: string;
	onSelectColor: (hex: string) => void;
}

export function QuickAddChairColorPicker({
	selectedColor,
	onSelectColor,
}: QuickAddChairColorPickerProps) {
	return (
		<div className="space-y-1.5">
			<span
				id="quick-add-chair-colors-label"
				className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted,#64748b)]"
			>
				Цветовой маркер в сетке
			</span>
			<div
				className="grid grid-cols-7 sm:grid-cols-7 gap-2"
				role="radiogroup"
				aria-labelledby="quick-add-chair-colors-label"
			>
				{CHAIR_COLOR_PRESETS.map((preset) => {
					const isSelected =
						selectedColor.toLowerCase() === preset.hex.toLowerCase();
					return (
						<button
							key={preset.id}
							type="button"
							onClick={() => onSelectColor(preset.hex)}
							className={`min-h-[44px] min-w-[44px] h-11 w-11 rounded-xl border flex items-center justify-center transition-all cursor-pointer relative ${
								isSelected
									? "scale-110 shadow-md ring-2 ring-[var(--teal,#0d9488)] ring-offset-1"
									: "hover:scale-105"
							}`}
							style={{
								minHeight: "44px",
								minWidth: "44px",
								backgroundColor: preset.hex,
								borderColor: preset.darkHex,
							}}
							title={preset.label}
							data-testid={`quick-add-chair-color-${preset.id}`}
							role="radio"
							aria-checked={isSelected}
						>
							{isSelected && (
								<Check className="w-4 h-4 text-white drop-shadow-sm" />
							)}
						</button>
					);
				})}
			</div>
		</div>
	);
}
