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
					<span className="text-[10px] font-medium text-[var(--muted)]">(опционально)</span>
				</div>
				<span className="text-xs font-mono font-bold text-teal-700 dark:text-teal-400">
					[{selectedSurfaces.join(", ") || "O"}]
				</span>
			</div>

			{/* Быстрые комбинации */}
			<div className="mb-2 flex flex-wrap gap-1">
				{RESTORATION_SURFACE_PRESETS.map((preset) => {
					const isMatch =
						preset.surfaces.length === selectedSurfaces.length &&
						preset.surfaces.every((s) => selectedSurfaces.includes(s));
					return (
						<button
							key={preset.id}
							type="button"
							onClick={() => onApplySurfacePreset(preset.surfaces)}
							className={`h-7 sm:h-8 px-2.5 rounded-md text-[11px] font-mono font-bold border transition cursor-pointer select-none shrink-0 flex items-center justify-center ${
								isMatch
									? "bg-teal-600 text-white border-teal-600 shadow-2xs"
									: "bg-[var(--paper-strong)] text-[var(--ink)] border-[var(--glass-border)] hover:bg-[var(--paper-soft)]"
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
			<div className="flex flex-wrap items-center gap-1 border-t border-[var(--line)] pt-1.5">
				<span className="text-[10px] text-[var(--muted)] mr-1">По отдельности:</span>
				{INDIVIDUAL_SURFACES.map((surf) => {
					const isActive = selectedSurfaces.includes(surf);
					return (
						<button
							key={surf}
							type="button"
							onClick={() => onToggleSurface(surf)}
							className={`h-7 sm:h-8 min-w-[28px] sm:min-w-[32px] px-2 rounded-md text-[11px] font-mono font-bold border transition cursor-pointer select-none shrink-0 flex items-center justify-center ${
								isActive
									? "bg-teal-600 text-white border-teal-600 shadow-2xs"
									: "bg-[var(--paper-strong)] text-[var(--ink)] border-[var(--glass-border)] hover:bg-[var(--paper-soft)]"
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
