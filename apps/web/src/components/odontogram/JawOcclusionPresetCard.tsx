import React from "react";
import { Check } from "lucide-react";
import type { JawFindingPreset } from "./jawOcclusionTypes";

export interface JawOcclusionPresetCardProps {
	readonly preset: JawFindingPreset;
	readonly isSelected: boolean;
	readonly onSelect: (presetId: string) => void;
}

export const JawOcclusionPresetCard: React.FC<JawOcclusionPresetCardProps> = ({
	preset,
	isSelected,
	onSelect,
}) => {
	return (
		<div
			onClick={() => onSelect(preset.id)}
			className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none flex flex-col gap-1.5 touch-manipulation ${
				isSelected
					? "bg-indigo-500/10 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/30 shadow-xs"
					: preset.isNorm
						? "bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/30"
						: "bg-[var(--odontogram-paper,#ffffff)] hover:bg-[var(--odontogram-surface-hover,#f1f5f9)] border-[var(--odontogram-border-subtle,#e2e8f0)]"
			}`}
			data-testid={`jaw-preset-${preset.id}`}
		>
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-2 min-w-0">
					<div
						className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${
							isSelected
								? "bg-indigo-600 border-indigo-600 text-white"
								: preset.isNorm
									? "border-emerald-500 text-emerald-600"
									: "border-[var(--odontogram-border,#cbd5e1)] text-transparent"
						}`}
					>
						<Check size={12} />
					</div>
					<span className="text-sm font-black text-[var(--odontogram-ink,#0f172a)] truncate">
						{preset.titleRu}
					</span>
				</div>

				<div className="flex items-center gap-1.5 shrink-0">
					{preset.mkb10Code && (
						<span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--odontogram-surface,#f8fafc)] border border-[var(--odontogram-border-subtle,#e2e8f0)] text-[var(--odontogram-ink-muted,#64748b)]">
							{preset.mkb10Code}
						</span>
					)}
					{preset.isNorm && (
						<span className="text-[11px] font-black px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
							Норма
						</span>
					)}
				</div>
			</div>

			<p className="text-xs text-[var(--odontogram-ink-muted,#64748b)] pl-7">
				{preset.descriptionRu}
			</p>
		</div>
	);
};
