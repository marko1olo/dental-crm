import React from "react";
import { PEDIATRIC_SURFACE_PRESETS } from "./constants";

interface PediatricToothSurfacesCardProps {
	readonly selectedSurfaces: readonly string[];
	readonly onToggleSurface: (surf: string) => void;
	readonly onApplySurfacePreset: (surfs: readonly string[]) => void;
}

export const PediatricToothSurfacesCard: React.FC<PediatricToothSurfacesCardProps> = ({
	selectedSurfaces,
	onToggleSurface,
	onApplySurfacePreset,
}) => {
	return (
		<div className="rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] p-3">
			<div className="mb-2 flex items-center justify-between">
				<span className="text-xs font-bold text-[var(--ink,#0f172a)]">
					Поверхности зуба в 1 клик:
				</span>
				<span className="text-xs font-mono font-bold text-teal-700 dark:text-teal-400">
					[{selectedSurfaces.join(", ") || "O"}]
				</span>
			</div>

			<div className="mb-2 flex flex-wrap gap-1.5">
				{PEDIATRIC_SURFACE_PRESETS.map((preset) => {
					const isMatch =
						preset.surfaces.length === selectedSurfaces.length &&
						preset.surfaces.every((s) => selectedSurfaces.includes(s));
					return (
						<button
							key={preset.id}
							type="button"
							onClick={() => onApplySurfacePreset(preset.surfaces)}
							className={`min-h-[48px] px-3 rounded-xl text-xs font-mono font-bold border transition cursor-pointer select-none touch-manipulation flex items-center justify-center ${
								isMatch
									? "bg-teal-600 text-white border-teal-600 shadow-xs scale-105"
									: "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-soft,#f8fafc)]"
							}`}
							title={preset.descriptionRu}
							data-testid={`pediatric-surf-preset-${preset.id}`}
						>
							[{preset.labelRu}]
						</button>
					);
				})}
			</div>

			<div className="flex flex-wrap items-center gap-1.5 border-t border-[var(--line,#e2e8f0)] pt-2">
				<span className="text-[11px] text-[var(--muted,#64748b)] mr-1">
					По отдельности:
				</span>
				{(["O", "V", "L", "M", "D"] as const).map((surf) => {
					const isActive = selectedSurfaces.includes(surf);
					return (
						<button
							key={surf}
							type="button"
							onClick={() => onToggleSurface(surf)}
							className={`min-h-[48px] min-w-[48px] px-2.5 rounded-xl text-xs font-mono font-bold border transition cursor-pointer select-none touch-manipulation flex items-center justify-center ${
								isActive
									? "bg-teal-600 text-white border-teal-600 shadow-xs scale-105"
									: "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-soft,#f8fafc)]"
							}`}
							title={`Поверхность ${surf}`}
							data-testid={`pediatric-surf-btn-${surf}`}
						>
							{surf}
						</button>
					);
				})}
			</div>
		</div>
	);
};
