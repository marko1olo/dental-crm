import React, { memo } from "react";
import { SURFACE_PRESETS } from "./surfacePresets";

export interface SurfacePresetsBarProps {
	normalizedSelected: readonly string[];
	disabled: boolean;
	applyPreset: (surfs: readonly string[]) => void;
	onClear: () => void;
}

export const SurfacePresetsBar: React.FC<SurfacePresetsBarProps> = memo(({
	normalizedSelected,
	disabled,
	applyPreset,
	onClear,
}) => {
	return (
		<div className="flex flex-wrap items-center justify-center gap-1 mt-2.5 max-w-[210px]" data-testid="surface-black-presets">
			{SURFACE_PRESETS.map((p) => {
				const isSelected = p.surfs.every((s) => normalizedSelected.includes(s));
				return (
					<button
						key={p.label}
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							applyPreset(p.surfs);
						}}
						disabled={disabled}
						className={`px-2 py-1 min-h-[26px] rounded-md text-[11px] font-mono font-bold border transition-all cursor-pointer select-none active:scale-95 ${
							isSelected
								? "bg-teal-600 text-white border-teal-700 shadow-2xs font-black"
								: "bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] text-[var(--odontogram-ink,var(--ink,#0f172a))] border-[var(--line,#cbd5e1)] hover:border-teal-500 hover:bg-[var(--odontogram-surface-hover,var(--paper-strong,#f1f5f9))]"
						}`}
						title={p.title}
						data-testid={`surface-preset-${p.label}`}
					>
						{p.label}
					</button>
				);
			})}
			{normalizedSelected.length > 0 && (
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onClear();
					}}
					disabled={disabled}
					className="px-2 py-1 min-h-[26px] rounded-md text-[11px] font-medium text-[var(--muted,#64748b)] hover:text-rose-600 dark:hover:text-rose-400 border border-transparent hover:border-rose-400/30 cursor-pointer transition-colors"
					title="Снять выбор всех поверхностей"
					data-testid="surface-preset-clear"
				>
					Сброс
				</button>
			)}
		</div>
	);
});
SurfacePresetsBar.displayName = "SurfacePresetsBar";
