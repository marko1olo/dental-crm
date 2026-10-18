import React from "react";
import { Check } from "lucide-react";
import { BLACK_CAVITY_PRESETS, TOOTH_SURFACES_MODBL } from "./types";

export interface ToothSurfacesButtonsProps {
	selectedSurfaces: string[];
	onSelectSurface?: ((surface: string) => void) | undefined;
}

export const ToothSurfacesButtons: React.FC<ToothSurfacesButtonsProps> = ({
	selectedSurfaces,
	onSelectSurface,
}) => {
	return (
		<div className="space-y-2">
			<div className="grid grid-cols-5 gap-1.5" role="group" aria-label="Анатомические поверхности зуба">
				{TOOTH_SURFACES_MODBL.map((surf) => {
					const isSelected = selectedSurfaces.includes(surf.key);
					return (
						<button
							key={surf.key}
							type="button"
							data-testid={`tooth-surface-btn-${surf.key.toLowerCase()}`}
							onClick={() => onSelectSurface?.(surf.key)}
							className={`flex flex-col items-center justify-center min-h-[40px] p-1 rounded-lg border text-center transition-all cursor-pointer ${
								isSelected
									? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-xs font-bold"
									: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal)]"
							}`}
							title={`${surf.fullRu}: ${surf.description}`}
							aria-pressed={isSelected}
						>
							<span className="text-xs font-mono font-bold leading-none">{surf.label}</span>
							<span className="text-[9px] mt-0.5 truncate max-w-full opacity-80">{surf.fullRu.slice(0, 4)}.</span>
						</button>
					);
				})}
			</div>

			<div className="flex items-center gap-1.5 flex-wrap pt-0.5">
				<span className="text-[11px] text-[var(--muted)] font-medium shrink-0">Пресеты Блэка:</span>
				{BLACK_CAVITY_PRESETS.map((preset) => {
					const isPresetActive = selectedSurfaces.length === preset.surfaces.length && preset.surfaces.every((s) => selectedSurfaces.includes(s));
					return (
						<button
							key={preset.code}
							type="button"
							data-testid={`preset-cavity-${preset.code.toLowerCase()}`}
							onClick={() => onSelectSurface?.(preset.code)}
							className={`text-[11px] font-mono px-2 py-0.5 min-h-[28px] rounded-md border transition-colors flex items-center gap-1 cursor-pointer ${
								isPresetActive
									? "bg-[var(--teal-subtle)] text-[var(--teal)] border-[var(--teal)] font-bold"
									: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
							}`}
							title={preset.name}
						>
							{isPresetActive && <Check className="w-3 h-3 text-[var(--teal)]" />}
							<span>{preset.code}</span>
						</button>
					);
				})}
			</div>
		</div>
	);
};
