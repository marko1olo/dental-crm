import type React from "react";
import { Sparkles } from "lucide-react";
import {
	type TherapyPresetId,
	type TherapyProtocolPreset,
	THERAPY_PROTOCOL_PRESETS,
} from "@dental/shared";

interface TherapyPresetSelectorProps {
	activePresetId: TherapyPresetId;
	onSelectPreset: (preset: TherapyProtocolPreset) => void;
}

export const TherapyPresetSelector: React.FC<TherapyPresetSelectorProps> = ({
	activePresetId,
	onSelectPreset,
}) => {
	return (
		<div className="mb-4">
			<div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
				Протоколы лечения у кресла:
			</div>
			<div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
				{THERAPY_PROTOCOL_PRESETS.map((preset) => {
					const isCurrent = activePresetId === preset.id;
					return (
						<button
							key={preset.id}
							type="button"
							onClick={() => onSelectPreset(preset)}
							className={`flex min-h-[52px] flex-col justify-center rounded-xl border p-2.5 text-left transition active:scale-[0.98] cursor-pointer touch-manipulation ${
								isCurrent
									? "border-teal-600 bg-teal-50/90 text-teal-950 shadow-sm ring-1 ring-teal-500 dark:border-teal-400 dark:bg-teal-950/60 dark:text-teal-100"
									: "border-[var(--glass-border)] bg-[var(--paper-strong)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
							}`}
							data-testid={`therapy-preset-btn-${preset.id}`}
						>
							<div className="flex items-center gap-1.5 font-bold text-xs">
								<Sparkles className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
								<span className="truncate">{preset.shortLabelRu}</span>
							</div>
							<div className="mt-0.5 text-[11px] text-[var(--muted)] truncate">
								{preset.id === "caries_composite"
									? "OptiBond FL + Filtek"
									: preset.id === "failed_filling_replacement"
										? "Снятие + Harmonize"
										: preset.id === "wedge_defect_erosion"
											? "Clearfil SE + SDR"
											: "Ключ + Мамелоны"}
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
};
