import React from "react";
import {
	STAGE_PRESETS,
	type StagePresetId,
} from "./stagePresetTypes";

export interface StagePresetSelectorProps {
	readonly selectedPreset: StagePresetId;
	readonly onSelectPreset: (preset: StagePresetId) => void;
}

export const StagePresetSelector: React.FC<StagePresetSelectorProps> = ({
	selectedPreset,
	onSelectPreset,
}) => {
	return (
		<div className="space-y-1.5">
			<label className="text-[11px] font-bold text-[var(--muted)]">
				Клиническая специализация этапа:
			</label>
			<div className="grid grid-cols-2 gap-2">
				{STAGE_PRESETS.map((preset) => {
					const isSelected = selectedPreset === preset.id;
					return (
						<button
							key={preset.id}
							type="button"
							onClick={() => onSelectPreset(preset.id)}
							className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
								isSelected
									? "bg-[var(--teal-soft,var(--paper-soft))] border-[var(--teal,var(--brand-primary))] shadow-xs"
									: "bg-[var(--paper-soft,#f8fafc)] border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-strong,#ffffff)]"
							}`}
						>
							<div className="font-bold text-xs text-[var(--ink,#0f172a)]">
								{preset.label}
							</div>
							<div className="text-[10px] text-[var(--muted,#64748b)] mt-0.5 line-clamp-1">
								{preset.desc}
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
};
