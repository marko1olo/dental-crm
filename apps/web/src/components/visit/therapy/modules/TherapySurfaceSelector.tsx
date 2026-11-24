import type React from "react";
import { RESTORATION_SURFACE_PRESETS } from "@dental/shared";

interface TherapySurfaceSelectorProps {
	selectedSurfaces: string[];
	onApplySurfacePreset: (surfs: readonly string[]) => void;
	onToggleSurface: (surf: string) => void;
}

const INDIVIDUAL_SURFACES = ["O", "V", "L", "M", "D", "C"] as const;

export const TherapySurfaceSelector: React.FC<TherapySurfaceSelectorProps> = ({
	selectedSurfaces,
	onApplySurfacePreset,
	onToggleSurface,
}) => {
	return (
		<div className="mb-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] p-2 sm:p-2.5 shadow-2xs">
			<div className="mb-1.5 flex items-center justify-between">
				<div className="flex items-center gap-1.5">
					<span className="text-xs font-semibold text-[var(--ink)]">Поверхности зуба:</span>
					<span className="text-[10px] font-medium text-[var(--ink-muted)]">(опционально)</span>
				</div>
				<span className="text-xs font-mono font-bold text-[var(--primary)]">
					[{selectedSurfaces.join(", ") || "O"}]
				</span>
			</div>

			{/* Быстрые комбинации */}
			<div className="mb-2 flex flex-wrap gap-1.5 sm:gap-1">
				{RESTORATION_SURFACE_PRESETS.map((preset) => {
					const isMatch =
						preset.surfaces.length === selectedSurfaces.length &&
						preset.surfaces.every((s) => selectedSurfaces.includes(s));
					return (
						<button
							key={preset.id}
							type="button"
							onClick={() => onApplySurfacePreset(preset.surfaces)}
							className={`min-h-[44px] h-11 px-3.5 rounded-xl text-xs sm:min-h-0 sm:h-8 sm:px-2.5 sm:rounded-md sm:text-[11px] font-mono font-bold border transition cursor-pointer select-none shrink-0 flex items-center justify-center touch-manipulation ${
								isMatch
									? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-2xs"
									: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
							}`}
							title={preset.descriptionRu}
							data-testid={`therapy-surf-preset-${preset.id}`}
						>
							[{preset.labelRu}]
						</button>
					);
				})}
			</div>

			{/* Отдельные поверхности */}
			<div className="flex flex-wrap items-center gap-1.5 sm:gap-1 border-t border-[var(--line)] pt-1.5">
				<span className="text-[10px] text-[var(--ink-muted)] mr-1">По отдельности:</span>
				{INDIVIDUAL_SURFACES.map((surf) => {
					const isActive = selectedSurfaces.includes(surf);
					return (
						<button
							key={surf}
							type="button"
							onClick={() => onToggleSurface(surf)}
							className={`min-h-[44px] h-11 min-w-[44px] px-3.5 rounded-xl text-xs sm:min-h-0 sm:h-8 sm:min-w-[32px] sm:px-2 sm:rounded-md sm:text-[11px] font-mono font-bold border transition cursor-pointer select-none shrink-0 flex items-center justify-center touch-manipulation ${
								isActive
									? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-2xs"
									: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
							}`}
							title={`Поверхность ${surf} (нажмите для переключения)`}
						>
							{surf}
						</button>
					);
				})}
			</div>
		</div>
	);
};
